import { useState } from 'react';
import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';
import axiosClient from '../../api/axiosClient.js';

export default function PrefixesPage() {
  const [selectedPrefixes, setSelectedPrefixes] = useState([]);
  const apiBaseURL = axiosClient.defaults.baseURL;

  const toggleSelectAll = (list) => {
    if (selectedPrefixes.length === list.length) {
      setSelectedPrefixes([]);
    } else {
      setSelectedPrefixes(list);
    }
  };

  const toggleSelectOne = (item) => {
    if (selectedPrefixes.some(s => s.id === item.id)) {
      setSelectedPrefixes(prev => prev.filter(s => s.id !== item.id));
    } else {
      setSelectedPrefixes(prev => [...prev, item]);
    }
  };

  const handleCreate = () => {
    window.open(`${apiBaseURL}/nds/netbox-redirect?type=prefix_add`, '_blank');
  };

  const handleEdit = () => {
    if (selectedPrefixes.length !== 1) return;
    window.open(`${apiBaseURL}/nds/netbox-redirect?type=prefix_edit&id=${selectedPrefixes[0].id}`, '_blank');
  };

  const handleDelete = () => {
    if (selectedPrefixes.length !== 1) return;
    window.open(`${apiBaseURL}/nds/netbox-redirect?type=prefix_delete&id=${selectedPrefixes[0].id}`, '_blank');
  };

  return (
    <>
      {/* Top Controls Bar - Always visible */}
      <div className="mb-4 flex flex-wrap gap-4 justify-between items-center bg-base-900/40 p-4 rounded-xl border border-base-600/30">
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-ink-400">
            IP Prefixes Management Toolbar
          </span>
          {selectedPrefixes.length > 0 && (
            <span className="text-xs font-mono text-ink-500 border-l border-base-600/50 pl-4">
              Selected: <span className="text-nds font-bold">{selectedPrefixes.length}</span> prefixes
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCreate}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-nds border border-nds text-base-950 hover:bg-nds-hover transition-all shadow-[0_0_15px_rgba(76,141,255,0.15)]"
          >
            Create Prefix
          </button>
          
          <button
            type="button"
            onClick={handleEdit}
            disabled={selectedPrefixes.length !== 1}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
              selectedPrefixes.length === 1
                ? 'bg-base-950 border-base-600 text-ink-100 hover:bg-base-800'
                : 'bg-base-950 border-base-600 text-ink-500 cursor-not-allowed opacity-50'
            }`}
          >
            Edit Prefix
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={selectedPrefixes.length !== 1}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
              selectedPrefixes.length === 1
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'bg-base-950 border-base-600 text-ink-500 cursor-not-allowed opacity-50'
            }`}
          >
            Delete
          </button>
        </div>
      </div>

      <NDSPageContainer
        fetchData={() => ndsApi.prefixes.list()}
        renderTable={(list) => (
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
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-600/30">
              {list.map(item => {
                const isSelected = selectedPrefixes.some(s => s.id === item.id);
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
                    <td className="px-5 py-4 font-medium text-ink-100 font-mono">{item.prefix}</td>
                    <td className="px-5 py-4 text-ink-400 font-mono text-xs">{item.vlan_id}</td>
                    <td className="px-5 py-4 text-ink-400 font-mono text-xs">{item.utilization}%</td>
                    <td className="px-5 py-4 text-ink-400 font-mono text-xs">{item.vrf}</td>
                    <td className="px-5 py-4 text-ink-400">{item.tenant}</td>
                    <td className="px-5 py-4 text-ink-400 font-mono text-xs">{item.role}</td>
                    <td className="px-5 py-4 text-ink-400 font-mono text-xs">{item.ringname}</td>
                    <td className="px-5 py-4 text-ink-400 max-w-xs truncate">{item.description}</td>
                    <td className="px-5 py-4 font-mono text-xs text-ink-600">{item.last_updated}</td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลผลลัพธ์ที่ค้นหา</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      />
    </>
  );
}
