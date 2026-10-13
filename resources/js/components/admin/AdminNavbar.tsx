import React from 'react';
import { Building2, LogOut, LayoutDashboard, DoorOpen, Car, Package, Globe } from 'lucide-react';
import { AdminActiveTab } from '../../types/admin';

interface AdminNavbarProps {
  activeTab: AdminActiveTab;
  onTabChange: (tab: AdminActiveTab) => void;
  adminName: string;
  adminEmail: string;
  onLogout: () => void;
}

const navItems: { key: AdminActiveTab; label: string; icon: React.ElementType }[] = [
  { key: 'rekap', label: 'Rekap Peminjaman', icon: LayoutDashboard },
  { key: 'ruangan', label: 'Ruangan', icon: DoorOpen },
  { key: 'kendaraan', label: 'Kendaraan', icon: Car },
  { key: 'perlengkapan', label: 'Perlengkapan', icon: Package },
];

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  activeTab,
  onTabChange,
  adminName,
  adminEmail,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <a
            href="/"
            title="Kunjungi Portal Publik SIMPRU"
            className="flex items-center gap-3 shrink-0 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 text-[#009966]" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 leading-none group-hover:text-[#009966] transition-colors">SIMPRU Admin</div>
              <div className="text-[10px] text-slate-400 leading-none mt-0.5">Kementerian Agama Kabupaten Sleman</div>
            </div>
          </a>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  id={`admin-nav-${item.key}`}
                  type="button"
                  onClick={() => onTabChange(item.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'text-[#009966] bg-emerald-50'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#009966]' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User & logout */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#009966] hover:bg-emerald-50 border border-slate-200 transition-all cursor-pointer"
              title="Kunjungi Portal Publik"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              Portal Publik
            </a>
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-slate-800 leading-none">{adminName}</div>
              <div className="text-[10px] text-slate-400 leading-none mt-0.5">{adminEmail}</div>
            </div>
            <button
              id="admin-logout-btn"
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-slate-100 bg-white px-4 py-2 flex gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onTabChange(item.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                isActive ? 'bg-emerald-50 text-[#009966]' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
