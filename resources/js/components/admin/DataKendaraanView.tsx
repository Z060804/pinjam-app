import React from 'react';
import { Car, Users } from 'lucide-react';
import { Kendaraan } from '../../types/admin';
import { getKendaraan, addKendaraan, updateKendaraan, deleteKendaraan } from '../../services/adminApi';
import { MasterDataView } from './MasterDataView';

export const DataKendaraanView: React.FC = () => {
  return (
    <MasterDataView<Kendaraan>
      entityKey="kendaraan"
      entityName="Kendaraan"
      pageTitle="Data Kendaraan"
      pageDesc="Kelola data armada kendaraan dinas operasional yang dapat dipinjam untuk tugas dinas."
      listTitle="Daftar Kendaraan Dinas"
      listDesc="Armada mobil dinas yang tersedia untuk kegiatan kedinasan."
      totalLabel="Kendaraan"
      itemIcon={Car}
      iconBgClass="bg-blue-50 border-blue-100"
      iconColorClass="text-blue-600"
      fetchItems={getKendaraan}
      createItem={addKendaraan}
      updateItem={updateKendaraan}
      deleteItem={deleteKendaraan}
      fields={[
        {
          name: 'nama',
          label: 'Nama / Tipe Kendaraan',
          type: 'text',
          placeholder: 'Contoh: Toyota Kijang Innova Reborn',
          required: true,
        },
        {
          name: 'nopol',
          label: 'Nomor Polisi (Plat Dinas)',
          type: 'text',
          mono: true,
          placeholder: 'Contoh: AB 1234 ZZ',
          required: true,
        },
        {
          name: 'kapasitas',
          label: 'Kapasitas Penumpang',
          type: 'number',
          placeholder: 'Contoh: 7',
          required: true,
          min: 1,
          validate: (val) =>
            isNaN(Number(val)) || Number(val) < 1 ? 'Kapasitas harus angka positif.' : undefined,
        },
        {
          name: 'keterangan',
          label: 'Keterangan / Kondisi',
          type: 'text',
          placeholder: 'Contoh: Transmisi manual, kondisi prima',
        },
      ]}
      renderItemBadges={(k) => (
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono border border-slate-200">
          {k.nopol}
        </span>
      )}
      renderItemMeta={(k) => (
        <>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Users className="w-3.5 h-3.5 text-slate-400" /> {k.kapasitas} penumpang
          </span>
          {k.keterangan && (
            <span className="text-xs text-slate-500 truncate max-w-[260px]">{k.keterangan}</span>
          )}
        </>
      )}
      defaultFormData={() => ({
        nama: '',
        nopol: '',
        kapasitas: '',
        keterangan: '',
        is_active: true,
      })}
      itemToFormData={(k) => ({
        nama: k.nama,
        nopol: k.nopol,
        kapasitas: String(k.kapasitas),
        keterangan: k.keterangan || '',
        is_active: k.is_active,
      })}
      formDataToPayload={(f) => ({
        nama: String(f.nama).trim(),
        nopol: String(f.nopol).trim(),
        kapasitas: Number(f.kapasitas),
        keterangan: String(f.keterangan || '').trim(),
        is_active: Boolean(f.is_active),
      })}
    />
  );
};


