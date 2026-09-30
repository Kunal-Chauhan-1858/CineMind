import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo';
import { SUPPORT_EMAIL, GITHUB_ISSUES_URL, POLICY_LAST_UPDATED } from '../config/contact';

const linkClass = 'text-cyan-500 hover:underline';

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">{title}</h2>
      <div className="text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function Bullets({ items }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

export default function Privacy() {
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
          <h1 className="font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Last updated: {POLICY_LAST_UPDATED}</p>
        </div>
      </header>

      <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 leading-relaxed">
        This Privacy Policy applies to <strong>CineMind</strong>, the movie discovery and recommendation
        app available at cine-mind-mu.vercel.app, including its Movie Assistant, watchlist and taste
        dashboard. It explains, in plain language, what CineMind collects and why.
      </div>

      <Section title="What information CineMind collects">
        <p><strong>If you create an account,</strong> CineMind stores:</p>
        <Bullets items={[
          'Your email address, username and (optionally) your display name.',
          'Your password, stored only as a one-way hash (bcrypt), never as plain text.',
          'An avatar link generated from your username, and your taste preferences (favorite genres, vibes, directors and actors).',
        ]} />
        <p><strong>As you use the app,</strong> CineMind stores what you choose to save:</p>
        <Bullets items={[
          'Ratings, reviews, favorites, and watchlist entries with their status (want to watch, watching, completed, dropped).',
          'Replies from the Movie Assistant and the movies it suggested. The text you type to the assistant is used to work out a reply; the app does not save your typed message.',
        ]} />
        <p>
          <strong>If you use CineMind without signing in,</strong> actions such as adding to a watchlist may be
          saved to a shared guest profile that is not tied to you and can be seen by other signed-out
          visitors. Create an account if you want a private watchlist.
        </p>
      </Section>

      <Section title="How information is used">
        <Bullets items={[
          'To sign you in and keep your account working.',
          'To show your watchlist, ratings and favorites, and to build your personal taste dashboard.',
          'To rank movie recommendations using content similarity, ratings, mood/genre match, and (when you have rated movies or set preferences) your own activity and preferences.',
          'To display reviews to other users, and to moderate the service.',
        ]} />
      </Section>

      <Section title="Searches and recommendations">
        <p>
          Your searches, mood and genre selections, and Movie Assistant messages are sent to the CineMind
          server to return results. CineMind does not include any advertising or analytics tools, and the
          app does not keep a saved history of your searches.
        </p>
      </Section>

      <Section title="Cookies and local storage">
        <p>
          CineMind's own code does not set cookies. It uses your browser's local storage for two items:
        </p>
        <Bullets items={[
          'cinemind_token: keeps you signed in on this device.',
          'cinemind_theme: remembers your light/dark theme choice.',
        ]} />
        <p>
          You can clear these at any time in your browser settings or by signing out. Content loaded from
          third parties (see below), such as embedded trailer videos, may set their own cookies under their
          own policies.
        </p>
      </Section>

      <Section title="Third-party services CineMind uses">
        <Bullets items={[
          'The Movie Database (TMDB): source of movie information and poster/backdrop images. The CineMind server requests movie data from TMDB, and your browser loads images from TMDB\'s image servers.',
          'YouTube: trailers are shown in an embedded player or through a link to a YouTube search.',
          'Google Fonts: fonts are loaded from Google when the app opens.',
          'DiceBear: generates the default avatar image from your username.',
          'Unsplash: stock photos used for selectable profile pictures and default avatars.',
          'Vercel and our backend hosting provider: host the website and the service that stores account data. Hosting providers may keep standard server logs, such as IP addresses.',
        ]} />
        <p>
          When your browser loads content directly from these services, they can receive information such as
          your IP address and browser details, and are governed by their own privacy policies.
        </p>
        <p className="text-sm">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </Section>

      <Section title="Data sharing">
        <p>
          CineMind does not sell your personal information. Reviews you post are visible to other users
          together with your username and avatar. The CineMind administrator can see account details (such
          as email and username) for maintenance and moderation. Information is otherwise shared only with
          the hosting and third-party services described above, as needed to run the app.
        </p>
      </Section>

      <Section title="Data security">
        <p>
          Passwords are stored as hashes, sign-in uses expiring tokens, and repeated sign-in attempts are
          rate-limited. No online service can guarantee perfect security, so please use a strong, unique
          password.
        </p>
      </Section>

      <Section title="Your choices and rights">
        <Bullets items={[
          'Update your genre, vibe, director and actor preferences from your profile.',
          'Remove movies from your watchlist or change their status at any time.',
          'Sign out to remove the sign-in token from your browser.',
          'Contact us to ask what is stored about you, to correct it, or to have your account and its data deleted.',
        ]} />
      </Section>

      <Section title="Children">
        <p>CineMind is not directed at children under 13, and we do not knowingly collect their information.</p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If CineMind's practices change, this page will be updated and the "Last updated" date above will
          change.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy or your data? Visit our{' '}
          <Link to="/support" className={linkClass}>Support page</Link>
          {SUPPORT_EMAIL && (
            <>, or email <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>{SUPPORT_EMAIL}</a></>
          )}
          , or open an issue on{' '}
          <a href={GITHUB_ISSUES_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>GitHub</a>.
        </p>
      </Section>
    </div>
  );
}
