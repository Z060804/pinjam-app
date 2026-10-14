import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AdminLogin } from './AdminLogin';
import { AdminNavbar } from './AdminNavbar';
import { AdminFooter } from './AdminFooter';
import { RekapPeminjamanView } from './RekapPeminjamanView';
import { DataRuanganView } from './DataRuanganView';
import { DataKendaraanView } from './DataKendaraanView';
import { DataPerlengkapanView } from './DataPerlengkapanView';
import { NotFoundView } from '../common/NotFoundView';
import { getAdminSession, getAdminToken, adminLogout, getAuthHeaders } from '../../services/adminApi';

export const AdminApp: React.FC = () => {
  const [session, setSession] = useState<{ email: string; name: string } | null>(null);
  const [booting, setBooting] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      const existing = getAdminSession();
      const token = getAdminToken();

      if (!existing || !token) {
        if (isMounted) {
          adminLogout();
          setSession(null);
          setBooting(false);
        }
        return;
      }

      try {
        const res = await axios.get('/api/admin/me', {
          headers: getAuthHeaders(),
        });
        if (isMounted) {
          if (res.data?.success && res.data?.user) {
            setSession(res.data.user);
          } else {
            adminLogout();
            setSession(null);
          }
        }
      } catch {
        if (isMounted) {
          adminLogout();
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setBooting(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = () => {
    setSession(getAdminSession());
    navigate('/admin/rekap');
  };

  const handleLogout = () => {
    adminLogout();
    setSession(null);
    navigate('/admin/login');
  };

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="w-8 h-8 border-2 border-[#009966] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/admin/login" element={<AdminLogin onLoginSuccess={handleLoginSuccess} />} />
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      <AdminNavbar
        adminName={session.name}
        adminEmail={session.email}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/admin" element={<Navigate to="/admin/rekap" replace />} />
          <Route path="/admin/login" element={<Navigate to="/admin/rekap" replace />} />
          <Route path="/admin/rekap" element={<RekapPeminjamanView />} />
          <Route path="/admin/ruangan" element={<DataRuanganView />} />
          <Route path="/admin/kendaraan" element={<DataKendaraanView />} />
          <Route path="/admin/perlengkapan" element={<DataPerlengkapanView />} />
          <Route path="/admin/master-data" element={<Navigate to="/admin/ruangan" replace />} />
          <Route path="*" element={<NotFoundView homePath="/admin/rekap" portalLabel="Dashboard Admin" />} />
        </Routes>
      </main>

      <AdminFooter />
    </div>
  );
};

export default AdminApp;
