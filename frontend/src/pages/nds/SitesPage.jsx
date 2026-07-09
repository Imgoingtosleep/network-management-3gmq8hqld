import { useState, useEffect } from 'react';
import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';

export default function SitesPage() {
  const [selectedSites, setSelectedSites] = useState([]);
  const [regions, setRegions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const loadRegions = async () => {
      try {
        const res = await ndsApi.getRegions();
        setRegions(res.data?.data || []);
      } catch (err) {
        console.error('Failed to load regions:', err);
      }
    };
    loadRegions();
  }, []);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    status: 'active',
    region: '',
    group: '',
    facility: '',
    asns: '',
    time_zone: '',
    description: '',
    tags: '',
    tenant_group: '',
    tenant: '',
    physical_address: '',
    shipping_address: '',
    latitude: '',
    longitude: '',
    name_thai: '',
    site_name: '',
    owner_group: '',
    owner: ''
  });

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

  const handleCreateClick = () => {
    setFormData({
      name: '',
      slug: '',
      status: 'active',
      region: '',
      group: '',
      facility: '',
      asns: '',
      time_zone: '',
      description: '',
      tags: '',
      tenant_group: '',
      tenant: '',
      physical_address: '',
      shipping_address: '',
      latitude: '',
      longitude: '',
      name_thai: '',
      site_name: '',
      owner_group: '',
      owner: ''
    });
    setSaveError(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditClick = () => {
    if (selectedSites.length !== 1) return;
    const site = selectedSites[0];
    setFormData({
      name: site.name || '',
      slug: site.slug || '',
      status: site.status || 'active',
      region: regions.find(r => r.name === site.region)?.id || '',
      group: site.group === 'N/A' ? '' : site.group,
      facility: site.facility === 'N/A' ? '' : site.facility,
      asns: site.asns || '',
      time_zone: site.time_zone || '',
      description: site.description === 'N/A' ? '' : site.description,
      tags: site.tags || '',
      tenant_group: site.tenant_group === 'N/A' ? '' : site.tenant_group,
      tenant: site.tenant === 'N/A' ? '' : site.tenant,
      physical_address: site.physical_address || '',
      shipping_address: site.shipping_address || '',
      latitude: site.latitude || '',
      longitude: site.longitude || '',
      name_thai: site.name_thai === 'N/A' ? '' : site.name_thai,
      site_name: site.site_name === 'N/A' ? '' : site.site_name,
      owner_group: site.owner_group === 'N/A' ? '' : site.owner_group,
      owner: site.owner === 'N/A' ? '' : site.owner
    });
    setSaveError(null);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // เจนค่า Slug จาก Name เป็นตัวเล็กภาษาอังกฤษและลบอักขระพิเศษ
      if (name === 'name') {
        updated.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
      }
      
      // บังคับให้ช่อง slug เป็นตัวเล็กเสมอเมื่อพิมพ์เอง
      if (name === 'slug') {
        updated.slug = value.toLowerCase();
      }
      
      return updated;
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug || !formData.status || !formData.name_thai || !formData.site_name) {
      setSaveError('กรุณากรอกฟิลด์ที่จำเป็น (Name, Slug, Status, Name thai, Site name) ให้ครบถ้วน');
      return;
    }

    setSaving(true);
    setSaveError(null);

    // Structure payload based on NetBox specifications
    const payload = {
      name: formData.name,
      slug: formData.slug,
      status: formData.status,
      region: formData.region ? parseInt(formData.region) : null,
      facility: formData.facility || null,
      time_zone: formData.time_zone || null,
      description: formData.description || null,
      physical_address: formData.physical_address || null,
      shipping_address: formData.shipping_address || null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      custom_fields: {
        name_thai: formData.name_thai,
        site_name: formData.site_name,
        owner_group: formData.owner_group || null,
        owner: formData.owner || null
      }
    };

    try {
      if (modalMode === 'create') {
        await ndsApi.sites.create(payload);
      } else {
        await ndsApi.sites.update(selectedSites[0].id, payload);
      }
      setSelectedSites([]);
      setIsModalOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setSaveError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลไซต์ไปยัง NetBox');
    } finally {
      setSaving(false);
    }
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
            onClick={handleCreateClick}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-nds border border-nds text-base-950 hover:bg-nds-hover transition-all shadow-[0_0_15px_rgba(76,141,255,0.15)]"
          >
            Create Site
          </button>
          <button
            type="button"
            onClick={handleEditClick}
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
            disabled={selectedSites.length === 0}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
              selectedSites.length > 0
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
        refreshTrigger={refreshTrigger}
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

      {/* Create/Edit Site Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-2xl rounded-xl border border-base-600 bg-base-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-display text-lg font-semibold text-ink-100">
              {modalMode === 'create' ? 'เพิ่มข้อมูล Site' : 'แก้ไขข้อมูล Site'}
            </h3>
            {modalMode === 'edit' && (
              <p className="mt-1 font-mono text-xs text-ink-400">
                Site ID: <span className="text-nds font-semibold">{selectedSites[0]?.id}</span>
              </p>
            )}

            {saveError && (
              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 font-mono">
                {saveError}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1 text-left">
              {/* General Details */}
              <div className="col-span-2 border-b border-base-600/30 pb-1 mt-2">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-nds">General Details</span>
              </div>
              
              <div>
                <label className="block text-xs font-mono text-ink-400">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Slug *</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder=""
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                  required
                >
                  <option value="planned">Planned</option>
                  <option value="staging">Staging</option>
                  <option value="active">Active</option>
                  <option value="decommissioning">Decommissioning</option>
                  <option value="retired">Retired</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Region</label>
                <select
                  name="region"
                  value={formData.region}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                >
                  <option value="">-- เลือก Region --</option>
                  {regions.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Group</label>
                <input
                  type="text"
                  name="group"
                  value={formData.group}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Facility</label>
                <input
                  type="text"
                  name="facility"
                  value={formData.facility}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                />
              </div>
                  
              <div>
                <label className="block text-xs font-mono text-ink-400">ASNs</label>
                <input
                  type="text"
                  name="asns"
                  value={formData.asns}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Time zone</label>
                <input
                  type="text"
                  name="time_zone"
                  value={formData.time_zone}
                  onChange={handleInputChange}
                  placeholder=""
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-mono text-ink-400">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none resize-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-mono text-ink-400">Tags</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                />
              </div>

              {/* Tenant Info */}
              <div className="col-span-2 border-b border-base-600/30 pb-1 mt-3">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-nds">Tenant Info</span>
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Tenant group</label>
                <input
                  type="text"
                  name="tenant_group"
                  value={formData.tenant_group}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Tenant</label>
                <input
                  type="text"
                  name="tenant"
                  value={formData.tenant}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                />
              </div>

              {/* Address details */}
              <div className="col-span-2 border-b border-base-600/30 pb-1 mt-3">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-nds">Address & Location Details</span>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-mono text-ink-400">Physical address</label>
                <input
                  type="text"
                  name="physical_address"
                  value={formData.physical_address}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-mono text-ink-400">Shipping address</label>
                <input
                  type="text"
                  name="shipping_address"
                  value={formData.shipping_address}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Latitude</label>
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Longitude</label>
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                />
              </div>

              {/* Custom Fields */}
              <div className="col-span-2 border-b border-base-600/30 pb-1 mt-3">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-nds">Custom Fields (Required)</span>
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Name thai *</label>
                <input
                  type="text"
                  name="name_thai"
                  value={formData.name_thai}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Site name *</label>
                <input
                  type="text"
                  name="site_name"
                  value={formData.site_name}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                  required
                />
              </div>

              {/* Owner Info */}
              <div className="col-span-2 border-b border-base-600/30 pb-1 mt-3">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-nds">Owner Info</span>
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Owner group</label>
                <input
                  type="text"
                  name="owner_group"
                  value={formData.owner_group}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Owner</label>
                <input
                  type="text"
                  name="owner"
                  value={formData.owner}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-base-600/30 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
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
                {saving ? 'กำลังบันทึก...' : modalMode === 'create' ? 'สร้าง Site' : 'บันทึกไปยัง NetBox'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
