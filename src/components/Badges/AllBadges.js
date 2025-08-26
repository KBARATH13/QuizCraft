import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLock, faBaby, faChild, faRoute, faCrown, faStar, faPencilAlt, faBookOpen, 
  faGraduationCap, faBullseye, faFire, faMeteor, faCoins, faGem, faBolt, 
  faBrain, faUsers, faHammer, faMoon, faSun, faMicroscope, faGlobe, 
  faTint, faTrophy, faChartLine, faCalendarCheck 
} from '@fortawesome/free-solid-svg-icons';
import './AllBadges.css';

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

export default function AllBadges() {
  const [levelBadges, setLevelBadges] = useState([]);
  const [criteriaBadges, setCriteriaBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        
        const allBadgesRes = await axios.get('http://localhost:5000/api/badges', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const profileRes = await axios.get('http://localhost:5000/api/profile', {
            headers: { Authorization: `Bearer ${token}` },
        });

        const all = allBadgesRes.data;
        const earned = profileRes.data.badges || [];

        setLevelBadges(all.filter(b => b.criteria.type === 'level'));
        setCriteriaBadges(all.filter(b => b.criteria.type !== 'level'));
        setUserBadges(earned);

      } catch (error) {
        console.error('Failed to fetch badges', error);
        toast.error('Failed to load badge information.');
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, []);

  const renderBadge = (badge) => {
    const isUnlocked = userBadges.includes(badge.name);
    const iconObject = iconMap[badge.icon] || faLock; // Fallback to faLock if icon not found

    return (
      <div key={badge._id} className={`badge-display-item ${isUnlocked ? 'unlocked' : 'locked'}`} title={isUnlocked ? badge.phrase : badge.description}>
        <FontAwesomeIcon icon={iconObject} size="3x" />
        <span className="badge-display-name">{badge.name}</span>
        {!isUnlocked && (
          <div className="badge-lock-overlay">
            <FontAwesomeIcon icon={faLock} size="lg" />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <ClipLoader size={50} color={"#7E5C4A"} />
      </div>
    );
  }

  return (
    <div className="all-badges-container">
      <h2 className="all-badges-header">Badge Collection</h2>
      
      <div className="badge-section">
        <h3>Level Badges</h3>
        <p>Earn these by leveling up your profile.</p>
        <div className="badge-grid">
          {levelBadges.map(renderBadge)}
        </div>
      </div>

      <div className="badge-section">
        <h3>Achievement Badges</h3>
        <p>Unlock these by completing specific challenges and milestones.</p>
        <div className="badge-grid">
          {criteriaBadges.map(renderBadge)}
        </div>
      </div>
    </div>
  );
}