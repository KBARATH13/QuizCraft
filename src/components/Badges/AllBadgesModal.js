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
import './AllBadgesModal.css';

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

export default function AllBadgesModal({ onClose }) {
  const [allBadges, setAllBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllBadgeData = async () => {
      setLoading(true);
      try {
        const allBadgesResponse = await axios.get('http://localhost:5000/api/badges');

        if (Array.isArray(allBadgesResponse.data)) {
          setAllBadges(allBadgesResponse.data);
        } else {
          console.error('Expected an array of all badges, but received:', allBadgesResponse.data);
          setAllBadges([]);
        }

      } catch (error) {
        console.error('Failed to fetch badge data', error);
        toast.error('Could not load badge collection.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllBadgeData();
  }, []);

  const renderBadge = (badge) => {
    const isUnlocked = badge.isEarned;
    const iconObject = iconMap[badge.icon] || faLock;

    return (
      <div 
        key={badge._id} 
        className={`badge-display-item ${isUnlocked ? 'unlocked' : 'locked'}`}
        title={isUnlocked ? `${badge.name}: ${badge.phrase}` : `${badge.name}: ${badge.description}`}
      >
        <FontAwesomeIcon icon={iconObject} size="2x" style={{ color: 'var(--primary-color)' }} />
        <span className="badge-display-name">{badge.name}</span>
        {!isUnlocked && (
          <div className="badge-lock-overlay">
            <FontAwesomeIcon icon={faLock} size="lg" style={{ color: 'var(--primary-color)' }} />
          </div>
        )}
      </div>
    );
  };

  const levelBadges = allBadges.filter(b => b.criteria.type === 'level');
  const achievementBadges = allBadges.filter(b => b.criteria.type !== 'level');

  return (
    <div className="all-badges-modal-overlay" onClick={onClose}>
      <div className="all-badges-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal-btn" onClick={onClose}>&times;</button>
        <h2 className="all-badges-header">Badge Collection</h2>
        
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <ClipLoader size={50} color={"#7E5C4A"} />
          </div>
        ) : (
          <>
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
                {achievementBadges.map(renderBadge)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}