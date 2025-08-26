import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useChat } from '../Chat/ChatContext';
import { ClipLoader } from 'react-spinners';
import './FriendsProfile.css'; // Specific styles for UserProfile

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [friendship, setFriendship] = useState(null);
  const [loading, setLoading] = useState(true);
  const { userId } = useParams();
  const { userProfile, openChat, joinChatRoom } = useChat(); // Get logged-in user's profile
  const navigate = useNavigate(); // Get navigate function

  const handleChat = async () => {
      const token = localStorage.getItem('token');
      try {
          let url;
          if ((userProfile.role === 'student' && user.role === 'teacher') || (userProfile.role === 'teacher' && user.role === 'student')) {
              url = 'http://localhost:5000/api/chat/student-teacher';
          } else {
              url = 'http://localhost:5000/api/chat/private';
          }
          const res = await axios.post(url, { targetUserId: userId }, {
              headers: { Authorization: `Bearer ${token}` },
          });
          const chatRoomId = res.data._id;
          joinChatRoom(chatRoomId);
          openChat(chatRoomId);
      } catch (error) {
          console.error('Failed to create/get private chat:', error);
          toast.error(error.response?.data?.message || 'Failed to start chat.');
      }
  };

  const fetchUserProfile = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`http://localhost:5000/api/users/${userId}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data.user);
      setFriendship(res.data.friendship);
    } catch (error) {
      console.error('Failed to fetch user profile', error);
      toast.error('Failed to fetch user profile.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleSendRequest = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.post('http://localhost:5000/api/friends/send-request', { recipientId: userId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Friend request sent!');
      fetchUserProfile(); // Refresh to update friendship status
    } catch (error) {
      console.error('Failed to send friend request', error);
      toast.error(error.response?.data?.message || 'Failed to send friend request.');
    }
  };

  const handleRemoveFriend = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/friends/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Friend removed!');
      fetchUserProfile(); // Refresh to update friendship status
    } catch (error) {
      console.error('Failed to remove friend', error);
      toast.error(error.response?.data?.message || 'Failed to remove friend.');
    }
  };

  if (loading || !user) return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
      <ClipLoader size={50} color={"#7E5C4A"} />
    </div>
  );

  return (
    <div className="profile-container">
      <div className="profile-card profile-details-card">
        <div className="profile-picture-container">
          <img src={user.profilePicture ? `http://localhost:5000/${user.profilePicture}` : '/defaultSilh.jpg'} alt="profile" className="profile-picture" />
        </div>
        <div className="profile-details">
          <p><strong>Name:</strong> {user.username}</p>
          <p><strong>Level:</strong> {user.level}</p>
          <p><strong>Points:</strong> {user.points}</p>
          <p><strong>XP:</strong> {user.xp}</p>
          <p><strong>Role:</strong> {user.role}</p>
          {/* Add location display here */}
          <div className="location-details">
            <h4>Location</h4>
            {(!user.location?.country && !user.location?.subdivision1 && !user.location?.subdivision2) ? (
              <p className="location-not-set">Location not set.</p>
            ) : (
              <>
                <p><strong>{user.locationPreferences?.countryLabel || 'Country'}:</strong> {user.location?.country || 'Not set'}</p>
                <p><strong>{user.locationPreferences?.subdivision1Label || 'Subdivision 1'}:</strong> {user.location?.subdivision1 || 'Not set'}</p>
                <p><strong>{user.locationPreferences?.subdivision2Label || 'Subdivision 2'}:</strong> {user.location?.subdivision2 || 'Not set'}</p>
              </>
            )}
          </div>
        </div>
        {user.featuredBadges && user.featuredBadges.length > 0 && (
          <div className="featured-badges">
            <h3>Featured Badges</h3>
            <div className="badges-grid">
              {user.featuredBadges.slice(0, 4).map(badge => (
                <div key={badge._id} className="badge-item">
                  <img src={`http://localhost:5000/${badge.imageUrl}`} alt={badge.name} />
                  <p>{badge.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="friendship-actions">
          {friendship && friendship.isFriend ? (
            <> {/* Use a fragment to group buttons */}
              <button onClick={handleRemoveFriend} className="remove-friend-btn">Remove Friend</button>
              <button onClick={handleChat} className="chat-friend-btn">Chat</button> {/* New Chat button */}
            </>
          ) : friendship && friendship.requestSent ? (
            <button disabled>Friend Request Sent</button>
          ) : friendship && friendship.requestReceived ? (
            <p>This user has sent you a friend request.</p>
          ) : (
            <button onClick={handleSendRequest} className="add-friend-btn">Add Friend</button>
          )}
        </div>
      </div>
    </div>
  );
}