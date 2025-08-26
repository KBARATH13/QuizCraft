const axios = require('axios');

const getQuestions = async (topic, count, signal, ws) => {
  const generationPrompt = `
    IMPORTANT: Respond with ONLY a valid JSON object. Do NOT include any other text, explanations, or markdown formatting outside the JSON.
    Generate a quiz about "${topic}" with exactly ${count} multiple-choice questions.
    Each question must have exactly 4 distinct options, and one correct answer.
    Strictly NO True/False questions. Ensure options are varied and not easily guessable by pattern.
    Vary the position of the correct answer among the options (e.g., not always option A, B, C, or D). Ensure the correct answer is distributed randomly across all four option positions (A, B, C, D) to avoid any predictable patterns. For instance, do not consistently place the correct answer as the first option.
    If the topic is broad, generate questions covering diverse subtopics within it.
    Respond with the following JSON structure. Adhere strictly to this schema:
    {
      "title": "Suggested Quiz Title related to ${topic}",
      "category": "Suggested Category related to ${topic}",
      "questions": [
        {
          "questionText": "Example question text",
          "options": ["Example Option A", "Example Option B", "Example Option C", "Example Option D"],
          "correctAnswer": "Example Correct Answer Text",
          "explanation": "Example explanation for the correct answer."
        }
        // ... exactly ${count} question objects
      ]
    }
  `;

  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'gemma:2b',
      prompt: generationPrompt,
      stream: true, // Enable streaming
      format: 'json'
    }, { signal, responseType: 'stream' }); // Set responseType to stream // Pass the signal here

    let jsonResponseString = '';

    // Process the stream
    await new Promise((resolve, reject) => {
      let buffer = '';
      response.data.on('data', chunk => {
        buffer += chunk.toString();
        let boundary;
        while ((boundary = buffer.indexOf('\n')) !== -1) {
          const piece = buffer.substring(0, boundary);
          buffer = buffer.substring(boundary + 1);
          if (piece) {
            try {
              const parsedLine = JSON.parse(piece);
              jsonResponseString += parsedLine.response || '';
              if (ws && ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'quizGenerationStatus', message: `Generating quiz... (${jsonResponseString.length} characters generated)` }));
              }
            } catch (e) {
              
            }
          }
        }
      });

      response.data.on('end', () => {
        if (buffer) { // Process any remaining data
          try {
            const parsedLine = JSON.parse(buffer);
            jsonResponseString += parsedLine.response || '';
          } catch (e) {
            
          }
        }
        resolve();
      });

      response.data.on('error', err => {
        reject(err);
      });
    });

    
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'quizGenerationStatus', message: 'Processing generated quiz data...' }));
    }

    let parsedResponse;
    try {
      // Now, parse the complete JSON string
      parsedResponse = JSON.parse(jsonResponseString);
    } catch (e) {
      
      // Attempt to extract JSON using regex as a fallback
      const jsonMatch = jsonResponseString.match(/```json\s*([\s\S]*?)\s*```|[\s\S]*?(\{[\s\S]*?\})[\s\S]*/);
      if (jsonMatch && (jsonMatch[1] || jsonMatch[2])) {
        const extractedJsonString = jsonMatch[1] || jsonMatch[2];
        try {
          parsedResponse = JSON.parse(extractedJsonString);
          
        } catch (extractError) {
          
          throw new Error("The AI response was not in a valid JSON format even after extraction.");
        }
      }
      else {
        
        throw new Error("The AI response was not in a valid JSON format.");
      }
    }

    const { title, category, questions: quizArray } = parsedResponse;

    if (!title || !category || !Array.isArray(quizArray)) {
      throw new Error("The AI response was valid JSON, but not in the expected structure (missing title, category, or questions array).");
    }

    // Convert the AI's JSON into the format needed by the application.
    const processedQuestions = quizArray.map(q => {
      // Basic validation and True/False check
      if (!q.questionText || !Array.isArray(q.options) || q.options.length !== 4 || !q.correctAnswer) {
        
        return null;
      }

      // Check for True/False patterns
      const lowerQuestionText = q.questionText.toLowerCase();
      const isTrueFalse = lowerQuestionText.includes('true or false') ||
                          lowerQuestionText.includes('is it true that') ||
                          q.options.some(opt => opt.toLowerCase() === 'true' || opt.toLowerCase() === 'false');
      if (isTrueFalse) {
        
        return null;
      }

      const correctAnswerIndex = q.options.findIndex(opt => opt.toLowerCase() === q.correctAnswer.toLowerCase());
      if (correctAnswerIndex === -1) {
        
        return null;
      }

      return {
        questionText: q.questionText,
        options: q.options,
        correctAnswer: correctAnswerIndex,
        explanation: q.explanation || 'No explanation provided.'
      };
    });

    // Filter out any malformed or invalid questions.
    const validQuestions = processedQuestions.filter(q => q !== null);

    if (validQuestions.length === 0) {
      throw new Error("AI returned JSON, but no valid questions could be processed.");
    }

    if (validQuestions.length < count) {
      
    }

    // Stream questions one by one to the client
    for (let i = 0; i < validQuestions.length; i++) {
      const question = validQuestions[i];
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'quizQuestion',
          question: question,
          currentCount: i + 1,
          totalRequested: count,
          title: title,
          category: category,
          topic: topic,
        }));
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }

    // Send a completion message
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'quizGenerationComplete',
        message: 'Quiz generation complete!',
        title: title,
        category: category,
        topic: topic,
      }));
    }

    // No return value needed here as questions are streamed via WebSocket
    return; // Explicitly return nothing

  } catch (error) {
    if (axios.isCancel(error)) {
      
      throw new Error("Quiz generation cancelled."); // Propagate a specific message for cancellation
    }
    
    
    // Propagate a more user-friendly error message.
    throw new Error(`Failed to generate quiz from AI: ${error.message}`);
  }
};

module.exports = { getQuestions };