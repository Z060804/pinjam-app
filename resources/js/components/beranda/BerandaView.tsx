import React from 'react';
import { ActiveTab } from '../../types';
import { HeroSection } from './HeroSection';
import { KategoriLayananSection } from './KategoriLayananSection';
import { ProsedurSection } from './ProsedurSection';

interface BerandaViewProps {
  onNavigate: (tab: ActiveTab) => void;
  onFilterCategory: (categoryId: number) => void;
}

export const BerandaView: React.FC<BerandaViewProps> = ({ onNavigate, onFilterCategory }) => {
  const handleSelectCategory = (categoryId: number) => {
    onFilterCategory(categoryId);
    onNavigate('ketersediaan');
  };

  return (
    <div className="space-y-6">
      <HeroSection onNavigate={onNavigate} />
      <KategoriLayananSection onSelectCategory={handleSelectCategory} />
      <ProsedurSection />
    </div>
  );
};
