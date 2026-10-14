import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import { ItemJenis, MasterJenis, FormPeminjamanState } from '../../types';
import { StepIndicator } from './StepIndicator';
import { StepPilihItem } from './StepPilihItem';
import { StepDataPeminjam } from './StepDataPeminjam';
import { StepWaktuDanKeperluan } from './StepWaktuDanKeperluan';
import { StepUnggahSurat } from './StepUnggahSurat';
import { RingkasanSidebar } from './RingkasanSidebar';
import { SuccessModal } from './SuccessModal';
import { StepNavigation } from './StepNavigation';
import { submitPeminjaman } from './ajukanSubmit';
import { AlertTriangle } from 'lucide-react';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [form, setForm] = useState<FormPeminjamanState>({
    nip: '',
    nama_peminjam: '',
    unit_kerja: '',
    nomor_hp: '',
    mulai: '2026-10-15T08:00',
    selesai: '2026-10-15T15:00',
    keperluan: '',
    surat_peminjaman_name: '',
    selected_items: [],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [resCats, resItems] = await Promise.all([
          axios.get('/api/master/jenis'),
          axios.get('/api/item/jenis'),
        ]);
        setCategories(resCats.data?.data ?? []);
        setItems(resItems.data?.data ?? []);
      } catch {
        // Fallback gracefully
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
    setErrorMessage(null);
    setForm((prev) => {
      const exists = prev.selected_items.find((c) => c.item.id === item.id);
      if (exists) {
        return { ...prev, selected_items: prev.selected_items.filter((c) => c.item.id !== item.id) };
      }
      return { ...prev, selected_items: [...prev.selected_items, { item, jumlah }] };
    });
  };

  const handleUpdateQty = (itemId: number, delta: number) => {
    setErrorMessage(null);
    setForm((prev) => ({
      ...prev,
      selected_items: prev.selected_items.map((c) =>
        c.item.id === itemId ? { ...c, jumlah: Math.max(1, c.jumlah + delta) } : c
      ),
    }));
  };

  const handleRemoveItem = (itemId: number) => {
    setErrorMessage(null);
    setForm((prev) => ({
      ...prev,
      selected_items: prev.selected_items.filter((c) => c.item.id !== itemId),
    }));
  };

  const canProceed = (): boolean => {
    if (step === 1) return form.selected_items.length > 0;
    if (step === 2) return Boolean(form.nip.trim() && form.nama_peminjam.trim() && form.unit_kerja.trim());
    if (step === 3) {
      return Boolean(form.mulai && form.selesai && form.keperluan.trim() && new Date(form.selesai) > new Date(form.mulai));
    }
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const id = await submitPeminjaman(form, uploadedFile);
      setCreatedId(id);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errorObj.response?.data?.message ?? errorObj.message ?? 'Gagal mengirim pengajuan peminjaman';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Ajukan Peminjaman</h1>
        <p className="text-sm text-slate-500 mt-1">
          Satu permohonan untuk seluruh item yang Anda butuhkan.
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
                nomorHp={form.nomor_hp}
                onChangeField={(f, v) => { setErrorMessage(null); setForm((prev) => ({ ...prev, [f]: v })); }}
              />
            )}
            {step === 3 && (
              <StepWaktuDanKeperluan
                mulai={form.mulai}
                selesai={form.selesai}
                keperluan={form.keperluan}
                onChangeField={(f, v) => { setErrorMessage(null); setForm((prev) => ({ ...prev, [f]: v })); }}
              />
            )}
            {step === 4 && (
              <div className="space-y-4">
                <StepUnggahSurat
                  suratName={uploadedFile ? uploadedFile.name : form.surat_peminjaman_name}
                  file={uploadedFile}
                  onFileSelect={(f) => {
                    setUploadedFile(f);
                    setForm((prev) => ({ ...prev, surat_peminjaman_name: f.name }));
                  }}
                  onFileChange={(fn) => setForm((prev) => ({ ...prev, surat_peminjaman_name: fn }))}
                  nip={form.nip}
                  namaPeminjam={form.nama_peminjam}
                  mulai={form.mulai}
                  selesai={form.selesai}
                />
                {errorMessage && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-medium">{errorMessage}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <StepNavigation
            step={step}
            canProceed={canProceed()}
            isSubmitting={isSubmitting}
            onPrev={() => { setErrorMessage(null); setStep((s) => Math.max(1, s - 1)); }}
            onNext={() => { setErrorMessage(null); setStep((s) => s + 1); }}
            onSubmit={handleSubmit}
          />
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
