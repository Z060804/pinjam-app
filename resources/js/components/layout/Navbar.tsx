import React, { useState } from 'react';
import { ActiveTab } from '../../types';
import { Building2, Calendar, FilePlus2, Search, Menu, X, Landmark } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const navItems = [
  { key: 'beranda' as ActiveTab, label: 'Beranda', icon: Landmark },
  { key: 'ketersediaan' as ActiveTab, label: 'Ketersediaan & Kalender', icon: Calendar },
  { key: 'ajukan' as ActiveTab, label: 'Ajukan Peminjaman', icon: FilePlus2 },
  { key: 'pelacakan' as ActiveTab, label: 'Pelacakan', icon: Search },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const handleSelect = (tab: ActiveTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            type="button"
            onClick={() => handleSelect('beranda')}
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
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === key ? 'bg-emerald-50 text-[#009966] shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${activeTab === key ? 'text-[#009966]' : 'text-slate-400'}`} />
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
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium ${
                activeTab === key ? 'bg-emerald-50 text-[#009966]' : 'text-slate-700 hover:bg-slate-50'
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
