import React from 'react';
import { DoorOpen, Users, Wifi } from 'lucide-react';
import { Ruangan } from '../../types/admin';
import { getRuangan, addRuangan, updateRuangan, deleteRuangan } from '../../services/adminApi';
import { MasterDataView } from './MasterDataView';

export const DataRuanganView: React.FC = () => {
  return (
    <MasterDataView<Ruangan>
      entityKey="ruangan"
      entityName="Ruangan"
      pageTitle="Data Ruangan"
      pageDesc="Kelola data fasilitas ruangan dinas, kapasitas, fasilitas, serta status operasionalnya."
      listTitle="Daftar Ruangan Rapat & Aula"
      listDesc="Semua ruangan yang tersedia untuk peminjaman kegiatan internal maupun kedinasan."
      totalLabel="Ruangan"
      itemIcon={DoorOpen}
      iconBgClass="bg-emerald-50 border-emerald-100"
      iconColorClass="text-[#009966]"
      fetchItems={getRuangan}
      createItem={addRuangan}
      updateItem={updateRuangan}
      deleteItem={deleteRuangan}
      fields={[
        {
          name: 'nama',
          label: 'Nama Ruangan',
          type: 'text',
          placeholder: 'Contoh: Ruang Rapat Lt. 2 / Aula Kemenag',
          required: true,
        },
        {
          name: 'kapasitas',
          label: 'Kapasitas (Orang)',
          type: 'number',
          placeholder: 'Contoh: 50',
          required: true,
          min: 1,
          validate: (val) =>
            isNaN(Number(val)) || Number(val) < 1 ? 'Kapasitas harus angka positif.' : undefined,
        },
        {
          name: 'fasilitas',
          label: 'Fasilitas & Perlengkapan',
          type: 'text',
          placeholder: 'Contoh: AC, Proyektor, Sound System, WiFi',
        },
      ]}
      renderItemMeta={(r) => (
        <>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Users className="w-3.5 h-3.5 text-slate-400" /> {r.kapasitas} orang
          </span>
          {r.fasilitas && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Wifi className="w-3.5 h-3.5 text-slate-400" /> {r.fasilitas}
            </span>
          )}
        </>
      )}
      defaultFormData={() => ({ nama: '', kapasitas: '', fasilitas: '', is_active: true })}
      itemToFormData={(r) => ({
        nama: r.nama,
        kapasitas: String(r.kapasitas),
        fasilitas: r.fasilitas || '',
        is_active: r.is_active,
      })}
      formDataToPayload={(f) => ({
        nama: String(f.nama).trim(),
        kapasitas: Number(f.kapasitas),
        fasilitas: String(f.fasilitas || '').trim(),
        is_active: Boolean(f.is_active),
      })}
    />
  );
};


