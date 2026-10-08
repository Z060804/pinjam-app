import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import { MasterJenis, ItemJenis, MasterPeminjaman } from '../../types';
import { ItemFilterTabs } from './ItemFilterTabs';
import { ItemCard } from './ItemCard';
import { CalendarContainer } from '../calendar/CalendarContainer';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Info } from 'lucide-react';
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
          axios.get('/api/master/peminjaman'),
        ]);
        setCategories(resJenis.data?.data || []);
        setItems(resItems.data?.data || []);
        setPeminjamanList(resPeminjaman.data?.data || []);
      } catch (error) {
        console.error('Error fetching ketersediaan data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchCategory = selectedCategory ? item.id_jenis === selectedCategory : true;
    const matchSearch =
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.registration_id?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (item.keterangan?.toLowerCase() || '').includes(searchQuery.toLowerCase());
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
        <p className="text-sm text-slate-500 mt-1">
          Pilih jenis sumber daya, lalu temukan item yang sesuai dengan kebutuhan Anda.
        </p>
      </div>

      <ItemFilterTabs
        categories={categories}
        selectedCategoryId={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <ItemCard key={item.id} item={item} onBookItem={onBookItem} />
        ))}
      </div>

      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#009966] shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          Data contoh untuk pratinjau. Ketersediaan sesuai jadwal dan persetujuan aktif &amp; perlu
          dikonfirmasi oleh petugas Kementerian Agama Kabupaten Sleman.
        </p>
      </div>

      <section className="pt-4 border-t border-slate-200/80">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Agenda Peminjaman</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Bentuk agenda semua sumber daya yang telah disetujui. Tampilan kalender dapat disesuaikan.
          </p>
        </div>
        <CalendarContainer events={approvedEvents} />
      </section>
    </div>
  );
};
