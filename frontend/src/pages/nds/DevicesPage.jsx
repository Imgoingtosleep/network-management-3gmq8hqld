import { useState } from 'react';
import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';
import axiosClient from '../../api/axiosClient.js';

export default function DevicesPage() {
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const apiBaseURL = axiosClient.defaults.baseURL;

  const handleCreate = () => {
    window.open(`${apiBaseURL}/nds/netbox-redirect?type=device_add`, '_blank');
  };

  const handleEdit = () => {
    if (selectedDevices.length !== 1) return;
    window.open(`${apiBaseURL}/nds/netbox-redirect?type=device_edit&id=${selectedDevices[0].id}`, '_blank');
  };

  const handleDelete = () => {
    if (selectedDevices.length !== 1) return;
    window.open(`${apiBaseURL}/nds/netbox-redirect?type=device_delete&id=${selectedDevices[0].id}`, '_blank');
  };

  const toggleSelectAll = (list) => {
    if (selectedDevices.length === list.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(list);
    }
  };

  const toggleSelectOne = (item) => {
    if (selectedDevices.some(d => d.id === item.id)) {
      setSelectedDevices(prev => prev.filter(d => d.id !== item.id));
    } else {
      setSelectedDevices(prev => [...prev, item]);
    }
  };

  const renderDeviceTable = (fullList) => {
    // สกัดประเภท Role ทั้งหมดที่มีแบบไดนามิก เพื่อสร้างฟิลเตอร์
    const uniqueRoles = ['All', ...Array.from(new Set(fullList.map(item => item.role).filter(Boolean)))];

    // กรองอุปกรณ์ตาม Role ที่เลือก
    const filteredList = fullList.filter(item => {
      if (selectedRoleFilter === 'All') return true;
      return item.role === selectedRoleFilter;
    });

    return (
      <div>
        {/* Role Filter & Toolbar Header */}
        <div className="mb-4 flex flex-wrap gap-4 justify-between items-center bg-base-900/40 p-4 rounded-xl border border-base-600/30">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-ink-400">
              Filter by Role:
            </span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => {
                setSelectedRoleFilter(e.target.value);
                setSelectedDevices([]); // ล้างตัวที่เลือกเมื่อสลับฟิลเตอร์
              }}
              className="rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 focus:border-nds focus:outline-none font-mono min-w-[180px]"
            >
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            {selectedDevices.length > 0 && (
              <span className="text-xs font-mono text-ink-500 border-l border-base-600/50 pl-4 animate-in fade-in duration-200">
                Selected: <span className="text-nds font-bold">{selectedDevices.length}</span> devices
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-nds border border-nds text-base-950 hover:bg-nds-hover transition-all shadow-[0_0_15px_rgba(76,141,255,0.15)]"
            >
              Create Device
            </button>
            <button
              type="button"
              onClick={handleEdit}
              disabled={selectedDevices.length !== 1}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                selectedDevices.length === 1
                  ? 'bg-base-950 border-base-600 text-ink-100 hover:bg-base-800'
                  : 'bg-base-950 border-base-600 text-ink-500 cursor-not-allowed opacity-50'
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={selectedDevices.length !== 1}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                selectedDevices.length === 1
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                  : 'bg-base-950 border-base-600 text-ink-500 cursor-not-allowed opacity-50'
              }`}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Table Display */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
              <tr>
                <th className="px-5 py-3.5 text-center w-12">
                  <input
                    type="checkbox"
                    checked={filteredList.length > 0 && selectedDevices.length === filteredList.length}
                    onChange={() => toggleSelectAll(filteredList)}
                    className="rounded border-base-600 text-nds focus:ring-nds focus:ring-opacity-25 bg-base-950 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-5 py-3.5">nodeid</th>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Tenant</th>
                <th className="px-5 py-3.5">Site</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Rack</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Manufacturer</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">IP Address</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-600/30">
              {filteredList.map(item => {
                const isSelected = selectedDevices.some(d => d.id === item.id);
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
                    <td className="px-5 py-4 font-mono text-xs text-ink-500">{item.nodeid}</td>
                    <td className="px-5 py-4 font-mono font-medium text-ink-100">{item.name}</td>
                    <td className="px-5 py-4">
                      <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-400 border border-green-500/20 uppercase font-mono">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-ink-400">{item.tenant}</td>
                    <td className="px-5 py-4 text-ink-400">{item.site}</td>
                    <td className="px-5 py-4 text-ink-400">{item.location}</td>
                    <td className="px-5 py-4 text-ink-400">{item.rack}</td>
                    <td className="px-5 py-4 text-ink-400 font-mono text-xs">{item.role}</td>
                    <td className="px-5 py-4 text-ink-400">{item.manufacturer}</td>
                    <td className="px-5 py-4 text-ink-400">{item.type}</td>
                    <td className="px-5 py-4 font-mono text-nds">{item.ip}</td>
                    <td className="px-5 py-4 text-ink-400 max-w-xs truncate">{item.description}</td>
                    <td className="px-5 py-4 font-mono text-xs text-ink-600">{item.last_updated}</td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลดีไวซ์ตามฟิลเตอร์นี้จาก NetBox</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      <NDSPageContainer
        fetchData={() => ndsApi.getDevices()}
        renderTable={renderDeviceTable}
      />
    </div>
  );
}
