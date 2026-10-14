import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { adminLogin } from '../../services/adminApi';

interface AdminLoginFormProps {
  onLoginSuccess: () => void;
}

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await adminLogin(email, password);
      if (result.ok) {
        onLoginSuccess();
      } else {
        setError(result.message ?? 'Email atau kata sandi tidak sesuai. Akses ke area admin ditolak.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="admin-email" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Email Administrator
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Masukkan email admin"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#009966]/40 focus:border-[#009966] transition"
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Kata Sandi
          </label>
          <div className="relative">
            <input
              id="admin-password"
              type={showPass ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi"
              className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#009966]/40 focus:border-[#009966] transition"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              aria-label="Toggle password visibility"
            >
              {showPass ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs leading-relaxed font-medium">
            <Shield className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          id="admin-login-btn"
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#009966] hover:bg-[#008055] active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-md shadow-emerald-700/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Memverifikasi...' : 'Masuk Admin'}
        </button>
      </form>
    </div>
  );
};
