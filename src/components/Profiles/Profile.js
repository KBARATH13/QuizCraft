import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLock, faBaby, faChild, faRoute, faCrown, faStar, faPencilAlt, faBookOpen, 
  faGraduationCap, faBullseye, faFire, faMeteor, faCoins, faGem, faBolt, 
  faBrain, faUsers, faHammer, faMoon, faSun, faMicroscope, faGlobe, 
  faTint, faTrophy, faChartLine, faCalendarCheck 
} from '@fortawesome/free-solid-svg-icons';
import './Profile.css';
import '../Badges/Badge.css';
import AllBadgesModal from '../Badges/AllBadgesModal';
import BadgeEditor from '../Badges/BadgeEditor'; // Import BadgeEditor

const iconMap = {
  'fas fa-baby': faBaby,
  'fas fa-child': faChild,
  'fas fa-route': faRoute,
  'fas fa-crown': faCrown,
  'fas fa-star': faStar,
  'fas fa-pencil-alt': faPencilAlt,
  'fas fa-book-open': faBookOpen,
  'fas fa-graduation-cap': faGraduationCap,
  'fas fa-bullseye': faBullseye,
  'fas fa-fire': faFire,
  'fas fa-meteor': faMeteor,
  'fas fa-coins': faCoins,
  'fas fa-gem': faGem,
  'fas fa-bolt': faBolt,
  'fas fa-brain': faBrain,
  'fas fa-users': faUsers,
  'fas fa-hammer': faHammer,
  'fas fa-moon': faMoon,
  'fas fa-sun': faSun,
  'fas fa-microscope': faMicroscope,
  'fas fa-globe': faGlobe,
  'fas fa-tint': faTint,
  'fas fa-trophy': faTrophy,
  'fas fa-chart-line': faChartLine,
  'fas fa-calendar-check': faCalendarCheck,
};

export default function Profile() {
  const [user, setUser] = useState(null);
  const [gamificationStatus, setGamificationStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quizHistory, setQuizHistory] = useState([]);
  const [displayedBadges, setDisplayedBadges] = useState([]);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [showBadgeEditor, setShowBadgeEditor] = useState(false); // State for BadgeEditor
  const [editingLocation, setEditingLocation] = useState(false);
  const [location, setLocation] = useState({ country: '', subdivision1: '' });
  const [locationPreferences, setLocationPreferences] = useState({ subdivision1Label: 'Subdivision 1' });
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const fetchCountries = useCallback(async () => {
    setLoadingCountries(true);
    try {
      const res = await axios.get('http://localhost:5000/api/locations/countries');
      setCountries(res.data);
    } catch (error) {
      console.error('Failed to fetch countries', error);
      toast.error('Failed to fetch countries.');
    } finally {
      setLoadingCountries(false);
    }
  }, []);

  const handleCountryChange = async (countryName) => {
    setLocation({ ...location, country: countryName, subdivision1: '' });
    setStates([]);
    if (!countryName) return;

    const selectedCountry = countries.find(c => c.name === countryName);
    if (!selectedCountry) return;

    setLoadingStates(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/locations/states/${selectedCountry.id}`);
      setStates(res.data);
    } catch (error) {
      console.error('Failed to fetch states', error);
      toast.error('Failed to fetch states.');
    } finally {
      setLoadingStates(false);
    }
  };

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/profile');
      setUser(res.data);
      setDisplayedBadges(res.data.displayedBadges || []);
      setLocation(res.data.location || { country: '', subdivision1: '', subdivision2: '' });
      setLocationPreferences(res.data.locationPreferences || { subdivision1Label: 'Subdivision 1', subdivision2Label: 'Subdivision 2' });
    } catch (error) {
      console.error('Failed to fetch profile', error);
      toast.error(error.response?.data?.message || 'Failed to fetch profile.');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchQuizHistory = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/profile/quiz-history');
      setQuizHistory(res.data);
    } catch (error) {
      console.error('Failed to fetch quiz history', error);
      toast.error('Failed to fetch quiz history.');
    }
  }, []);

  const fetchGamificationStatus = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/profile/gamification-status');
      setGamificationStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch gamification status', error);
      toast.error('Failed to fetch gamification status.');
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchQuizHistory();
    fetchGamificationStatus();
    fetchCountries();
  }, [navigate, fetchUser, fetchQuizHistory, fetchGamificationStatus, fetchCountries]);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('profilePicture', selectedFile);

    try {
      await axios.post('http://localhost:5000/api/auth/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Profile picture updated successfully!');
      fetchUser(); // Refresh user data to show new picture
    } catch (error) {
      console.error('Failed to upload profile picture', error);
      toast.error(error.response?.data?.message || 'Failed to upload profile picture.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleLocationUpdate = async () => {
    try {
      await axios.put('http://localhost:5000/api/profile', { location, locationPreferences });
      toast.success('Location updated successfully!');
      setEditingLocation(false);

      // Directly update the user state with the new location
      setUser(prevUser => ({
        ...prevUser,
        location: { ...location }, // Create a new location object to ensure re-render
        locationPreferences: { ...locationPreferences }
      }));
    } catch (error) {
      console.error('Failed to update location', error);
      toast.error(error.response?.data?.message || 'Failed to update location.');
    }
  };

  const handleBadgesSave = (newlySelectedBadgeIds) => {
    // Refetch user to get populated badge objects
    fetchUser();
  };

  if (loading || !user || !gamificationStatus) return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
      <ClipLoader size={50} color={"#7E5C4A"} />
    </div>
  );

  const xpNeededForNextLevel = gamificationStatus.xpToNextLevel;
  const xpProgress = gamificationStatus.xp - gamificationStatus.xpForCurrentLevel;
  const xpPercentage = (xpNeededForNextLevel > 0) ? (xpProgress / xpNeededForNextLevel) * 100 : 100;

  return (
    <>
      <div className="profile-container">
        <h2 className="profile-header">Profile</h2>
        <div className="profile-top-section">
          <div className="profile-card profile-details-card">
            <div className="profile-picture-container" onClick={handleImageClick}>
              <img src={user.profilePicture ? `http://localhost:5000/${user.profilePicture}` : '/defaultSilh.jpg'} alt="profile" className="profile-picture" />
              <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
              <span className="plus-icon">+</span>
            </div>
            <div className="profile-details">
              <p><strong>Name:</strong> {user.username}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role}</p>
              <div className="location-details">
                <h4>Location</h4>
                {!user.location?.country ? (
                  <p className="location-not-set">Your location is not set. Please update it.</p>
                ) : (
                  <p>
                    <strong>Location:</strong>
                    {user.location?.country && ` ${user.location.country}`}
                    {user.location?.subdivision1 && ` / ${user.location.subdivision1}`}
                  </p>
                )}
                <button onClick={() => setEditingLocation(true)}>Edit Location</button>
              </div>
              {editingLocation && (
                <div className="location-edit-form">
                  {loadingCountries ? (
                    <div className="loading-indicator"><ClipLoader size={20} color={"#7E5C4A"} /> Loading Countries...</div>
                  ) : (
                    <select
                        className="location-select"
                        value={location.country}
                        onChange={(e) => handleCountryChange(e.target.value)}
                      >
                      <option value="">Select Country</option>
                      {countries.map((country) => (
                        <option key={country.id} value={country.name}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    placeholder="State Label"
                    value={locationPreferences.subdivision1Label}
                    onChange={(e) => setLocationPreferences({ ...locationPreferences, subdivision1Label: e.target.value })}
                  />
                  {loadingStates ? (
                    <div className="loading-indicator"><ClipLoader size={20} color={"#7E5C4A"} /> Loading States...</div>
                  ) : (
                    <select
                        className="location-select"
                        value={location.subdivision1}
                        onChange={(e) => setLocation({ ...location, subdivision1: e.target.value })}
                      >
                      <option value="">Select State</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.name}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button onClick={handleLocationUpdate}>Save</button>
                  <button onClick={() => setEditingLocation(false)}>Cancel</button>
                </div>
              )}
            </div>
            <p><Link to="/leaderboard" className="leaderboard-link">View Leaderboard</Link></p>
            
          </div>

          <div className="profile-card gamification-card">
            <h3>Your Progress:</h3>
            {gamificationStatus ? (
              <div className="gamification-details">
                <p><strong>Level:</strong> {gamificationStatus.level}</p>
                {gamificationStatus.level < 50 && (
                  <p><strong>XP:</strong> {xpProgress} / {xpNeededForNextLevel}</p>
                )}
                {gamificationStatus.level < 50 && (
                  <div className="xp-progress-bar-container">
                    <div className="xp-progress-bar" style={{ width: `${xpPercentage}%` }}></div>
                  </div>
                )}
                <p><strong>Streak:</strong> {gamificationStatus.streaks} days</p>
                <p><strong>Points:</strong> {gamificationStatus.points}</p>
                <p><strong>Daily Goal:</strong> {gamificationStatus.dailyGoalProgress}/{gamificationStatus.dailyGoal} Quizzes</p>
                
                <div className="featured-badges-section">
                  <h4>Featured Badges</h4>
                  <div className="displayed-badges-container">
                      {Array.isArray(displayedBadges) && displayedBadges.map((badge) => {
                          const iconObject = iconMap[badge.icon] || faLock; // Use iconMap
                          return (
                              <div key={badge._id} className="badge" title={`${badge.name}: ${badge.phrase}`}>
                                  <FontAwesomeIcon icon={iconObject} size="2x" style={{ color: 'var(--primary-color)' }} />
                              </div>
                          );
                      })}
                      {[...Array(4 - displayedBadges.length)].map((_, i) => (
                        <div key={`empty-${i}`} className="badge empty-badge"></div>
                      ))}
                  </div>
                  <button onClick={() => setShowBadgeEditor(true)} className="edit-badges-btn">Edit Badges</button>
                </div>

                <div className="profile-badges-section">
                  <button onClick={() => setShowBadgesModal(true)} className="view-badges-btn">View All Badges</button>
                </div>
              </div>
            ) : (
              <p>Loading gamification data...</p>
            )}
          </div>
        </div>

        

        <div className="profile-card quiz-history-card">
          <div className="quiz-history">
            <h3>Quiz History</h3>
            {quizHistory.length > 0 ? (
              <ul className="quiz-history-list">
                {quizHistory.map((attempt) => (
                  <li key={attempt._id} className="quiz-history-item">
                    <span><strong>{attempt.quiz ? attempt.quiz.title : 'Quiz unavailable'}</strong></span>
                    <span>{attempt.score} / {attempt.totalQuestions}</span>
                    <span>{new Date(attempt.attemptedAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No quiz attempts yet.</p>
            )}
          </div>
        </div>
      </div>
      {showBadgesModal && <AllBadgesModal onClose={() => setShowBadgesModal(false)} />}
      {showBadgeEditor && <BadgeEditor onClose={() => setShowBadgeEditor(false)} onSave={handleBadgesSave} />}
    </>
  );
}