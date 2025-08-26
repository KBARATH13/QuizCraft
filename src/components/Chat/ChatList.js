import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useChat } from './ChatContext';
import './ChatList.css';

const ChatList = () => {
    const { chatRooms, setChatRooms, joinChatRoom, userProfile, setActiveChatRoom, perChatUnreadCounts, markMessagesAsRead } = useChat();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('chats'); // 'chats', 'friends', 'classrooms', 'social'
    const [friends, setFriends] = useState([]);
    const [classrooms, setClassrooms] = useState([]);

    useEffect(() => {
        const fetchChatRooms = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/chat/rooms');
                setChatRooms(res.data);
            } catch (err) {
                console.error('Error fetching chat rooms:', err);
                setError('Failed to load chat rooms.');
            } finally {
                setLoading(false);
            }
        };

        fetchChatRooms();
    }, [setChatRooms]); // Revert to original dependency array

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/friends');
                setFriends(res.data);
            } catch (err) {
                console.error('Error fetching friends:', err);
            }
        };

        const fetchClassrooms = async () => {
            if (!userProfile) return;
            try {
                const endpoint = userProfile.role === 'teacher' ? '/api/classrooms/teacher' : '/api/classrooms/student';
                const res = await axios.get(`http://localhost:5000${endpoint}`);
                setClassrooms(res.data);
            } catch (err) {
                console.error('Error fetching classrooms:', err);
            }
        };

        if (activeTab === 'friends') {
            fetchFriends();
        } else if (activeTab === 'classrooms') {
            fetchClassrooms();
        }
    }, [activeTab, userProfile]);

    const handleChatRoomClick = (roomId) => {
        joinChatRoom(roomId);
        setActiveChatRoom(roomId);
        markMessagesAsRead(roomId);
    };

    const handleStartPrivateChat = async (friend) => {
        try {
            let url;
            if ((userProfile.role === 'student' && friend.role === 'teacher') || (userProfile.role === 'teacher' && friend.role === 'student')) {
                url = 'http://localhost:5000/api/chat/student-teacher';
            } else {
                url = 'http://localhost:5000/api/chat/private';
            }
            const res = await axios.post(url, { targetUserId: friend._id });
            setActiveChatRoom(res.data._id);
            markMessagesAsRead(res.data._id);
        } catch (err) {
            console.error('Error starting private chat:', err);
            setError('Failed to start private chat.');
        }
    };

    const handleJoinClassroomChat = async (classroomId) => {
        try {
            const res = await axios.post(`http://localhost:5000/api/chat/classroom/${classroomId}`, {});
            setActiveChatRoom(res.data._id);
            markMessagesAsRead(res.data._id);
        } catch (err) {
            console.error('Error joining classroom chat:', err);
            setError('Failed to join classroom chat.');
        }
    };

    const handleJoinGlobalChat = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/chat/global');
            setActiveChatRoom(res.data._id);
            markMessagesAsRead(res.data._id);
        } catch (err) {
            console.error('Error joining global chat:', err);
            setError('Failed to join global chat.');
        }
    };

    const truncateMessage = (message, maxLength = 30) => {
        if (!message) return '';
        if (message.length > maxLength) {
            return message.substring(0, maxLength) + '...';
        }
        return message;
    };

    const renderActiveTab = () => {
        if (loading) return <div>Loading...</div>;
        if (error) return <div className="error-message">{error}</div>;
        if (!userProfile) return <div>Loading user profile...</div>;

        switch (activeTab) {
            case 'chats':
                return (
                    <ul className="chat-rooms-list">
                        {chatRooms.map(room => (
                            <li key={room._id} className="chat-room-item" onClick={() => handleChatRoomClick(room._id)}>
                                <div className="chat-room-info">
                                    <span className="chat-room-name">
                                        {room.type === 'private'
                                            ? room.members.find(m => m._id !== userProfile._id)?.username || 'Unknown User'
                                            : room.name}
                                    </span>
                                    {room.lastMessage && <p className="last-message">{truncateMessage(room.lastMessage.content)}</p>}
                                </div>
                                {perChatUnreadCounts[room._id] > 0 && (
                                    <span className="unread-count">{perChatUnreadCounts[room._id]}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                );
            case 'friends':
                return (
                    <ul className="friends-list">
                        {friends.length > 0 ? (
                            friends.map(friend => (
                                <li key={friend._id} className="friend-item" onClick={() => handleStartPrivateChat(friend)}>
                                    <span className="friend-name">{friend.username}</span>
                                </li>
                            ))
                        ) : (
                            <p>No friends found. Go make some!</p>
                        )}
                    </ul>
                );
            case 'classrooms':
                return (
                    <ul className="classrooms-list">
                        {classrooms.length > 0 ? (
                            classrooms.map(classroom => (
                                <li key={classroom._id} className="classroom-item" onClick={() => handleJoinClassroomChat(classroom._id)}>
                                    <span className="classroom-name">{classroom.name}</span>
                                </li>
                            ))
                        ) : (
                            <p>You are not enrolled in any classrooms.</p>
                        )}
                    </ul>
                );
            case 'social':
                return (
                    <div className="social-chat">
                        <button onClick={handleJoinGlobalChat} className="global-chat-button">Join Global Chat</button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="chat-list-container">
            <div className="chat-tabs">
                <button onClick={() => setActiveTab('chats')} className={activeTab === 'chats' ? 'active' : ''}>Chats</button>
                <button onClick={() => setActiveTab('friends')} className={activeTab === 'friends' ? 'active' : ''}>Friends</button>
                <button onClick={() => setActiveTab('classrooms')} className={activeTab === 'classrooms' ? 'active' : ''}>Classrooms</button>
                <button onClick={() => setActiveTab('social')} className={activeTab === 'social' ? 'active' : ''}>Social</button>
            </div>
            <div className="tab-content">
                {renderActiveTab()}
            </div>
        </div>
    );
};

export default ChatList;
