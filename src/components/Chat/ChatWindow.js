import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useChat } from './ChatContext';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faCheckDouble, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import './ChatWindow.css';

const ChatWindow = ({ roomId }) => {
    const { messages, sendMessage, joinChatRoom, userProfile, chatRooms } = useChat();
    const [currentMessage, setCurrentMessage] = useState('');
    const [chatRoomInfo, setChatRoomInfo] = useState(null);
    const messagesEndRef = useRef(null);

    // Memoize fetchChatRoomInfo
    const fetchChatRoomInfo = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/chat/room/${roomId}/messages`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.length > 0) {
                setChatRoomInfo({ _id: roomId, type: 'unknown', members: [] }); // Placeholder
            }
        } catch (err) {
            console.error('Error fetching chat room info:', err);
        }
    }, [roomId]);

    // Memoize foundRoom
    const foundRoom = useMemo(() => {
        return chatRooms.find(room => room._id === roomId);
    }, [chatRooms, roomId]); // Dependencies for useMemo

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!roomId) return; // Do not proceed if roomId is not present

        if (foundRoom) {
            setChatRoomInfo(foundRoom);
        }
        else {
            fetchChatRoomInfo();
        }

        joinChatRoom(roomId);
    }, [roomId, joinChatRoom, foundRoom, fetchChatRoomInfo]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages[roomId]]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (currentMessage.trim()) {
            sendMessage(roomId, currentMessage);
            setCurrentMessage('');
        }
    };

    const getChatPartnerName = () => {
        if (chatRoomInfo && chatRoomInfo.type === 'private' && userProfile) {
            const otherMember = chatRoomInfo.members.find(member => member._id !== userProfile._id);
            return otherMember ? otherMember.username : 'Unknown User';
        }
        return chatRoomInfo?.name || 'Chat';
    };

    const renderReadReceipts = (message) => {
        if (!chatRoomInfo) return null; // Add this null check
        if (message.sender._id !== userProfile._id) return null; // Only show ticks for messages sent by current user

        const otherMembers = chatRoomInfo.members.filter(member => member._id !== userProfile._id);

        // Check if all other members have read the message
        const allRead = otherMembers.every(member => message.readBy.includes(member._id));

        if (allRead) {
            return <FontAwesomeIcon icon={faCheckDouble} className="read-receipt blue" />;
        } else if (message.readBy.length > 1) { // More than just the sender has read it (i.e., at least one recipient)
            return <FontAwesomeIcon icon={faCheckDouble} className="read-receipt gray" />;
        } else {
            return <FontAwesomeIcon icon={faCheck} className="read-receipt gray" />;
        }
    };

    return (
        <div className="chat-window-container">
            <div className="chat-header">
                <h3>{getChatPartnerName()}</h3>
            </div>
            <div className="chat-messages">
                {messages[roomId] && messages[roomId].length > 0 ? (
                    messages[roomId].map((msg, index) => (
                        <div key={msg._id || index} className={`message-bubble ${msg.sender._id === userProfile._id ? 'my-message' : 'other-message'}`}>
                            <div className="message-sender">{msg.sender.username}</div>
                            <div className="message-content">{msg.content}</div>
                            <div className="message-time">
                                {new Date(msg.createdAt).toLocaleTimeString()}
                                {renderReadReceipts(msg)}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-messages">No messages yet. Say hello!</div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="message-input-form">
                <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="message-input"
                />
                <button type="submit" className="send-button">
                    <FontAwesomeIcon icon={faPaperPlane} />
                </button>
            </form>
        </div>
    );
};

export default ChatWindow;
