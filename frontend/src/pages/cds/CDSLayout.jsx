import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';

const menuItems = [
  { label: 'Dashboard', value: 'dashboard', path: '/cds/dashboard' },
  { label: 'Search & Reserve', value: 'search-reserve', path: '/cds/search-reserve' },
  { label: 'Topology Map', value: 'topology-map', path: '/cds/topology-map' },
  { label: 'Bulk Import', value: 'bulk-import', path: '/cds/bulk-import' },
  { label: 'Domain & IP', value: 'domain-ip', path: '/cds/domain-ip' },
  { label: 'Domain Demo', value: 'domain-demo', path: '/cds/domain-demo' },
  { label: 'VLANs', value: 'vlans', path: '/cds/vlans' },
  { label: 'Devices', value: 'devices', path: '/cds/devices' },
  { label: 'Models', value: 'models', path: '/cds/models' },
  { label: 'Site Code', value: 'site-code', path: '/cds/site-code' },
];

export default function CDSLayout() {
  const location = useLocation();
  const currentItem = menuItems.find(item => item.path === location.pathname) || menuItems[0];

  return (
    <div className="flex gap-10">
      <Sidebar accent="cds" items={menuItems} />

      <section className="flex-1 overflow-hidden">
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-base-600/30 pb-6">
          <div>
            <span className="rounded-full border border-cds/30 bg-cds/10 px-3 py-1 font-mono text-xs tracking-widest text-cds">
              CDS CUSTOMER DESIGN SERVICE
            </span>
            <h1 className="mt-4 font-display text-3xl font-semibold text-ink-100 uppercase tracking-wide">
              {currentItem?.label}
            </h1>
          </div>
        </div>

        <div className="mt-6">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
