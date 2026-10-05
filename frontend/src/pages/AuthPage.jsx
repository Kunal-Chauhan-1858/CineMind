import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, LineChart, MessageCircle, Check, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

const BRAND_POINTS = [
  { icon: Compass, text: 'Vibe-based discovery, not just genre filters' },
  { icon: MessageCircle, text: 'Ask the Movie Assistant for anything, in plain language' },
  { icon: LineChart, text: 'A taste dashboard that actually learns from you' },
];

/**
 * Shared full-page layout for /login and /signup. Replaces the old
 * AuthModal popup -- these are real routed pages now (see App.jsx), not
 * an overlay, so there's no backdrop/close button/focus-trap to manage.
 * Rendering both routes through one component (mode="login" | "signup")
 * keeps the split-screen layout and all the auth logic in one place
 * instead of duplicating it across two files.
 */
export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Switching between /login and /signup re-renders this same component
  // with a new `mode` rather than mounting a fresh one (matches the old
  // tab-switch behavior, which only cleared the error and left whatever
  // had already been typed in place).
  useEffect(() => {
    setError('');
  }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend check for immediate feedback -- the backend re-validates
    // this independently on signup, since client-side checks alone can
    // always be bypassed.
    if (!isLogin && password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!isLogin && !(/[a-zA-Z]/.test(password) && /[0-9]/.test(password))) {
      setError('Password must contain at least one letter and one number.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, username, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || "Authentication failed. Check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2">
      {/* Brand panel -- hidden below md so mobile gets just the form.
          Forced dark via `media-overlay` (same convention HeroSpotlight /
          MovieDetailsModal use) so it keeps its identity in light mode
          instead of being flattened by the global light-theme overrides. */}
      <div className="hidden md:flex md:flex-col md:justify-between relative overflow-hidden p-10 lg:p-14 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 media-overlay">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl animate-pulse-glow" />
        <div className="absolute -bottom-28 -right-16 w-80 h-80 rounded-full bg-violet-600/20 blur-3xl animate-pulse-glow" />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-violet-600 to-amber-500 p-[2px] shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[9px] flex items-center justify-center">
                <Logo className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            <span className="font-display font-extrabold text-lg text-white">
              Cine<span className="gradient-text">Mind</span>
            </span>
          </Link>

          <h1 className="font-display font-black text-4xl lg:text-5xl text-white leading-[1.1] mt-12 max-w-md">
            Movie nights,<br />actually figured out.
          </h1>
          <p className="text-sm text-slate-400 mt-4 max-w-sm leading-relaxed">
            CineMind learns what you actually like — not just what's popular — and gets sharper every time you rate, save, or ask.
          </p>

          <ul className="space-y-4 mt-10">
            {BRAND_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-cyan-400" />
                </span>
                <span className="text-sm text-slate-300 leading-snug pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative border border-slate-800 rounded-2xl p-5 bg-slate-900/60 backdrop-blur-sm max-w-sm">
          <p className="font-display font-black text-3xl text-white">20 sec</p>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Average time from sign-up to your first personalized pick — no credit card, ever.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-6 py-14 sm:px-12 lg:px-20 bg-white dark:bg-cineverse-dark">
        <div className="w-full max-w-sm mx-auto">
          {/* Compact brand mark for mobile, where the left panel is hidden. */}
          <Link to="/" className="md:hidden inline-flex items-center gap-2 mb-10">
            <Logo className="w-7 h-7" />
            <span className="font-display font-extrabold text-lg text-slate-900 dark:text-white">
              Cine<span className="gradient-text">Mind</span>
            </span>
          </Link>

          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {isLogin ? 'Sign in to pick up right where you left off.' : 'Takes about 20 seconds — no credit card, ever.'}
          </p>

          {error && (
            <div className="mt-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {!isLogin && (
              <div>
                <label htmlFor="auth-username" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Username
                </label>
                <input
                  id="auth-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 transition-all"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                required
                minLength={!isLogin ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 transition-all"
              />
            </div>

            {/* Lightweight live password-requirement checklist, shown
                only on signup -- clearer than a placeholder hint that
                disappears the moment you start typing. */}
            {!isLogin && (
              <div className="flex items-center gap-4 pl-0.5">
                <span className={`flex items-center gap-1 text-xs font-medium transition-colors ${password.length >= 8 ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  <Check className="w-3.5 h-3.5" /> 8+ characters
                </span>
                <span className={`flex items-center gap-1 text-xs font-medium transition-colors ${/[a-zA-Z]/.test(password) && /[0-9]/.test(password) ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  <Check className="w-3.5 h-3.5" /> Letter &amp; number
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 disabled:opacity-50 text-black font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all hover:shadow-cyan-500/30"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In to CineMind' : 'Create Account')}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Link
              to={isLogin ? '/signup' : '/login'}
              className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </Link>
          </p>

          <div className="flex items-center gap-3 mt-8">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>

          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Continue browsing as guest
          </button>
        </div>
      </div>
    </div>
  );
}
