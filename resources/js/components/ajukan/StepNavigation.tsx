import React from 'react';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';

interface StepNavigationProps {
  step: number;
  canProceed: boolean;
  isSubmitting: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  step,
  canProceed,
  isSubmitting,
  onPrev,
  onNext,
  onSubmit,
}) => {
  return (
    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
      <button
        type="button"
        disabled={step === 1}
        onClick={onPrev}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
          step === 1 ? 'opacity-40 cursor-not-allowed text-slate-400' : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
        }`}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Kembali
      </button>

      {step < 4 ? (
        <button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer shadow-xs transition-all ${
            canProceed ? 'bg-[#009966] hover:bg-[#008055]' : 'bg-slate-300 cursor-not-allowed opacity-60'
          }`}
        >
          Lanjut
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          type="button"
          disabled={isSubmitting || !canProceed}
          onClick={onSubmit}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#009966] hover:bg-[#008055] cursor-pointer shadow-md shadow-emerald-700/20"
        >
          <Send className="w-3.5 h-3.5" />
          {isSubmitting ? 'Mengirim...' : 'Kirim Permohonan'}
        </button>
      )}
    </div>
  );
};
