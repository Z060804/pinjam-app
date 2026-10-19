import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ItemJenis, MasterJenis, FormPeminjamanState } from '../../types';
import { StepIndicator } from './StepIndicator';
import { StepPilihItem, isAulaLantai3 } from './StepPilihItem';
import { StepDataPeminjam } from './StepDataPeminjam';
import { StepWaktuDanKeperluan } from './StepWaktuDanKeperluan';
import { StepUnggahSurat } from './StepUnggahSurat';
import { RingkasanSidebar } from './RingkasanSidebar';
import { SuccessModal } from './SuccessModal';
import { StepNavigation } from './StepNavigation';
import { submitPeminjaman, SubmitPeminjamanResult } from './ajukanSubmit';
import { isDateTimeRangeValid, getTodayWIB } from '../../utils/date';
import { AlertTriangle } from 'lucide-react';

interface AjukanPeminjamanViewProps {
  preSelectedItem?: ItemJenis | null;
  onTrackRedirect?: (id: string) => void;
  onHomeRedirect?: () => void;
}

export const AjukanPeminjamanView: React.FC<AjukanPeminjamanViewProps> = ({
  preSelectedItem = null,
  onTrackRedirect,
  onHomeRedirect,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationState = location.state as { preSelectedItem?: ItemJenis; item?: ItemJenis } | null;
  const stateItem = locationState?.preSelectedItem ?? locationState?.item ?? null;
  const initialSelected = preSelectedItem ?? stateItem;
  const [step, setStep] = useState<number>(1);
  const [items, setItems] = useState<ItemJenis[]>([]);
  const [categories, setCategories] = useState<MasterJenis[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdBooking, setCreatedBooking] = useState<SubmitPeminjamanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const todayWIB = getTodayWIB();

  const [form, setForm] = useState<FormPeminjamanState>({
    applicant_type: 'internal',
    pihak_pemohon: 'Internal Kemenag Sleman',
    nip: '',
    nama_peminjam: '',
    unit_kerja: '',
    nomor_hp: '',
    mulai: `${todayWIB}T08:00`,
    selesai: `${todayWIB}T16:00`,
    keperluan: '',
    surat_peminjaman_name: '',
    selected_items: [],
    is_recurring: false,
    recurring_frequency: 'weekly',
    recurring_end_date: todayWIB,
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
        setErrorMessage('Gagal memuat katalog sarana prasarana dari server backend.');
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (initialSelected) {
      setForm((prev) => ({
        ...prev,
        selected_items: [{ item: initialSelected, jumlah: 1 }],
      }));
    } else {
      const itemIdParam = searchParams.get('item_id');
      if (itemIdParam && items.length > 0) {
        const found = items.find((it) => it.id === Number(itemIdParam));
        if (found) {
          setForm((prev) => ({
            ...prev,
            selected_items: [{ item: found, jumlah: 1 }],
          }));
        }
      }
    }
  }, [initialSelected, searchParams, items]);

  const roomCount = form.selected_items
    .filter((c) => c.item.id_jenis === 1)
    .reduce((sum, c) => sum + c.jumlah, 0);

  const vehicleCount = form.selected_items
    .filter((c) => c.item.id_jenis === 2)
    .reduce((sum, c) => sum + c.jumlah, 0);

  // Surat HANYA wajib untuk pemohon eksternal. Untuk pemohon internal, surat selalu opsional.
  const isSuratWajib = form.applicant_type === 'external';

  const handleApplicantTypeChange = (newType: 'internal' | 'external') => {
    setErrorMessage(null);
    setForm((prev) => {
      // Jika beralih ke eksternal, bersihkan item yang tidak diperbolehkan (hanya izinkan Aula Lantai 3 maks 1)
      let adjustedItems = prev.selected_items;
      if (newType === 'external') {
        adjustedItems = prev.selected_items
          .filter((c) => isAulaLantai3(c.item))
          .map((c) => ({ ...c, jumlah: 1 }))
          .slice(0, 1);
      }

      return {
        ...prev,
        applicant_type: newType,
        pihak_pemohon:
          newType === 'external'
            ? 'Eksternal (Madrasah/KUA/Lainnya)'
            : 'Internal Kemenag Sleman',
        nip: newType === 'external' ? '' : prev.nip,
        selected_items: adjustedItems,
      };
    });
  };

  const handleToggleItem = (item: ItemJenis, jumlah: number) => {
    setErrorMessage(null);
    setForm((prev) => {
      const exists = prev.selected_items.find((c) => c.item.id === item.id);
      if (exists) {
        return {
          ...prev,
          selected_items: prev.selected_items.filter((c) => c.item.id !== item.id),
        };
      }

      // Validasi batasan ketat untuk pemohon eksternal
      if (prev.applicant_type === 'external') {
        if (!isAulaLantai3(item)) {
          setErrorMessage('Pemohon eksternal hanya dapat mengajukan peminjaman Aula Lantai 3.');
          return prev;
        }

        const currentAula = prev.selected_items.filter((c) => isAulaLantai3(c.item));
        if (currentAula.length >= 1) {
          setErrorMessage('Pemohon eksternal hanya diperbolehkan memilih maksimal 1 unit Aula Lantai 3.');
          return prev;
        }

        return {
          ...prev,
          selected_items: [{ item, jumlah: 1 }],
        };
      }

      return { ...prev, selected_items: [...prev.selected_items, { item, jumlah }] };
    });
  };

  const handleUpdateQty = (itemId: number, delta: number) => {
    setErrorMessage(null);
    setForm((prev) => ({
      ...prev,
      selected_items: prev.selected_items.map((c) => {
        if (c.item.id !== itemId) return c;
        if (prev.applicant_type === 'external') {
          return { ...c, jumlah: 1 }; // Batasi strictly 1 unit untuk pemohon eksternal
        }
        return { ...c, jumlah: Math.max(1, c.jumlah + delta) };
      }),
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
    if (step === 1) {
      if (form.selected_items.length === 0) return false;
      if (form.applicant_type === 'external') {
        const hasDisallowed = form.selected_items.some((c) => !isAulaLantai3(c.item) || c.jumlah > 1);
        if (hasDisallowed || form.selected_items.length > 1) {
          return false;
        }
      }
      return true;
    }
    if (step === 2) {
      const hasBase = Boolean(
        form.nama_peminjam.trim() &&
        form.unit_kerja.trim() &&
        (form.nomor_hp || '').trim()
      );
      if (!hasBase) return false;
      if (form.applicant_type === 'internal') {
        if (!form.nip.trim()) return false;
      }
      return true;
    }
    if (step === 3) {
      const hasValidSchedule = Boolean(
        form.mulai &&
        form.selesai &&
        form.keperluan.trim() &&
        isDateTimeRangeValid(form.mulai, form.selesai)
      );
      if (!hasValidSchedule) return false;

      if (form.is_recurring) {
        const startDate = form.mulai.substring(0, 10);
        if (!form.recurring_end_date || form.recurring_end_date < startDate) {
          return false;
        }
      }

      return true;
    }
    if (step === 4) {
      if (fileError) return false;
      if (isSuratWajib && !uploadedFile && !form.surat_peminjaman_name) {
        return false;
      }
      return true;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (fileError) {
      setErrorMessage(fileError);
      return;
    }

    if (isSuratWajib && !uploadedFile && !form.surat_peminjaman_name) {
      setErrorMessage(
        'Pemohon eksternal wajib mengunggah surat permohonan peminjaman resmi bertanda tangan pimpinan (format PDF, maks. 1 MB).'
      );
      return;
    }

    if (uploadedFile) {
      if (!uploadedFile.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Format berkas surat permohonan harus berupa PDF (.pdf).');
        return;
      }
      if (uploadedFile.size > 1048576) {
        setErrorMessage('Ukuran berkas surat permohonan melebihi batas maksimal 1 MB (1.048.576 byte).');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await submitPeminjaman(form, uploadedFile);
      setCreatedBooking(result);
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
          Satu permohonan untuk seluruh sarana prasarana yang Anda butuhkan.
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
                applicantType={form.applicant_type}
                onToggleItem={handleToggleItem}
              />
            )}
            {step === 2 && (
              <StepDataPeminjam
                applicantType={form.applicant_type}
                nip={form.nip}
                namaPeminjam={form.nama_peminjam}
                unitKerja={form.unit_kerja}
                nomorHp={form.nomor_hp}
                roomCount={roomCount}
                vehicleCount={vehicleCount}
                onChangeApplicantType={handleApplicantTypeChange}
                onChangeField={(f, v) => {
                  setErrorMessage(null);
                  setForm((prev) => ({ ...prev, [f]: v }));
                }}
              />
            )}
            {step === 3 && (
              <StepWaktuDanKeperluan
                mulai={form.mulai}
                selesai={form.selesai}
                keperluan={form.keperluan}
                isRecurring={form.is_recurring}
                recurringFrequency={form.recurring_frequency}
                recurringEndDate={form.recurring_end_date}
                onChangeField={(f, v) => {
                  setErrorMessage(null);
                  setForm((prev) => ({ ...prev, [f]: v }));
                }}
                onChangeRecurring={(recurring, freq, endDate) => {
                  setErrorMessage(null);
                  setForm((prev) => ({
                    ...prev,
                    is_recurring: recurring,
                    recurring_frequency: freq,
                    recurring_end_date: endDate,
                  }));
                }}
              />
            )}
            {step === 4 && (
              <div className="space-y-4">
                <StepUnggahSurat
                  suratName={uploadedFile ? uploadedFile.name : form.surat_peminjaman_name}
                  file={uploadedFile}
                  fileError={fileError}
                  applicantType={form.applicant_type}
                  isSuratWajib={isSuratWajib}
                  onFileSelect={(f) => {
                    setUploadedFile(f);
                    setForm((prev) => ({ ...prev, surat_peminjaman_name: f ? f.name : '' }));
                  }}
                  onFileChange={(fn) => setForm((prev) => ({ ...prev, surat_peminjaman_name: fn }))}
                  onErrorChange={(err) => setFileError(err)}
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
            onPrev={() => {
              setErrorMessage(null);
              setStep((s) => Math.max(1, s - 1));
            }}
            onNext={() => {
              setErrorMessage(null);
              setStep((s) => s + 1);
            }}
            onSubmit={handleSubmit}
          />
        </div>

        <div className="lg:col-span-1">
          <RingkasanSidebar
            selectedItems={form.selected_items}
            applicantType={form.applicant_type}
            onRemoveItem={handleRemoveItem}
            onUpdateQty={handleUpdateQty}
          />
        </div>
      </div>

      {createdBooking && (
        <SuccessModal
          idPeminjaman={createdBooking.id_peminjaman}
          status={createdBooking.status}
          isRecurring={createdBooking.is_recurring}
          recurringFrequency={createdBooking.recurring_frequency}
          recurringEndDate={createdBooking.recurring_end_date}
          recurringSchedules={createdBooking.recurring_schedules}
          onTrack={(id) => {
            if (onTrackRedirect) onTrackRedirect(id);
            navigate(`/pelacakan?id=${encodeURIComponent(id)}`);
          }}
          onClose={() => {
            if (onHomeRedirect) onHomeRedirect();
            navigate('/');
          }}
        />
      )}
    </div>
  );
};
