import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext();

const GUEST_USER = {
  id: 1,
  username: 'Guest Cinephile',
  email: 'guest@cinemind.app',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  preferred_genres: ['Sci-Fi', 'Action', 'Thriller'],
  preferred_vibes: ['Mind-Bending', 'Cyberpunk'],
  is_guest: true,
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('cinemind_token');
      if (token) {
        try {
          const res = await apiClient.get('/auth/me');
          setUser(res.data);
        } catch (err) {
          console.error("Auth session expired", err);
          localStorage.removeItem('cinemind_token');
          setUser(GUEST_USER);
        }
      } else {
        // Guest user default for zero-friction exploration
        setUser(GUEST_USER);
      }
      setLoading(false);
    };

    fetchMe();
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('cinemind_token', res.data.access_token);
    setUser(res.data.user);
    return res.data;
  };

  const signup = async (email, username, password) => {
    const res = await apiClient.post('/auth/signup', { email, username, password });
    localStorage.setItem('cinemind_token', res.data.access_token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    // Previously this set user to null with no way to sign back in --
    // AuthModal was never actually wired up anywhere in the app, so
    // "Logout" just broke the session with no recovery path. Now it drops
    // back to a real usable guest session immediately (matching first-load
    // behavior), and Navbar opens the sign-in modal right after so
    // "Switch Profile" actually lets you switch.
    localStorage.removeItem('cinemind_token');
    setUser(GUEST_USER);
  };

  const updatePreferences = async (prefs) => {
    try {
      const res = await apiClient.put('/auth/preferences', prefs);
      setUser(res.data);
    } catch (err) {
      console.error("Error updating preferences:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updatePreferences, isGuest: !!user?.is_guest }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
