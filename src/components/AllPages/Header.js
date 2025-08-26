import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthButtons from './AuthButtons';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightFromBracket, faUsers } from '@fortawesome/free-solid-svg-icons';
import './Header.css';
import axios from 'axios';

const Header = ({ isLoggedIn, setIsLoggedIn, userProfile, isDarkMode, setIsDarkMode, friendRequestCount }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogoClick = (event) => {
    event.preventDefault(); // Prevent default navigation
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      toast.info("Switched to Dark Mode!");
    } else {
      toast.info("Switched to Light Mode!");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/api/auth/logout');
    } catch (error) {
      console.error('Logout failed', error);
    }
    localStorage.removeItem('role');
    setIsLoggedIn(false); // Update the login state in App.js
    navigate('/login');
  };

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <header className="app-header">
      <div className="container header-container">
        <div className="logo-auth-container">
          <Link to="/home" className="logo" onClick={handleLogoClick}>QuizCraft </Link>
          {isLoggedIn && (
            <Link to="/friends" className="btn btn-friends">
                  <FontAwesomeIcon icon={faUsers} />
                  {friendRequestCount > 0 && <span className="notification-badge"></span>}
            </Link>
          )}
          {isAuthPage ? (
            location.pathname === '/login' ? (
              <Link to="/register" className="auth-link">Register</Link>
            ) : (
              <Link to="/login" className="auth-link">Login</Link>
            )
          ) : (
            null
          )}
        </div>
        {!isAuthPage && isLoggedIn && (
          <ul className="nav-list">
            <li className="nav-item"><Link to="/home">Home</Link></li>
            <li className="nav-item"><Link to="/quizzes">Quizzes</Link></li>
            {userProfile && userProfile.role === 'teacher' && (
              <li className="nav-item"><Link to="/teacher/dashboard">Teacher Dashboard</Link></li>
            )}
            {userProfile && userProfile.role === 'student' && (
              <li className="nav-item"><Link to="student/dashboard">Student Dashboard</Link></li>
            )}
            <li className="nav-item"><Link to="/quiz/create">Create Quiz</Link></li>
          </ul>
        )}
        {!isAuthPage && isLoggedIn && (
          <div className="header-action-buttons">
            <AuthButtons isLoggedIn={isLoggedIn} userProfile={userProfile} />
            <button onClick={handleLogout} className="btn btn-logout"><FontAwesomeIcon icon={faRightFromBracket} /> Logout</button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
