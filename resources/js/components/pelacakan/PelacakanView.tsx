import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import { useParams, useSearchParams } from 'react-router-dom';
import { PeminjamanFull } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';
import { PelacakanSearch } from './PelacakanSearch';
import { PelacakanDetail } from './PelacakanDetail';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { DEBOUNCE_DELAY_MS } from '../../constants';
import { FileQuestion } from 'lucide-react';

interface PelacakanViewProps {
  initialSearchId?: string;
}

export const PelacakanView: React.FC<PelacakanViewProps> = ({ initialSearchId = '' }) => {
  const { id: paramId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id') ?? searchParams.get('kode');
  const resolvedInitialId = paramId ?? queryId ?? initialSearchId;

  const [searchId, setSearchId] = useState<string>(resolvedInitialId);
  const [result, setResult] = useState<PeminjamanFull | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debouncedSearchId = useDebounce(searchId.trim(), DEBOUNCE_DELAY_MS);

  useEffect(() => {
    if (resolvedInitialId) {
      setSearchId(resolvedInitialId);
    }
  }, [resolvedInitialId]);

  useEffect(() => {
    if (!debouncedSearchId) {
      setResult(null);
      setNotFound(false);
      setErrorMessage(null);
      return;
    }

    const fetchPeminjaman = async () => {
      setLoading(true);
      setNotFound(false);
      setErrorMessage(null);
      try {
        const response = await axios.get(`/api/peminjaman/${debouncedSearchId}`);
        if (response.data?.success && response.data?.data) {
          setResult(response.data.data);
        } else {
          setResult(null);
          setNotFound(true);
        }
      } catch (err: unknown) {
        setResult(null);
        const errorObj = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
        if (errorObj.response?.status === 404) {
          setNotFound(true);
        } else {
          setErrorMessage(errorObj.response?.data?.message ?? errorObj.message ?? 'Gagal menghubungi server untuk melacak peminjaman.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPeminjaman();
  }, [debouncedSearchId]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Pelacakan Peminjaman</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pantau status permohonan peminjaman ruangan, kendaraan, atau alat Anda secara real-time.
        </p>
      </div>

      <PelacakanSearch
        searchQuery={searchId}
        onSearchChange={setSearchId}
        onSelectSample={(sample) => setSearchId(sample)}
      />

      {loading && <LoadingSpinner message="Mencari riwayat peminjaman..." />}

      {!loading && errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-6 text-center space-y-2">
          <FileQuestion className="w-10 h-10 text-rose-400 mx-auto" />
          <h4 className="text-sm font-bold text-rose-900">Gangguan Komunikasi Server</h4>
          <p className="text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {!loading && notFound && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <FileQuestion className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">Peminjaman Tidak Ditemukan</h4>
          <p className="text-xs text-slate-500">
            Pastikan ID peminjaman yang Anda masukkan benar (contoh: <code>PMJ-202610-001</code>).
          </p>
        </div>
      )}

      {!loading && result && <PelacakanDetail data={result} />}
    </div>
  );
};
