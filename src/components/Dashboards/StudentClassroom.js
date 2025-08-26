import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useChat } from '../Chat/ChatContext'; // New import
import './StudentClassroom.css';

const StudentClassroom = () => {
  const { classroomId } = useParams();
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { joinChatRoom, openChat } = useChat(); // Get joinChatRoom function

  const handleJoinClassroomChat = async () => {
      try {
          const token = localStorage.getItem('token');
          const res = await axios.post(`http://localhost:5000/api/chat/classroom/${classroomId}`, {}, {
              headers: { Authorization: `Bearer ${token}` },
          });
          const chatRoomId = res.data._id;
          joinChatRoom(chatRoomId); // Join WebSocket room
          openChat(chatRoomId); // Open chat slider
      } catch (error) {
          console.error('Failed to join classroom chat:', error);
          // Display error to user
          // toast.error(error.response?.data?.message || 'Failed to join classroom chat.');
      }
  };

  const fetchClassroomDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      // This endpoint should fetch details for a specific classroom for a student
      const res = await axios.get(`http://localhost:5000/api/classrooms/${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClassroom(res.data);
    } catch (err) {
      setError('Failed to fetch classroom details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    fetchClassroomDetails();
  }, [fetchClassroomDetails]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!classroom) return <div className="error">Classroom data not available.</div>;

  return (
    <div className="student-classroom-container">
      <div className="student-classroom-header">
        <h2>{classroom.name}</h2>
        <p>Taught by: {classroom.teacher.username}</p>
        <button onClick={handleJoinClassroomChat} className="btn btn-classroom-chat">Join Classroom Chat</button> {/* New Chat button */}
      </div>

      <div className="assigned-quizzes-section">
        <h3>Assigned Quizzes</h3>
        {classroom.quizzes && classroom.quizzes.length > 0 ? (
          <div className="quiz-list-student">
            {classroom.quizzes.map(({ quiz }) => {
              if (!quiz) return null; // Don't render if quiz is null
              return (
                <div key={quiz._id} className="quiz-card-student">
                  <h4>{quiz.title}</h4>
                  <p>Topic: {quiz.topic}</p>
                  <p>{quiz.questions ? quiz.questions.length : 0} Questions</p>
                  <Link to={`/quiz/take/${quiz._id}`} state={{ from: 'classroom', classroomId: classroomId }} className="take-quiz-btn">
                  Take Quiz
                </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <p>No quizzes have been assigned to this classroom yet.</p>
        )}
      </div>
       <div className="back-to-dashboard-container">
        <Link to="/student/dashboard" className="back-to-dashboard-btn">
          &larr; Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default StudentClassroom;