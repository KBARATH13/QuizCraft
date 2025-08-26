import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ClassroomDashboard.css';

const ClassroomDashboard = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClassrooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/classrooms/teacher', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClassrooms(res.data);
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
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/classrooms/create', 
        { name: newClassName }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClassrooms([...classrooms, res.data]);
      setNewClassName('');
    } catch (err) {
      setError('Failed to create classroom.');
      console.error(err);
    }
  };

  const handleAddStudent = async (classroomId) => {
    if (!studentEmail.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`http://localhost:5000/api/classrooms/${classroomId}/add-student`, 
        { studentEmail }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedClassrooms = classrooms.map(c => c._id === classroomId ? res.data : c);
      setClassrooms(updatedClassrooms);
      setStudentEmail('');
    } catch (err) {
      setError('Failed to add student. Please check the email and try again.');
      console.error(err);
    }
  };

  const handleRemoveStudent = async (classroomId, studentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/classrooms/${classroomId}/remove-student/${studentId}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      fetchClassrooms(); // Refetch to update the student list
    } catch (err) {
      setError('Failed to remove student.');
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="classroom-dashboard">
      <h2>Teacher Dashboard</h2>
      <div className="create-classroom-form">
        <h3>Create New Classroom</h3>
        <form onSubmit={handleCreateClassroom}>
          <input 
            type="text" 
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="Enter classroom name"
          />
          <button type="submit">Create</button>
        </form>
      </div>
      <div className="classroom-list">
        <h3>My Classrooms</h3>
        {classrooms.length === 0 ? (
          <p>You have not created any classrooms yet.</p>
        ) : (
          classrooms.map(classroom => (
            <div key={classroom._id} className="classroom-item">
              <h4>{classroom.name}</h4>
              <p>Class Code: <code>{classroom.classCode}</code></p>
              <div className="student-management">
                <h5>Students</h5>
                <ul>
                  {classroom.students.map(student => (
                    <li key={student._id}>
                      {student.username} ({student.email})
                      <button onClick={() => handleRemoveStudent(classroom._id, student._id)} className="remove-student-btn">Remove</button>
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
                  <button onClick={() => handleAddStudent(classroom._id)}>Add Student</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClassroomDashboard;