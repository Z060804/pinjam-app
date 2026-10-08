import React from 'react';
import { CheckCircle2, Clock, FileText } from 'lucide-react';

export const ProsedurSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Pilih kebutuhan',
      desc: 'Periksa ketersediaan dan pilih satu atau beberapa item yang Anda butuhkan.',
      icon: CheckCircle2,
    },
    {
      num: '02',
      title: 'Lengkapi permohonan',
      desc: 'Isi data peminjam, jadwal, keperluan, dan unggah surat peminjaman.',
      icon: FileText,
    },
    {
      num: '03',
      title: 'Pantau proses',
      desc: 'Tinjau permohonan sebelum dikirim, lalu pantau persetujuannya melalui Pelacakan.',
      icon: Clock,
    },
  ];

  return (
    <section className="py-12 border-t border-slate-200/80 my-8">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900">
          Peminjaman yang jelas, dari awal hingga selesai.
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Alur terstruktur dan transparan untuk seluruh pegawai dan unit kerja Kemenag Sleman.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-xs relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-black text-[#009966]/30">{step.num}</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#009966] flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
