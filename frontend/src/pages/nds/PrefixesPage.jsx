import { useState, useEffect } from 'react';
import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';

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

export default function PrefixesPage() {
  const [selectedPrefixes, setSelectedPrefixes] = useState([]);
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'scope' | 'tenancy'
  
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Metadata dropdowns
  const [vrfs, setVrfs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [vlans, setVlans] = useState([]);
  const [sites, setSites] = useState([]);
  const [regions, setRegions] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [tenantGroups, setTenantGroups] = useState([]);
  const [tenants, setTenants] = useState([]);

  // Form states
  const [formData, setFormData] = useState({
    prefix: '',
    status: 'active',
    vrf: '',
    role: '',
    is_pool: false,
    mark_utilized: false,
    ringname: '',
    description: '',
    tags: '',
    scope_type: '',
    scope_id: '',
    vlan: '',
    tenant_group: '',
    tenant: '',
    owner_group: '',
    owner: ''
  });

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [
          vrfsRes, rolesRes, vlansRes, sitesRes, regionsRes, clustersRes, tenantGroupsRes, tenantsRes
        ] = await Promise.all([
          ndsApi.domains.list(),
          ndsApi.getDeviceRoles(),
          ndsApi.getVlans(),
          ndsApi.sites.list(),
          ndsApi.getRegions(),
          ndsApi.getClusters(),
          ndsApi.getTenantGroups(),
          ndsApi.getTenants()
        ]);

        setVrfs(vrfsRes.data?.data || vrfsRes.data || vrfsRes || []);
        setRoles(rolesRes.data?.data || rolesRes.data || rolesRes || []);
        setVlans(vlansRes.data?.data || vlansRes.data || vlansRes || []);
        setSites(sitesRes.data?.data || sitesRes.data || sitesRes || []);
        setRegions(regionsRes.data?.data || regionsRes.data || regionsRes || []);
        setClusters(clustersRes.data?.data || clustersRes.data || clustersRes || []);
        setTenantGroups(tenantGroupsRes.data?.data || tenantGroupsRes.data || tenantGroupsRes || []);
        setTenants(tenantsRes.data?.data || tenantsRes.data || tenantsRes || []);
      } catch (err) {
        console.error('Failed to load prefixes metadata:', err);
      }
    };
    loadMetadata();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // Reset scope_id if scope_type changes
      if (name === 'scope_type') {
        updated.scope_id = '';
      }
      return updated;
    });
  };

  const handleCreateClick = () => {
    setFormData({
      prefix: '',
      status: 'active',
      vrf: '',
      role: '',
      is_pool: false,
      mark_utilized: false,
      ringname: '',
      description: '',
      tags: '',
      scope_type: '',
      scope_id: '',
      vlan: '',
      tenant_group: '',
      tenant: '',
      owner_group: '',
      owner: ''
    });
    setSaveError(null);
    setModalMode('create');
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleEditClick = () => {
    if (selectedPrefixes.length !== 1) return;
    const prefix = selectedPrefixes[0];

    // Map scope types matching NetBox Content Types
    let scopeTypeVal = '';
    if (prefix.scope_type) {
      if (prefix.scope_type.includes('site')) scopeTypeVal = 'dcim.site';
      else if (prefix.scope_type.includes('region')) scopeTypeVal = 'dcim.region';
      else if (prefix.scope_type.includes('cluster')) scopeTypeVal = 'virtualization.cluster';
    }

    setFormData({
      prefix: prefix.prefix || '',
      status: prefix.status_value || 'active',
      vrf: prefix.vrf_id || '',
      role: prefix.role_id || '',
      is_pool: prefix.is_pool || false,
      mark_utilized: prefix.mark_utilized || false,
      ringname: prefix.ringname === 'N/A' ? '' : prefix.ringname,
      description: prefix.description === 'N/A' ? '' : prefix.description,
      tags: prefix.tags || '',
      scope_type: scopeTypeVal,
      scope_id: prefix.scope_id || '',
      vlan: prefix.vlan_id || '',
      tenant_group: prefix.tenant_group_id || '',
      tenant: prefix.tenant_id || '',
      owner_group: prefix.owner_group === 'N/A' ? '' : prefix.owner_group,
      owner: prefix.owner === 'N/A' ? '' : prefix.owner
    });

    setSaveError(null);
    setModalMode('edit');
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleDeleteClick = () => {
    if (selectedPrefixes.length !== 1) return;
    setSaveError(null);
    setIsDeleteConfirmOpen(true);
  };

  const handleSave = async () => {
    if (!formData.prefix || !formData.status) {
      setSaveError('กรุณากรอกฟิลด์ที่จำเป็น (Prefix, Status) ให้ครบถ้วน');
      return;
    }

    setSaving(true);
    setSaveError(null);

    const payload = {
      prefix: formData.prefix,
      status: formData.status,
      vrf: formData.vrf ? parseInt(formData.vrf) : null,
      role: formData.role ? parseInt(formData.role) : null,
      is_pool: formData.is_pool,
      mark_utilized: formData.mark_utilized,
      description: formData.description || null,
      vlan: formData.vlan ? parseInt(formData.vlan) : null,
      tenant: formData.tenant ? parseInt(formData.tenant) : null,
      custom_fields: {
        ringname: formData.ringname || null,
        owner_group: formData.owner_group || null,
        owner: formData.owner || null
      }
    };

    if (formData.scope_type && formData.scope_id) {
      payload.scope_type = formData.scope_type;
      payload.scope_id = parseInt(formData.scope_id);
    } else {
      payload.scope_type = null;
      payload.scope_id = null;
    }

    if (formData.tags) {
      payload.tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    try {
      if (modalMode === 'create') {
        await ndsApi.prefixes.create(payload);
      } else {
        await ndsApi.prefixes.update(selectedPrefixes[0].id, payload);
      }
      setSelectedPrefixes([]);
      setIsModalOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setSaveError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลไปยัง NetBox');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await ndsApi.prefixes.delete(selectedPrefixes[0].id);
      setSelectedPrefixes([]);
      setIsDeleteConfirmOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setSaveError(err.message || 'เกิดข้อผิดพลาดในการลบ Prefix ออกจาก NetBox');
    } finally {
      setSaving(false);
    }
  };

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

  // Get active scope list based on selected scope type
  const getScopeList = () => {
    switch (formData.scope_type) {
      case 'dcim.site':
        return sites;
      case 'dcim.region':
        return regions.map(r => ({ id: r.id, name: r.name }));
      case 'virtualization.cluster':
        return clusters;
      default:
        return [];
    }
  };

  const activeScopes = getScopeList();

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
            onClick={handleCreateClick}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-nds border border-nds text-base-950 hover:bg-nds-hover transition-all shadow-[0_0_15px_rgba(76,141,255,0.15)]"
          >
            Create Prefix
          </button>
          
          <button
            type="button"
            onClick={handleEditClick}
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
            onClick={handleDeleteClick}
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
        refreshTrigger={refreshTrigger}
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
                <th className="px-5 py-3.5">VRF</th>
                <th className="px-5 py-3.5 text-nds font-bold">Ring Name</th>
                <th className="px-5 py-3.5">IP Prefix Block</th>
                <th className="px-5 py-3.5">VLAN ID</th>
                <th className="px-5 py-3.5">Utilization</th>
                <th className="px-5 py-3.5">Tenant</th>
                <th className="px-5 py-3.5">Role</th>
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
                    <td className="px-5 py-4 text-ink-400 font-mono text-xs">{item.vrf}</td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {item.ringname && item.ringname !== 'N/A' ? (
                        <span className="text-nds font-semibold uppercase">
                          {item.ringname}
                        </span>
                      ) : (
                        <span className="text-ink-600">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-medium text-ink-100 font-mono">{item.prefix}</td>
                    <td className="px-5 py-4 text-ink-400 font-mono text-xs">{item.vlan}</td>
                    <td className="px-5 py-4">{renderUtilBar(item.utilization)}</td>
                    <td className="px-5 py-4 text-ink-400">{item.tenant}</td>
                    <td className="px-5 py-4 text-ink-400 font-mono text-xs">{item.role}</td>
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

      {/* Create / Edit Prefix Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-base-600 bg-base-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left my-8">
            <div className="flex justify-between items-center border-b border-base-600/30 pb-3">
              <h3 className="font-display text-lg font-semibold text-ink-100">
                {modalMode === 'create' ? 'เพิ่มข้อมูล IP Prefix' : 'แก้ไขข้อมูล IP Prefix'}
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
                { id: 'scope', label: 'ขอบเขต & เน็ตเวิร์ก (Scope & VLAN)' },
                { id: 'tenancy', label: 'กลุ่มผู้ดูแล (Tenancy)' }
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

            <div className="mt-4 min-h-[300px]">
              {/* Tab 1: General */}
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-mono text-ink-400">Prefix *</label>
                    <input
                      type="text"
                      name="prefix"
                      value={formData.prefix}
                      onChange={handleInputChange}
                      placeholder="e.g. 10.0.0.0/24"
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none font-mono"
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
                      <option value="container">Container</option>
                      <option value="deprecated">Deprecated</option>
                      <option value="reserved">Reserved</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">VRF (Domain)</label>
                    <select
                      name="vrf"
                      value={formData.vrf}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    >
                      <option value="">-- เลือก VRF --</option>
                      {vrfs.map(v => (
                        <option key={v.id} value={v.id}>{v.name} {v.rd ? `(${v.rd})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    >
                      <option value="">-- เลือก Role --</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-6 py-2">
                    <label className="flex items-center text-xs font-mono text-ink-400 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_pool"
                        checked={formData.is_pool}
                        onChange={handleInputChange}
                        className="rounded border-base-600 text-nds focus:ring-nds bg-base-950 w-4 h-4 mr-2 cursor-pointer"
                      />
                      Is a Pool
                    </label>

                    <label className="flex items-center text-xs font-mono text-ink-400 cursor-pointer">
                      <input
                        type="checkbox"
                        name="mark_utilized"
                        checked={formData.mark_utilized}
                        onChange={handleInputChange}
                        className="rounded border-base-600 text-nds focus:ring-nds bg-base-950 w-4 h-4 mr-2 cursor-pointer"
                      />
                      Mark Utilized
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Ring Name (Custom Field)</label>
                    <input
                      type="text"
                      name="ringname"
                      value={formData.ringname}
                      onChange={handleInputChange}
                      placeholder="e.g. BKK-RING-01"
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-mono text-ink-400">Tags (คั่นด้วยจุลภาค `,` เพื่อแยกหลายแท็ก)</label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleInputChange}
                      placeholder="e.g. Core, VLAN100, NDS"
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
                      placeholder="คำอธิบายเพิ่มเติม..."
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Scope & VLAN */}
              {activeTab === 'scope' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-mono text-ink-400">Scope Type</label>
                    <select
                      name="scope_type"
                      value={formData.scope_type}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    >
                      <option value="">-- ไม่ระบุ Scope --</option>
                      <option value="dcim.site">Site (dcim.site)</option>
                      <option value="dcim.region">Region (dcim.region)</option>
                      <option value="virtualization.cluster">Cluster (virtualization.cluster)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">Scope</label>
                    <select
                      name="scope_id"
                      value={formData.scope_id}
                      onChange={handleInputChange}
                      disabled={!formData.scope_type}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">-- เลือกรายการ Scope --</option>
                      {activeScopes.map(scope => (
                        <option key={scope.id} value={scope.id}>{scope.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-400">VLAN</label>
                    <select
                      name="vlan"
                      value={formData.vlan}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    >
                      <option value="">-- เลือก VLAN --</option>
                      {vlans.map(v => (
                        <option key={v.id} value={v.id}>{v.display}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Tab 3: Tenancy & Owner */}
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
                {saving ? 'กำลังบันทึก...' : modalMode === 'create' ? 'สร้าง Prefix' : 'บันทึกไปยัง NetBox'}
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
              ยืนยันการลบข้อมูล IP Prefix
            </h3>
            <p className="mt-3 text-xs text-ink-400 leading-relaxed">
              คุณต้องการลบข้อมูล IP Prefix <span className="text-red-400 font-bold">{selectedPrefixes[0]?.prefix}</span> ออกจาก NetBox ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
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
                {saving ? 'กำลังลบ...' : 'ยืนยันลบ Prefix'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
