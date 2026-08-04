import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage.jsx';
import NDSLayout from '../pages/nds/NDSLayout.jsx';
import SitesPage from '../pages/nds/SitesPage.jsx';
import DevicesPage from '../pages/nds/DevicesPage.jsx';
import DeviceTypesPage from '../pages/nds/DeviceTypesPage.jsx';
import SyncInterfacesPage from '../pages/nds/SyncInterfacesPage.jsx';
import ModuleBaysPage from '../pages/nds/ModuleBaysPage.jsx';
import PrefixesPage from '../pages/nds/PrefixesPage.jsx';
import DomainsPage from '../pages/nds/DomainsPage.jsx';
import ReplaceDevicePage from '../pages/nds/ReplaceDevicePage.jsx';
import CDSLayout from '../pages/cds/CDSLayout.jsx';
import CDSDashboardPage from '../pages/cds/CDSDashboardPage.jsx';
import CDSSearchReservePage from '../pages/cds/CDSSearchReservePage.jsx';
import CDSTopologyMapPage from '../pages/cds/CDSTopologyMapPage.jsx';
import CDSBulkImportPage from '../pages/cds/CDSBulkImportPage.jsx';
import CDSDomainIPPage from '../pages/cds/CDSDomainIPPage.jsx';
import CDSDomainDemoPage from '../pages/cds/CDSDomainDemoPage.jsx';
import CDSVlansPage from '../pages/cds/CDSVlansPage.jsx';
import NDSVlansPage from '../pages/nds/NDSVlansPage.jsx';
import CDSModelsPage from '../pages/cds/CDSModelsPage.jsx';
import CDSSiteCodePage from '../pages/cds/CDSSiteCodePage.jsx';
import CDSDevicesPage from '../pages/cds/CDSDevicesPage.jsx';
import CDSVlanAssignPage from '../pages/cds/CDSVlanAssignPage.jsx';
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
            <Route path="devices" element={<DevicesPage />} />
            <Route path="device-types" element={<DeviceTypesPage />} />
            <Route path="sync-interfaces" element={<SyncInterfacesPage />} />
            <Route path="module-bays" element={<ModuleBaysPage />} />
            <Route path="replace-device" element={<ReplaceDevicePage />} />
            <Route path="prefixes" element={<PrefixesPage />} />
            <Route path="domains" element={<DomainsPage />} />
            <Route path="vlans" element={<NDSVlansPage />} />
          </Route>

          {/* ทีม CDS */}
          <Route path="/cds" element={<CDSLayout />}>
            <Route index element={<Navigate to="/cds/dashboard" replace />} />
            <Route path="dashboard" element={<CDSDashboardPage />} />
            <Route path="search-reserve" element={<CDSSearchReservePage />} />
            <Route path="topology-map" element={<CDSTopologyMapPage />} />
            <Route path="bulk-import" element={<CDSBulkImportPage />} />
            <Route path="domain-ip" element={<CDSDomainIPPage />} />
            <Route path="domain-demo" element={<CDSDomainDemoPage />} />
            <Route path="vlans" element={<CDSVlansPage />} />
            <Route path="vlan-assign" element={<CDSVlanAssignPage />} />
            <Route path="devices" element={<CDSDevicesPage />} />
            <Route path="models" element={<CDSModelsPage />} />
            <Route path="site-code" element={<CDSSiteCodePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

