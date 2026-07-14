import { useEffect, useState } from 'react';
import { cdsApi } from '../../api/cds.api.js';
import { ndsApi } from '../../api/nds.api.js';

export default function CDSSiteCodePage() {
  const [sites, setSites] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Popup states
  const [selectedSite, setSelectedSite] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const fetchSites = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cdsApi.getSites();
      setSites(res.data?.data || res.data || res || []);
    } catch (err) {
      console.error('Failed to fetch sites for CDS:', err);
      setError('ไม่สามารถเชื่อมต่อดึงข้อมูลจาก NetBox ได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await ndsApi.getDevices();
      setDevices(res.data?.data || res.data || res || []);
    } catch (err) {
      console.error('Failed to fetch devices for popup:', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    fetchSites();
    fetchDevices();
  }, []);

  const handleSiteClick = (site) => {
    setSelectedSite(site);
    setIsPopupOpen(true);
  };

  const filteredSites = sites.filter(site => {
    const query = searchQuery.toLowerCase();
    return (
      (site.name || '').toLowerCase().includes(query) ||
      (site.name_thai || '').toLowerCase().includes(query) ||
      (site.description || '').toLowerCase().includes(query) ||
      (site.region || '').toLowerCase().includes(query) ||
      (site.group || '').toLowerCase().includes(query) ||
      (site.tenant || '').toLowerCase().includes(query)
    );
  });

  // Get devices for the selected site in popup
  const siteDevices = devices.filter(d => d.site_id === selectedSite?.id || d.site === selectedSite?.name);

  return (
    <div className="space-y-6 text-left">
      {/* Control Panel */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-base-900 border border-base-600/30 rounded-xl p-4 shadow-glow">
        <div className="w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="ค้นหาชื่อไซต์, รหัส, จังหวัด, รายละเอียด..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-base-600 bg-base-950 px-3.5 py-2 text-xs text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => {
              fetchSites();
              fetchDevices();
            }}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-base-950 border border-base-600 text-ink-400 hover:text-ink-100 hover:bg-base-800 transition-all font-mono"
          >
            {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400 font-mono">
          ⚠️ {error}  
        </div>
      )}

      {/* Table Container */}
      <div className="relative overflow-hidden rounded-xl border border-base-600 bg-base-900 shadow-glow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
              <tr>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Name Thai</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Region</th>
                <th className="px-5 py-3.5">Group</th>
                <th className="px-5 py-3.5">Tenant</th>
                <th className="px-5 py-3.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-600/30">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-xs text-ink-600 font-mono">
                    <span className="inline-block animate-spin mr-2">⚙️</span> กำลังโหลดข้อมูลไซต์จาก NetBox...
                  </td>
                </tr>
              ) : filteredSites.length > 0 ? (
                filteredSites.map((site) => (
                  <tr key={site.id} className="hover:bg-base-700/10 transition-colors">
                    <td 
                      onClick={() => handleSiteClick(site)}
                      className="px-5 py-4 font-mono font-medium text-cds cursor-pointer hover:underline"
                    >
                      {site.name}
                    </td>
                    <td 
                      onClick={() => handleSiteClick(site)}
                      className="px-5 py-4 text-ink-100 cursor-pointer hover:text-cds hover:underline"
                    >
                      {site.name_thai}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border uppercase font-mono ${
                        site.status === 'active'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : site.status === 'planned'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-base-600/30 text-ink-400 border-base-600/50'
                      }`}>
                        {site.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-ink-400">{site.region}</td>
                    <td className="px-5 py-4 text-ink-400">{site.group}</td>
                    <td className="px-5 py-4 text-ink-400">{site.tenant}</td>
                    <td className="px-5 py-4 text-ink-400 max-w-xs truncate" title={site.description}>
                      {site.description}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-xs text-ink-600 font-mono">
                    ไม่พบข้อมูล Site Code ตามที่ระบุค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device List Popup Modal */}
      {isPopupOpen && selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-6xl rounded-xl border border-base-600 bg-base-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left my-8">
            <div className="flex justify-between items-center border-b border-base-600/30 pb-3 mb-4">
              <div>
                <span className="rounded-full border border-cds/30 bg-cds/10 px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-cds">
                  SITE DEVICES
                </span>
                <h3 className="font-display text-lg font-semibold text-ink-100 mt-1">
                  อุปกรณ์ในไซต์: {selectedSite.name_thai} ({selectedSite.name})
                </h3>
              </div>
              <button 
                onClick={() => setIsPopupOpen(false)}
                className="text-ink-400 hover:text-ink-100 transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* Devices Table */}
            <div className="relative overflow-hidden rounded-lg border border-base-600/50 bg-base-950/30 max-h-[50vh] overflow-y-auto pr-1">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-base-950 text-[10px] font-mono uppercase text-ink-400 border-b border-base-600/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3">nodeid</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Rack</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Manufacturer</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-600/20">
                  {loadingDevices ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-ink-600 font-mono">
                        <span className="inline-block animate-spin mr-2">⚙️</span> กำลังโหลดข้อมูลดีไวซ์...
                      </td>
                    </tr>
                  ) : siteDevices.length > 0 ? (
                    siteDevices.map((device) => (
                      <tr key={device.id} className="hover:bg-base-750/30 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-ink-500">{device.nodeid}</td>
                        <td className="px-4 py-3.5 font-mono font-medium text-ink-100">{device.name}</td>
                        <td className="px-4 py-3.5">
                          <span className="rounded bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400 border border-green-500/20 uppercase font-mono">
                            {device.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-ink-400">{device.tenant}</td>
                        <td className="px-4 py-3.5 text-ink-400">{device.location}</td>
                        <td className="px-4 py-3.5 text-ink-400">{device.rack}</td>
                        <td className="px-4 py-3.5 text-ink-400 font-mono">{device.role}</td>
                        <td className="px-4 py-3.5 text-ink-400 font-mono">{device.manufacturer}</td>
                        <td className="px-4 py-3.5 text-ink-400">{device.type}</td>
                        <td className="px-4 py-3.5 font-mono text-cds">{device.ip}</td>
                        <td className="px-4 py-3.5 text-ink-550 max-w-xs truncate" title={device.description}>
                          {device.description}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-ink-600 font-mono">
                        ไม่พบดีไวซ์ติดตั้งอยู่ในไซต์งานนี้ในระบบ NetBox
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPopupOpen(false)}
                className="rounded-lg border border-base-600 bg-base-950 px-4 py-2 text-xs text-ink-400 hover:bg-base-800 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
