import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, DoorOpen, Car, Package, Globe } from 'lucide-react';
import { AdminActiveTab } from '../../types/admin';

interface AdminNavbarProps {
  activeTab?: AdminActiveTab;
  onTabChange?: (tab: AdminActiveTab) => void;
  adminName: string;
  adminEmail: string;
  onLogout: () => void;
}

const navItems: { key: AdminActiveTab; path: string; label: string; icon: React.ElementType }[] = [
  { key: 'rekap', path: '/admin/rekap', label: 'Rekap Peminjaman', icon: LayoutDashboard },
  { key: 'ruangan', path: '/admin/ruangan', label: 'Ruangan', icon: DoorOpen },
  { key: 'kendaraan', path: '/admin/kendaraan', label: 'Kendaraan', icon: Car },
  { key: 'perlengkapan', path: '/admin/perlengkapan', label: 'Perlengkapan', icon: Package },
];

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  activeTab: propActiveTab,
  onTabChange,
  adminName,
  adminEmail,
  onLogout,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = (): AdminActiveTab => {
    const p = location.pathname;
    if (p.includes('/ruangan')) return 'ruangan';
    if (p.includes('/kendaraan')) return 'kendaraan';
    if (p.includes('/perlengkapan')) return 'perlengkapan';
    if (p.includes('/rekap') || p === '/admin') return 'rekap';
    return propActiveTab ?? 'rekap';
  };

  const currentTab = getActiveTab();

  const handleSelect = (key: AdminActiveTab, path: string) => {
    if (onTabChange) onTabChange(key);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200/80 shadow-xs">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-slate-200/80 p-1 shrink-0 shadow-xs">
              <img
                src="/kemenag-logo.webp"
                alt="Logo Kemenag Sleman"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 leading-none">SIMPRU Admin</div>
              <div className="text-[10px] text-slate-400 leading-none mt-1 hidden xs:block">Kemenag Sleman</div>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 shrink-0">
            {navItems.map(({ key, path, label, icon: Icon }) => (
              <button
                key={key}
                id={`admin-nav-${key}`}
                type="button"
                onClick={() => handleSelect(key, path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  currentTab === key ? 'text-[#009966] bg-emerald-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${currentTab === key ? 'text-[#009966]' : 'text-slate-400'}`} />
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <a
              href="/"
              id="admin-back-to-portal-btn"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#009966] hover:bg-emerald-50 border border-slate-200 transition-all cursor-pointer"
              title="Kembali ke Portal Pelanggan"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Portal Pelanggan</span>
            </a>
            <div className="hidden xl:block text-right">
              <div className="text-xs font-bold text-slate-800 leading-none">{adminName}</div>
              <div className="text-[10px] text-slate-400 leading-none mt-0.5">{adminEmail}</div>
            </div>
            <button
              id="admin-logout-btn"
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="lg:hidden border-t border-slate-100 bg-white">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {navItems.map(({ key, path, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key, path)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer shrink-0 ${
                currentTab === key ? 'bg-emerald-50 text-[#009966] font-bold' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
