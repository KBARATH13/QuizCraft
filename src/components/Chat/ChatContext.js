import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

const ChatContext = createContext();

export const useChat = () => {
    return useContext(ChatContext);
};

export const ChatProvider = ({ children, isLoggedIn, userProfile }) => {
    const [chatRooms, setChatRooms] = useState([]);
    const [messages, setMessages] = useState({}); // { chatRoomId: [message1, message2] }
    const [activeChatRoom, setActiveChatRoom] = useState(null);
    const [isChatSliderOpen, setIsChatSliderOpen] = useState(false);
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);
    const [perChatUnreadCounts, setPerChatUnreadCounts] = useState({});
    const ws = useRef(null);

    const openChat = (chatRoomId) => {
        setIsChatSliderOpen(true);
        setActiveChatRoom(chatRoomId);
    };

    const closeChat = () => {
        setIsChatSliderOpen(false);
        setActiveChatRoom(null);
    };

    const toggleChat = () => {
        setIsChatSliderOpen(prev => !prev);
        if (isChatSliderOpen) {
            setActiveChatRoom(null);
        }
    };

    const fetchUnreadCounts = useCallback(async () => {
        if (!isLoggedIn) return;
        try {
            const res = await axios.get('http://localhost:5000/api/chat/unreadCounts');
            setTotalUnreadCount(res.data.totalUnreadCount);
            setPerChatUnreadCounts(res.data.perChatUnreadCounts);
        } catch (err) {
            
        }
    }, [isLoggedIn]);

    const markMessagesAsRead = useCallback(async (chatRoomId) => {
        if (!isLoggedIn || !chatRoomId) return;
        try {
            await axios.post('http://localhost:5000/api/chat/messages/read', { chatRoomId });
            // After marking as read, refetch unread counts to update UI
            fetchUnreadCounts();
        } catch (err) {
            
        }
    }, [isLoggedIn, fetchUnreadCounts]);

    useEffect(() => {
        let isMounted = true; // To prevent state updates on unmounted component
        let newWs; // Define WebSocket instance at a higher scope

        const connect = () => {
            if (!isLoggedIn || !userProfile || (ws.current && ws.current.readyState === WebSocket.OPEN)) {
                return;
            }

            newWs = new WebSocket(`ws://localhost:5000/`);

            newWs.onopen = () => {
                if (isMounted) {
                    ws.current = newWs;
                    newWs.send(JSON.stringify({ type: 'authenticate' }));
                }
            };

            newWs.onmessage = (event) => {
                if (!isMounted) return;
                const parsedData = JSON.parse(event.data);
                switch (parsedData.type) {
                    case 'chatHistory':
                        setMessages(prev => ({ ...prev, [parsedData.payload.chatRoomId]: parsedData.payload.messages }));
                        markMessagesAsRead(parsedData.payload.chatRoomId);
                        break;
                    case 'newChatMessage':
                        setMessages(prev => {
                            const { chatRoomId, message } = parsedData.payload;
                            const updated = { ...prev };
                            updated[chatRoomId] = updated[chatRoomId] ? [...updated[chatRoomId], message] : [message];
                            return updated;
                        });
                        fetchUnreadCounts();
                        if (userProfile && parsedData.payload.message.sender._id !== userProfile._id) {
                            toast.info(`New message from ${parsedData.payload.message.sender.username}`);
                        }
                        break;
                    case 'error':
                        toast.error(`Chat Error: ${parsedData.message}`);
                        break;
                    case 'authenticated':
                        fetchUnreadCounts();
                        break;
                    case 'messageRead':
                        setMessages(prev => {
                            const { chatRoomId, messageId, readerId } = parsedData.payload;
                            const updated = { ...prev };
                            if (updated[chatRoomId]) {
                                updated[chatRoomId] = updated[chatRoomId].map(msg => 
                                    msg._id === messageId && !msg.readBy.includes(readerId) 
                                        ? { ...msg, readBy: [...msg.readBy, readerId] } 
                                        : msg
                                );
                            }
                            return updated;
                        });
                        break;
                    default:
                        break;
                }
            };

            newWs.onclose = () => {
                if (ws.current === newWs) {
                    ws.current = null;
                }
            };

            newWs.onerror = (error) => {
                // console.error('WebSocket error:', error);
                if (isMounted) {
                    toast.error('WebSocket connection error.');
                }
                if (ws.current === newWs) {
                    ws.current = null;
                }
            };
        };

        if (isLoggedIn && userProfile) {
            connect();
        }

        return () => {
            isMounted = false;
            if (newWs && (newWs.readyState === WebSocket.OPEN || newWs.readyState === WebSocket.CONNECTING)) {
                newWs.close();
            }
            if (ws.current === newWs) {
                ws.current = null;
            }
        };
    }, [isLoggedIn, userProfile,markMessagesAsRead, fetchUnreadCounts]);

    const sendMessage = useCallback((chatRoomId, content) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'chatMessage',
                payload: {
                    chatRoomId,
                    content
                }
            }));
        } else {
            toast.error('WebSocket not connected. Cannot send message.');
        }
    }, []);

    const joinChatRoom = useCallback((chatRoomId) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'joinChatRoom',
                payload: {
                    chatRoomId
                }
            }));
        } else {
            toast.error('WebSocket not connected. Cannot join chat room.');
        }
    }, []);

    const value = {
        chatRooms,
        setChatRooms,
        messages,
        sendMessage,
        joinChatRoom,
        ws: ws.current,
        userProfile: userProfile,
        activeChatRoom,
        setActiveChatRoom,
        totalUnreadCount,
        perChatUnreadCounts,
        markMessagesAsRead,
        isChatSliderOpen,
        openChat,
        closeChat,
        toggleChat
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};