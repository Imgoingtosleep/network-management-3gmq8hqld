import { useState, useEffect } from 'react';
import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';

export default function DevicesPage() {
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [selectedDeviceType, setSelectedDeviceType] = useState('All');
  const [allDevices, setAllDevices] = useState([]);
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'hardware' | 'location' | 'tenancy' | 'advanced'
  
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form dropdown data
  const [sites, setSites] = useState([]);
  const [deviceRoles, setDeviceRoles] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [tenantGroups, setTenantGroups] = useState([]);
  const [locations, setLocations] = useState([]);
  const [racks, setRacks] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [configTemplates, setConfigTemplates] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [virtualChassises, setVirtualChassises] = useState([]);
  const [tagsList, setTagsList] = useState([]);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
    role: '',
    device_type: '',
    site: '',
    location: '',
    rack: '',
    face: '',
    position: '',
    latitude: '',
    longitude: '',
    platform: '',
    config_template: '',
    cluster: '',
    tenant_group: '',
    tenant: '',
    virtual_chassis: '',
    vc_position: '',
    vc_priority: '',
    owner_group: '',
    owner: '',
    description: '',
    airflow: '',
    serial: '',
    asset_tag: '',
    tags: '',
    nodeid: '',
    local_context_data: '',
    create_vlanif100: false,
    create_vlanif115: false
  });

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [
          sitesRes, rolesRes, typesRes, tenantsRes, locationsRes, racksRes,
          platformsRes, templatesRes, clustersRes, tenantGroupsRes, vcRes, tagsRes
        ] = await Promise.all([
          ndsApi.sites.list(),
          ndsApi.getDeviceRoles(),
          ndsApi.getDeviceTypes(),
          ndsApi.getTenants(),
          ndsApi.getLocations(),
          ndsApi.getRacks(),
          ndsApi.getPlatforms(),
          ndsApi.getConfigTemplates(),
          ndsApi.getClusters(),
          ndsApi.getTenantGroups(),
          ndsApi.getVirtualChassises(),
          ndsApi.getTags()
        ]);

        setSites(sitesRes.data?.data || sitesRes.data || sitesRes || []);
        setDeviceRoles(rolesRes.data?.data || rolesRes.data || rolesRes || []);
        setDeviceTypes(typesRes.data?.data || typesRes.data || typesRes || []);
        setTenants(tenantsRes.data?.data || tenantsRes.data || tenantsRes || []);
        setLocations(locationsRes.data?.data || locationsRes.data || locationsRes || []);
        setRacks(racksRes.data?.data || racksRes.data || racksRes || []);
        setPlatforms(platformsRes.data?.data || platformsRes.data || platformsRes || []);
        setConfigTemplates(templatesRes.data?.data || templatesRes.data || templatesRes || []);
        setClusters(clustersRes.data?.data || clustersRes.data || clustersRes || []);
        setTenantGroups(tenantGroupsRes.data?.data || tenantGroupsRes.data || tenantGroupsRes || []);
        setVirtualChassises(vcRes.data?.data || vcRes.data || vcRes || []);
        setTagsList(tagsRes.data?.data || tagsRes.data || tagsRes || []);
      } catch (err) {
        console.error('Failed to load form metadata:', err);
      }
    };
    loadMetadata();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateClick = () => {
    setFormData({
      name: '',
      status: 'active',
      role: '',
      device_type: '',
      site: '',
      location: '',
      rack: '',
      face: '',
      position: '',
      latitude: '',
      longitude: '',
      platform: '',
      config_template: '',
      cluster: '',
      tenant_group: '',
      tenant: '',
      virtual_chassis: '',
      vc_position: '',
      vc_priority: '',
      owner_group: '',
      owner: '',
      description: '',
      airflow: '',
      serial: '',
      asset_tag: '',
      tags: '',
      nodeid: '',
      local_context_data: '',
      create_vlanif100: false,
      create_vlanif115: false
    });
    setSaveError(null);
    setModalMode('create');
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleEditClick = () => {
    if (selectedDevices.length !== 1) return;
    const device = selectedDevices[0];

    // Find the IDs matching strings for values that only come back as names if not preloaded
    const matchedPlatform = platforms.find(p => p.name === device.platform)?.id || device.platform_id || '';
    const matchedCluster = clusters.find(c => c.name === device.cluster)?.id || device.cluster_id || '';
    const matchedVC = virtualChassises.find(v => v.name === device.virtual_chassis)?.id || device.virtual_chassis_id || '';

    setFormData({
      name: device.name || '',
      status: device.status_value || 'active',
      role: device.role_id || '',
      device_type: device.device_type_id || '',
      site: device.site_id || '',
      location: device.location_id || '',
      rack: device.rack_id || '',
      face: device.face || '',
      position: device.position || '',
      latitude: device.latitude || '',
      longitude: device.longitude || '',
      platform: matchedPlatform,
      config_template: device.config_template_id || '',
      cluster: matchedCluster,
      tenant_group: device.tenant_group_id || '',
      tenant: device.tenant_id || '',
      virtual_chassis: matchedVC,
      vc_position: device.vc_position || '',
      vc_priority: device.vc_priority || '',
      owner_group: device.owner_group === 'N/A' ? '' : device.owner_group,
      owner: device.owner === 'N/A' ? '' : device.owner,
      description: device.description === 'N/A' ? '' : device.description,
      airflow: device.airflow || '',
      serial: device.serial || '',
      asset_tag: device.asset_tag || '',
      tags: device.tags || '',
      nodeid: device.nodeid || '',
      local_context_data: device.local_context_data || '',
      create_vlanif100: false,
      create_vlanif115: false
    });

    setSaveError(null);
    setModalMode('edit');
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleDeleteClick = () => {
    if (selectedDevices.length !== 1) return;
    setSaveError(null);
    setIsDeleteConfirmOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.role || !formData.device_type || !formData.site || !formData.status || !formData.nodeid) {
      setSaveError('กรุณากรอกข้อมูลที่จำเป็น (Name, Status, Site, Device Type, Role, Node ID) ให้ครบถ้วน');
      return;
    }

    // Try validating local context data JSON if supplied
    let parsedLocalContext = null;
    if (formData.local_context_data.trim()) {
      try {
        parsedLocalContext = JSON.parse(formData.local_context_data);
      } catch (err) {
        setSaveError('ฟิลด์ Local Config Context Data ต้องอยู่ในรูปแบบ JSON ที่ถูกต้อง');
        setActiveTab('advanced');
        return;
      }
    }

    setSaving(true);
    setSaveError(null);

    // Parse values to comply with Netbox models
    const payload = {
      name: formData.name,
      status: formData.status,
      site: parseInt(formData.site),
      role: parseInt(formData.role),
      device_type: parseInt(formData.device_type),
      location: formData.location ? parseInt(formData.location) : null,
      rack: formData.rack ? parseInt(formData.rack) : null,
      face: formData.face || null,
      position: formData.position ? parseFloat(formData.position) : null,
      platform: formData.platform ? parseInt(formData.platform) : null,
      config_template: formData.config_template ? parseInt(formData.config_template) : null,
      cluster: formData.cluster ? parseInt(formData.cluster) : null,
      tenant: formData.tenant ? parseInt(formData.tenant) : null,
      virtual_chassis: formData.virtual_chassis ? parseInt(formData.virtual_chassis) : null,
      vc_position: formData.vc_position ? parseInt(formData.vc_position) : null,
      vc_priority: formData.vc_priority ? parseInt(formData.vc_priority) : null,
      description: formData.description || null,
      airflow: formData.airflow || null,
      serial: formData.serial || null,
      asset_tag: formData.asset_tag || null,
      local_context_data: parsedLocalContext,
      custom_fields: {
        node_id: formData.nodeid,
        owner_group: formData.owner_group || null,
        owner: formData.owner || null,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null
      }
    };

    // Parse tag names to array of strings
    if (formData.tags) {
      payload.tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    try {
      if (modalMode === 'create') {
        payload.create_vlanif100 = formData.create_vlanif100;
        payload.create_vlanif115 = formData.create_vlanif115;
        await ndsApi.createDevice(payload);
      } else {
        await ndsApi.updateDevice(selectedDevices[0].id, payload);
      }
      setSelectedDevices([]);
      setIsModalOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setSaveError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลดีไวซ์ไปยัง NetBox');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await ndsApi.deleteDevice(selectedDevices[0].id);
      setSelectedDevices([]);
      setIsDeleteConfirmOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setSaveError(err.message || 'เกิดข้อผิดพลาดในการลบดีไวซ์ออกจาก NetBox');
    } finally {
      setSaving(false);
    }
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
    const staticRoles = ['All', 'Provider Edge', 'Provider', 'Network', 'Aggregation'];
    const dynamicRoles = Array.from(new Set(allDevices.map(item => item.role).filter(Boolean)));
    const uniqueRoles = Array.from(new Set([...staticRoles, ...dynamicRoles]));

    const filteredList = fullList;

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
                setSelectedDevices([]); // Clear selected when filter changes
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
              onClick={handleCreateClick}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-nds border border-nds text-base-950 hover:bg-nds-hover transition-all shadow-[0_0_15px_rgba(76,141,255,0.15)]"
            >
              Create Device
            </button>
            <button
              type="button"
              onClick={handleEditClick}
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
              onClick={handleDeleteClick}
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
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Tenant</th>
                <th className="px-5 py-3.5">Site</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Rack</th>
                <th className="px-5 py-3.5">Manufacturer</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">IP Address</th>
                <th className="px-5 py-3.5">Description</th>
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
                       <span className={`rounded px-2 py-0.5 text-xs border font-semibold uppercase font-mono ${
                         (item.role || '').toLowerCase().includes('network')
                           ? 'bg-green-500/10 text-green-400 border-green-500/20'
                           : (item.role || '').toLowerCase().includes('aggregation')
                           ? 'bg-red-500/10 text-red-400 border-red-500/20'
                           : (item.role || '').toLowerCase().includes('provider edge')
                           ? 'bg-base-600/30 text-ink-400 border-base-600/50'
                           : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                       }`}>
                         {item.role}
                       </span>
                     </td>
                    <td className="px-5 py-4">
                      <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-400 border border-green-500/20 uppercase font-mono">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-ink-400">{item.tenant}</td>
                    <td className="px-5 py-4 text-ink-400">{item.site}</td>
                    <td className="px-5 py-4 text-ink-400">{item.location}</td>
                    <td className="px-5 py-4 text-ink-400">{item.rack}</td>
                    <td className="px-5 py-4 text-ink-400 font-mono text-xs">{item.manufacturer}</td>
                    <td className="px-5 py-4 text-ink-400">{item.type}</td>
                    <td className="px-5 py-4 font-mono text-nds">{item.ip}</td>
                    <td className="px-5 py-4 text-ink-400 max-w-xs truncate">{item.description}</td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลดีไวซ์ตามฟิลเตอร์นี้จาก NetBox</td>
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
        refreshTrigger={refreshTrigger}
        renderTable={renderDeviceTable}
        extraFilter={selectedRoleFilter === 'All' ? null : (item) => item.role === selectedRoleFilter}
        onDataLoaded={(data) => setAllDevices(data)}
      />

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl border border-base-600 bg-base-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left my-8">
            <div className="flex justify-between items-center border-b border-base-600/30 pb-3">
              <h3 className="font-display text-lg font-semibold text-ink-100">
                {modalMode === 'create' ? 'เพิ่มอุปกรณ์ใหม่ (Create Device)' : 'แก้ไขอุปกรณ์ (Edit Device)'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-ink-400 hover:text-ink-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Tab navigation */}
            <div className="mt-4 flex border-b border-base-600/30 gap-2">
              {[
                { id: 'general', label: 'ข้อมูลทั่วไป (General)' },
                { id: 'location', label: 'ตำแหน่ง & ไซต์ (Location)' },
                { id: 'hardware', label: 'ฮาร์ดแวร์ & VC (Hardware)' },
                { id: 'tenancy', label: 'กลุ่มผู้ดูแล (Tenancy & Owner)' },
                { id: 'advanced', label: 'ขั้นสูง & Context (Advanced)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-xs font-mono border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-nds text-nds font-semibold'
                      : 'border-transparent text-ink-400 hover:text-ink-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {saveError && (
              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 font-mono">
                {saveError}
              </div>
            )}

            <div className="mt-4 min-h-[350px]">
              {/* Tab 1: General */}
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-mono text-ink-400">Device Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. bkk-pe-01"
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Node ID (Custom field) *</label>
                    <input
                      type="text"
                      name="nodeid"
                      value={formData.nodeid}
                      onChange={handleInputChange}
                      placeholder="e.g. NODE-BKK-01"
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
                      <option value="active">Active</option>
                      <option value="offline">Offline</option>
                      <option value="planned">Planned</option>
                      <option value="staged">Staged</option>
                      <option value="failed">Failed</option>
                      <option value="inventory">Inventory</option>
                      <option value="decommissioning">Decommissioning</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Device Role *</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                      required
                    >
                      <option value="">-- เลือก Device Role --</option>
                      {deviceRoles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Device Type *</label>
                    <select
                      name="device_type"
                      value={formData.device_type}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                      required
                    >
                      <option value="">-- เลือก Device Type (Model) --</option>
                      {deviceTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.display}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Platform</label>
                    <select
                      name="platform"
                      value={formData.platform}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    >
                      <option value="">-- เลือก Platform --</option>
                      {platforms.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Config Template</label>
                    <select
                      name="config_template"
                      value={formData.config_template}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    >
                      <option value="">-- เลือก Config Template --</option>
                      {configTemplates.map(ct => (
                        <option key={ct.id} value={ct.id}>{ct.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-mono text-ink-400">Tags (คั่นด้วยจุลภาค `,` เพื่อแยกหลายแท็ก)</label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleInputChange}
                      placeholder="e.g. Production, Core, NDS"
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-mono text-ink-400">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={2}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none resize-none"
                      placeholder="คำอธิบายอุปกรณ์..."
                    />
                  </div>

                  {modalMode === 'create' && (
                    <div className="col-span-1 sm:col-span-2 border border-base-600/30 rounded-xl bg-base-950/30 p-4 mt-2">
                      <label className="block text-xs font-mono font-semibold text-nds mb-2">Virtual Interfaces (อินเตอร์เฟสเสมือน)</label>
                      <div className="flex gap-6">
                        <label className="inline-flex items-center text-xs font-mono text-ink-400 cursor-pointer">
                          <input
                            type="checkbox"
                            name="create_vlanif100"
                            checked={formData.create_vlanif100}
                            onChange={(e) => setFormData(prev => ({ ...prev, create_vlanif100: e.target.checked }))}
                            className="rounded border-base-600 text-nds focus:ring-nds bg-base-950 w-4 h-4 cursor-pointer mr-2"
                          />
                          สร้าง Vlanif100 (Type: virtual)
                        </label>
                        <label className="inline-flex items-center text-xs font-mono text-ink-400 cursor-pointer">
                          <input
                            type="checkbox"
                            name="create_vlanif115"
                            checked={formData.create_vlanif115}
                            onChange={(e) => setFormData(prev => ({ ...prev, create_vlanif115: e.target.checked }))}
                            className="rounded border-base-600 text-nds focus:ring-nds bg-base-950 w-4 h-4 cursor-pointer mr-2"
                          />
                          สร้าง Vlanif115 (Type: virtual)
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Location */}
              {activeTab === 'location' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-mono text-ink-400">Site *</label>
                    <select
                      name="site"
                      value={formData.site}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                      required
                    >
                      <option value="">-- เลือก Site --</option>
                      {sites.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Location</label>
                    <select
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    >
                      <option value="">-- เลือก Location --</option>
                      {locations.filter(l => !formData.site || l.site === parseInt(formData.site)).map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Rack</label>
                    <select
                      name="rack"
                      value={formData.rack}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    >
                      <option value="">-- เลือก Rack --</option>
                      {racks.filter(r => !formData.site || r.site === parseInt(formData.site)).map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Rack Face</label>
                    <select
                      name="face"
                      value={formData.face}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    >
                      <option value="">-- เลือกด้าน (Face) --</option>
                      <option value="front">Front (ด้านหน้า)</option>
                      <option value="rear">Rear (ด้านหลัง)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Rack Position (U index)</label>
                    <input
                      type="number"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      placeholder="e.g. 42"
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    />
                  </div>

                  <div className="hidden sm:block"></div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Latitude</label>
                    <input
                      type="text"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      placeholder="e.g. 13.736717"
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
                      placeholder="e.g. 100.523186"
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Hardware */}
              {activeTab === 'hardware' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-mono text-ink-400">Airflow</label>
                    <input
                      type="text"
                      name="airflow"
                      value={formData.airflow}
                      onChange={handleInputChange}
                      placeholder="e.g. front-to-back"
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Serial number</label>
                    <input
                      type="text"
                      name="serial"
                      value={formData.serial}
                      onChange={handleInputChange}
                      placeholder="S/N"
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Asset tag</label>
                    <input
                      type="text"
                      name="asset_tag"
                      value={formData.asset_tag}
                      onChange={handleInputChange}
                      placeholder="Asset Tag"
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Virtual chassis</label>
                    <select
                      name="virtual_chassis"
                      value={formData.virtual_chassis}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    >
                      <option value="">-- เลือก Virtual Chassis --</option>
                      {virtualChassises.map(vc => (
                        <option key={vc.id} value={vc.id}>{vc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">VC Member Position</label>
                    <input
                      type="number"
                      name="vc_position"
                      value={formData.vc_position}
                      onChange={handleInputChange}
                      placeholder="e.g. 0"
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">VC Member Priority</label>
                    <input
                      type="number"
                      name="vc_priority"
                      value={formData.vc_priority}
                      onChange={handleInputChange}
                      placeholder="e.g. 255"
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Tab 4: Tenancy & Owner */}
              {activeTab === 'tenancy' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-mono text-ink-400">Tenant group</label>
                    <select
                      name="tenant_group"
                      value={formData.tenant_group}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    >
                      <option value="">-- เลือก Tenant group --</option>
                      {tenantGroups.map(tg => (
                        <option key={tg.id} value={tg.id}>{tg.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Tenant</label>
                    <select
                      name="tenant"
                      value={formData.tenant}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    >
                      <option value="">-- เลือก Tenant --</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Owner group</label>
                    <input
                      type="text"
                      name="owner_group"
                      value={formData.owner_group}
                      onChange={handleInputChange}
                      placeholder="e.g. NDS Team"
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
                      placeholder="e.g. Rachata"
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Tab 5: Advanced & JSON */}
              {activeTab === 'advanced' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-mono text-ink-400">Cluster</label>
                    <select
                      name="cluster"
                      value={formData.cluster}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    >
                      <option value="">-- เลือก Cluster --</option>
                      {clusters.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>



                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-mono text-ink-400">Local Config Context Data (JSON format)</label>
                    <textarea
                      name="local_context_data"
                      value={formData.local_context_data}
                      onChange={handleInputChange}
                      rows={6}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs font-mono text-ink-100 focus:border-nds focus:outline-none"
                      placeholder={`{\n  "syslog_server": "10.0.0.1",\n  "ntp_server": "10.0.0.2"\n}`}
                    />
                  </div>
                </div>
              )}
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
                {saving ? 'กำลังบันทึก...' : modalMode === 'create' ? 'สร้าง Device' : 'บันทึกไปยัง NetBox'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-base-600 bg-base-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left">
            <h3 className="font-display text-lg font-semibold text-ink-100">
              ยืนยันการลบข้อมูล Device
            </h3>
            <p className="mt-3 text-xs text-ink-400 leading-relaxed">
              คุณต้องการลบข้อมูล Device <span className="text-red-400 font-bold">{selectedDevices[0]?.name}</span> ออกจาก NetBox ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>

            {saveError && (
              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 font-mono">
                {saveError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3 border-t border-base-600/30 pt-4">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="rounded-lg border border-base-600 bg-base-950 px-4 py-2 text-xs text-ink-400 hover:bg-base-800 transition-colors"
                disabled={saving}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                disabled={saving}
              >
                {saving ? 'กำลังลบ...' : 'ยืนยันลบ Device'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
