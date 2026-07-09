import { useState } from 'react';
import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';

const deviceTabs = [
  { label: 'PE Devices', value: 'pe' },
  { label: 'LSW Devices', value: 'lsw_nt' },
  { label: 'AGG Devices', value: 'agg' }
];

export default function DevicesPage() {
  const [activeTab, setActiveTab] = useState('pe');

  const fetchLookups = async () => {
    const res = await ndsApi.sites.list();
    return { sites: res.data?.data || [] };
  };

  const getSiteName = (item, lookups) => {
    if (item.siteName) return item.siteName;
    const site = lookups.sites?.find(s => s.id === Number(item.siteId));
    return site ? site.name : 'Unknown Site';
  };

  const getFetchDataFn = () => {
    if (activeTab === 'pe') return () => ndsApi.pes.list();
    if (activeTab === 'lsw_nt') return () => ndsApi.lswNts.list();
    return () => ndsApi.aggs.list();
  };

  return (
    <div>
      {/* Sub-tabs for Device Roles */}
      <div className="mb-6 flex gap-2 border-b border-base-600/30 pb-3">
        {deviceTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === tab.value
                ? 'bg-nds/20 text-nds border border-nds/30'
                : 'text-ink-400 hover:text-ink-100 hover:bg-base-800/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <NDSPageContainer
        key={activeTab} // Force remount and reload when tab switches
        fetchData={getFetchDataFn()}
        fetchLookups={fetchLookups}
        renderTable={(list, lookups) => {
          if (activeTab === 'pe') {
            return (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
                  <tr>
                    <th className="px-5 py-3.5">Router Name</th>
                    <th className="px-5 py-3.5">Vendor/MFG</th>
                    <th className="px-5 py-3.5">Model</th>
                    <th className="px-5 py-3.5">Loopback IP</th>
                    <th className="px-5 py-3.5">Site Location</th>
                    <th className="px-5 py-3.5">Location</th>
                    <th className="px-5 py-3.5">Rack</th>
                    <th className="px-5 py-3.5">Serial</th>
                    <th className="px-5 py-3.5">Asset Tag</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-600/30">
                  {list.map(item => (
                    <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                      <td className="px-5 py-4 font-mono font-medium text-ink-100">{item.name}</td>
                      <td className="px-5 py-4 text-ink-400">{item.manufacturer}</td>
                      <td className="px-5 py-4 text-ink-400">{item.model}</td>
                      <td className="px-5 py-4 font-mono text-nds">{item.ip}</td>
                      <td className="px-5 py-4 text-ink-400">{getSiteName(item, lookups)}</td>
                      <td className="px-5 py-4 text-ink-400">{item.location}</td>
                      <td className="px-5 py-4 text-ink-400">{item.rack}</td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.serial}</td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.asset_tag}</td>
                      <td className="px-5 py-4">
                        <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-400 border border-green-500/20">{item.status}</span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-600">{item.last_updated}</td>
                    </tr>
                  ))}
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลผลลัพธ์ที่ค้นหา</td>
                    </tr>
                  )}
                </tbody>
              </table>
            );
          }

          if (activeTab === 'lsw_nt') {
            return (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
                  <tr>
                    <th className="px-5 py-3.5">Device Name</th>
                    <th className="px-5 py-3.5">Device Role</th>
                    <th className="px-5 py-3.5">Vendor/MFG</th>
                    <th className="px-5 py-3.5">Model</th>
                    <th className="px-5 py-3.5">Management IP</th>
                    <th className="px-5 py-3.5">Site Location</th>
                    <th className="px-5 py-3.5">Location</th>
                    <th className="px-5 py-3.5">Rack</th>
                    <th className="px-5 py-3.5">Serial</th>
                    <th className="px-5 py-3.5">Asset Tag</th>
                    <th className="px-5 py-3.5">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-600/30">
                  {list.map(item => (
                    <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                      <td className="px-5 py-4 font-mono font-medium text-ink-100">{item.name}</td>
                      <td className="px-5 py-4 text-ink-400 font-semibold text-xs">{item.role}</td>
                      <td className="px-5 py-4 text-ink-400">{item.manufacturer}</td>
                      <td className="px-5 py-4 text-ink-400">{item.model}</td>
                      <td className="px-5 py-4 font-mono text-nds">{item.ip}</td>
                      <td className="px-5 py-4 text-ink-400">{getSiteName(item, lookups)}</td>
                      <td className="px-5 py-4 text-ink-400">{item.location}</td>
                      <td className="px-5 py-4 text-ink-400">{item.rack}</td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.serial}</td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.asset_tag}</td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-600">{item.last_updated}</td>
                    </tr>
                  ))}
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลผลลัพธ์ที่ค้นหา</td>
                    </tr>
                  )}
                </tbody>
              </table>
            );
          }

          // AGG Tab
          return (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
                <tr>
                  <th className="px-5 py-3.5">AGG Router Name</th>
                  <th className="px-5 py-3.5">Vendor/MFG</th>
                  <th className="px-5 py-3.5">Model</th>
                  <th className="px-5 py-3.5">IP Address</th>
                  <th className="px-5 py-3.5">Site Location</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Rack</th>
                  <th className="px-5 py-3.5">Serial</th>
                  <th className="px-5 py-3.5">Asset Tag</th>
                  <th className="px-5 py-3.5">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-600/30">
                {list.map(item => (
                  <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                    <td className="px-5 py-4 font-mono font-medium text-ink-100">{item.name}</td>
                    <td className="px-5 py-4 text-ink-400">{item.manufacturer}</td>
                    <td className="px-5 py-4 text-ink-400">{item.model}</td>
                    <td className="px-5 py-4 font-mono text-nds">{item.ip}</td>
                    <td className="px-5 py-4 text-ink-400">{getSiteName(item, lookups)}</td>
                    <td className="px-5 py-4 text-ink-400">{item.location}</td>
                    <td className="px-5 py-4 text-ink-400">{item.rack}</td>
                    <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.serial}</td>
                    <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.asset_tag}</td>
                    <td className="px-5 py-4 font-mono text-xs text-ink-600">{item.last_updated}</td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลผลลัพธ์ที่ค้นหา</td>
                  </tr>
                )}
              </tbody>
            </table>
          );
        }}
      />
    </div>
  );
}
