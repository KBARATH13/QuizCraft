import React, { useEffect, useState } from 'react';
import { useLocation, Link, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import './QuizResult.css';

export default function QuizResult() {
  const { state } = useLocation();
  const { score, total, results, timeTaken, from } = state || {};
  const [weakAreas, setWeakAreas] = useState([]);
  const { userProfile } = useOutletContext() || {};


  useEffect(() => {
    if (!results) {
      toast.info("No results found. Please take a quiz first.");
    }

    const fetchWeakAreas = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return; // Don't fetch if not logged in

        const res = await axios.get('http://localhost:5000/api/profile/weak-areas', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setWeakAreas(res.data);
      } catch (err) {
        console.error('Failed to fetch weak areas:', err);
        toast.error('Failed to load weak areas.');
      }
    };

    fetchWeakAreas();
  }, [results]);

  if (!results) {
    return (
      <div className="container quiz-result">
        <h2>Quiz Results</h2>
        <p>Redirecting to quiz list...</p>
        <Link to="/quizzes" className="btn">Back to Quiz List</Link>
      </div>
    );
  }

  return (
    <div className="quiz-result-container">
      <h2>Quiz Completed!</h2>
      <p className="quiz-result-summary">
        Your Score: <span className="score-correct">{score}</span> / <span className="score-total">{total}</span>
      </p>
      <p className="quiz-result-summary">
        Time Taken: <span className="score-total">{timeTaken}</span> seconds
      </p>

      {weakAreas.length > 0 && (
        <div className="weak-areas-section">
          <h3>Your Top Weak Areas:</h3>
          <ul>
            {weakAreas.map((area, index) => (
              <li key={index}>
                {area.topic} &ndash; {area.accuracy.toFixed(0)}% Accuracy ({area.totalQuestions} questions)
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="quiz-results-details">
        {results.map((result, index) => (
          <div key={index} className={`quiz-question-result ${result.isCorrect ? 'correct' : 'incorrect'}`}>
            <h4>{index + 1}. {result.questionText}</h4>
            <ul>
              {result.options.map((option, optIndex) => (
                <li key={optIndex} className={
                  optIndex === result.correctAnswer ? 'correct-answer' :
                  (optIndex === result.userAnswer && !result.isCorrect ? 'user-wrong-answer' : 
                  (optIndex === result.userAnswer && result.isCorrect ? 'user-correct-answer' : ''))
                }>
                  {option}
                  {optIndex === result.correctAnswer && <span className="answer-indicator">(Correct Answer)</span>}
                  {optIndex === result.userAnswer && !result.isCorrect && <span className="answer-indicator">(Your Answer)</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="navigation-buttons">
        {from === 'classroom' ? (
          <Link to="/student/dashboard" className="btn">Back to Dashboard</Link>
        ) : (
          <Link to="/quizzes" className="btn">Back to Quizzes</Link>
        )}
      </div>
    </div>
  );
}
