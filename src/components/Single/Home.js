import React, { useState, useEffect } from 'react';
 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe, faEdit, faChartLine, faUserFriends } from '@fortawesome/free-solid-svg-icons';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import './Home.css';

export default function Home({ isLoggedIn, setIsLoggedIn, setUserProfile }) { // setIsLoggedIn and setUserProfile props are needed for LoginModal
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const openLoginModal = () => {
    
    setIsLoginModalOpen(true);
    setIsRegisterModalOpen(false); // Close register modal if open
  };

  const closeLoginModal = () => {
    
    setIsLoginModalOpen(false);
  };

  const openRegisterModal = () => {
    
    setIsRegisterModalOpen(true);
    setIsLoginModalOpen(false); // Close login modal if open
  };

  const closeRegisterModal = () => {
    
    setIsRegisterModalOpen(false);
  };

  return (
    <>
      <div className="hero-section">
        <h2>Welcome to the QuizCraft!</h2>
        <p>Test your knowledge, create quizzes, and challenge your friends!</p>

        {isLoggedIn ? null : (
          <div className="call-to-action-section">
            <h3>Ready to get started?</h3>
            <p>
              Want to take part in the quiz? 
              <button onClick={openLoginModal} className="auth-link-home">Login</button>
              or
              <button onClick={openRegisterModal} className="auth-link-home">Register</button>
            </p>
          </div>
        )}
      </div>
      {/* AboutUs Content */}
      <div className="about-us-section">
        <h2 className="about-us-title">About Our Quiz Platform</h2>
        
        <div className="about-us-card intro-card">
          <p>
            Welcome to our interactive quiz platform! We provide a fun and engaging way to test your knowledge on a variety of subjects. 
            Whether you're a student looking to revise, a teacher creating assessments, or just someone who loves a good challenge, 
            our platform is designed for you.
          </p>
        </div>

        <div className="about-us-card mission-card">
          <h3>Our Mission</h3>
          <p>
            Our mission is to make learning enjoyable and accessible. You can explore existing quizzes, 
            create your own custom quizzes, and track your progress. Join our community today and start your learning journey!
          </p>
        </div>

        <div className="about-us-card features-card">
          <h3>Key Features</h3>
          <ul className="features-list">
            <li><FontAwesomeIcon icon={faGlobe} /> Wide range of quiz categories</li>
            <li><FontAwesomeIcon icon={faEdit} /> Create and share your own quizzes</li>
            <li><FontAwesomeIcon icon={faChartLine} /> Track your scores and progress</li>
            <li><FontAwesomeIcon icon={faUserFriends} /> User-friendly interface</li>
          </ul>
        </div>
      </div>

      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} setToken={setIsLoggedIn} setUserProfile={setUserProfile} onSwitchToRegister={openRegisterModal} />
      <RegisterModal isOpen={isRegisterModalOpen} onClose={closeRegisterModal} onSwitchToLogin={openLoginModal} />
    </>
  );
}