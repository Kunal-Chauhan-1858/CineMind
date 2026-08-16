import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
} from 'recharts';

const COLORS = ['#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#6366F1'];

// Fixed axis order matching the vibe pills everywhere else in the app
// (VibeFilterBar, the Movie Assistant's mood detection). Previously the radar chart
// only plotted whichever vibes happened to appear in the user's data,
// so someone with e.g. 3 tagged vibes saw a triangle instead of the full
// shape -- confusing to read as a "matrix" since the shape itself changed
// per user instead of just the fill. Every axis is now always present,
// at 0 if the user hasn't touched that vibe yet.
const ALL_VIBES = ['Mind-Bending', 'Adrenaline Rush', 'Dark & Gritty', 'Feel-Good', 'Thought-Provoking', 'Cyberpunk', 'Bollywood'];

export default function TasteAnalyticsChart({ data }) {
  if (!data) return null;

  const genreData = Object.entries(data.genre_distribution || {}).map(([name, value]) => ({
    name,
    value
  }));

  // Normalize to a 0-100 share of the user's total vibe-tagged
  // interactions, instead of raw count * 10 (which made the radius encode
  // an arbitrary, hard-to-compare absolute number rather than a
  // proportion of taste).
  const vibeCounts = data.vibe_distribution || {};
  const totalVibeCount = Object.values(vibeCounts).reduce((a, b) => a + b, 0);
  const vibeData = ALL_VIBES.map((vibe) => ({
    subject: vibe,
    score: totalVibeCount > 0 ? Math.round(((vibeCounts[vibe] || 0) / totalVibeCount) * 100) : 0,
  }));

  // "Rated Movies per Release Year" bar chart -- the backend already
  // computed this bucketing, just wasn't rendered anywhere.
  const yearData = data.movies_per_year || [];

  // "Watching Activity Timeline" area chart -- same story, the backend
  // computed watching_timeline months ago and the frontend never plotted it.
  const timelineData = data.watching_timeline || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
      {/* Genre Distribution Pie Chart */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
        <div className="mb-2">
          <h3 className="font-display font-bold text-base text-white">Favorite Genres breakdown</h3>
          <p className="text-[11px] text-slate-500">From movies you've rated, watchlisted, or liked</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={genreData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {genreData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1F293D', borderRadius: '12px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          {genreData.map((entry, i) => (
            <span key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              {entry.name} ({entry.value})
            </span>
          ))}
        </div>
      </div>

      {/* Vibe Affinity Radar Matrix */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
        <div className="mb-2">
          <h3 className="font-display font-bold text-base text-white">Vibe Affinity Matrix</h3>
          <p className="text-[11px] text-slate-500">% share of your taste across each mood</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={vibeData}>
              <PolarGrid stroke="#1F293D" />
              <PolarAngleAxis dataKey="subject" stroke="#94A3B8" tick={{ fontSize: 9 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#1F293D" tick={{ fontSize: 9 }} />
              <Radar name="Affinity" dataKey="score" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.3} />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Share of your taste']}
                contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1F293D', borderRadius: '12px', fontSize: '12px' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center text-xs text-slate-400">
          Dominant Vibe Preference: <span className="font-bold text-cyan-400">{data.top_vibe || '—'}</span>
        </div>
      </div>

      {/* Rated Movies per Release Year -- bar chart */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
        <div className="mb-2">
          <h3 className="font-display font-bold text-base text-white">Rated Movies per Release Year</h3>
          <p className="text-[11px] text-slate-500">How your picks spread across release years</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" vertical={false} />
              <XAxis dataKey="year" stroke="#94A3B8" tick={{ fontSize: 10 }} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1F293D', borderRadius: '12px', fontSize: '12px' }}
                cursor={{ fill: 'rgba(6,182,212,0.08)' }}
              />
              <Bar dataKey="count" fill="#06B6D4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Watching Activity Timeline -- area chart */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
        <div className="mb-2">
          <h3 className="font-display font-bold text-base text-white">Watching Activity Timeline</h3>
          <p className="text-[11px] text-slate-500">Ratings logged per month</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" vertical={false} />
              <XAxis dataKey="month" stroke="#94A3B8" tick={{ fontSize: 10 }} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1F293D', borderRadius: '12px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="count" stroke="#06B6D4" fill="url(#activityGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
