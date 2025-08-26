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
import './BadgeEditor.css';

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

export default function BadgeEditor({ onClose, onSave }) {
  const [allBadges, setAllBadges] = useState([]);
  const [selectedBadges, setSelectedBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadgeData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const [allBadgesRes, profileRes] = await Promise.all([
          axios.get('http://localhost:5000/api/badges', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5000/api/profile', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setAllBadges(allBadgesRes.data);
        setSelectedBadges(profileRes.data.displayedBadges.map(b => b._id));

      } catch (error) {
        console.error('Failed to fetch badge data', error);
        toast.error('Could not load badge data.');
      } finally {
        setLoading(false);
      }
    };
    fetchBadgeData();
  }, []);

  const handleBadgeSelect = (badgeId) => {
    setSelectedBadges(prev => {
      if (prev.includes(badgeId)) {
        return prev.filter(id => id !== badgeId);
      } else if (prev.length < 4) {
        return [...prev, badgeId];
      }
      toast.warn('You can only select up to 4 badges.');
      return prev;
    });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5000/api/profile/displayed-badges', 
        { badgeIds: selectedBadges }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Featured badges updated!');
      onSave(selectedBadges);
      onClose();
    } catch (error) {
      console.error('Failed to save badges', error);
      toast.error('Failed to update featured badges.');
    }
  };

  const renderBadge = (badge) => {
    const isSelected = selectedBadges.includes(badge._id);
    const iconObject = iconMap[badge.icon] || faLock;

    return (
      <div 
        key={badge._id} 
        className={`badge-editor-item ${isSelected ? 'selected' : ''}`}
        onClick={() => handleBadgeSelect(badge._id)}
      >
        <FontAwesomeIcon icon={iconObject} size="2x" style={{ color: 'var(--primary-color)' }} />
        <span>{badge.name}</span>
      </div>
    );
  };

  return (
    <div className="badge-editor-modal-overlay">
      <div className="badge-editor-modal-content">
        <h3>Select Your Featured Badges</h3>
        {loading ? (
          <ClipLoader size={50} color={"#7E5C4A"} />
        ) : (
          <>
            <div className="badge-section">
              <h4>Level Badges</h4>
              <p>These badges are earned by reaching certain levels.</p>
              <div className="badge-editor-grid">
                {allBadges.filter(badge => badge.isEarned && badge.criteria.type === 'level').map(renderBadge)}
              </div>
            </div>

            <div className="badge-section">
              <h4>Achievement Badges</h4>
              <p>These badges are earned by completing specific challenges and milestones.</p>
              <div className="badge-editor-grid">
                {allBadges.filter(badge => badge.isEarned && badge.criteria.type !== 'level').map(renderBadge)}
              </div>
            </div>
          </>
        )}
        <div className="badge-editor-actions">
          <button onClick={handleSave} className="save-btn">Save</button>
          <button onClick={onClose} className="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  );
}