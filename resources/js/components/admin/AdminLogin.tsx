import React from 'react';
import { Shield, Globe } from 'lucide-react';
import { AdminLoginForm } from './AdminLoginForm';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col items-center justify-center px-4 py-8">
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#009966] via-[#00cc88] to-[#009966]" />

      <div className="w-full max-w-md">
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

        <AdminLoginForm onLoginSuccess={onLoginSuccess} />

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
