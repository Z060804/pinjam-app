import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AdminLogin } from './AdminLogin';
import { AdminNavbar } from './AdminNavbar';
import { AdminFooter } from './AdminFooter';
import { RekapPeminjamanView } from './RekapPeminjamanView';
import { DataRuanganView } from './DataRuanganView';
import { DataKendaraanView } from './DataKendaraanView';
import { DataPerlengkapanView } from './DataPerlengkapanView';
import { getAdminSession, getAdminToken, adminLogout, getAuthHeaders } from '../../services/adminApi';
import { AdminActiveTab } from '../../types/admin';

export const AdminApp: React.FC = () => {
  const [session, setSession] = useState<{ email: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<AdminActiveTab>('rekap');
  const [booting, setBooting] = useState(true);

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
  };

  const handleLogout = () => {
    adminLogout();
    setSession(null);
    setActiveTab('rekap');
  };

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="w-8 h-8 border-2 border-[#009966] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      <AdminNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        adminName={session.name}
        adminEmail={session.email}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'rekap' && <RekapPeminjamanView />}
        {activeTab === 'ruangan' && <DataRuanganView />}
        {activeTab === 'kendaraan' && <DataKendaraanView />}
        {activeTab === 'perlengkapan' && <DataPerlengkapanView />}
      </main>

      <AdminFooter onSelectTab={setActiveTab} />
    </div>
  );
};

export default AdminApp;
