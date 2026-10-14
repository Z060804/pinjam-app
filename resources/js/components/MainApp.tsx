import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ItemJenis } from '../types';
import { Navbar } from './layout/Navbar';
import { Footer } from './layout/Footer';
import { BerandaView } from './beranda/BerandaView';
import { KetersediaanView } from './ketersediaan/KetersediaanView';
import { AjukanPeminjamanView } from './ajukan/AjukanPeminjamanView';
import { PelacakanView } from './pelacakan/PelacakanView';
import { NotFoundView } from './common/NotFoundView';

export const MainApp: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [preSelectedItem, setPreSelectedItem] = useState<ItemJenis | null>(null);

  const handleBookFromCatalog = (item: ItemJenis) => {
    setPreSelectedItem(item);
    navigate('/pengajuan', { state: { preSelectedItem: item } });
  };

  const handleFilterCategory = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    navigate(`/ketersediaan?kategori=${categoryId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <Routes>
          <Route
            path="/"
            element={
              <BerandaView
                onNavigate={(tab) => {
                  if (tab === 'ketersediaan') navigate('/ketersediaan');
                  else if (tab === 'ajukan') navigate('/pengajuan');
                  else if (tab === 'pelacakan') navigate('/pelacakan');
                  else navigate('/');
                }}
                onFilterCategory={handleFilterCategory}
              />
            }
          />
          <Route
            path="/ketersediaan"
            element={
              <KetersediaanView
                initialCategoryId={selectedCategoryId}
                onBookItem={handleBookFromCatalog}
              />
            }
          />
          <Route
            path="/pengajuan"
            element={<AjukanPeminjamanView preSelectedItem={preSelectedItem} />}
          />
          <Route path="/ajukan" element={<Navigate to="/pengajuan" replace />} />
          <Route path="/pelacakan" element={<PelacakanView />} />
          <Route path="/pelacakan/:id" element={<PelacakanView />} />
          <Route path="*" element={<NotFoundView homePath="/" portalLabel="Beranda SIMPRU" />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default MainApp;
