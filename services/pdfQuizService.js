const pdf = require('pdf-parse');
const axios = require('axios');
const fs = require('fs');

// Helper function to split text into manageable chunks.
function chunkText(text, chunkSize) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

// Helper function to generate questions for a single chunk of text.
// This function now always tries to generate 1 question and includes retry logic.
async function generateQuestionFromText(textChunk, isGeneralKnowledge = false, topic = '', signal) {
  const MAX_RETRIES = 3; 

  for (let retryCount = 0; retryCount < MAX_RETRIES; retryCount++) {
    if (signal && signal.aborted) {
      
      return [];
    }

    let rawResponse = ''; 
    try {
      let generationPrompt;
      if (isGeneralKnowledge) {
        generationPrompt = `
          You are a JSON quiz generator. Your ONLY output must be a single, valid JSON array containing exactly 1 question object. Do not output any other text, markdown, or explanations.
          Each object in the JSON array must have this exact structure:
          {
            "questionText": "The text of the question",
            "options": ["Option A", "Option B", "Option C", "Option D"], /* The 'options' array MUST contain exactly 4 string values. */
            "correctAnswer": "The text of the correct option",
            "explanation": "A brief explanation"
          }
          Generate 1 *diverse and distinct* multiple-choice question about the topic: "${topic}". Ensure it is not a rephrasing of a very similar question.
        `;
      } else {
        generationPrompt = `
          You are a JSON quiz generator. Your ONLY output must be a single, valid JSON array containing exactly 1 question object. Do not output any other text, markdown, or explanations.
          Each object in the JSON array must have this exact structure:
          {
            "questionText": "The text of the question",
            "options": ["Option A", "Option B", "Option C", "Option D"], /* The 'options' array MUST contain exactly 4 string values. */
            "correctAnswer": "The text of the correct option",
            "explanation": "A brief explanation"
          }
          Generate 1 *diverse and distinct* multiple-choice question based *only* on the text provided below. Ensure it is not a rephrasing of a very similar question.
          --- BEGIN TEXT ---
          ${textChunk}
          --- END TEXT ---
        `;
      }

      const response = await axios.post('http://localhost:11434/api/generate', {
        model: 'gemma:2b',
        prompt: generationPrompt,
        stream: false,
        format: 'json'
      }, { signal }); // Pass the signal here

      rawResponse = response.data.response; 
      

      if (!rawResponse || typeof rawResponse !== 'string') {
        
        continue; 
      }

      const responseObject = JSON.parse(rawResponse);

      let questionsArray = [];
      if (Array.isArray(responseObject)) {
        questionsArray = responseObject;
      } else if (responseObject && Array.isArray(responseObject.questions)) {
        questionsArray = responseObject.questions;
      } else if (responseObject && typeof responseObject === 'object' && Object.keys(responseObject).length > 0) {
        questionsArray = [responseObject];
      }
      
      // Validate the generated question(s) strictly before returning
      const validGeneratedQuestions = questionsArray.filter(q => {
        if (!q || typeof q.questionText !== 'string' || !Array.isArray(q.options) || q.options.some(opt => typeof opt !== 'string') || typeof q.correctAnswer !== 'string') {
          
          return false; 
        }
        // Further check if correct answer text is present in options
        const correctAnswerText = q.correctAnswer.trim();
        const options = q.options.map(opt => String(opt).trim());
        const correctAnswerIndex = options.findIndex(opt => opt.toLowerCase().includes(correctAnswerText.toLowerCase()));
        if (correctAnswerIndex === -1) {
          
          return false;
        }
        return true;
      });

      if (validGeneratedQuestions.length > 0) {
        return validGeneratedQuestions; 
      } else {
        
        continue; 
      }

    } catch (e) {
      if (axios.isCancel(e)) {
        
        return []; // Return empty array if cancelled
      }
      
      continue; 
    }
  }
  
  return []; 
}

const getQuestionsFromPdf = async (pdfPath, totalQuestions, ws, signal) => {
  try {
    if (signal && signal.aborted) {
      
      ws.send(JSON.stringify({ type: 'quizGenerationError', message: 'Quiz generation cancelled.' }));
      return;
    }

    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    const extractedText = data.text;

    if (!extractedText || extractedText.trim().length < 50) {
      ws.send(JSON.stringify({ type: 'quizGenerationError', message: "The provided PDF does not contain enough text (at least 50 characters) to generate a meaningful quiz." }));
      return;
    }

    const SINGLE_REQUEST_CHAR_LIMIT = 15000;
    const allQuestions = [];
    const existingQuestionTexts = new Set(); // Stores normalized question texts

    let currentQuestionsGenerated = 0;

    // Phase 1: Generate questions directly from PDF content
    ws.send(JSON.stringify({ type: 'quizGenerationStatus', message: `Phase 1: Generating questions from PDF content...` }));

    const MAX_PDF_GENERATION_ATTEMPTS = totalQuestions * 5; // Attempt more times than requested questions
    let pdfGenerationAttempts = 0;

    // Determine the source text for PDF-based questions
    let sourceTextForPdfQuestions;
    let isChunkedSource = false;
    if (extractedText.length <= SINGLE_REQUEST_CHAR_LIMIT) {
      sourceTextForPdfQuestions = extractedText;
    } else {
      sourceTextForPdfQuestions = chunkText(extractedText, 4000); // Array of chunks
      isChunkedSource = true;
    }

    while (currentQuestionsGenerated < totalQuestions && pdfGenerationAttempts < MAX_PDF_GENERATION_ATTEMPTS) {
      if (signal && signal.aborted) {
        
        ws.send(JSON.stringify({ type: 'quizGenerationError', message: 'Quiz generation cancelled.' }));
        return;
      }

      let textToUseForGeneration;
      if (isChunkedSource) {
        // Randomly select a chunk to try and get more diverse questions
        const randomIndex = Math.floor(Math.random() * sourceTextForPdfQuestions.length);
        textToUseForGeneration = sourceTextForPdfQuestions[randomIndex];
      } else {
        textToUseForGeneration = sourceTextForPdfQuestions; // Use entire text
      }

      const generated = await generateQuestionFromText(textToUseForGeneration, false, '', signal); // Pass the signal
      pdfGenerationAttempts++;

      if (generated && generated.length > 0) {
        const question = generated[0]; 
        const normalizedQuestionText = question.questionText.toLowerCase().replace(/[^a-z0-9]/g, ''); // Normalize for comparison

        if (question.questionText && !existingQuestionTexts.has(normalizedQuestionText)) {
          
          allQuestions.push(question);
          existingQuestionTexts.add(normalizedQuestionText);
          currentQuestionsGenerated++;
          ws.send(JSON.stringify({ type: 'quizQuestion', question: question, currentCount: currentQuestionsGenerated, totalRequested: totalQuestions }));
        } else {
          
        }
      }
    }

    // Phase 2: Supplement with general knowledge if not enough questions were generated from PDF
    if (currentQuestionsGenerated < totalQuestions) {
      ws.send(JSON.stringify({ type: 'quizGenerationStatus', message: `Phase 2: Supplementing with general knowledge...` }));
      const remainingToGenerate = totalQuestions - currentQuestionsGenerated;
      const fallbackTopic = extractedText.substring(0, Math.min(extractedText.length, 500)); // Use first 500 chars as topic

      for (let i = 0; i < remainingToGenerate; i++) {
        if (signal && signal.aborted) {
          
          ws.send(JSON.stringify({ type: 'quizGenerationError', message: 'Quiz generation cancelled.' }));
          return;
        }

        if (currentQuestionsGenerated >= totalQuestions) break;
        const generated = await generateQuestionFromText(fallbackTopic, true, fallbackTopic, signal); // Pass the signal
        if (generated && generated.length > 0) {
          const question = generated[0]; 
          const normalizedQuestionText = question.questionText.toLowerCase().replace(/[^a-z0-9]/g, ''); // Normalize for comparison
          if (question.questionText && !existingQuestionTexts.has(normalizedQuestionText)) {
            
            allQuestions.push(question);
            existingQuestionTexts.add(normalizedQuestionText);
            currentQuestionsGenerated++;
            ws.send(JSON.stringify({ type: 'quizQuestion', question: question, currentCount: currentQuestionsGenerated, totalRequested: totalQuestions }));
          } else {
            
          }
        }
      }
    }

    // Final validation and formatting (this part remains similar, but now processes allQuestions)
    
    const finalValidatedQuestions = allQuestions.map(q => {
      if (!q || typeof q.questionText !== 'string' || !Array.isArray(q.options) || q.options.some(opt => typeof opt !== 'string') || typeof q.correctAnswer !== 'string') {
        
        return null;
      }

      const questionText = q.questionText.trim();
      const explanation = q.explanation ? String(q.explanation).trim() : "";
      const correctAnswerText = q.correctAnswer.trim();
      const options = q.options.map(opt => String(opt).trim());

      const truncatedOptions = options.slice(0, 4);
      while (truncatedOptions.length < 4) {
        truncatedOptions.push("Invalid Option");
      }

      const correctAnswerIndex = truncatedOptions.findIndex(opt => opt.toLowerCase().includes(correctAnswerText.toLowerCase()));

      if (correctAnswerIndex === -1) {
        
        return null;
      }

      return {
        questionText,
        options: truncatedOptions,
        correctAnswer: correctAnswerIndex,
        explanation
      };
    }).filter(q => q !== null);

    let finalMessage = `Quiz generation complete. Generated ${finalValidatedQuestions.length} out of ${totalQuestions} requested questions.`;
    if (finalValidatedQuestions.length < totalQuestions) {
      finalMessage += " The document may not have contained enough distinct information to create all questions, so some were generated from general knowledge.";
    }

    ws.send(JSON.stringify({ type: 'quizGenerationComplete', message: finalMessage, finalQuestionsCount: finalValidatedQuestions.length }));

  } catch (error) {
    
    
    ws.send(JSON.stringify({ type: 'quizGenerationError', message: `Failed to generate quiz from PDF content: ${error.message}. Please check your Ollama server and model.` }));
  } finally {
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
  }
};

module.exports = { getQuestionsFromPdf };