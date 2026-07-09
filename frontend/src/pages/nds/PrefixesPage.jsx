import { useState } from 'react';
import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';

export default function PrefixesPage() {
  const [selectedPrefixes, setSelectedPrefixes] = useState([]);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchLookups = async () => {
    const res = await ndsApi.sites.list();
    return { sites: res.data?.data || [] };
  };

  const getSiteName = (item, lookups) => {
    if (item.siteName) return item.siteName;
    const site = lookups.sites?.find(s => s.id === Number(item.siteId));
    return site ? site.name : 'Unknown Site';
  };

  const getUtilColor = (utilStr) => {
    const val = parseInt(utilStr);
    if (isNaN(val)) return 'text-ink-400';
    if (val >= 85) return 'text-red-400 font-semibold';
    if (val >= 50) return 'text-yellow-400 font-semibold';
    return 'text-green-400';
  };

  const getUtilBarColor = (val) => {
    if (val >= 85) return 'bg-red-500';
    if (val >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const renderUtilBar = (utilStr) => {
    const val = parseInt(utilStr) || 0;
    const barColor = getUtilBarColor(val);
    return (
      <div className="flex items-center gap-2.5 min-w-[110px]">
        <div className="w-14 h-2 bg-base-950 rounded-full overflow-hidden border border-base-600/30">
          <div 
            className={`h-full ${barColor} transition-all duration-500`} 
            style={{ width: `${val}%` }}
          />
        </div>
        <span className={`font-mono text-xs ${getUtilColor(utilStr)}`}>{utilStr}</span>
      </div>
    );
  };

  const toggleSelectAll = (list) => {
    if (selectedPrefixes.length === list.length) {
      setSelectedPrefixes([]);
    } else {
      setSelectedPrefixes(list);
    }
  };

  const toggleSelectOne = (item) => {
    if (selectedPrefixes.some(p => p.id === item.id)) {
      setSelectedPrefixes(prev => prev.filter(p => p.id !== item.id));
    } else {
      setSelectedPrefixes(prev => [...prev, item]);
    }
  };

  const handleEditClick = () => {
    if (selectedPrefixes.length === 0) return;
    const firstRing = selectedPrefixes[0].ringname;
    const allSame = selectedPrefixes.every(p => p.ringname === firstRing);
    setEditValue(allSame && firstRing !== 'N/A' ? firstRing : '');
    setSaveError(null);
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await Promise.all(
        selectedPrefixes.map(p => ndsApi.prefixes.update(p.id, { ringname: editValue }))
      );
      setSelectedPrefixes([]);
      setIsEditModalOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setSaveError('เกิดข้อผิดพลาดในการบันทึกข้อมูลไปยัง NetBox');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Action Toolbar Outside Table - Only visible when items are selected */}
      {selectedPrefixes.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3 items-center bg-base-900 p-4 rounded-xl border border-base-600/40 justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-base-950 border border-base-600 text-ink-500 cursor-not-allowed opacity-50 flex items-center gap-1.5"
            >
              Create
            </button>
            
            <button
              type="button"
              onClick={handleEditClick}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border bg-nds border-nds text-base-950 hover:bg-nds-hover shadow-[0_0_15px_rgba(76,141,255,0.15)] transition-all flex items-center gap-1.5"
            >
              Edit Ring
            </button>

            <button
              type="button"
              disabled
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-base-950 border border-base-600 text-ink-500 cursor-not-allowed opacity-50 flex items-center gap-1.5"
            >
              Move Topology
            </button>

            <button
              type="button"
              disabled
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-base-950 border border-base-600 text-ink-500 cursor-not-allowed opacity-50 flex items-center gap-1.5"
            >
              Delete
            </button>
          </div>

          <span className="text-xs font-mono text-ink-400">
            Selected: <span className="text-nds font-bold">{selectedPrefixes.length}</span> prefixes
          </span>
        </div>
      )}

      <NDSPageContainer
        fetchData={() => ndsApi.prefixes.list()}
        fetchLookups={fetchLookups}
        refreshTrigger={refreshTrigger}
        renderTable={(list, lookups) => (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
              <tr>
                <th className="px-5 py-3.5 text-center w-12">
                  <input
                    type="checkbox"
                    checked={list.length > 0 && selectedPrefixes.length === list.length}
                    onChange={() => toggleSelectAll(list)}
                    className="rounded border-base-600 text-nds focus:ring-nds focus:ring-opacity-25 bg-base-950 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-5 py-3.5">IP Prefix Block</th>
                <th className="px-5 py-3.5">VLAN ID</th>
                <th className="px-5 py-3.5">Utilization</th>
                <th className="px-5 py-3.5">VRF</th>
                <th className="px-5 py-3.5">Tenant</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Ring Name</th>
                <th className="px-5 py-3.5">Site Assigned</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-600/30">
              {list.map(item => {
                const isSelected = selectedPrefixes.some(p => p.id === item.id);
                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-base-700/20 transition-colors ${isSelected ? 'bg-nds/5' : ''}`}
                  >
                    <td className="px-5 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(item)}
                        className="rounded border-base-600 text-nds focus:ring-nds focus:ring-opacity-25 bg-base-950 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-4 font-mono font-medium text-ink-100">{item.prefix}</td>
                    <td className="px-5 py-4 font-mono text-ink-400">{item.vlan}</td>
                    <td className="px-5 py-4">{renderUtilBar(item.utilization)}</td>
                    <td className="px-5 py-4 text-ink-400 font-mono text-xs">{item.vrf}</td>
                    <td className="px-5 py-4 text-ink-400">{item.tenant}</td>
                    <td className="px-5 py-4 text-ink-400 text-xs">{item.role}</td>
                    <td className="px-5 py-4 text-pink-400 font-mono text-xs font-semibold">{item.ringname}</td>
                    <td className="px-5 py-4 text-ink-400">{getSiteName(item, lookups)}</td>
                    <td className="px-5 py-4 text-ink-400 max-w-xs truncate">{item.description}</td>
                    <td className="px-5 py-4 font-mono text-xs text-ink-600">{item.last_updated}</td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลผลลัพธ์ที่ค้นหา</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      />

      {/* Edit Ring Name Modal */}
      {selectedPrefixes.length > 0 && isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-base-600 bg-base-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-display text-lg font-semibold text-ink-100">
              แก้ไขชื่อ Ring Name ({selectedPrefixes.length} รายการ)
            </h3>
            
            <div className="mt-2 max-h-24 overflow-y-auto border border-base-600/40 rounded-lg p-2.5 bg-base-950">
              <p className="font-mono text-xs text-ink-500 uppercase tracking-wider mb-1">รายการที่จะอัปเดต:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedPrefixes.map(p => (
                  <span key={p.id} className="text-xs font-mono bg-base-800 border border-base-600/30 text-nds px-1.5 py-0.5 rounded">
                    {p.prefix}
                  </span>
                ))}
              </div>
            </div>

            {saveError && (
              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 font-mono">
                {saveError}
              </div>
            )}

            <div className="mt-4">
              <label htmlFor="ringname-input" className="block text-xs font-mono uppercase tracking-wider text-ink-500">
                Ring Name (Custom Field)
              </label>
              <input
                id="ringname-input"
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="ระบุ Ring Name ใหม่ให้กับทุกรายการ"
                className="mt-2 w-full rounded-lg border border-base-600 bg-base-950 px-3.5 py-2.5 text-sm text-ink-100 placeholder-ink-600 focus:border-nds focus:outline-none focus:ring-1 focus:ring-nds"
                disabled={saving}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg border border-base-600 bg-base-950 px-4 py-2 text-xs text-ink-400 hover:bg-base-800 transition-colors"
                disabled={saving}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-nds px-4 py-2 text-xs font-semibold text-base-950 hover:bg-nds-hover disabled:opacity-50 transition-colors"
                disabled={saving}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกไปยัง NetBox'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
