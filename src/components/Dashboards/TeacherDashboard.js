import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './TeacherDashboard.css';
import { toast } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';
import { showConfirmToast } from '../Single/ConfirmToast';
import { FaArrowUp, FaArrowDown, FaEye, FaTrash, FaCopy, FaPlus } from 'react-icons/fa';

const TeacherDashboard = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef(null);
  const itemRefs = useRef([]);

  const navigate = useNavigate();

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

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      toast.success('Class code copied to clipboard!');
    }, (err) => {
      toast.error('Failed to copy code.');
      console.error('Could not copy text: ', err);
    });
  };

  const fetchClassrooms = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/classrooms/teacher');
      setClassrooms(res.data);
      itemRefs.current = itemRefs.current.slice(0, res.data.length);
    } catch (err) {
      setError('Failed to fetch classrooms. You may not be authorized.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      await axios.post('http://localhost:5000/api/classrooms/create', 
        { name: newClassName } 
      );
      fetchClassrooms();
      setNewClassName('');
      toast.success('Classroom created successfully!');
    } catch (err) {
      toast.error('Failed to create classroom.');
    }
  };

  const handleDeleteClassroom = async (classroomId) => {
    const confirmed = await showConfirmToast('Are you sure you want to delete this classroom? This action cannot be undone.');
    if (confirmed) {
      try {
        await axios.delete(`http://localhost:5000/api/classrooms/${classroomId}`);
        toast.success('Classroom deleted successfully!');
        fetchClassrooms();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete classroom.');
        console.error(err);
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="classroom-dashboard">
      <h2>Teacher Dashboard</h2>
      <div className="dashboard-content">
        <div className="dashboard-column left-column">
          <div className="create-classroom-form">
            <h3>Create New Classroom</h3>
            <form onSubmit={handleCreateClassroom}>
              <input 
                type="text" 
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Enter classroom name"
              />
              <button type="submit" className="btn">Create</button>
            </form>
          </div>
          <div className="create-classroom-form" style={{ marginTop: '3rem' }}>
            <h3>Quiz Management</h3>
            <p>Create new quizzes or manage existing ones.</p>
            <Link to="/quiz/create" className="create-quiz-btn">
              <FaPlus /> Create New Quiz
            </Link>
          </div>
        </div>
        <div className="dashboard-column right-column">
          <div className="classroom-list-container">
            <h3>My Classrooms</h3>
            {classrooms.length === 0 ? (
              <p>No classrooms created yet.</p>
            ) : (
              <div className="classroom-list-wrapper">
                <div className="classroom-grid-scrollable" ref={scrollContainerRef}>
                  {classrooms.map((classroom, index) => (
                    <div 
                      key={classroom._id} 
                      className="classroom-item-summary"
                      ref={el => itemRefs.current[index] = el}
                    >
                      <h4>{classroom.name}</h4>
                      <div className="class-code-wrapper">
                        <p>Class Code: <code>{classroom.classCode}</code></p>
                        <button onClick={() => handleCopyCode(classroom.classCode)} className="copy-code-btn">
                          <FaCopy />
                        </button>
                      </div>
                      <div className="classroom-actions">
                        <button 
                          onClick={() => navigate(`/teacher/classroom/${classroom._id}`)}
                          className="view-details-btn"
                        >
                          <FaEye /> View Details
                        </button>
                        <button 
                          onClick={() => handleDeleteClassroom(classroom._id)}
                          className="delete-classroom-btn"
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;