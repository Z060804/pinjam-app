/**
 * Kosakata status permohonan untuk panel admin.
 *
 * Satu sumber untuk seluruh komponen admin — jangan definisikan ulang di
 * masing-masing view. Nilai `status` di sini harus sama persis dengan enum
 * backend di SimpruController::updateStatus().
 */
import type { ElementType } from 'react';
import { CheckCircle2, Clock, XCircle, Ban } from 'lucide-react';
import type { Permohonan, RekapStatusFilter } from '../../types/admin';

export interface StatusConfigEntry {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: ElementType;
}

export const STATUS_CONFIG: Record<Permohonan['status'], StatusConfigEntry> = {
  'Disetujui': {
    label: 'Disetujui',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  'Menunggu Persetujuan': {
    label: 'Menunggu',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    border: 'border-amber-200',
    icon: Clock,
  },
  'Tidak Disetujui': {
    label: 'Tidak Disetujui',
    color: 'text-red-700',
    bg: 'bg-red-100',
    border: 'border-red-200',
    icon: XCircle,
  },
  'Dibatalkan': {
    label: 'Dibatalkan',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    icon: Ban,
  },
};

export const STATUS_TABS: RekapStatusFilter[] = [
  'Semua',
  'Menunggu Persetujuan',
  'Disetujui',
  'Tidak Disetujui',
  'Dibatalkan',
];
