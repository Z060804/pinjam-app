import React from 'react';

interface RekapStatsCardsProps {
  counts: {
    menunggu: number;
    disetujui: number;
    ditolak: number;
    dibatalkan: number;
  };
}

export const RekapStatsCards: React.FC<RekapStatsCardsProps> = ({ counts }) => {
  const stats = [
    { label: 'Menunggu', count: counts.menunggu, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    { label: 'Disetujui', count: counts.disetujui, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Ditolak', count: counts.ditolak, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
    { label: 'Dibatalkan', count: counts.dibatalkan, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4`}>
          <div className={`text-2xl font-extrabold ${s.color}`}>{s.count}</div>
          <div className="text-xs font-semibold text-slate-500 mt-0.5 uppercase tracking-wide">{s.label}</div>
        </div>
      ))}
    </div>
  );
};
