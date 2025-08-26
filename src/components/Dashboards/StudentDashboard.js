import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './StudentDashboard.css';
import { toast } from 'react-toastify';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

const StudentDashboard = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [classCode, setClassCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef(null);
  const itemRefs = useRef([]);

  // Function to scroll to a specific index
  const scrollToIndex = (index) => {
    if (itemRefs.current[index]) {
      itemRefs.current[index].scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      setActiveIndex(index);
    }
  };

  const handleDotClick = (index) => {
    scrollToIndex(index);
  };

  const handleArrowClick = (direction) => {
    let newIndex = direction === 'up' ? activeIndex - 1 : activeIndex + 1;
    if (newIndex >= 0 && newIndex < classrooms.length) {
      scrollToIndex(newIndex);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/classrooms/student');
      setClassrooms(res.data);
      itemRefs.current = itemRefs.current.slice(0, res.data.length);
    } catch (err) {
      setError('Failed to fetch classrooms.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleJoinClassroom = async (e) => {
    e.preventDefault();
    if (!classCode.trim()) return;
    try {
      await axios.post('http://localhost:5000/api/classrooms/join', 
        { classCode } 
      );
      fetchClassrooms();
      setClassCode('');
      toast.success('Joined classroom successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join classroom.');
    }
  };

  if (loading) return <div className="loading-container">Loading...</div>;

  return (
    <div className="student-dashboard-container">
      <div className="dashboard-header">
        <h2>Student Dashboard</h2>
      </div>

      <div className="join-classroom-section">
        <h3>Join a New Classroom</h3>
        <form onSubmit={handleJoinClassroom} className="join-form">
          <input 
            type="text" 
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            placeholder="Enter Class Code"
            className="class-code-input"
          />
          <button type="submit" className="join-button">Join</button>
        </form>
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="my-classrooms-section">
        <h3>My Classrooms</h3>
        {classrooms.length > 0 ? (
          <div className="classroom-list-wrapper">
            <div className="classrooms-grid-scrollable" ref={scrollContainerRef}>
              {classrooms.map((classroom, index) => (
                <div 
                  key={classroom._id} 
                  className="classroom-card"
                  ref={el => itemRefs.current[index] = el}
                >
                  <div className="classroom-header-card">
                    <h4>{classroom.name}</h4>
                  </div>
                  <p className="teacher-name">Created by: {classroom.teacher.username}</p>
                  <div className="quizzes-list">
                    <h5>Assigned Quizzes</h5>
                    {classroom.quizzes && classroom.quizzes.length > 0 ? (
                      <ul className="quiz-scroll-container">
                        {classroom.quizzes.map(quiz => (
                          <li key={quiz._id}>{quiz.title}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No quizzes assigned yet.</p>
                    )}
                  </div>
                  <Link to={`/classroom/${classroom._id}`} className="view-quizzes-btn">View Classroom</Link>
                </div>
              ))}
            </div>
            {classrooms.length > 1 && (
              <div className="dot-scroller">
                <button onClick={() => handleArrowClick('up')} className="scroll-arrow" disabled={activeIndex === 0}>
                  <FaArrowUp />
                </button>
                <div className="dots-container">
                  {classrooms.map((_, index) => (
                    <div 
                      key={index} 
                      className={`dot ${index === activeIndex ? 'active' : ''}`}
                      onClick={() => handleDotClick(index)}
                    />
                  ))}
                </div>
                <button onClick={() => handleArrowClick('down')} className="scroll-arrow" disabled={activeIndex === classrooms.length - 1}>
                  <FaArrowDown />
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="no-classrooms-message">You are not enrolled in any classrooms yet.</p>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;