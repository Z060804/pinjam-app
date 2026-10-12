import React from 'react';
import { Package, Hash } from 'lucide-react';
import { Perlengkapan } from '../../types/admin';
import { getPerlengkapan, addPerlengkapan, updatePerlengkapan, deletePerlengkapan } from '../../services/adminApi';
import { MasterDataView } from './MasterDataView';

export const DataPerlengkapanView: React.FC = () => {
  return (
    <MasterDataView<Perlengkapan>
      entityKey="perlengkapan"
      entityName="Perlengkapan"
      pageTitle="Data Perlengkapan"
      pageDesc="Kelola inventaris perlengkapan dinas & multimedia yang tersedia untuk peminjaman."
      listTitle="Daftar Perlengkapan & Alat"
      listDesc="Daftar sarana inventaris dan perangkat operasional."
      totalLabel="Item"
      itemIcon={Package}
      iconBgClass="bg-violet-50 border-violet-100"
      iconColorClass="text-violet-600"
      fetchItems={getPerlengkapan}
      createItem={addPerlengkapan}
      updateItem={updatePerlengkapan}
      deleteItem={deletePerlengkapan}
      fields={[
        {
          name: 'nama',
          label: 'Nama Perlengkapan / Alat',
          type: 'text',
          placeholder: 'Contoh: Wireless Portable Sound System',
          required: true,
        },
        {
          name: 'kode',
          label: 'Kode BMN / Registrasi',
          type: 'text',
          mono: true,
          placeholder: 'Contoh: BMN-SOUND-01',
          required: true,
        },
        {
          name: 'jumlah',
          label: 'Jumlah Unit Tersedia',
          type: 'number',
          placeholder: 'Contoh: 2',
          required: true,
          min: 1,
          validate: (val) =>
            isNaN(Number(val)) || Number(val) < 1 ? 'Jumlah harus angka positif.' : undefined,
        },
        {
          name: 'keterangan',
          label: 'Keterangan / Spesifikasi',
          type: 'text',
          placeholder: 'Contoh: 2 mic wireless + tripod stand',
        },
      ]}
      renderItemBadges={(p) => (
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono border border-slate-200">
          {p.kode}
        </span>
      )}
      renderItemMeta={(p) => (
        <>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Hash className="w-3.5 h-3.5 text-slate-400" /> {p.jumlah} unit tersedia
          </span>
          {p.keterangan && (
            <span className="text-xs text-slate-500 truncate max-w-[280px]">{p.keterangan}</span>
          )}
        </>
      )}
      defaultFormData={() => ({
        nama: '',
        kode: '',
        jumlah: '',
        keterangan: '',
        is_active: true,
      })}
      itemToFormData={(p) => ({
        nama: p.nama,
        kode: p.kode,
        jumlah: String(p.jumlah),
        keterangan: p.keterangan || '',
        is_active: p.is_active,
      })}
      formDataToPayload={(f) => ({
        nama: String(f.nama).trim(),
        kode: String(f.kode).trim(),
        jumlah: Number(f.jumlah),
        keterangan: String(f.keterangan || '').trim(),
        is_active: Boolean(f.is_active),
      })}
    />
  );
};


