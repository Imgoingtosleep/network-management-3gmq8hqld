import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage.jsx';
import NDSLayout from '../pages/nds/NDSLayout.jsx';
import SitesPage from '../pages/nds/SitesPage.jsx';
import PEsPage from '../pages/nds/PEsPage.jsx';
import LswNtsPage from '../pages/nds/LswNtsPage.jsx';
import PrefixesPage from '../pages/nds/PrefixesPage.jsx';
import AggsPage from '../pages/nds/AggsPage.jsx';
import DomainsPage from '../pages/nds/DomainsPage.jsx';
import RingsPage from '../pages/nds/RingsPage.jsx';
import CDSHomePage from '../pages/cds/CDSHomePage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      {/* หน้า Login (ไม่ผ่านการตรวจสอบสิทธิ์) */}
      <Route path="/login" element={<LoginPage />} />

      {/* เส้นทางที่ต้องการการล็อกอินทั้งหมด */}
      <Route
        element={
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        }
      >
        {/* หน้า Home สำหรับเลือกทีม (เต็มหน้าจอ) */}
        <Route path="/" element={<HomePage />} />

        {/* หน้าอื่นๆ ที่มีเมนูนำทางและฟุตเตอร์ปกติ */}
        <Route element={<MainLayout><Outlet /></MainLayout>}>
          {/* ทีม NDS */}
          <Route path="/nds" element={<NDSLayout />}>
            <Route index element={<Navigate to="/nds/sites" replace />} />
            <Route path="sites" element={<SitesPage />} />
            <Route path="pes" element={<PEsPage />} />
            <Route path="lsw-nts" element={<LswNtsPage />} />
            <Route path="prefixes" element={<PrefixesPage />} />
            <Route path="aggs" element={<AggsPage />} />
            <Route path="domains" element={<DomainsPage />} />
            <Route path="rings" element={<RingsPage />} />
          </Route>

          {/* ทีม CDS */}
          <Route path="/cds" element={<CDSHomePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

