import { Link } from 'react-router-dom';
import './AuthButtons.css';

function AuthButtons({ isLoggedIn, userProfile }) {
  const defaultAvatar = '/defaultSilh.png'; // Path to your default silhouette image

  return (
    <>
      {isLoggedIn ? (
        <div className="auth-buttons-container">
          <Link to="/profile" className="profile-picture-nav">
            <img 
              src={userProfile?.profilePicture ? `http://localhost:5000/${userProfile.profilePicture}` : defaultAvatar}
              alt="Profile"
              className="nav-profile-pic"
            />
          </Link>
        </div>
      ) : (
        null
      )}
    </>
  );
}

export default AuthButtons;