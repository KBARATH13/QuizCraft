import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faTimes, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { toast } from 'react-toastify';
import './AIMiniBot.css';

const AIMiniBot = ({ userProfile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingQuery, setPendingQuery] = useState(null);

  useEffect(() => {
    const storedQuery = localStorage.getItem('ai-query');
    if (storedQuery) {
      const parsedQuery = JSON.parse(storedQuery);
      if (parsedQuery.status === 'pending') {
        setPendingQuery(parsedQuery);
        setResponse('I am still working on your previous question...');
      } else if (parsedQuery.status === 'completed') {
        setPendingQuery(parsedQuery);
        setResponse(parsedQuery.response);
        toast.success('Your answer is ready!');
        localStorage.removeItem('ai-query');
      }
    }
  }, []);

  const handleToggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const newQuery = {
      id: Date.now(),
      text: query,
      status: 'pending',
    };

    localStorage.setItem('ai-query', JSON.stringify(newQuery));
    setPendingQuery(newQuery);
    setQuery('');
    setResponse('I will search and inform you. Until then, you can do your other work in QuizCraft.');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/ai/doubt', 
        { questionText: newQuery.text, userId: userProfile._id },
      );

      const completedQuery = { ...newQuery, status: 'completed', response: res.data.response };
      const currentQuery = JSON.parse(localStorage.getItem('ai-query'));

      if (currentQuery && currentQuery.id === completedQuery.id) {
        localStorage.setItem('ai-query', JSON.stringify(completedQuery));
        if (isOpen) {
          setResponse(res.data.response);
          setPendingQuery(null);
          localStorage.removeItem('ai-query');
        } else {
          toast.success('Your answer is ready!');
        }
      }
    } catch (err) {
      console.error('Error asking doubt:', err);
      const currentQuery = JSON.parse(localStorage.getItem('ai-query'));
      if (currentQuery && currentQuery.id === newQuery.id) {
        localStorage.removeItem('ai-query');
        setResponse('Sorry, I could not process your request. Please try again later.');
      }
      toast.error('Failed to get a response.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelQuery = () => {
    localStorage.removeItem('ai-query');
    setPendingQuery(null);
    setResponse('');
    setLoading(false);
    toast.info('Your request has been cancelled.');
  };

  return (
    <>
      <div className="ai-minibot-button" onClick={handleToggleChat}>
        <FontAwesomeIcon icon={faRobot} size="2x" />
      </div>

      {isOpen && (
        <div className="ai-minibot-modal-overlay">
          <div className="ai-minibot-modal-content">
            <div className="ai-minibot-header">
              <div className="waving-bot">
                <FontAwesomeIcon icon={faRobot} />
              </div>
              <h3>AI Assistant</h3>
              <FontAwesomeIcon icon={faTimes} className="close-btn" onClick={handleToggleChat} />
            </div>
            <div className="ai-minibot-body">
              <div className="ai-minibot-response">
                {loading && !response ? (
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                ) : (response || "Hello! Ask me anything about quizzes or general knowledge.")}
              </div>
              {pendingQuery && loading && (
                <button onClick={handleCancelQuery} className="cancel-button">Cancel Request</button>
              )}
              <form onSubmit={handleQuerySubmit} className="ai-minibot-input-form">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask your question..."
                  disabled={loading}
                />
                <button type="submit" disabled={loading}>
                  <FontAwesomeIcon icon={faPaperPlane} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIMiniBot;