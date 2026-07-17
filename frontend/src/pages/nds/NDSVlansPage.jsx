import { useEffect, useState } from 'react';
import { ndsApi } from '../../api/nds.api.js';

export default function NDSVlansPage() {
  const [vlans, setVlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadVlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ndsApi.getVlans();
      const list = res.data?.data || res.data || res || [];
      setVlans(list);
    } catch (err) {
      console.error('Failed to load NDS VLANs:', err);
      setError('ไม่สามารถเชื่อมต่อดึงข้อมูล VLANs จากระบบหลังบ้านได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVlans();
  }, []);

  const filteredVlans = vlans.filter((v) => {
    if (!v) return false;
    const query = searchQuery.toLowerCase();
    return (
      String(v.vid).toLowerCase().includes(query) ||
      (v.name || '').toLowerCase().includes(query) ||
      (v.site || '').toLowerCase().includes(query) ||
      (v.group || '').toLowerCase().includes(query) ||
      (v.prefixes || '').toLowerCase().includes(query) ||
      (v.tenant || '').toLowerCase().includes(query) ||
      (v.status || '').toLowerCase().includes(query) ||
      (v.role || '').toLowerCase().includes(query) ||
      (v.description || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4 text-left">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400 font-mono">
          ⚠️ {error}
        </div>
      )}

      <div className="flex flex-col h-full rounded-xl border border-base-600 bg-base-900 overflow-hidden shadow-glow">
        {/* Header & Search */}
        <div className="p-4 border-b border-base-600/50 bg-base-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-ink-600 px-2 py-0.5 rounded bg-base-950 border border-base-600/30">
              {filteredVlans.length} VLANs
            </span>
          </div>
          <div className="flex items-center gap-3 w-full sm:max-w-xs">
            <input
              type="text"
              placeholder="ค้นหา VLAN (VID, Name, Site, Tenant...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:border-nds focus:outline-none transition-colors"
            />
            <button
              onClick={loadVlans}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-base-950 border border-base-600 text-ink-400 hover:text-ink-100 hover:bg-base-800 transition-all font-mono"
            >
              {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
            </button>
          </div>
        </div>

        {/* VLAN Table Container */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-ink-600 font-mono">
              <span className="inline-block animate-spin mr-2">⚙️</span> กำลังโหลดข้อมูล VLANs...
            </div>
          ) : filteredVlans.length > 0 ? (
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-base-600 bg-base-950 text-[10px] font-mono uppercase text-ink-400">
                  <th className="px-4 py-3">VID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3">Prefixes</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-600/20 text-ink-100">
                {filteredVlans.map((v) => (
                  <tr key={v.id} className="hover:bg-nds/5 transition-colors duration-150">
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-nds">{v.vid}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold">{v.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-300">{v.site}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-400">{v.group}</td>
                    <td className="px-4 py-3 text-ink-300 max-w-xs truncate" title={v.prefixes}>{v.prefixes}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-400">{v.tenant}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] uppercase font-semibold ${
                        v.status?.toLowerCase() === 'active'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-base-650 text-ink-400 border border-base-600'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-400">{v.role}</td>
                    <td className="px-4 py-3 text-ink-600 max-w-xs truncate" title={v.description}>{v.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-ink-650 font-mono">
              ไม่พบข้อมูล VLANs
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
