import React from 'react';
import { STATUS_PEMINJAMAN } from '../../constants';

interface BadgeStatusProps {
  status: string;
}

export const BadgeStatus: React.FC<BadgeStatusProps> = ({ status }) => {
  const getBadgeStyle = (currentStatus: string): string => {
    switch (currentStatus) {
      case STATUS_PEMINJAMAN.DISETUJUI:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case STATUS_PEMINJAMAN.MENUNGGU:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case STATUS_PEMINJAMAN.DITOLAK:
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case STATUS_PEMINJAMAN.SELESAI:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle(
        status
      )}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75" />
      {status}
    </span>
  );
};
