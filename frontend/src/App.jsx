import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MovieProvider } from './context/MovieContext';
import { ChatProvider } from './context/ChatContext';

import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MovieDetailsModal from './components/MovieDetailsModal';
import TrailerModal from './components/TrailerModal';
import VoiceSearchModal from './components/VoiceSearchModal';
import AIChatDrawer from './components/AIChatDrawer';

import Home from './pages/Home';
import WatchlistPage from './pages/WatchlistPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import Support from './pages/Support';
import Privacy from './pages/Privacy';

// Code-split the heaviest routes -- Discover (search/filter UI), Dashboard
// (pulls in the recharts chart library), and AdminDashboard are the
// biggest contributors to the single ~800KB bundle Vite was warning about.
// Splitting them means the initial load only pays for Home's dependencies;
// the rest downloads on navigation.
const Discover = lazy(() => import('./pages/Discover'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
    </div>
  );
}

const AUTH_ROUTES = ['/login', '/signup'];

/**
 * /login and /signup are full-bleed, full-viewport split-screen pages
 * (see AuthPage), not content that lives inside the app's normal
 * Navbar + max-w-7xl/padded <main> + Footer chrome -- so this renders
 * them on their own, outside that wrapper, instead of nested inside it.
 * Everything else keeps the standard layout. Needs to sit inside
 * <Router> since it reads the current route via useLocation.
 */
function AppShell() {
  const location = useLocation();
  const isAuthRoute = AUTH_ROUTES.includes(location.pathname);

  if (isAuthRoute) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-cineverse-lightBg dark:bg-cineverse-dark text-slate-900 dark:text-slate-100 font-sans selection:bg-cyan-500 selection:text-black transition-colors duration-300">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />

      {/* Modals & Floating Drawers */}
      <MovieDetailsModal />
      <TrailerModal />
      <VoiceSearchModal />
      <AIChatDrawer />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <MovieProvider>
            <ChatProvider>
              <Router>
                <AppShell />
              </Router>
            </ChatProvider>
          </MovieProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
