import { useEffect, useState } from 'react';
import { cdsApi } from '../../api/cds.api.js';

export default function CDSVlansPage() {
  const [vlans, setVlans] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State สำหรับสร้าง VLAN ใหม่ (รองรับฟิลด์ NetBox ทั้งหมด)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields อ้างอิง NetBox VLAN Schema
  const [vidInput, setVidInput] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [statusInput, setStatusInput] = useState('active');
  const [roleInput, setRoleInput] = useState('Customer');
  const [groupInput, setGroupInput] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [siteInput, setSiteInput] = useState('');
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const [tenantInput, setTenantInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [qinqRoleInput, setQinqRoleInput] = useState('');
  const [qinqRoleSearchQuery, setQinqRoleSearchQuery] = useState('');
  const [showQinqRoleDropdown, setShowQinqRoleDropdown] = useState(false);

  const [qinqSvlanInput, setQinqSvlanInput] = useState('');
  const [qinqSvlanSearchQuery, setQinqSvlanSearchQuery] = useState('');
  const [showQinqSvlanDropdown, setShowQinqSvlanDropdown] = useState(false);

  const [qinqCvlanInput, setQinqCvlanInput] = useState('');

  const [roles, setRoles] = useState([]);
  const [vlanGroups, setVlanGroups] = useState([]);

  const loadVlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vlanRes, siteRes, roleRes, groupRes] = await Promise.all([
        cdsApi.getVlans(),
        cdsApi.getSites().catch(() => ({ data: [] })),
        cdsApi.getVlanRoles().catch(() => ({ data: [] })),
        cdsApi.getVlanGroups().catch(() => ({ data: [] }))
      ]);

      const list = vlanRes.data?.data || vlanRes.data || vlanRes || [];
      setVlans(list);

      const siteList = siteRes.data?.data || siteRes.data || siteRes || [];
      setSites(siteList);

      const roleList = roleRes.data?.data || roleRes.data || roleRes || [];
      setRoles(roleList);

      const groupList = groupRes.data?.data || groupRes.data || groupRes || [];
      setVlanGroups(groupList);
    } catch (err) {
      console.error('Failed to load CDS VLANs:', err);
      setError('ไม่สามารถเชื่อมต่อดึงข้อมูล VLANs จากระบบหลังบ้านได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVlans();
  }, []);

  // คำนวณชื่อ VLAN ตามฟอร์แมต Naming Standard: Customer_<name>_<vid>
  const generatedVlanName = customerNameInput && vidInput
    ? `Customer_${customerNameInput.trim().replace(/\s+/g, '')}_${vidInput.trim()}`
    : '';

  const closeAllDropdowns = () => {
    setShowGroupDropdown(false);
    setShowSiteDropdown(false);
    setShowQinqRoleDropdown(false);
    setShowQinqSvlanDropdown(false);
  };

  const handleCreateVlan = async (e) => {
    e.preventDefault();
    if (!vidInput || !customerNameInput) {
      setError('กรุณากรอก VID และชื่อลูกค้า (Require Fields)');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const parsedTags = tagsInput
      ? tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const payload = {
      vid: parseInt(vidInput, 10), // Required
      name: generatedVlanName,    // Required
      status: statusInput || 'active', // Required
      role: roleInput,
      group: groupInput,
      site: siteInput,
      tenant: tenantInput,
      description: descriptionInput,
      tags: parsedTags,
      qinq_role: qinqRoleInput || null,
      qinq_svlan: qinqSvlanInput || null,
      qinq_cvlan: qinqCvlanInput || null
    };

    try {
      await cdsApi.createVlan(payload);
      setSuccessMsg(`สร้าง VLAN ${generatedVlanName} (VID: ${vidInput}) ลง NetBox ครบทุกฟิลด์เรียบร้อยแล้ว`);
      setShowCreateModal(false);
      setVidInput('');
      setCustomerNameInput('');
      setStatusInput('active');
      setRoleInput('Customer');
      setGroupInput('');
      setSiteInput('');
      setTenantInput('');
      setDescriptionInput('');
      setQinqRoleInput('');
      setQinqRoleSearchQuery('');
      setQinqSvlanInput('');
      setQinqSvlanSearchQuery('');
      setQinqCvlanInput('');
      await loadVlans();
    } catch (err) {
      console.error('Failed to create VLAN:', err);
      setError('เกิดข้อผิดพลาดในการสร้าง VLAN ใน NetBox: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const [activeTab, setActiveTab] = useState('vlans'); // 'vlans' | 'groups'
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('');

  const filteredVlans = vlans.filter((v) => {
    if (!v) return false;
    
    // กรองตาม VLAN Group Filter ถ้ามีการเลือก
    if (selectedGroupFilter && (v.group || '') !== selectedGroupFilter) {
      return false;
    }

    if (!searchQuery) return true;
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

  const filteredGroups = vlanGroups.filter((g) => {
    if (!g) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (g.name || '').toLowerCase().includes(query) ||
      (g.slug || '').toLowerCase().includes(query) ||
      String(g.id).toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4 text-left font-mono">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400 font-mono flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-red-100">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400 font-mono flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-300 hover:text-emerald-100">✕</button>
        </div>
      )}

      {/* Main Tab Bar: VLANs / VLAN Groups */}
      <div className="flex border-b border-base-600/50 gap-2">
        <button
          onClick={() => setActiveTab('vlans')}
          className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
            activeTab === 'vlans'
              ? 'border-cds text-cds bg-cds/5'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          VLAN List ({vlans.length})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
            activeTab === 'groups'
              ? 'border-cds text-cds bg-cds/5'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          VLAN Groups ({vlanGroups.length})
        </button>
      </div>

      <div className="flex flex-col h-full rounded-xl border border-base-600 bg-base-900 overflow-hidden shadow-glow">
        {/* Header & Actions */}
        <div className="p-4 border-b border-base-600/50 bg-base-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-ink-600 px-2 py-0.5 rounded bg-base-950 border border-base-600/30">
              {activeTab === 'vlans' ? `${filteredVlans.length} VLANs` : `${filteredGroups.length} Groups`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder={activeTab === 'vlans' ? "ค้นหา VLAN (VID, Name, Site...)" : "ค้นหา VLAN Group (Name, Slug...)"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none transition-colors"
            />
            
            {/* ปุ่มสร้าง VLAN ใหม่ */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cds text-base-950 hover:bg-cds/90 transition-all font-mono whitespace-nowrap"
            >
              + Create VLAN
            </button>

            <button
              onClick={loadVlans}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-base-950 border border-base-600 text-ink-400 hover:text-ink-100 hover:bg-base-800 transition-all font-mono whitespace-nowrap"
            >
              {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
            </button>
          </div>
        </div>

        {/* Content Table Container */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-ink-600 font-mono">
              กำลังโหลดข้อมูล...
            </div>
          ) : activeTab === 'vlans' ? (
            filteredVlans.length > 0 ? (
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
                    <tr key={v.id} className="hover:bg-cds/5 transition-colors duration-150">
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-cds">{v.vid}</td>
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
            )
          ) : (
            /* Tab: VLAN Groups */
            filteredGroups.length > 0 ? (
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-base-600 bg-base-950 text-[10px] font-mono uppercase text-ink-400">
                    <th className="px-4 py-3">Group Name</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">VLAN Count</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-600/20 text-ink-100">
                  {filteredGroups.map((g) => {
                    const count = vlans.filter(v => v.group === g.name).length;
                    return (
                      <tr key={g.id} className="hover:bg-cds/5 transition-colors duration-150">
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-cds">{g.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-ink-400">{g.slug || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-emerald-400">{count} VLANs</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedGroupFilter(g.name);
                              setActiveTab('vlans');
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold rounded border border-cds/30 bg-cds/10 text-cds hover:bg-cds/20 transition-all"
                          >
                            ดู VLANs ในกลุ่มนี้ ➔
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-ink-650 font-mono">
                ไม่พบข้อมูล VLAN Groups
              </div>
            )
          )}
        </div>
      </div>

      {/* Modal: Create NetBox VLAN (Full NetBox Schema Fields) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl border border-base-600 bg-base-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-base-600/50 pb-3">
              <div>
                <h3 className="text-sm font-bold text-ink-100">
                  สร้าง VLAN ใน NetBox (NetBox VLAN Schema)
                </h3>
                <p className="text-[10px] text-ink-500 font-mono mt-0.5">
                  ระบุฟิลด์บังคับ (*) และฟิลด์มาตรฐานทั้งหมดตามโครงสร้าง NetBox
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-ink-500 hover:text-ink-200"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateVlan}
              onClick={() => {
                // ซ่อน dropdown ทั้งหมดเมื่อคลิกนอกพื้นที่ dropdown
              }}
              className="space-y-3.5 text-xs font-mono"
            >
              {/* Row 1: VID (Required) & Customer Name (Required) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-300 font-semibold mb-1 uppercase text-[10px]">
                    VID (VLAN ID) * <span className="text-red-400">(Required)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="เช่น 100, 200, 300"
                    value={vidInput}
                    onChange={(e) => setVidInput(e.target.value)}
                    onFocus={closeAllDropdowns}
                    className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-ink-100 focus:border-cds focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-ink-300 font-semibold mb-1 uppercase text-[10px]">
                    Name * <span className="text-red-400">(Required)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ระบุชื่อ Customer"
                    value={customerNameInput}
                    onChange={(e) => setCustomerNameInput(e.target.value)}
                    onFocus={closeAllDropdowns}
                    className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-ink-100 focus:border-cds focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Preview Naming Standard */}
              <div className="rounded-lg border border-cds/30 bg-cds/10 p-2.5 text-[11px]">
                <span className="text-ink-400 block text-[9px] uppercase font-mono mb-0.5">Name Field Preview (Required *):</span>
                <span className="font-bold text-cds">{generatedVlanName || 'Customer_<name>_<vid>'}</span>
              </div>

              {/* Row 2: Status (Required) & Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-300 font-semibold mb-1 uppercase text-[10px]">
                    Status * <span className="text-red-400">(Required)</span>
                  </label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    onFocus={closeAllDropdowns}
                    className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-ink-100 focus:border-cds focus:outline-none"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="reserved">Reserved</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-ink-300 font-semibold mb-1 uppercase text-[10px]">
                    Role
                  </label>
                  {roles.length > 0 ? (
                    <select
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-ink-100 focus:border-cds focus:outline-none"
                    >
                      <option value="">— เลือก Role จาก NetBox —</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="ระบุ Role เช่น Customer, Management"
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-ink-100 focus:border-cds focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Row 3: VLAN Group & Site */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-300 font-semibold mb-1 uppercase text-[10px]">
                    VLAN Group
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ค้นหา VLAN Group..."
                      value={groupSearchQuery}
                      onChange={(e) => {
                        setGroupSearchQuery(e.target.value);
                        setShowGroupDropdown(true);
                        setShowSiteDropdown(false);
                      }}
                      onFocus={() => {
                        setShowGroupDropdown(true);
                        setShowSiteDropdown(false);
                      }}
                      className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-ink-100 focus:border-cds focus:outline-none"
                    />
                    {groupInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setGroupInput('');
                          setGroupSearchQuery('');
                        }}
                        className="absolute right-2 top-2 text-[10px] text-ink-500 hover:text-ink-200"
                      >
                        ✕
                      </button>
                    )}
                    {showGroupDropdown && vlanGroups.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border border-base-600 bg-base-950 shadow-2xl">
                        {vlanGroups
                          .filter(g => (g.name || '').toLowerCase().includes(groupSearchQuery.toLowerCase()))
                          .map(g => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                setGroupInput(g.id);
                                setGroupSearchQuery(g.name);
                                setShowGroupDropdown(false);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-cds/10 hover:text-cds text-[11px] text-ink-200 font-mono border-b border-base-600/20 last:border-b-0"
                            >
                              {g.name}
                            </button>
                          ))}
                        {vlanGroups.filter(g => (g.name || '').toLowerCase().includes(groupSearchQuery.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-[11px] text-ink-600 text-center">
                            ไม่พบ VLAN Group ที่ตรงกับคำค้น
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-ink-300 font-semibold mb-1 uppercase text-[10px]">
                    Site  
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อ Site..."
                      value={siteSearchQuery}
                      onChange={(e) => {
                        setSiteSearchQuery(e.target.value);
                        setShowSiteDropdown(true);
                        setShowGroupDropdown(false);
                      }}
                      onFocus={() => {
                        setShowSiteDropdown(true);
                        setShowGroupDropdown(false);
                      }}
                      className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-ink-100 focus:border-cds focus:outline-none"
                    />
                    {siteInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setSiteInput('');
                          setSiteSearchQuery('');
                        }}
                        className="absolute right-2 top-2 text-[10px] text-ink-500 hover:text-ink-200"
                      >
                        ✕
                      </button>
                    )}
                    {showSiteDropdown && sites.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border border-base-600 bg-base-950 shadow-2xl">
                        {sites
                          .filter(s =>
                            (s.name || '').toLowerCase().includes(siteSearchQuery.toLowerCase()) ||
                            (s.slug || s.site_code || '').toLowerCase().includes(siteSearchQuery.toLowerCase())
                          )
                          .map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSiteInput(s.id);
                                setSiteSearchQuery(`${s.name} (${s.slug || s.site_code || s.id})`);
                                setShowSiteDropdown(false);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-cds/10 hover:text-cds text-[11px] text-ink-200 font-mono border-b border-base-600/20 last:border-b-0"
                            >
                              {s.name} <span className="text-ink-500 text-[10px]">({s.slug || s.site_code || s.id})</span>
                            </button>
                          ))}
                        {sites.filter(s =>
                          (s.name || '').toLowerCase().includes(siteSearchQuery.toLowerCase()) ||
                          (s.slug || s.site_code || '').toLowerCase().includes(siteSearchQuery.toLowerCase())
                        ).length === 0 && (
                          <div className="px-3 py-2 text-[11px] text-ink-600 text-center">
                            ไม่พบ Site ที่ตรงกับคำค้น
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 4: Tenant & Description */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-300 font-semibold mb-1 uppercase text-[10px]">
                    Tenant
                  </label>
                  <input
                    type="text"
                    placeholder="ระบุชื่อ Tenant (ถ้ามี)"
                    value={tenantInput}
                    onChange={(e) => setTenantInput(e.target.value)}
                    onFocus={closeAllDropdowns}
                    className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-ink-100 focus:border-cds focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-ink-300 font-semibold mb-1 uppercase text-[10px]">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="คำอธิบายเพิ่มเติม"
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    onFocus={closeAllDropdowns}
                    className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-ink-100 focus:border-cds focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 5: Q-in-Q (802.1ad) Configuration */}
              <div className="rounded-lg border border-cds/20 bg-cds/5 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-cds">
                    Q-in-Q Configuration (IEEE 802.1ad)
                  </span> 
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Q-in-Q Role (Service / Customer) */}
                  <div>
                    <label className="block text-ink-300 font-semibold mb-1 uppercase text-[9px]">
                      Q-in-Q Role
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="เลือก Service หรือ Customer..."
                        value={qinqRoleSearchQuery}
                        onChange={(e) => {
                          setQinqRoleSearchQuery(e.target.value);
                          setQinqRoleInput(e.target.value);
                          setShowQinqRoleDropdown(true);
                          setShowQinqSvlanDropdown(false);
                          setShowGroupDropdown(false);
                          setShowSiteDropdown(false);
                        }}
                        onFocus={() => {
                          setShowQinqRoleDropdown(true);
                          setShowQinqSvlanDropdown(false);
                          setShowGroupDropdown(false);
                          setShowSiteDropdown(false);
                        }}
                        className="w-full rounded-lg border border-base-600 bg-base-950 px-2.5 py-1.5 text-ink-100 focus:border-cds focus:outline-none text-[11px]"
                      />
                      {qinqRoleInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setQinqRoleInput('');
                            setQinqRoleSearchQuery('');
                          }}
                          className="absolute right-2 top-1.5 text-[10px] text-ink-500 hover:text-ink-200"
                        >
                          ✕
                        </button>
                      )}
                      {showQinqRoleDropdown && (
                        <div className="absolute z-30 left-0 right-0 mt-1 max-h-36 overflow-y-auto rounded-lg border border-base-600 bg-base-950 shadow-2xl font-mono">
                          {['Service', 'Customer']
                            .filter(r => r.toLowerCase().includes(qinqRoleSearchQuery.toLowerCase()))
                            .map(r => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => {
                                  setQinqRoleInput(r);
                                  setQinqRoleSearchQuery(r);
                                  setShowQinqRoleDropdown(false);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-cds/10 hover:text-cds text-[11px] text-ink-200 border-b border-base-600/20 last:border-b-0"
                              >
                                {r}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Q-in-Q S-VLAN (ดึงค้นหาจาก NetBox หรือพิมพ์ VID เอง) */}
                  <div>
                    <label className="block text-ink-300 font-semibold mb-1 uppercase text-[9px]">
                      Q-in-Q S-VLAN
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="คลิกเพื่อเลือก หรือพิมพ์ค้นหา S-VLAN..."
                        value={qinqSvlanSearchQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQinqSvlanSearchQuery(val);
                          setQinqSvlanInput(val);
                          setShowQinqSvlanDropdown(true);
                          setShowQinqRoleDropdown(false);
                          setShowGroupDropdown(false);
                          setShowSiteDropdown(false);
                        }}
                        onFocus={() => {
                          setShowQinqSvlanDropdown(true);
                          setShowQinqRoleDropdown(false);
                          setShowGroupDropdown(false);
                          setShowSiteDropdown(false);
                        }}
                        className="w-full rounded-lg border border-base-600 bg-base-950 px-2.5 py-1.5 text-ink-100 focus:border-cds focus:outline-none text-[11px]"
                      />
                      {qinqSvlanInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setQinqSvlanInput('');
                            setQinqSvlanSearchQuery('');
                          }}
                          className="absolute right-2 top-1.5 text-[10px] text-ink-500 hover:text-ink-200"
                        >
                          ✕
                        </button>
                      )}
                      {showQinqSvlanDropdown && (
                        <div className="absolute z-30 left-0 right-0 mt-1 max-h-44 overflow-y-auto rounded-lg border border-base-600 bg-base-950 shadow-2xl">
                          {vlans
                            .filter(v => {
                              if (!qinqSvlanSearchQuery || qinqSvlanSearchQuery.includes(' - ')) return true;
                              const q = qinqSvlanSearchQuery.toLowerCase();
                              return (
                                String(v.vid).toLowerCase().includes(q) ||
                                (v.name || '').toLowerCase().includes(q)
                              );
                            })
                            .map(v => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => {
                                  setQinqSvlanInput(v.vid);
                                  setQinqSvlanSearchQuery(`${v.vid} - ${v.name}`);
                                  setShowQinqSvlanDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-cds/10 hover:text-cds text-[11px] text-ink-200 font-mono border-b border-base-600/20 last:border-b-0 flex items-center justify-between"
                              >
                                <span className="font-bold text-cds">{v.vid}</span>
                                <span className="text-ink-300 text-[10px] truncate max-w-[150px]">{v.name}</span>
                              </button>
                            ))}
                          {vlans.length === 0 && (
                            <div className="px-3 py-2 text-[10px] text-ink-500 text-center font-mono">
                              พิมพ์เพื่อระบุ VID S-VLAN โดยตรง
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 6: Tags */}
              <div>
                <label className="block text-ink-300 font-semibold mb-1 uppercase text-[10px]">
                  Tags (แท็กคั่นด้วยเครื่องหมายจุลภาค ,)
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onFocus={closeAllDropdowns}
                  className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-ink-100 focus:border-cds focus:outline-none"
                />
                </div>

              <div className="flex gap-2 pt-3 border-t border-base-600/50">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 text-xs font-bold rounded-lg bg-cds text-base-950 hover:bg-cds/90 transition-all disabled:opacity-50"
                >
                  {submitting ? 'กำลังส่งข้อมูลสร้างใน NetBox...' : 'สร้าง VLAN ใน NetBox'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold rounded-lg border border-base-600 text-ink-400 hover:text-ink-100"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
