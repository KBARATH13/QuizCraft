import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { showConfirmToast } from '../Single/ConfirmToast'; // Corrected import
import { ClipLoader } from 'react-spinners';
import './QuizTake.css';

export default function QuizTake() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { classroomId } = location.state || {};
  
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(true); // Set initial loading state to true
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [timer, setTimer] = useState(20);
  const [totalTime, setTotalTime] = useState(0);
  const [quizTakingStyle, setQuizTakingStyle] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);

  const handleNext = useCallback(() => {
    if (quiz && currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setTimer(20);
      setShowCorrect(false);
      if (quizTakingStyle) {
        setAttempts(quizTakingStyle.numberOfAttempts);
      }
    }
  }, [quiz, currentQuestion, quizTakingStyle]);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prevTimer) => prevTimer - 1);
    }, 1000);

    if (timer === 0) {
      handleNext();
    }

    return () => clearInterval(interval);
  }, [timer, handleNext]);

  // Save progress to sessionStorage
  useEffect(() => {
    if (quiz) { // Only save if quiz is loaded
      const progress = JSON.stringify({ currentQuestion, answers, totalTime });
      sessionStorage.setItem(`quiz-progress-${id}`, progress);
    }
  }, [currentQuestion, answers, id, quiz, totalTime]);

  // Stop speech when currentQuestion changes
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      setIsSpeaking(false);
    }
  }, [currentQuestion]);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      const synth = window.speechSynthesis;
      if (synth.speaking) {
        synth.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/quizzes/${id}`);
        setQuiz(res.data);

        // Initialize answers array based on current quiz length
        const initialAnswers = Array(res.data.questions.length).fill(null);

        // Load saved progress from sessionStorage
        const savedProgress = sessionStorage.getItem(`quiz-progress-${id}`);
        if (savedProgress) {
          const { currentQuestion: savedCurrentQuestion, answers: savedAnswers, totalTime: savedTotalTime } = JSON.parse(savedProgress);
          // Merge saved answers into the new array, ensuring correct length
          savedAnswers.forEach((ans, index) => {
            if (index < initialAnswers.length) {
              initialAnswers[index] = ans;
            }
          });
          setCurrentQuestion(savedCurrentQuestion);
          setTotalTime(savedTotalTime || 0);
        }
        setAnswers(initialAnswers);
        sessionStorage.setItem('activeQuizId', id); // Save active quiz ID
      } catch (err) {
        console.error("Error fetching quiz:", err);
        toast.error("Failed to load quiz. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const fetchQuizTakingStyle = async () => {
      if (classroomId) {
        try {
          const res = await axios.get(`http://localhost:5000/api/classrooms/${classroomId}/quiz/${id}/style`);
          setQuizTakingStyle(res.data);
          setAttempts(res.data.numberOfAttempts);
        } catch (err) {
          console.error('Error fetching quiz taking style:', err);
        }
      }
    };

    fetchQuiz();
    fetchQuizTakingStyle();
  }, [id, classroomId]);

  const handleAnswer = (optionIndex) => {
    if (quizTakingStyle && attempts <= 0) return;

    const updated = [...answers];
    updated[currentQuestion] = optionIndex;
    setAnswers(updated);
    const timeSpent = 20 - timer;
    setTotalTime((prevTotalTime) => prevTotalTime + timeSpent);

    if (quizTakingStyle) {
      setAttempts(attempts - 1);
      if (quizTakingStyle.showCorrectAnswer) {
        setShowCorrect(true);
      }
    }
  };

  
    const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setTimer(20);
      setShowCorrect(false);
      if (quizTakingStyle) {
        setAttempts(quizTakingStyle.numberOfAttempts);
      }
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`http://localhost:5000/api/quizzes/${id}/submit`, { answers, timeTaken: totalTime });
      const { score, total, results } = response.data;
      toast.success('Quiz submitted successfully!');
      sessionStorage.removeItem(`quiz-progress-${id}`); // Clear progress on successful submission
      sessionStorage.removeItem('activeQuizId'); // Clear active quiz ID
      navigate(`/quiz/${id}/result`, { state: { score, total, results, timeTaken: totalTime, from: location.state?.from } });
    } catch (err) {
      console.error('Error submitting quiz:', err);
      toast.error('Failed to submit quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReadAloud = () => {
    if (!q) return;

    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    let textToSpeak = `Question: ${q.questionText}. `;
    q.options.forEach((opt, index) => {
      textToSpeak += `Option ${index + 1}: ${opt}. `;
    });

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = (event) => {
      console.error('SpeechSynthesisUtterance.onerror', event);
      setIsSpeaking(false);
    };
    synth.speak(utterance);
  };

  const handleCancel = async () => {
    const confirmed = await showConfirmToast("Are you sure you want to cancel this quiz? Your progress will be lost.");
    
    if (confirmed) {
      sessionStorage.removeItem(`quiz-progress-${id}`); // Clear progress on cancel
      sessionStorage.removeItem('activeQuizId'); // Clear active quiz ID
      navigate('/quizzes'); // Navigate back to quiz list
    }
  };

  if (loading || !quiz) return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
      <ClipLoader size={50} color={"#7E5C4A"} />
    </div>
  );

  const q = quiz.questions[currentQuestion];

  return (
    <div className="quiz-take-container">
      <h2>{quiz.title}</h2>
      <div className="quiz-timer">Time Left: {timer}s</div>
      <div className="quiz-progress-container">
        <div className="quiz-progress-bar" style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}></div>
      </div>
      {quizTakingStyle && <div className="attempts-left">Attempts Left: {attempts}</div>}
      <div className="quiz-question">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h4>{currentQuestion + 1}. {q.questionText}</h4>
          <button onClick={handleReadAloud} className="btn btn-sm btn-outline-secondary ml-2" style={{ marginLeft: '10px' }} disabled={loading}>
            {isSpeaking ? 'Stop' : 'Read'}
          </button>
        </div>
        <div className="quiz-options">
          <ul>
            {q.options.map((opt, j) => (
              <li key={j}>
                <button
                  className={`btn ${
                    answers[currentQuestion] === j ? 'selected' : ''
                  } ${
                    showCorrect && j === q.correctAnswer ? 'correct' : ''
                  }`}
                  onClick={() => handleAnswer(j)}
                  disabled={quizTakingStyle && attempts <= 0}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="quiz-navigation">
        <button className="btn btn-secondary" onClick={handleCancel} disabled={loading}>Cancel</button>
        {currentQuestion > 0 && (
          <button className="btn btn-secondary" onClick={handlePrevious} disabled={loading}>
            Previous
          </button>
        )}
        {currentQuestion < quiz.questions.length - 1 ? (
          <button className="btn" onClick={handleNext} disabled={loading}>Next</button>
        ) : (
          <button className="btn" onClick={handleSubmit} disabled={loading}>Submit Quiz</button>
        )}
      </div>
    </div>
  );
}