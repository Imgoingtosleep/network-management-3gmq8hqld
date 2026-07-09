import { Routes, Route, Outlet } from 'react-router-dom';
import HomePage from '../pages/HomePage.jsx';
import NDSHomePage from '../pages/nds/NDSHomePage.jsx';
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
          <Route path="/nds" element={<NDSHomePage />} />

          {/* ทีม CDS */}
          <Route path="/cds" element={<CDSHomePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
