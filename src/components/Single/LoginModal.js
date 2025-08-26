import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faEyeSlash, faEye, faTimes } from '@fortawesome/free-solid-svg-icons';
import './LoginModal.css';
import Modal from './Modal'; // Import the Modal component

// The Login component is now defined within LoginModal.js
function Login({ setToken, setUserProfile, idPrefix = '', onClose, onSwitchToRegister }) { // Added setUserProfile prop
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    // Client-side validation
    if (!email || !password) {
      toast.error('Email and password are required.');
      return;
    }

    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password }, { withCredentials: true });
      setToken(true); // Signal login success
      setUserProfile(res.data.userProfile); // Set user profile
      localStorage.setItem('role', res.data.role);
      toast.success('Login successful!');
      setTimeout(() => {
        navigate('/profile');
      }, 1000); // Redirect after 1 second
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h2>Login</h2>
      <button className="modal-close-button" onClick={onClose}><FontAwesomeIcon icon={faTimes} /></button>
      <div className="form-group">
        <label htmlFor={idPrefix + 'email'}>Email</label> {/* Modified ID */}
        <div className="input-group">
          <FontAwesomeIcon icon={faEnvelope} />
          <input id={idPrefix + 'email'} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required /> {/* Modified ID */}
        </div>
      </div>
      <div className="form-group">
        <label htmlFor={idPrefix + 'password'}>Password</label> {/* Modified ID */}
        <div className="input-group">
          <FontAwesomeIcon icon={faLock} />
          <input id={idPrefix + 'password'} type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required /> {/* Modified ID */}
          <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="password-toggle" onClick={() => setShowPassword(!showPassword)} />
        </div>
      </div>
      <button className="btn btn-primary btn-block" onClick={handleLogin} disabled={loading}>
        {loading ? <ClipLoader size={20} color={"#fff"} /> : 'Login'}
      </button>
      <div className="auth-switch-link">
        New to website? <span onClick={() => { onClose(); onSwitchToRegister(); }}>Register</span>
      </div>
    </div>
  );
}

// The LoginModal component that wraps the Login form
const LoginModal = ({ isOpen, onClose, setToken, setUserProfile, onSwitchToRegister }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Login setToken={setToken} setUserProfile={setUserProfile} idPrefix="login-" onClose={onClose} onSwitchToRegister={onSwitchToRegister} /> {/* Pass setUserProfile here */}
    </Modal>
  );
};

export default LoginModal;