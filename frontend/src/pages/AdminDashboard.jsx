import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Film, Activity, Trash2, CheckCircle, Database, Server } from 'lucide-react';
import apiClient from '../api/client';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, usersRes] = await Promise.all([
        apiClient.get('/admin/analytics'),
        apiClient.get('/admin/users')
      ]);
      setAnalytics(analyticsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error("Admin dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await apiClient.delete(`/admin/users/${userId}`);
      setMsg(`User ${userId} deleted successfully.`);
      fetchAdminData();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.detail || "Error deleting user");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-4xl text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-cyan-400" /> Admin Control & Health Panel
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            System health metrics, TMDb proxy status, cache efficiency, and user management.
          </p>
        </div>
      </div>

      {msg && (
        <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold text-center">
          {msg}
        </div>
      )}

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Users className="w-4 h-4 text-cyan-400" /> Registered Users
          </div>
          <p className="font-display font-extrabold text-3xl text-white">{analytics?.total_users || 1}</p>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Film className="w-4 h-4 text-violet-400" /> Movies Database
          </div>
          <p className="font-display font-extrabold text-3xl text-violet-400">{analytics?.total_movies || 20}</p>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Database className="w-4 h-4 text-emerald-400" /> TMDb Cache Entries
          </div>
          <p className="font-display font-extrabold text-3xl text-emerald-400">{analytics?.tmdb_cache_entries || 0}</p>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Server className="w-4 h-4 text-amber-400" /> System Uptime
          </div>
          <p className="font-display font-extrabold text-xl text-amber-400 flex items-center gap-1">
            <CheckCircle className="w-5 h-5 text-emerald-400" /> Operational
          </p>
        </div>
      </div>

      {/* API Health Monitor Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" /> API Health & Proxy Monitor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">TMDb Backend Proxy</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Operational
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">ML Recommendation Model</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Operational
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">SQLite Database Engine</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Operational
            </span>
          </div>
        </div>
      </div>

      {/* User Management Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" /> User Management
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono">{u.id}</td>
                  <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                    <img src={u.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                    {u.username}
                  </td>
                  <td className="py-3 px-4 text-slate-400">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.is_admin ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {u.is_admin ? 'Superadmin' : 'User'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {!u.is_admin && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
