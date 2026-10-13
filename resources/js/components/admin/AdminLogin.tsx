import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Loader2, ArrowLeft, Globe } from 'lucide-react';
import { adminLogin } from '../../services/adminApi';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
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
        setError(result.message || 'Email atau kata sandi tidak sesuai. Akses ke area admin ditolak.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col items-center justify-center px-4 py-8">
      {/* Header bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#009966] via-[#00cc88] to-[#009966]" />

      <div className="w-full max-w-md">
        {/* Navigasi Kembali ke Portal Publik */}
        <div className="mb-6 flex items-center justify-between">
          <a
            href="/"
            id="btn-back-to-public"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#009966] bg-white hover:bg-emerald-50 px-3.5 py-2 rounded-xl border border-slate-200 transition shadow-xs cursor-pointer"
            title="Kembali ke halaman publik SIMPRU"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Portal Publik</span>
          </a>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/70 px-2.5 py-1 rounded-lg">
            Area Khusus Admin
          </span>
        </div>

        {/* Logo & title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-lg border border-slate-200/80 mb-4">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Kemenag.svg/1200px-Kemenag.svg.png"
              alt="Kemenag"
              className="w-12 h-12 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <Shield className="w-10 h-10 text-[#009966] hidden" />
          </div>
          <p className="text-xs font-bold tracking-widest text-[#009966] uppercase mb-1">
            Administrasi SIMPRU
          </p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Masuk Admin</h1>
          <p className="text-sm text-slate-500 mt-2">
            Silakan masukkan email dan kata sandi resmi untuk mengelola permohonan.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
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

            {/* Password */}
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

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs leading-relaxed font-medium">
                <Shield className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
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

        {/* Footer text */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-xs text-slate-400">
            Akses area ini dibatasi khusus untuk petugas administrator SIMPRU Kemenag Sleman.
          </p>
          <div>
            <a
              href="/"
              className="text-xs font-semibold text-slate-500 hover:text-[#009966] transition inline-flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              Buka Halaman Publik Layanan SIMPRU
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
