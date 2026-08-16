import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Film, Bot, User, ArrowRight, Minimize2 } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useMovies } from '../context/MovieContext';

const QUICK_PROMPTS = [
  "Mind-Bending Sci-Fi Thriller",
  "Cozy Feel-Good 90s Film",
  "Top Rated Bollywood Movies",
  "Christopher Nolan Masterpieces"
];

export default function AIChatDrawer() {
  const { isOpen, toggleChat, messages, sendMessage, loading } = useChat();
  const { setSelectedMovie } = useMovies();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = (textToSend) => {
    const query = textToSend || input;
    if (query.trim()) {
      sendMessage(query);
      setInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[94vw] sm:w-[400px] h-[520px] max-h-[85vh] glass-panel rounded-3xl shadow-2xl border border-cyan-500/40 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
      {/* Drawer Header */}
      <div className="p-3.5 bg-gradient-to-r from-violet-950/90 via-slate-900 to-cyan-950/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Bot className="w-4 h-4 text-black font-bold" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
              Movie Assistant
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-cyan-300/80">Natural Language Cinema Engine</p>
          </div>
        </div>

        <button
          onClick={toggleChat}
          className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="Minimize Assistant"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </div>
            )}

            <div className={`max-w-[82%] p-3 rounded-2xl space-y-2 ${
              msg.role === 'user'
                ? 'bg-gradient-to-r from-cyan-600 to-violet-600 text-white rounded-br-none'
                : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none'
            }`}>
              <p className="leading-relaxed text-xs">{msg.message}</p>

              {/* Suggested Movies Carousel inside chat */}
              {msg.suggested_movies && msg.suggested_movies.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <p className="text-[10px] font-bold uppercase text-cyan-400">Recommended Movies:</p>
                  <div className="space-y-1.5">
                    {msg.suggested_movies.map(m => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMovie(m)}
                        className="flex items-center justify-between p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img src={m.poster_path} alt={m.title} className="w-6 h-9 object-cover rounded" />
                          <div className="truncate">
                            <p className="font-bold text-white text-[11px] truncate group-hover:text-cyan-400">{m.title}</p>
                            <p className="text-[10px] text-slate-400">{m.release_year} • {m.genres && m.genres[0]}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-slate-300" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 items-center text-cyan-400 text-xs italic">
            <Sparkles className="w-4 h-4 animate-spin" /> Movie Assistant is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-3 py-1.5 bg-slate-950/60 border-t border-slate-900 overflow-x-auto flex gap-1.5 no-scrollbar">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSend(prompt)}
            className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything (e.g. Recommend dark thrillers)..."
          className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
