import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Memuat data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-9 h-9 border-3 border-emerald-200 border-t-[#009966] rounded-full animate-spin mb-3" />
      <p className="text-sm text-slate-500 font-medium">{message}</p>
    </div>
  );
};
