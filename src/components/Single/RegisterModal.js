import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faLock, faEyeSlash, faEye, faUserTag, faCamera, faTimes } from '@fortawesome/free-solid-svg-icons';
import './RegisterModal.css'; // Assuming RegisterModal.css has general auth styles
import Modal from './Modal'; // Import the Modal component

// The Register component is now defined within RegisterModal.js
function Register({ idPrefix = '', onClose, onSwitchToLogin }) { // Added idPrefix prop, onClose, and onSwitchToLogin
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('student');
  const [profilePicture, setProfilePicture] = useState(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const registerUser = async () => {
    // Client-side validation
    if (!email || !password || !username) {
      toast.error('All fields are required.');
      return;
    }

    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('role', role);
    if (profilePicture) {
      formData.append('profilePicture', profilePicture);
    }

    try {
      await axios.post('http://localhost:5000/api/auth/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Registration successful!');
      setTimeout(() => {
        onClose();
        onSwitchToLogin();
      }, 1000); // Redirect after 1 second
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

   return (
    <div className="auth-form">
      <h2>Register</h2>
      <button className="modal-close-button" onClick={onClose}><FontAwesomeIcon icon={faTimes} /></button>
      <div className="form-group">
        <label htmlFor={idPrefix + 'username'}>Username</label> {/* Modified ID */}
        <div className="input-group">
          <FontAwesomeIcon icon={faUser} />
          <input id={idPrefix + 'username'} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required /> {/* Modified ID */}
        </div>
      </div>
      <div className="form-group">
        <label htmlFor={idPrefix + 'email'}>Email</label> {/* Modified ID */}
        <div className="input-group">
          <FontAwesomeIcon icon={faEnvelope} />
          <input id={idPrefix + 'email'} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /> {/* Modified ID */}
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
      <div className="form-group">
        <label htmlFor={idPrefix + 'role'}>Role</label> {/* Modified ID */}
        <div className="input-group">
          <FontAwesomeIcon icon={faUserTag} />
          <select id={idPrefix + 'role'} value={role} onChange={(e) => setRole(e.target.value)}> {/* Modified ID */}
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor={idPrefix + 'profile-picture'}>Profile Picture</label> {/* Modified ID */}
        <div className="input-group">
          <FontAwesomeIcon icon={faCamera} />
          <input id={idPrefix + 'profile-picture'} type="file" ref={fileInputRef} onChange={(e) => setProfilePicture(e.target.files[0])} accept="image/*" /> {/* Modified ID */}
        </div>
      </div>
      <button className="btn btn-primary btn-block" onClick={registerUser} disabled={loading}>
        {loading ? <ClipLoader size={20} color={"#fff"} /> : 'Register'}
      </button>
      <div className="auth-switch-link">
        Already registered? <span onClick={() => { onClose(); onSwitchToLogin(); }}>Login</span>
      </div>
    </div>
  );
}

// The RegisterModal component that wraps the Register form
const RegisterModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Register idPrefix="register-" onClose={onClose} onSwitchToLogin={onSwitchToLogin} /> {/* Pass idPrefix, onClose, and onSwitchToLogin here */}
    </Modal>
  );
};

export default RegisterModal;