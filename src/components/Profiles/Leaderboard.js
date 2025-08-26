import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserFriends } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import './Leaderboard.css';

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [activeSection, setActiveSection] = useState('social'); // 'social' or 'classrooms'
  const [activeSocialTab, setActiveSocialTab] = useState('global'); // 'global', 'national', 'subdivision1', 'subdivision2'
  const [activeClassroom, setActiveClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  const fetchUserAndClassrooms = useCallback(async () => {
    try {
      // Fetch user profile to get role and location
      const profileRes = await axios.get('http://localhost:5000/api/profile');
      setUser(profileRes.data);

      // Fetch classrooms based on role
      const endpoint = profileRes.data.role === 'teacher' ? '/api/classrooms/teacher' : '/api/classrooms/student';
      const classroomsRes = await axios.get(`http://localhost:5000${endpoint}`);
      setClassrooms(classroomsRes.data);
      // Set the first classroom as active by default if available
      if (classroomsRes.data.length > 0) {
        setActiveClassroom(classroomsRes.data[0]._id);
      }
    } catch (err) {
      setError('Failed to fetch initial data.');
      
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    let url = 'http://localhost:5000/api/leaderboard';

    if (activeSection === 'social') {
      if (activeSocialTab === 'global') {
        url += '';
      } else if (activeSocialTab === 'national' && user?.location?.country) {
        url += `?country=${user.location.country}`;
      } else if (activeSocialTab === 'subdivision1' && user?.location?.country && user?.location?.subdivision1) {
        url += `?country=${user.location.country}&subdivision1=${user.location.subdivision1}`;
      } else {
        setLeaderboardData([]);
        setLoading(false);
        return;
      }
    } else if (activeSection === 'classrooms' && activeClassroom) {
      url = `http://localhost:5000/api/leaderboard/classroom/${activeClassroom}`;
    } else {
      setLeaderboardData([]);
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(url);
      
      setLeaderboardData(res.data);
    } catch (err) {
      setError('Failed to fetch leaderboard data.');
      
    } finally {
      setLoading(false);
    }
  }, [activeSection, activeSocialTab, activeClassroom, user]);

  useEffect(() => {
    fetchUserAndClassrooms();
  }, [fetchUserAndClassrooms]);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeSection, activeSocialTab, activeClassroom, fetchLeaderboard]);

  useEffect(() => {
    if (activeSection === 'classrooms' && classrooms.length > 0 && !activeClassroom) {
      setActiveClassroom(classrooms[0]._id);
    }
  }, [activeSection, classrooms, activeClassroom]);

  if (error) return <div className="leaderboard-container error">{error}</div>;

  if (!user || !user.location || !user.location.country) {
    return (
      <div className="leaderboard-container">
        <h2>Leaderboard</h2>
        <div className="leaderboard-message">
          <p>Please update your location in your <Link to="/profile">Profile</Link> to view the social leaderboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <h2>Leaderboard</h2>
      <div className="leaderboard-sections">
        <button onClick={() => setActiveSection('social')} className={activeSection === 'social' ? 'active' : ''}>Social</button>
        <button onClick={() => setActiveSection('classrooms')} className={activeSection === 'classrooms' ? 'active' : ''}>Classrooms</button>
      </div>

      {activeSection === 'social' && (
        <div className="leaderboard-tabs social-tabs">
          <button onClick={() => setActiveSocialTab('global')} className={activeSocialTab === 'global' ? 'active' : ''}>Global</button>
          {user && user.location && user.location.country && (
            <button onClick={() => setActiveSocialTab('national')} className={activeSocialTab === 'national' ? 'active' : ''}>{user.location.country}</button>
          )}
          {user && user.location && user.location.subdivision1 && (
            <button onClick={() => setActiveSocialTab('subdivision1')} className={activeSocialTab === 'subdivision1' ? 'active' : ''}>{user.location.subdivision1}</button>
          )}
        </div>
      )}

      {activeSection === 'classrooms' && (
        <div className="leaderboard-tabs classroom-tabs">
          {classrooms.length > 0 ? (
            classrooms.map(classroom => (
              <button key={classroom._id} onClick={() => setActiveClassroom(classroom._id)} className={activeClassroom === classroom._id ? 'active' : ''}>
                {classroom.name}
              </button>
            ))
          ) : (
            <p className="no-classrooms-message">You are not assigned to any classrooms.</p>
          )}
        </div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <ol className="leaderboard-list">
          {leaderboardData.map((leaderboardUser, index) => (
            <li key={leaderboardUser._id} className={`leaderboard-item ${index < 3 ? 'top-three' : ''}`}>
              <span className="leaderboard-rank">#{index + 1}</span>
              <img src={leaderboardUser.profilePicture ? `http://localhost:5000/${leaderboardUser.profilePicture}` : '/defaultSilh.jpg'} alt="profile" className="leaderboard-profile-picture" />
              <span className="leaderboard-username">{leaderboardUser.username} {leaderboardUser.isFriend && <FontAwesomeIcon icon={faUserFriends} />}</span>
              <span className="leaderboard-points">Points: {leaderboardUser.points}</span>
              <span className="leaderboard-level">Level: {leaderboardUser.level}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default Leaderboard;