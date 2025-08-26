const axios = require('axios');

const askGemma = async (userQuestion) => {
  const lowerCaseQuestion = userQuestion.toLowerCase().trim();

  // 1. Hardcoded responses for simple, common queries
  if (lowerCaseQuestion.includes("what is your name") || lowerCaseQuestion.includes("who are you")) {
    return "I am an AI assistant designed to help you with quizzes and academic doubts. I don't have a name.";
  }

  // 2. Basic domain check for out-of-scope questions
  const outOfDomainKeywords = [
    "current events", "news today", "personal life", "feelings", "emotions",
    "weather", "sports scores", "celebrity gossip", "political opinions",
    "tell me a joke", "sing a song", "write a poem", "recipe for",
    "stock market", "financial advice", "medical advice", "legal advice"
  ];

  const isOutOfDomain = outOfDomainKeywords.some(keyword => lowerCaseQuestion.includes(keyword));

  if (isOutOfDomain) {
    return "Sorry, I am not trained in that domain or field. I can help you with academic concepts and quiz-related questions.";
  }

  // 3. If not a simple query or out-of-domain, proceed to gemma
  const personaPrompt = `You are an AI assistant for a quiz application, designed to answer simple, factual questions and define concepts. Your name is QuizBot. Keep your answers concise and to the point. If a question is too complex, open-ended, or requires deep analysis, politely state that you are designed for simpler questions.

${userQuestion}`;

  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'gemma:2b',
      prompt: personaPrompt,
      stream: false,
    });
    return response.data.response;
  } catch (error) {
    console.error('Error communicating with Ollama:', error.message);
    throw new Error('Failed to get response from AI. Please ensure Ollama is running and the gemma:2b model is available.');
  }
};

module.exports = { askGemma };