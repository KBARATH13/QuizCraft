import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { showConfirmToast } from '../Single/ConfirmToast';
import { useChat } from '../Chat/ChatContext'; // New import
import './ClassroomDetails.css'; 

const ClassroomDetails = ({ userProfile }) => {
  const { classroomId } = useParams();
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizzes, setQuizzes] = useState([]); // All quizzes created by teacher
  const [selectedQuizzesToAssign, setSelectedQuizzesToAssign] = useState([]); // Array for multiple selections
  const [studentEmail, setStudentEmail] = useState('');
  const [studentQuizPerformance, setStudentQuizPerformance] = useState([]);
  const [quizTakingStyle, setQuizTakingStyle] = useState({
    showCorrectAnswer: false,
    numberOfAttempts: 1,
  });

  const { joinChatRoom } = useChat(); // Get joinChatRoom function
  const navigate = useNavigate(); // Get navigate function

  const handleJoinClassroomChat = async () => {
      try {
          const res = await axios.post(`http://localhost:5000/api/chat/classroom/${classroomId}`, {});
          const chatRoomId = res.data._id;
          joinChatRoom(chatRoomId); // Join WebSocket room
          navigate(`/chat/${chatRoomId}`);
      } catch (error) {
          console.error('Failed to join classroom chat:', error);
          toast.error(error.response?.data?.message || 'Failed to join classroom chat.');
      }
  };

  const fetchClassroomDetails = useCallback(async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/classrooms/teacher`);
      const foundClassroom = res.data.find(c => c._id === classroomId);
      if (foundClassroom) {
        setClassroom(foundClassroom);
      } else {
        setError('Classroom not found or you are not authorized to view it.');
      }
    } catch (err) {
      setError('Failed to fetch classroom details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  const fetchTeacherQuizzes = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/quizzes');
      setQuizzes(res.data);
    } catch (err) {
      toast.error('Failed to fetch quizzes.');
      console.error(err);
    }
  }, [userProfile]);

  const fetchStudentQuizPerformance = useCallback(async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/classrooms/${classroomId}/quiz-performance`);
      setStudentQuizPerformance(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch student quiz performance.');
      console.error(err);
    }
  }, [classroomId]);

  useEffect(() => {
    fetchClassroomDetails();
    fetchTeacherQuizzes();
    fetchStudentQuizPerformance();
  }, [fetchClassroomDetails, fetchTeacherQuizzes, fetchStudentQuizPerformance]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!studentEmail.trim()) return;
    try {
      await axios.post(`http://localhost:5000/api/classrooms/${classroomId}/add-student`, 
        { studentEmail } 
      );
      toast.success('Student added successfully!');
      setStudentEmail('');
      fetchClassroomDetails(); // Refresh details
      fetchStudentQuizPerformance(); // Refresh performance data
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add student.');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      await axios.delete(`http://localhost:5000/api/classrooms/${classroomId}/remove-student/${studentId}`);
      toast.success('Student removed.');
      fetchClassroomDetails(); // Refresh details
      fetchStudentQuizPerformance(); // Refresh performance data
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove student.');
    }
  };

  const handleAssignQuiz = async (e) => {
    e.preventDefault();
    if (selectedQuizzesToAssign.length === 0) { // Check if array is empty
      toast.error('Please select at least one quiz to assign.');
      return;
    }
    const confirmed = await showConfirmToast('Are you sure you want to assign this quiz to the classroom?');
    if(confirmed){
      try {
        await axios.post(`http://localhost:5000/api/classrooms/${classroomId}/assign-quiz`, 
          { quizIds: selectedQuizzesToAssign, quizTakingStyle } // Send array of quiz IDs and the quiz taking style
        );
        toast.success('Quiz(es) assigned successfully!');
        setSelectedQuizzesToAssign([]); // Clear selection
        fetchClassroomDetails(); // Refresh details
        fetchStudentQuizPerformance(); // Refresh performance data
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to assign quiz(es).');
        console.error(err);
      }
    }
  };

  const handleUnassignQuiz = async (quizId) => {
    const confirmed = await showConfirmToast('Are you sure you want to unassign this quiz from the classroom?');
    if (confirmed) {
      try {
        await axios.post(`http://localhost:5000/api/classrooms/${classroomId}/unassign-quiz`, 
          { quizId } 
        );
        toast.success('Quiz unassigned successfully!');
        fetchClassroomDetails(); // Refresh details
        fetchStudentQuizPerformance(); // Refresh performance data
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to unassign quiz.');
        console.error(err);
      }
    }
  };

  const handleQuizSelectionChange = (e) => {
    const options = e.target.options;
    const value = [];
    for (let i = 0, l = options.length; i < l; i++) {
      if (options[i].selected) {
        value.push(options[i].value);
      }
    }
    setSelectedQuizzesToAssign(value);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!classroom) return <div className="error">Classroom data not available.</div>;

  const availableQuizzes = quizzes.filter(q => !classroom.quizzes.some(assignedQ => assignedQ._id === q._id));

  return (
    <div className="classroom-dashboard">
      <h2>Classroom: {classroom.name}</h2>
      <p>Class Code: <code>{classroom.classCode}</code></p>
      <button onClick={handleJoinClassroomChat} className="btn btn-classroom-chat">Join Classroom Chat</button> {/* New Chat button */}

      {/* Assigned Quizzes Section (Row 1) */}
      <div className="assigned-quizzes-section-full-width"> {/* This will be the flex container */}
        <div className="create-classroom-form assigned-quizzes-content-wrapper"> {/* This will be flex: 1 */}
          <h3>Assigned Quizzes</h3>
          {classroom.quizzes && classroom.quizzes.length > 0 ? (
            <div className="assigned-quizzes-grid"> 
              {classroom.quizzes.map(quiz => (
                <div key={quiz.quiz._id} className="assigned-quiz-card"> 
                  <h4>{quiz.quiz.title}</h4>
                  <p>Topic: {quiz.quiz.topic}</p>
                  <button onClick={() => handleUnassignQuiz(quiz.quiz._id)} className="remove-student-btn">Unassign</button>
                </div>
              ))}
            </div>
          ) : (
            <p>No quizzes assigned to this classroom.</p>
          )}
          <div className="assign-quiz-form">
            <h4>Select Quizzes to Assign:</h4>
            <select
              multiple
              value={selectedQuizzesToAssign}
              onChange={handleQuizSelectionChange}
              className="multi-select-dropdown" // Add a class for styling
            >
              {availableQuizzes.length > 0 ? (
                availableQuizzes.map(quiz => (
                  <option key={quiz._id} value={quiz._id}>
                    {quiz.title} ({quiz.topic})
                  </option>
                ))
              ) : (
                <option value="" disabled>No new quizzes available to assign.</option>
              )}
            </select>
            <div className="quiz-taking-style-options">
              <h4>Quiz Taking Style</h4>
              <div>
                <input
                  type="checkbox"
                  id="showCorrectAnswer"
                  checked={quizTakingStyle.showCorrectAnswer}
                  onChange={(e) => setQuizTakingStyle({ ...quizTakingStyle, showCorrectAnswer: e.target.checked })}
                />
                <label htmlFor="showCorrectAnswer">Show Correct Answer</label>
              </div>
              <div>
                <label htmlFor="numberOfAttempts">Number of Attempts:</label>
                <select
                  id="numberOfAttempts"
                  value={quizTakingStyle.numberOfAttempts}
                  onChange={(e) => setQuizTakingStyle({ ...quizTakingStyle, numberOfAttempts: parseInt(e.target.value) })}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
            </div>
            <button onClick={handleAssignQuiz} disabled={selectedQuizzesToAssign.length === 0}>Assign Selected Quizzes</button>
          </div>
        </div>
        <div className="empty-column"></div> {/* Empty div to create the second column space */}
      </div>

      <div className="details-two-column-layout">
        {/* Enrolled Students Section (Column 1) */}
        <div className="create-classroom-form details-column">
          <h3>Enrolled Students</h3>
          <ul>
            {classroom.students.map(student => (
              <li key={student._id}>
                <img 
                  src={student.profilePicture ? `http://localhost:5000/${student.profilePicture}` : '/defaultSilh.jpg'} 
                  alt={`${student.username}'s profile`} 
                  className="student-profile-pic"
                />
                <span>{student.username} ({student.email})</span>
                <button onClick={() => handleRemoveStudent(student._id)} className="remove-student-btn">Remove</button>
              </li>
            ))}
          </ul>
          <div className="add-student-form">
            <input 
              type="email" 
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="Enter student email"
            />
            <button onClick={handleAddStudent}>Add Student</button>
          </div>
        </div>

        {/* Student Quiz Performance (Column 2) */}
        <div className="create-classroom-form details-column">
          <h3>Student Quiz Performance</h3>
          {studentQuizPerformance.length > 0 ? (
            <div className="performance-table">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    {classroom.quizzes.map(quiz => (
                      <th key={quiz._id}>{quiz.title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {studentQuizPerformance.map(studentPerf => (
                    <tr key={studentPerf.studentId}>
                      <td>{studentPerf.username}</td>
                      {classroom.quizzes.map(quiz => {
                        const performance = studentPerf.quizzes.find(q => q.quizId === quiz._id);
                        return (
                          <td key={quiz._id}>
                            {performance ? `${performance.score} / ${performance.totalQuestions}` : 'N/A'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No quiz performance data available for this classroom.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassroomDetails;