import React from 'react';
import { Plus, Loader2, Pencil, X } from 'lucide-react';

export interface MasterFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number';
  placeholder?: string;
  required?: boolean;
  min?: number;
  mono?: boolean;
  validate?: (value: string | number | boolean | undefined) => string | undefined;
}

export type MasterFormData = Record<string, string | number | boolean>;

interface MasterDataModalProps {
  isOpen: boolean;
  isEditing: boolean;
  entityKey: string;
  entityName: string;
  fields: MasterFieldConfig[];
  form: MasterFormData;
  errors: Record<string, string>;
  saving: boolean;
  onClose: () => void;
  onFormChange: (name: string, value: string | number | boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const MasterDataModal: React.FC<MasterDataModalProps> = ({
  isOpen,
  isEditing,
  entityKey,
  entityName,
  fields,
  form,
  errors,
  saving,
  onClose,
  onFormChange,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#009966] flex items-center justify-center font-bold">
              {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isEditing ? `Edit Data ${entityName}` : `Tambah ${entityName} Baru`}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? `Perbarui informasi ${entityName.toLowerCase()}`
                  : `Masukkan data ${entityName.toLowerCase()} baru`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                id={`modal-${entityKey}-${field.name}`}
                type={field.type}
                min={field.min}
                value={String(form[field.name] ?? '')}
                onChange={(e) => onFormChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#009966]/30 focus:border-[#009966] transition ${
                  field.mono ? 'font-mono' : ''
                } ${errors[field.name] ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors[field.name] && (
                <p className="text-[10px] text-red-500 mt-1">{errors[field.name]}</p>
              )}
            </div>
          ))}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Status Ketersediaan</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name={`is_active_${entityKey}`}
                  checked={Boolean(form.is_active)}
                  onChange={() => onFormChange('is_active', true)}
                  className="accent-[#009966]"
                />
                Aktif (Dapat Dipinjam)
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name={`is_active_${entityKey}`}
                  checked={!form.is_active}
                  onChange={() => onFormChange('is_active', false)}
                  className="accent-slate-500"
                />
                Nonaktif
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#009966] hover:bg-[#008055] rounded-xl transition cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambahkan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
