import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faChevronLeft, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useChat } from './ChatContext';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import './ChatSlider.css';

const ChatSlider = () => {
  const { activeChatRoom, setActiveChatRoom, totalUnreadCount, isChatSliderOpen, toggleChat, closeChat } = useChat();
  const sliderRef = useRef(null);

  const handleBackToList = () => {
    setActiveChatRoom(null);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sliderRef.current && !sliderRef.current.contains(event.target) && !event.target.closest('.chat-slider-trigger')) {
        closeChat();
      }
    };

    if (isChatSliderOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isChatSliderOpen, closeChat]);

  return (
    <>
      <div className={`chat-slider-trigger ${isChatSliderOpen ? 'open' : ''}`} onClick={toggleChat}>
        <FontAwesomeIcon icon={isChatSliderOpen ? faChevronLeft : faChevronRight} />
        {totalUnreadCount > 0 && <span className="notification-badge">{totalUnreadCount}</span>}
      </div>
      <div ref={sliderRef} className={`chat-slider-panel ${isChatSliderOpen ? 'open' : ''}`}>
        <div className="chat-slider-header">
            {activeChatRoom && <button onClick={handleBackToList} className="back-button"><FontAwesomeIcon icon={faArrowLeft} /></button>}
            <h3>{activeChatRoom ? 'Chat' : 'Chat List'}</h3>
          <button onClick={toggleChat} className="close-button">
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
        </div>
        <div className="chat-slider-content">
          {activeChatRoom ? <ChatWindow roomId={activeChatRoom} /> : <ChatList />}
        </div>
      </div>
    </>
  );
};

export default ChatSlider;
