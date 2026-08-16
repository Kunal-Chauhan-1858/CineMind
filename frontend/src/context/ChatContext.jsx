import React, { createContext, useContext, useState } from 'react';
import apiClient from '../api/client';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      message: "👋 Welcome to CineMind! I'm your Movie Assistant. Tell me a mood, a genre, a movie or actor you like — or ask me to search for something specific.",
      suggested_movies: []
    }
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      message: text,
      suggested_movies: []
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await apiClient.post('/chatbot/message', { message: text });
      const botMsg = {
        id: res.data.id || Date.now() + 1,
        role: 'assistant',
        message: res.data.message,
        suggested_movies: res.data.suggested_movies || []
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error("Chatbot error:", err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        message: "Sorry, something went wrong on my end processing that. Give it another try in a moment.",
        suggested_movies: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleChat = () => setIsOpen(prev => !prev);

  return (
    <ChatContext.Provider value={{ isOpen, toggleChat, setIsOpen, messages, sendMessage, loading }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
