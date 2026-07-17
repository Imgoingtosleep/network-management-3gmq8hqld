import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';

const menuItems = [
  { label: 'Site Management', value: 'sites', path: '/nds/sites' },
  { label: 'Devices', value: 'devices', path: '/nds/devices' },
  { label: 'Device Types', value: 'device-types', path: '/nds/device-types' },
  { label: 'IP Management (Prefix)', value: 'prefixes', path: '/nds/prefixes' },
  { label: 'Domains', value: 'domains', path: '/nds/domains' },
];

export default function NDSLayout() {
  const location = useLocation();
  const currentItem = menuItems.find(item => item.path === location.pathname) || menuItems[0];

  return (
    <div className="flex gap-10">
      <Sidebar accent="nds" items={menuItems} />

      <section className="flex-1 overflow-hidden">
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-base-600/30 pb-6">
          <div>
            <span className="rounded-full border border-nds/30 bg-nds/10 px-3 py-1 font-mono text-xs tracking-widest text-nds">
              NDS NETWORK MANAGEMENT
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
