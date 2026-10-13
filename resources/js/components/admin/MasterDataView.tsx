import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, Pencil, X } from 'lucide-react';

export interface MasterFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number';
  placeholder?: string;
  required?: boolean;
  min?: number;
  mono?: boolean;
  validate?: (value: any) => string | undefined;
}

export interface MasterDataViewProps<T extends { id: number; nama: string; is_active: boolean }> {
  entityKey: string;
  entityName: string;
  pageTitle: string;
  pageDesc: string;
  listTitle: string;
  listDesc: string;
  totalLabel: string;
  itemIcon: React.ElementType;
  iconBgClass: string;
  iconColorClass: string;
  fields: MasterFieldConfig[];
  fetchItems: () => Promise<T[]>;
  createItem: (data: any) => Promise<T>;
  updateItem: (id: number, data: any) => Promise<void>;
  deleteItem: (id: number) => Promise<string | null | void>;
  renderItemBadges?: (item: T) => React.ReactNode;
  renderItemMeta: (item: T) => React.ReactNode;
  defaultFormData: () => Record<string, any>;
  itemToFormData: (item: T) => Record<string, any>;
  formDataToPayload: (form: Record<string, any>) => any;
}

export function MasterDataView<T extends { id: number; nama: string; is_active: boolean }>({
  entityKey,
  entityName,
  pageTitle,
  pageDesc,
  listTitle,
  listDesc,
  totalLabel,
  itemIcon: ItemIcon,
  iconBgClass,
  iconColorClass,
  fields,
  fetchItems,
  createItem,
  updateItem,
  deleteItem,
  renderItemBadges,
  renderItemMeta,
  defaultFormData,
  itemToFormData,
  formDataToPayload,
}: MasterDataViewProps<T>) {
  const [list, setList] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, any>>(() => defaultFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setList(await fetchItems());
    } finally {
      setLoading(false);
    }
  }, [fetchItems]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddModal = () => {
    setEditingItem(null);
    setForm(defaultFormData());
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (item: T) => {
    setEditingItem(item);
    setForm(itemToFormData(item));
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setErrors({});
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const val = form[f.name];
      if (f.required && (val === undefined || val === null || String(val).trim() === '')) {
        errs[f.name] = `${f.label.replace(/\*/g, '').trim()} wajib diisi.`;
        continue;
      }
      if (f.validate) {
        const customErr = f.validate(val);
        if (customErr) errs[f.name] = customErr;
      }
    }
    return errs;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const payload = formDataToPayload(form);
      if (editingItem) {
        await updateItem(editingItem.id, payload);
        setList((prev) =>
          prev.map((it) => (it.id === editingItem.id ? { ...it, ...payload } : it)),
        );
      } else {
        const newItem = await createItem(payload);
        setList((prev) => [newItem, ...prev]);
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Hapus ${entityName.toLowerCase()} ini?`)) return;
    try {
      const err = await deleteItem(id);
      if (err) {
        alert(err);
        return;
      }
      setList((prev) => prev.filter((it) => it.id !== id));
    } catch (e: unknown) {
      const errorObj = e as { response?: { data?: { message?: string } }; message?: string };
      alert(errorObj.response?.data?.message || errorObj.message || `Gagal menghapus ${entityName.toLowerCase()}.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[#009966] uppercase tracking-widest">Master Data Layanan</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">{pageTitle}</h1>
          <p className="text-sm text-[#009966] mt-1">{pageDesc}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            id={`${entityKey}-open-add-btn`}
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#009966] hover:bg-[#008055] text-white text-xs sm:text-sm font-bold shadow-sm shadow-emerald-700/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah {entityName}
          </button>
          <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
            <span className="text-xl font-extrabold text-slate-900">{list.length}</span>
            <span className="text-[11px] font-semibold text-slate-400 leading-tight">
              Total<br />{totalLabel}
            </span>
          </div>
        </div>
      </div>

      {/* List Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">{listTitle}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{listDesc}</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
            {list.length} Item
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#009966] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Belum ada {entityName.toLowerCase()} terdaftar.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/70 transition">
                <div
                  className={`w-10 h-10 rounded-xl ${iconBgClass} border flex items-center justify-center shrink-0`}
                >
                  <ItemIcon className={`w-5 h-5 ${iconColorClass}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{item.nama}</span>
                    {renderItemBadges && renderItemBadges(item)}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-slate-500">
                    {renderItemMeta(item)}
                  </div>
                </div>
                {/* Actions: Edit & Delete */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    id={`${entityKey}-edit-${item.id}`}
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-[#009966] hover:bg-emerald-50 border border-slate-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    id={`${entityKey}-delete-${item.id}`}
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
          style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#009966] flex items-center justify-center font-bold">
                  {editingItem ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingItem ? `Edit Data ${entityName}` : `Tambah ${entityName} Baru`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingItem
                      ? `Perbarui informasi ${entityName.toLowerCase()}`
                      : `Masukkan data ${entityName.toLowerCase()} baru`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    id={`modal-${entityKey}-${field.name}`}
                    type={field.type}
                    min={field.min}
                    value={form[field.name] ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [field.name]: e.target.value }))
                    }
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
                      onChange={() => setForm((prev) => ({ ...prev, is_active: true }))}
                      className="accent-[#009966]"
                    />
                    Aktif (Dapat Dipinjam)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name={`is_active_${entityKey}`}
                      checked={!form.is_active}
                      onChange={() => setForm((prev) => ({ ...prev, is_active: false }))}
                      className="accent-slate-500"
                    />
                    Nonaktif
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
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
                  {saving ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
