import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Friends.css';

export default function Friends({ fetchFriendRequestCount }) {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'search', 'requests'

  const fetchFriends = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/profile');
      setFriends(res.data.friends || []);
    } catch (error) {
      console.error('Failed to fetch friends', error);
      toast.error('Failed to fetch friends.');
    }
  }, []);

  const fetchFriendRequests = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/friends/requests');
      setFriendRequests(res.data);
    } catch (error) {
      console.error('Failed to fetch friend requests', error);
      toast.error('Failed to fetch friend requests.');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'friends') {
      fetchFriends();
    } else if (activeTab === 'requests') {
      fetchFriendRequests();
    }
  }, [activeTab, fetchFriends, fetchFriendRequests]);

  const handleSearchUsers = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/users/search?q=${searchQuery}`);
      setSearchResults(res.data);
    } catch (error) {
      console.error('Failed to search users', error);
      toast.error(error.response?.data?.message || 'Failed to search users.');
    }
  };

  const handleAcceptRequest = async (senderId) => {
    try {
      await axios.post('http://localhost:5000/api/friends/accept-request', { senderId });
      toast.success('Friend request accepted!');
      fetchFriendRequests();
      fetchFriends();
      fetchFriendRequestCount();
    } catch (error) {
      console.error('Failed to accept friend request', error);
      toast.error(error.response?.data?.message || 'Failed to accept friend request.');
    }
  };

  const handleDeclineRequest = async (senderId) => {
    try {
      await axios.post('http://localhost:5000/api/friends/decline-request', { senderId });
      toast.success('Friend request declined!');
      fetchFriendRequests();
      fetchFriendRequestCount();
    } catch (error) {
      console.error('Failed to decline friend request', error);
      toast.error(error.response?.data?.message || 'Failed to decline friend request.');
    }
  };

  return (
    <div className="friends-container">
      <h2>Friends Circle</h2>
      <div className="friends-nav">
        <button onClick={() => setActiveTab('friends')} className={activeTab === 'friends' ? 'active' : ''}>My Friends</button>
        <button onClick={() => setActiveTab('search')} className={activeTab === 'search' ? 'active' : ''}>Search for Friends</button>
        <button onClick={() => setActiveTab('requests')} className={activeTab === 'requests' ? 'active' : ''}>
          <span>Friend Requests</span>
          {friendRequests.length > 0 && <span className="notification-badge">{friendRequests.length}</span>}
        </button>
      </div>

      {activeTab === 'friends' && (
        <div className="friends-list">
          {friends.length > 0 ? (
            <ul>
              {friends.map((friend) => (
                <li key={friend._id}>
                  <Link to={`/profile/${friend._id}`} className="user-link-display">
                    <img src={friend.profilePicture ? `http://localhost:5000/${friend.profilePicture}` : '/defaultSilh.jpg'} alt={friend.username} />
                    <span><span className="username-display">{friend.username}</span> <span className="user-xp">(Level: {friend.level})</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>You have no friends yet.</p>
          )}
        </div>
      )}

      {activeTab === 'search' && (
        <div className="add-friend">
          <input
            type="text"
            placeholder="Search for users"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button onClick={handleSearchUsers}>Search</button>
          <div className="search-results">
            {searchResults.length > 0 && (
              <ul>
                {searchResults.map((user) => (
                  <li key={user._id}>
                    <Link to={`/profile/${user._id}`} className="user-link-display">
                      <img src={user.profilePicture ? `http://localhost:5000/${user.profilePicture}` : '/defaultSilh.jpg'} alt={user.username} />
                      <span><span className="username-display">{user.username}</span> <span className="user-xp">(Level: {user.level})</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="friend-requests">
          {friendRequests.length > 0 ? (
            <ul>
              {friendRequests.map((req) => (
                <li key={req._id}>
                  <Link to={`/profile/${req._id}`} className="user-link-display">
                    <img src={req.profilePicture ? `http://localhost:5000/${req.profilePicture}` : '/defaultSilh.jpg'} alt={req.username} />
                    <span><span className="username-display">{req.username}</span> <span className="user-xp">(Level: {req.level})</span></span>
                  </Link>
                  <div className="friend-request-actions">
                    <button onClick={() => handleAcceptRequest(req._id)} className="accept-request-btn">Accept</button>
                    <button onClick={() => handleDeclineRequest(req._id)} className="decline-request-btn">Decline</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No new friend requests.</p>
          )}
        </div>
      )}
    </div>
  );
}
