import React from 'react';
import { Link } from 'react-router-dom';
import { Bug, MessageSquare, HelpCircle, Mail, Github, ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo';
import { SUPPORT_EMAIL, GITHUB_ISSUES_URL } from '../config/contact';

const TOPICS = [
  {
    icon: Bug,
    title: 'Report a bug or problem',
    text: 'Something not loading, a wrong poster, a broken button, or results that look off? Tell us what you did and what you expected to see.',
  },
  {
    icon: MessageSquare,
    title: 'Share feedback',
    text: 'Ideas for new moods, filters or features are welcome, as are notes on recommendations that missed the mark.',
  },
  {
    icon: HelpCircle,
    title: 'App-related help',
    text: 'Questions about your watchlist, ratings, profile or taste dashboard, the Movie Assistant, or how your data is handled.',
  },
];

export default function Support() {
  const mailto = SUPPORT_EMAIL
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('CineMind support')}`
    : null;

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-cyan-500 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to CineMind home
      </Link>

      <header className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 p-[2px] shrink-0">
          <div className="w-full h-full bg-white dark:bg-cineverse-dark rounded-[14px] flex items-center justify-center">
            <Logo className="w-8 h-8" />
          </div>
        </div>
        <div>
          <p className="font-display font-extrabold text-lg text-slate-900 dark:text-white">
            Cine<span className="gradient-text">Mind</span> Support
          </p>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white">
            How can we help?
          </h1>
        </div>
      </header>

      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
        CineMind is a movie discovery and recommendation app. If something isn't working the way
        you expect, or you have an idea to make it better, get in touch using the options below.
      </p>

      <section className="grid gap-4 sm:grid-cols-3">
        {TOPICS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80">
            <Icon className="w-6 h-6 text-cyan-500 mb-3" />
            <h2 className="font-display font-bold text-slate-900 dark:text-white mb-1">{title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{text}</p>
          </div>
        ))}
      </section>

      <section className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800/80 space-y-4">
        <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Contact support</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          {mailto && (
            <a
              href={mailto}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold hover:opacity-90 transition-opacity"
            >
              <Mail className="w-5 h-5" /> Email {SUPPORT_EMAIL}
            </a>
          )}
          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={
              mailto
                ? 'inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:border-cyan-500 transition-colors'
                : 'inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold hover:opacity-90 transition-opacity'
            }
          >
            <Github className="w-5 h-5" /> Open an issue on GitHub
          </a>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          To help us fix things faster, include what you were doing, what happened, and the device
          and browser you used. Please don't include your password in any message.
        </p>
      </section>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        See how CineMind handles your information in the{' '}
        <Link to="/privacy" className="text-cyan-500 hover:underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}
