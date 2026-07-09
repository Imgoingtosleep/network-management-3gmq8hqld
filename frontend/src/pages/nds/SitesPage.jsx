import { useState } from 'react';
import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';
import axiosClient from '../../api/axiosClient.js';

export default function SitesPage() {
  const [selectedSites, setSelectedSites] = useState([]);
  const apiBaseURL = axiosClient.defaults.baseURL;

  const toggleSelectAll = (list) => {
    if (selectedSites.length === list.length) {
      setSelectedSites([]);
    } else {
      setSelectedSites(list);
    }
  };

  const toggleSelectOne = (item) => {
    if (selectedSites.some(s => s.id === item.id)) {
      setSelectedSites(prev => prev.filter(s => s.id !== item.id));
    } else {
      setSelectedSites(prev => [...prev, item]);
    }
  };

  const handleCreate = () => {
    window.open(`${apiBaseURL}/nds/netbox-redirect?type=site_add`, '_blank');
  };

  const handleEdit = () => {
    if (selectedSites.length !== 1) return;
    window.open(`${apiBaseURL}/nds/netbox-redirect?type=site_edit&id=${selectedSites[0].id}`, '_blank');
  };

  const handleDelete = () => {
    if (selectedSites.length !== 1) return;
    window.open(`${apiBaseURL}/nds/netbox-redirect?type=site_delete&id=${selectedSites[0].id}`, '_blank');
  };

  return (
    <>
      {/* Top Controls Bar - Always visible */}
      <div className="mb-4 flex flex-wrap gap-4 justify-between items-center bg-base-900/40 p-4 rounded-xl border border-base-600/30">
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-ink-400">
            Sites Management Toolbar
          </span>
          {selectedSites.length > 0 && (
            <span className="text-xs font-mono text-ink-500 border-l border-base-600/50 pl-4">
              Selected: <span className="text-nds font-bold">{selectedSites.length}</span> sites
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCreate}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-nds border border-nds text-base-950 hover:bg-nds-hover transition-all shadow-[0_0_15px_rgba(76,141,255,0.15)]"
          >
            Create Site
          </button>
          <button
            type="button"
            onClick={handleEdit}
            disabled={selectedSites.length !== 1}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
              selectedSites.length === 1
                ? 'bg-base-950 border-base-600 text-ink-100 hover:bg-base-800'
                : 'bg-base-950 border-base-600 text-ink-500 cursor-not-allowed opacity-50'
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={selectedSites.length !== 1}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
              selectedSites.length === 1
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'bg-base-950 border-base-600 text-ink-500 cursor-not-allowed opacity-50'
            }`}
          >
            Delete
          </button>
        </div>
      </div>

      <NDSPageContainer
        fetchData={() => ndsApi.sites.list()}
        renderTable={(list) => (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
              <tr>
                <th className="px-5 py-3.5 text-center w-12">
                  <input
                    type="checkbox"
                    checked={list.length > 0 && selectedSites.length === list.length}
                    onChange={() => toggleSelectAll(list)}
                    className="rounded border-base-600 text-nds focus:ring-nds focus:ring-opacity-25 bg-base-950 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Name Thai</th>
                <th className="px-5 py-3.5">Site Name</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Facility</th>
                <th className="px-5 py-3.5">Region</th>
                <th className="px-5 py-3.5">Group</th>
                <th className="px-5 py-3.5">Tenant</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-600/30">
              {list.map(item => {
                const isSelected = selectedSites.some(s => s.id === item.id);
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
                    <td className="px-5 py-4 font-medium text-ink-100">{item.name}</td>
                    <td className="px-5 py-4 text-ink-400">{item.name_thai}</td>
                    <td className="px-5 py-4 text-ink-400">{item.site_name}</td>
                    <td className="px-5 py-4">
                      <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-400 border border-green-500/20 uppercase font-mono">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-ink-400 font-mono text-xs">{item.facility}</td>
                    <td className="px-5 py-4 text-ink-400">{item.region}</td>
                    <td className="px-5 py-4 text-ink-400">{item.group}</td>
                    <td className="px-5 py-4 text-ink-400">{item.tenant}</td>
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
    </>
  );
}
