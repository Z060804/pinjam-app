import React, { useState } from 'react';
import { ActiveTab, ItemJenis } from '../types';
import { Navbar } from './layout/Navbar';
import { Footer } from './layout/Footer';
import { BerandaView } from './beranda/BerandaView';
import { KetersediaanView } from './ketersediaan/KetersediaanView';
import { AjukanPeminjamanView } from './ajukan/AjukanPeminjamanView';
import { PelacakanView } from './pelacakan/PelacakanView';

export const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('beranda');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [preSelectedItem, setPreSelectedItem] = useState<ItemJenis | null>(null);
  const [trackingId, setTrackingId] = useState<string>('');

  const handleBookFromCatalog = (item: ItemJenis) => {
    setPreSelectedItem(item);
    setActiveTab('ajukan');
  };

  const handleTrackRedirect = (id: string) => {
    setTrackingId(id);
    setActiveTab('pelacakan');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {activeTab === 'beranda' && (
          <BerandaView
            onNavigate={setActiveTab}
            onFilterCategory={setSelectedCategoryId}
          />
        )}

        {activeTab === 'ketersediaan' && (
          <KetersediaanView
            initialCategoryId={selectedCategoryId}
            onBookItem={handleBookFromCatalog}
          />
        )}

        {activeTab === 'ajukan' && (
          <AjukanPeminjamanView
            preSelectedItem={preSelectedItem}
            onTrackRedirect={handleTrackRedirect}
            onHomeRedirect={() => setActiveTab('beranda')}
          />
        )}

        {activeTab === 'pelacakan' && (
          <PelacakanView initialSearchId={trackingId} />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default MainApp;
