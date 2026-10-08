import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import { ItemJenis, CartItem, MasterJenis, FormPeminjamanState } from '../../types';
import { StepIndicator } from './StepIndicator';
import { StepPilihItem } from './StepPilihItem';
import { StepDataPeminjam } from './StepDataPeminjam';
import { StepWaktuDanKeperluan } from './StepWaktuDanKeperluan';
import { StepUnggahSurat } from './StepUnggahSurat';
import { RingkasanSidebar } from './RingkasanSidebar';
import { SuccessModal } from './SuccessModal';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';

interface AjukanPeminjamanViewProps {
  preSelectedItem: ItemJenis | null;
  onTrackRedirect: (id: string) => void;
  onHomeRedirect: () => void;
}

export const AjukanPeminjamanView: React.FC<AjukanPeminjamanViewProps> = ({
  preSelectedItem,
  onTrackRedirect,
  onHomeRedirect,
}) => {
  const [step, setStep] = useState<number>(1);
  const [items, setItems] = useState<ItemJenis[]>([]);
  const [categories, setCategories] = useState<MasterJenis[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const [form, setForm] = useState<FormPeminjamanState>({
    nip: '',
    nama_peminjam: '',
    unit_kerja: '',
    mulai: '2026-10-15T08:00',
    selesai: '2026-10-15T15:00',
    keperluan: '',
    surat_peminjaman_name: 'surat_permohonan.pdf',
    selected_items: [],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [resCats, resItems] = await Promise.all([
          axios.get('/api/master/jenis'),
          axios.get('/api/item/jenis'),
        ]);
        setCategories(resCats.data?.data || []);
        setItems(resItems.data?.data || []);
      } catch (err) {
        console.error('Failed to load item data:', err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (preSelectedItem) {
      setForm((prev) => ({
        ...prev,
        selected_items: [{ item: preSelectedItem, jumlah: 1 }],
      }));
    }
  }, [preSelectedItem]);

  const handleToggleItem = (item: ItemJenis, jumlah: number) => {
    setForm((prev) => {
      const exists = prev.selected_items.find((c) => c.item.id === item.id);
      if (exists) {
        return {
          ...prev,
          selected_items: prev.selected_items.filter((c) => c.item.id !== item.id),
        };
      }
      return { ...prev, selected_items: [...prev.selected_items, { item, jumlah }] };
    });
  };

  const handleUpdateQty = (itemId: number, delta: number) => {
    setForm((prev) => ({
      ...prev,
      selected_items: prev.selected_items
        .map((c) => (c.item.id === itemId ? { ...c, jumlah: Math.max(1, c.jumlah + delta) } : c)),
    }));
  };

  const handleRemoveItem = (itemId: number) => {
    setForm((prev) => ({
      ...prev,
      selected_items: prev.selected_items.filter((c) => c.item.id !== itemId),
    }));
  };

  const handleFieldChange = (field: keyof FormPeminjamanState, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const canProceed = (): boolean => {
    if (step === 1) return form.selected_items.length > 0;
    if (step === 2) return Boolean(form.nip.trim() && form.nama_peminjam.trim() && form.unit_kerja.trim());
    if (step === 3) return Boolean(form.mulai && form.selesai && form.keperluan.trim());
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await axios.post('/api/peminjaman', {
        ...form,
        mulai: form.mulai.replace('T', ' ') + ':00',
        selesai: form.selesai.replace('T', ' ') + ':00',
      });
      setCreatedId(response.data?.data?.id_peminjaman || 'PMJ-SUCCESS');
    } catch (err) {
      console.error('Error submitting peminjaman:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Ajukan Peminjaman</h1>
        <p className="text-sm text-slate-500 mt-1">
          Satu permohonan untuk seluruh item yang Anda butuhkan. Siapkan data peminjam dan surat peminjaman.
        </p>
      </div>

      <StepIndicator currentStep={step} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div className="min-h-[350px]">
            {step === 1 && (
              <StepPilihItem
                items={items}
                categories={categories}
                selectedItems={form.selected_items}
                onToggleItem={handleToggleItem}
              />
            )}
            {step === 2 && (
              <StepDataPeminjam
                nip={form.nip}
                namaPeminjam={form.nama_peminjam}
                unitKerja={form.unit_kerja}
                onChangeField={(f, v) => handleFieldChange(f, v)}
              />
            )}
            {step === 3 && (
              <StepWaktuDanKeperluan
                mulai={form.mulai}
                selesai={form.selesai}
                keperluan={form.keperluan}
                onChangeField={(f, v) => handleFieldChange(f, v)}
              />
            )}
            {step === 4 && (
              <StepUnggahSurat
                suratName={form.surat_peminjaman_name}
                onFileChange={(fn) => handleFieldChange('surat_peminjaman_name', fn)}
                nip={form.nip}
                namaPeminjam={form.nama_peminjam}
                mulai={form.mulai}
                selesai={form.selesai}
              />
            )}
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
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
                disabled={!canProceed()}
                onClick={() => setStep((s) => s + 1)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer shadow-xs transition-all ${
                  canProceed()
                    ? 'bg-[#009966] hover:bg-[#008055]'
                    : 'bg-slate-300 cursor-not-allowed opacity-60'
                }`}
              >
                Lanjut
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || !canProceed()}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#009966] hover:bg-[#008055] cursor-pointer shadow-md shadow-emerald-700/20"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? 'Mengirim...' : 'Kirim Permohonan'}
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <RingkasanSidebar
            selectedItems={form.selected_items}
            onRemoveItem={handleRemoveItem}
            onUpdateQty={handleUpdateQty}
          />
        </div>
      </div>

      {createdId && (
        <SuccessModal
          idPeminjaman={createdId}
          onTrack={onTrackRedirect}
          onClose={onHomeRedirect}
        />
      )}
    </div>
  );
};
