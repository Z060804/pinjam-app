import React from 'react';
import { STEP_NAMES } from '../../constants';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {STEP_NAMES.map((name, idx) => {
          const stepNum = idx + 1;
          const isDone = currentStep > stepNum;
          const isCurrent = currentStep === stepNum;

          return (
            <div
              key={name}
              className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold transition-all ${
                isCurrent
                  ? 'bg-emerald-50 text-[#009966] border border-emerald-200/80'
                  : isDone
                  ? 'text-slate-700 bg-slate-50'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isCurrent
                    ? 'bg-[#009966] text-white'
                    : isDone
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : stepNum}
              </div>
              <span className="truncate">{name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
