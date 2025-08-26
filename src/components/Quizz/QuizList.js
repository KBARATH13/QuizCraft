import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode'; // Import jwtDecode as a named export
import { ClipLoader } from 'react-spinners';
import { showConfirmToast } from '../Single/ConfirmToast'; // Corrected import
import './QuizList.css';

export default function QuizList({ userProfile }) {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const activeQuizId = sessionStorage.getItem('activeQuizId');
    if (activeQuizId) {
      navigate(`/quiz/take/${activeQuizId}`);
      toast.info('Resuming your last quiz.');
    }
  }, [navigate]);

  // Debounce searchTerm
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000); // 2 seconds debounce time

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  useEffect(() => {
    if (userProfile && userProfile._id) {
      setCurrentUserId(userProfile._id);
    }

    const fetchAllCategories = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/all-categories');
        setAvailableCategories(res.data);
        
      } catch (err) {
        console.error('Failed to fetch all categories:', err);
        if (err.response) {
          toast.error('Failed to load categories.');
        }
      }
    };
    fetchAllCategories();

    const fetchQuizzes = async () => {
      setLoading(true); // Set loading to true before fetching
      try {
        const res = await axios.get(`http://localhost:5000/api/quizzes?search=${debouncedSearchTerm}&category=${selectedCategory}`);
        setQuizzes(res.data);

      } catch (err) {
        console.error(err);
        if (err.response) {
          // Only show toast for actual API errors
          toast.error('Failed to fetch quizzes.');
        }
      } finally {
        setLoading(false); // Set loading to false after fetching (success or error)
      }
    };
    fetchQuizzes();
  }, [userProfile, debouncedSearchTerm, selectedCategory]); // Re-fetch quizzes when debouncedSearchTerm or selectedCategory changes

  const handleDeleteQuiz = async (quizId) => {
    const confirmed = await showConfirmToast("Are you sure you want to delete this quiz? This action cannot be undone.");
    
    if (confirmed) {
      try {
        await axios.delete(`http://localhost:5000/api/quizzes/${quizId}`);
        toast.success('Quiz deleted successfully!');
        setQuizzes(quizzes.filter(quiz => quiz._id !== quizId));
      } catch (err) {
        console.error('Error deleting quiz:', err);
        toast.error(err.response?.data?.message || 'Failed to delete quiz.');
      }
    }
  };

  return (
    <div className="quiz-list-card">
      <div className="quiz-list-container">
        <h2>Available Quizzes</h2>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
            <ClipLoader size={50} color={"#7E5C4A"} />
          </div>
        ) : (
          <>
            <div className="quiz-filters">
              <input
                type="text"
                placeholder="Search quizzes by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-select"
              >
                <option value="">All Categories</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <ul>
              {quizzes.map((quiz) => (
                <li key={quiz._id} className="quiz-list-item">
                  <div className="quiz-title-section">
                    {quiz.title}
                    <span className="quiz-question-count">
                      {quiz.questions ? `${quiz.questions.length} Questions` : '0 Questions'}
                    </span>
                    {quiz.visibility === 'private' && <span className="quiz-visibility-tag">(Private)</span>}
                  </div>
                  <div className="quiz-actions">
                    <Link to={`/quiz/take/${quiz._id}`} state={{ from: 'quizzes' }} className="btn">Start Quiz</Link>
                    
                    {currentUserId === quiz.createdBy.toString() && (
                      <Link to={`/quiz/edit/${quiz._id}`} className="btn btn-secondary">Edit</Link>
                    )}
                    {currentUserId === quiz.createdBy.toString() && (
                      <button onClick={() => handleDeleteQuiz(quiz._id)} className="btn btn-secondary">Delete</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
