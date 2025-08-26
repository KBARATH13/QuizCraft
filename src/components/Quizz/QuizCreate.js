import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams } from 'react-router-dom';
import './QuizCreate.css';

export default function QuizCreate() {
  const { id } = useParams(); // Get quiz ID from URL params

  // Initialize state from localStorage or with defaults. This function runs only once.
  const [initialState] = useState(() => {
    if (id) { // If in edit mode, start fresh.
      return { title: '', topic: '', categories: '', questions: [{ questionText: '', options: ['', '', '', ''], correctAnswer: 0 }] };
    }
    const savedQuiz = localStorage.getItem('savedQuiz');
    if (savedQuiz) {
      try {
        const parsed = JSON.parse(savedQuiz);
        if (parsed && typeof parsed === 'object') {
          return {
            title: parsed.title || '',
            topic: parsed.topic || '',
            categories: parsed.categories || '',
            questions: Array.isArray(parsed.questions) && parsed.questions.length > 0 
              ? parsed.questions 
              : [{ questionText: '', options: ['', '', '', ''], correctAnswer: 0 }],
          };
        }
      } catch (e) {
        
      }
    }
    // Default state if nothing is saved or parsing fails
    return { title: '', topic: '', categories: '', questions: [{ questionText: '', options: ['', '', '', ''], correctAnswer: 0 }] };
  });

  const [title, setTitle] = useState(initialState.title);
  const [topic, setTopic] = useState(initialState.topic);
  const [questions, setQuestions] = useState(initialState.questions);
  const questionsRef = useRef(questions); // Ref to hold the latest questions state
  const [categories, setCategories] = useState(initialState.categories);
  
  const [generationTopic, setGenerationTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [, setSelectedVisibility] = useState('public');
  const [pdfFile, setPdfFile] = useState(null);
  const [expandedQuestions, setExpandedQuestions] = useState({});

  const ws = useRef(null);
  // Ref to hold the latest value of generation topic for the WebSocket callback
  const generationTopicRef = useRef(generationTopic);

  // AbortController for cancelling generation
  const abortControllerRef = useRef(null);
  const questionsWrapperRef = useRef(null);

  useEffect(() => {
    generationTopicRef.current = generationTopic;
  }, [generationTopic]);

  useEffect(() => {
    questionsRef.current = questions; // Keep questionsRef updated
  }, [questions]);

  useEffect(() => {
    // Establish WebSocket connection
    ws.current = new WebSocket('ws://localhost:5000/');

    ws.current.onopen = () => {
      
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case 'quizQuestion': // For individual questions from topic-based and PDF generation
          // Set title/topic/category only for the first question received
          if (questionsRef.current.length === 0) {
            if (message.type === 'quizQuestion' && message.topic) { // Check if topic is provided in message
              setTitle(message.title || `Quiz on ${generationTopicRef.current}`);
              setTopic(message.topic || generationTopicRef.current);
              setCategories(message.category || 'General');
            } else { // Fallback for PDF or if topic not explicitly sent in first question
              setTitle(`Quiz from PDF`);
              setTopic(`PDF Content`);
              setCategories(`PDF-Generated`);
            }
          }
          // Ensure correctAnswer is converted to a number (index) before setting state
          const newQuestion = { ...message.question };
          if (typeof newQuestion.correctAnswer === 'string' && Array.isArray(newQuestion.options)) {
            const correctIndex = newQuestion.options.findIndex(opt => opt.toLowerCase() === newQuestion.correctAnswer.toLowerCase());
            newQuestion.correctAnswer = correctIndex !== -1 ? correctIndex : 0; // Default to 0 if not found
          }
          setQuestions(prevQuestions => [...prevQuestions, newQuestion]);
          toast.success(`Question ${message.currentCount}/${message.totalRequested} generated!`, { autoClose: 1000 });

          // Auto-scroll to the bottom
          if (questionsWrapperRef.current) {
            questionsWrapperRef.current.scrollTop = questionsWrapperRef.current.scrollHeight;
          }
          break;
        case 'quizGenerationComplete': // For PDF generation completion
          setLoading(false);
          toast.success(message.message);
          // Optionally, you can set the final questions here if needed, but they are already streamed
          break;
        case 'quizGenerationError': // For errors during PDF generation
          setLoading(false);
          toast.error(message.message);
          break;
        case 'error': // General errors
          setLoading(false);
          if (message.message.includes('enough information')) {
            toast.error('The AI does not have enough information on this topic. Please try a different one.');
          } else {
            toast.error(message.message);
          }
          break;
        default:
          
      }
    };

    ws.current.onclose = () => {
      
    };

    ws.current.onerror = (error) => {
      
      // Only show the error toast if we were actually in the process of generating a quiz.
      // This prevents the toast from showing up on the initial connection flicker caused by React.StrictMode.
      if (loading) {
        toast.error('WebSocket error during quiz generation.');
      }
      setLoading(false);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  // Save quiz to localStorage whenever it changes, but only if we are NOT in edit mode.
  useEffect(() => {
    if (!id) {
      const quizData = { title, topic, categories, questions };
      localStorage.setItem('savedQuiz', JSON.stringify(quizData));
    }
  }, [id, title, topic, categories, questions]);

  // Fetch quiz data if in edit mode
  useEffect(() => {
    if (id) {
      // Clear any local storage saved quiz when editing a quiz
      localStorage.removeItem('savedQuiz');
      const fetchQuiz = async () => {
        try {
          const res = await axios.get(`http://localhost:5000/api/quizzes/${id}`);
          setTitle(res.data.title);
          setTopic(res.data.topic || '');
          setQuestions(res.data.questions);
          setSelectedVisibility(res.data.visibility || 'public');
          setCategories(res.data.categories ? res.data.categories.join(', ') : '');
        } catch (err) {
          
          toast.error('Failed to load quiz for editing.');
        }
      };
      fetchQuiz();
    }
  }, [id]);

  const handleRemoveQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
  };

  const handleClearForm = () => {
    setTitle('');
    setTopic('');
    setQuestions([{ questionText: '', options: ['', '', '', ''], correctAnswer: 0 }]);
    setGenerationTopic('');
    setCategories('');
    localStorage.removeItem('savedQuiz');
  };

  const handleSubmit = () => {
    if (questions.length === 0 || questions.some(q => !q || !String(q.questionText).trim() || q.options.length < 2 || q.options.some(opt => !String(opt).trim()))) {
      toast.error('Please ensure every question has text and at least two options with text.');
      return;
    }
    setShowVisibilityModal(true);
  };

  const handleFinalSubmit = async (visibility) => {
    setShowVisibilityModal(false);
    // No validation here for title, topic, categories as AI generates them.
    // The backend model has been updated to not require them.
    const quizCategories = String(categories).split(',').map(cat => String(cat).trim()).filter(cat => String(cat).length > 0);
    

    // --- START DIAGNOSTIC LOG --- 
    // questions.forEach((q, index) => {
    //   
    // });
    // --- END DIAGNOSTIC LOG --- 

    setLoading(true); // Ensure loading state is set
    try {
      const endpoint = id ? `http://localhost:5000/api/quizzes/${id}` : 'http://localhost:5000/api/quizzes';
      const method = id ? 'put' : 'post';
      
      await axios[method](endpoint, { title, topic, questions, visibility, categories: quizCategories });
      
      toast.success(`Quiz ${id ? 'updated' : 'created'} successfully!`);
      handleClearForm();
    } catch (err) {
      
      toast.error(err.response?.data?.message || 'Failed to save quiz.');
    } finally {
      setLoading(false); // Ensure loading state is reset
    }
  };

  const handlePdfFileChange = (event) => {
    setPdfFile(event.target.files[0]);
  };

  const handleGenerateQuiz = async () => {
    if (!generationTopic.trim() && !pdfFile) {
      toast.error('Please provide a topic or upload a PDF to generate the quiz.');
      return;
    }

    if (numQuestions < 5 || numQuestions > 20) {
      toast.error('Number of questions must be between 5 and 20.');
      return;
    }

    setLoading(true);
    toast.warn('Quiz generation has started. Please do not refresh or leave the page.');
    setQuestions([]); // Clear existing questions for a fresh generation
    setQuestions([]);

    // Create a new AbortController for this generation attempt
    abortControllerRef.current = new AbortController();
    

    if (pdfFile) {
      const formData = new FormData();
      formData.append('pdfFile', pdfFile);

      try {
        const uploadResponse = await axios.post('http://localhost:5000/api/generate-from-pdf', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const pdfFilePath = uploadResponse.data.filePath;
        toast.info('PDF uploaded. Starting quiz generation...');

        // Now send the WebSocket message to start generation
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            type: 'generatePdfQuizRequest',
            payload: { pdfFilePath, numQuestions }
          }));
        } else {
          toast.error('WebSocket is not connected. Please refresh the page.');
          setLoading(false);
        }

      } catch (error) {
        
        toast.error(error.response?.data?.message || 'Failed to upload PDF or start generation.');
        setLoading(false);
      } finally {
        setPdfFile(null); // Clear the file input
      }
    } else if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'generateQuizRequest',
                    payload: { topic: generationTopic, numQuestions, difficulty }
      }));
    } else {
      toast.error('WebSocket is not connected. Please refresh the page.');
      setLoading(false);
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      // Send a WebSocket message to the backend to explicitly cancel
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'cancelPdfQuizGeneration',
          payload: { } // Send token for auth if needed
        }));
      }
      setLoading(false);
      toast.info('Quiz generation cancelled.');
    }
  };

  return (
    <div className="quiz-create-card">
      <h2>{id ? 'Edit Quiz' : 'Create Quiz'}</h2>
      
      <div className="generate-quiz-section">
        <h3>Generate Quiz with AI</h3>
        <div className="generate-quiz-controls">
          <div className="generate-quiz-row-first">
            <input
              placeholder="Topic (e.g., Tamil, Cricket)"
              value={generationTopic}
              onChange={(e) => setGenerationTopic(e.target.value)}
            />
            <input
              type="file"
              accept=".pdf"
              onChange={handlePdfFileChange}
              className="pdf-upload-input"
            />
          </div>
          <div className="generate-quiz-row">
            <input
              type="number"
              min="5"
              max="20"
              value={numQuestions}
              onChange={(e) => setNumQuestions(e.target.value)}
              placeholder="Num Qs"
              className="short-input"
            />
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="short-input">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="advanced">Advanced</option>
            </select>
            <button className={`btn generate-button ${loading ? 'loading-animation' : ''}`} onClick={handleGenerateQuiz} disabled={loading}>
              {loading ? (
                'Generating...'
              ) : (
                'Generate Quiz'
              )}
            </button>
            {loading && (
              <button className="btn btn-secondary" onClick={handleCancelGeneration}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <h3>Or Create Manually</h3>
      <div className="manual-quiz-details-row">
        <input
          placeholder="Quiz Title"
          value={title || ''}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          placeholder="Topic (e.g., World War II, React Hooks)"
          value={topic || ''}
          onChange={(e) => setTopic(e.target.value)}
        />
        <input
          placeholder="Categories (comma-separated)"
          value={categories || ''}
          onChange={(e) => setCategories(e.target.value)}
        />
      </div>
      
      <div className={`quiz-questions-wrapper ${questions.length > 1 ? 'two-column-layout' : ''}`} ref={questionsWrapperRef}>
        {questions.map((q, i) => (
          <div key={i} className="quiz-question">
            <div className="question-text-container">
              {expandedQuestions[i] ? (
                <textarea
                  placeholder="Question"
                  value={q.questionText || ''}
                  className="question-textarea expanded"
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[i].questionText = e.target.value;
                    setQuestions(updated);
                  }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onBlur={() => {
                    setExpandedQuestions(prev => ({ ...prev, [i]: false }));
                  }}
                  rows={1}
                  autoFocus
                  onFocus={(e) => { // Ensure it resizes on focus as well
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                />
              ) : (
                <div
                  className="question-text-truncated"
                  onClick={() => {
                    setExpandedQuestions(prev => ({ ...prev, [i]: true }));
                  }}
                >
                  {q.questionText || <span className="placeholder-text">Question</span>}
                </div>
              )}
            </div>
            <div className="options-group">
              {(q.options || []).map((opt, j) => (
                <input
                  key={j}
                  placeholder={`Option ${j + 1}`}
                  value={opt || ''}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[i].options[j] = e.target.value;
                    setQuestions(updated);
                  }}
                  className="option-input"
                />
              ))}
            </div>
            <select
              value={q.correctAnswer || 0}
              onChange={(e) => {
                const updated = [...questions];
                updated[i].correctAnswer = Number(e.target.value);
                setQuestions(updated);
              }}
            >
              <option value="0">Correct: Option 1</option>
              <option value="1">Correct: Option 2</option>
              <option value="2">Correct: Option 3</option>
              <option value="3">Correct: Option 4</option>
            </select>
            {questions.length > 1 && (
              <button className="btn btn-secondary btn-remove-question" onClick={() => handleRemoveQuestion(i)}>
                Remove
              </button>
            )}
            
          </div>
        ))}
        </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={() => setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctAnswer: 0 }])}>
          Add Question
        </button>
        <button className="btn" onClick={handleSubmit}>
          Submit Quiz
        </button>
        <button className="btn btn-secondary" onClick={handleClearForm}>
          Clear Form
        </button>
      </div>

      {showVisibilityModal && (
        <div className="visibility-actions">
          <p>Choose Quiz Visibility:</p>
          <button className="btn" onClick={() => handleFinalSubmit('public')}>Public</button>
          <button className="btn btn-secondary" onClick={() => handleFinalSubmit('private')}>Private</button>
          <button className="btn btn-secondary" onClick={() => setShowVisibilityModal(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}