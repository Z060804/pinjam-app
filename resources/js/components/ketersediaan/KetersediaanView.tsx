import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import { MasterJenis, ItemJenis, MasterPeminjaman } from '../../types';
import { ItemFilterTabs } from './ItemFilterTabs';
import { ItemCard } from './ItemCard';
import { CalendarContainer } from '../calendar/CalendarContainer';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Info, AlertCircle } from 'lucide-react';
import { STATUS_PEMINJAMAN } from '../../constants';

interface KetersediaanViewProps {
  initialCategoryId: number | null;
  onBookItem: (item: ItemJenis) => void;
}

export const KetersediaanView: React.FC<KetersediaanViewProps> = ({
  initialCategoryId,
  onBookItem,
}) => {
  const [categories, setCategories] = useState<MasterJenis[]>([]);
  const [items, setItems] = useState<ItemJenis[]>([]);
  const [peminjamanList, setPeminjamanList] = useState<MasterPeminjaman[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(initialCategoryId);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setSelectedCategory(initialCategoryId);
  }, [initialCategoryId]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resJenis, resItems, resPeminjaman] = await Promise.all([
          axios.get('/api/master/jenis'),
          axios.get('/api/item/jenis'),
          axios.get('/api/peminjaman'),
        ]);
        setCategories(resJenis.data?.data ?? []);
        setItems(resItems.data?.data ?? []);
        setPeminjamanList(resPeminjaman.data?.data ?? []);
      } catch {
        // Fallback gracefully to default empty list
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchCategory = selectedCategory ? item.id_jenis === selectedCategory : true;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      item.nama.toLowerCase().includes(q) ||
      (item.registration_id?.toLowerCase() ?? '').includes(q) ||
      (item.keterangan?.toLowerCase() ?? '').includes(q);
    return matchCategory && matchSearch;
  });

  const approvedEvents = peminjamanList.filter(
    (p) => p.status === STATUS_PEMINJAMAN.DISETUJUI
  );

  if (loading) {
    return <LoadingSpinner message="Memuat daftar item & kalender ketersediaan..." />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Ketersediaan</h1>
        <p className="text-sm text-slate-500 mt-1">Pilih jenis sumber daya, lalu temukan item yang sesuai.</p>
      </div>

      <ItemFilterTabs
        categories={categories}
        selectedCategoryId={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 flex flex-col items-center justify-center">
          <AlertCircle className="w-10 h-10 text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">Data tidak ditemukan</p>
          <p className="text-xs text-slate-400 mt-1">Tidak ada item yang sesuai dengan kriteria filter atau pencarian Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} onBookItem={onBookItem} />
          ))}
        </div>
      )}

      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#009966] shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          Ketersediaan sesuai jadwal persetujuan aktif Kementerian Agama Kabupaten Sleman.
        </p>
      </div>

      <section className="pt-4 border-t border-slate-200/80">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Agenda Peminjaman</h2>
          <p className="text-xs text-slate-500 mt-0.5">Semua sumber daya yang telah disetujui ditampilkan pada kalender.</p>
        </div>
        <CalendarContainer events={approvedEvents} />
      </section>
    </div>
  );
};
