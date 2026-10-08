import React from 'react';
import { DoorOpen, Car, Monitor, ArrowRight } from 'lucide-react';
import { CATEGORY_IDS } from '../../constants';

interface KategoriLayananSectionProps {
  onSelectCategory: (categoryId: number) => void;
}

export const KategoriLayananSection: React.FC<KategoriLayananSectionProps> = ({ onSelectCategory }) => {
  const categories = [
    {
      id: CATEGORY_IDS.RUANGAN,
      title: 'Ruangan',
      description: 'Ruang rapat, multimedia, dan Smartroom untuk kegiatan kerja.',
      icon: DoorOpen,
    },
    {
      id: CATEGORY_IDS.KENDARAAN,
      title: 'Kendaraan',
      description: 'Kendaraan operasional untuk mendukung mobilitas kedinasan.',
      icon: Car,
    },
    {
      id: CATEGORY_IDS.ALAT,
      title: 'Alat',
      description: 'Laptop, proyektor, dan perangkat penunjang kegiatan Anda.',
      icon: Monitor,
    },
  ];

  return (
    <section className="py-8">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Apa yang ingin Anda pinjam?</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#009966] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{cat.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{cat.description}</p>
              </div>
              <div className="pt-6 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#009966] group-hover:translate-x-1 transition-transform cursor-pointer"
                >
                  Lihat ketersediaan
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
