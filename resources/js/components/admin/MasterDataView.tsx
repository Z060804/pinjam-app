import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { MasterFieldConfig, MasterFormData, MasterDataModal } from './master/MasterDataModal';
import { MasterDataList } from './master/MasterDataList';

export type { MasterFieldConfig, MasterFormData };

export interface MasterDataViewProps<
  T extends { id: number; nama: string; is_active: boolean },
  TPayload = Omit<T, 'id'>
> {
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
  createItem: (data: TPayload) => Promise<T>;
  updateItem: (id: number, data: Partial<TPayload>) => Promise<void>;
  deleteItem: (id: number) => Promise<string | null | void>;
  renderItemBadges?: (item: T) => React.ReactNode;
  renderItemMeta: (item: T) => React.ReactNode;
  defaultFormData: () => MasterFormData;
  itemToFormData: (item: T) => MasterFormData;
  formDataToPayload: (form: MasterFormData) => TPayload;
}

export function MasterDataView<
  T extends { id: number; nama: string; is_active: boolean },
  TPayload = Omit<T, 'id'>
>({
  entityKey,
  entityName,
  pageTitle,
  pageDesc,
  listTitle,
  listDesc,
  totalLabel,
  itemIcon,
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
}: MasterDataViewProps<T, TPayload>) {
  const [list, setList] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [form, setForm] = useState<MasterFormData>(() => defaultFormData());
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
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errorObj.response?.data?.message ?? errorObj.message ?? 'Gagal menyimpan data ke server.';
      alert(msg);
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
      alert(errorObj.response?.data?.message ?? errorObj.message ?? `Gagal menghapus ${entityName.toLowerCase()}.`);
    }
  };

  return (
    <div className="space-y-6">
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
            <span className="text-[11px] font-semibold text-slate-400 leading-tight">Total<br />{totalLabel}</span>
          </div>
        </div>
      </div>

      <MasterDataList
        list={list}
        loading={loading}
        entityKey={entityKey}
        entityName={entityName}
        listTitle={listTitle}
        listDesc={listDesc}
        itemIcon={itemIcon}
        iconBgClass={iconBgClass}
        iconColorClass={iconColorClass}
        renderItemBadges={renderItemBadges}
        renderItemMeta={renderItemMeta}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      <MasterDataModal
        isOpen={modalOpen}
        isEditing={Boolean(editingItem)}
        entityKey={entityKey}
        entityName={entityName}
        fields={fields}
        form={form}
        errors={errors}
        saving={saving}
        onClose={closeModal}
        onFormChange={(name, value) => setForm((prev) => ({ ...prev, [name]: value }))}
        onSubmit={handleSave}
      />
    </div>
  );
}
