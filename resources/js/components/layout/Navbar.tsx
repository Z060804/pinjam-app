import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ActiveTab } from '../../types';
import { Building2, Calendar, FilePlus2, Search, Menu, X, Landmark } from 'lucide-react';

interface NavbarProps {
  activeTab?: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
}

const navItems = [
  { key: 'beranda' as ActiveTab, path: '/', label: 'Beranda', icon: Landmark },
  { key: 'ketersediaan' as ActiveTab, path: '/ketersediaan', label: 'Ketersediaan & Kalender', icon: Calendar },
  { key: 'ajukan' as ActiveTab, path: '/pengajuan', label: 'Ajukan Peminjaman', icon: FilePlus2 },
  { key: 'pelacakan' as ActiveTab, path: '/pelacakan', label: 'Pelacakan', icon: Search },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab: propActiveTab, onTabChange }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = (): ActiveTab => {
    const p = location.pathname;
    if (p.startsWith('/ketersediaan')) return 'ketersediaan';
    if (p.startsWith('/pengajuan') || p.startsWith('/ajukan')) return 'ajukan';
    if (p.startsWith('/pelacakan')) return 'pelacakan';
    if (p === '/') return 'beranda';
    return propActiveTab ?? 'beranda';
  };

  const currentTab = getActiveTab();

  const handleSelect = (tab: ActiveTab, path: string) => {
    if (onTabChange) onTabChange(tab);
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            type="button"
            onClick={() => handleSelect('beranda', '/')}
            className="flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#009966] flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>SIMPRU</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-[#009966]">
                  Kemenag Sleman
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Kementerian Agama Kabupaten Sleman</p>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ key, path, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key, path)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  currentTab === key ? 'bg-emerald-50 text-[#009966] shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${currentTab === key ? 'text-[#009966]' : 'text-slate-400'}`} />
                {label}
              </button>
            ))}
          </nav>

          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navItems.map(({ key, path, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key, path)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium ${
                currentTab === key ? 'bg-emerald-50 text-[#009966]' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
