import { useEffect, useState, useMemo } from 'react';
import { cdsApi } from '../../api/cds.api.js';

/**
 * สกัดชื่อลูกค้าจาก VLAN Name ตามฟอร์แมต Customer_<name>_<vid>
 */
const getCustomerName = (vlanName) => {
  if (!vlanName || !vlanName.startsWith('Customer_')) return null;
  const parts = vlanName.split('_');
  if (parts.length >= 3) {
    return parts.slice(1, parts.length - 1).join('_');
  }
  return vlanName.replace('Customer_', '');
};

export default function CDSVlanAssignPage() {
  // === State ===
  const [dashboardItems, setDashboardItems] = useState([]);
  const [vlans, setVlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [filterMode, setFilterMode] = useState('pending'); // 'pending' | 'all'

  // VLAN Assignment Form
  const [formData, setFormData] = useState({
    pe_vlan_customer: '',
    agg_vlan: '',
    access_lsw_vlan_management: '',
  });

  // === Data Loading ===
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, vlanRes] = await Promise.all([
        cdsApi.getDashboard(),
        cdsApi.getVlans(),
      ]);

      const dashList = dashRes.data?.data || dashRes.data || [];
      const localReserves = JSON.parse(localStorage.getItem('cds_local_reserves') || '[]');
      const combined = [...localReserves, ...dashList];
      setDashboardItems(combined);

      const vlanList = vlanRes.data?.data || vlanRes.data || [];
      setVlans(vlanList);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('ไม่สามารถเชื่อมต่อดึงข้อมูลจากระบบหลังบ้านได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // === Derived Data ===

  // ตรวจสอบว่า VLAN ครบหรือไม่
  const isVlanComplete = (item) => {
    return item.pe_vlan_customer && item.agg_vlan && item.access_lsw_vlan_management &&
      item.pe_vlan_customer !== '' && item.agg_vlan !== '' && item.access_lsw_vlan_management !== '';
  };

  // แยก Customer VLANs จาก NetBox
  const customerVlans = useMemo(() => {
    return vlans.filter(v => v.name?.startsWith('Customer_'));
  }, [vlans]);

  // VLAN ทั้งหมด (สำหรับ Management VLAN dropdown)
  const allVlans = vlans;

  // กรอง Dashboard Items
  const filteredItems = useMemo(() => {
    let items = dashboardItems;

    // กรองตามโหมด
    if (filterMode === 'pending') {
      items = items.filter(item => !isVlanComplete(item));
    }

    // กรองจาก Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        (item.access_lsw_id || '').toLowerCase().includes(query) ||
        (item.pe_name || '').toLowerCase().includes(query) ||
        (item.nodeName || '').toLowerCase().includes(query) ||
        (item.agg_id || '').toLowerCase().includes(query) ||
        (item.id || '').toString().toLowerCase().includes(query)
      );
    }

    return items;
  }, [dashboardItems, filterMode, searchQuery]);

  // รายการที่เลือก
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return dashboardItems.find(item =>
      item.id === selectedItemId || item.access_lsw_id === selectedItemId
    ) || null;
  }, [dashboardItems, selectedItemId]);

  // === Handlers ===

  const handleSelectItem = (item) => {
    const itemKey = item.id || item.access_lsw_id;
    setSelectedItemId(itemKey);
    setSuccessMsg(null);
    // Pre-fill ค่าปัจจุบันถ้ามี
    setFormData({
      pe_vlan_customer: item.pe_vlan_customer || '',
      agg_vlan: item.agg_vlan || '',
      access_lsw_vlan_management: item.access_lsw_vlan_management || '',
    });
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ซิงค์ pe_vlan_customer กับ agg_vlan (ปกติค่าเดียวกัน)
  const handleCustomerVlanChange = (value) => {
    setFormData(prev => ({
      ...prev,
      pe_vlan_customer: value,
      agg_vlan: value,
    }));
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    if (!formData.pe_vlan_customer && !formData.agg_vlan && !formData.access_lsw_vlan_management) {
      setError('กรุณาใส่ค่า VLAN อย่างน้อย 1 ฟิลด์');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const itemId = selectedItem.id || selectedItem.access_lsw_id;

      // 1. อัปเดตผ่าน Backend API
      try {
        await cdsApi.updateDashboard(itemId, formData);
      } catch (apiErr) {
        console.warn('Backend API update failed, updating locally:', apiErr);
      }

      // 2. อัปเดต LocalStorage
      const localReserves = JSON.parse(localStorage.getItem('cds_local_reserves') || '[]');
      const localIdx = localReserves.findIndex(r =>
        r.id === itemId || r.access_lsw_id === itemId || r.nodeId === itemId
      );
      if (localIdx !== -1) {
        localReserves[localIdx] = { ...localReserves[localIdx], ...formData };
        localStorage.setItem('cds_local_reserves', JSON.stringify(localReserves));
      }

      // 3. อัปเดต State
      setDashboardItems(prev => prev.map(item => {
        const key = item.id || item.access_lsw_id;
        if (key === itemId) {
          return { ...item, ...formData };
        }
        return item;
      }));

      setSuccessMsg(`บันทึก VLAN สำเร็จสำหรับ ${selectedItem.access_lsw_id || selectedItem.nodeName || itemId}`);
      setSelectedItemId(null);
    } catch (err) {
      console.error('Failed to save VLAN:', err);
      setError('เกิดข้อผิดพลาดในการบันทึก VLAN: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // === Render ===
  return (
    <div className="space-y-6 text-left">
      {/* Status Messages */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400 font-mono flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-red-100 ml-4">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400 font-mono flex items-center justify-between">
          <span>✅ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-300 hover:text-emerald-100 ml-4">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ===== LEFT PANEL: รายการ Reserved Items ===== */}
        <div className="lg:col-span-2 flex flex-col rounded-xl border border-base-600 bg-base-900 overflow-hidden shadow-glow">
          {/* Panel Header */}
          <div className="p-4 border-b border-base-600/50 bg-base-900/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-ink-100 font-display tracking-wide">
                รายการ Reserve
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-ink-500 px-2 py-0.5 rounded bg-base-950 border border-base-600/30">
                  {filteredItems.length} รายการ
                </span>
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="p-1.5 text-[10px] font-mono rounded-lg border border-base-600 text-ink-400 hover:text-ink-100 hover:bg-base-800 transition-all"
                >
                  {loading ? '⚙️' : '🔄'}
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 mb-3">
              <button
                onClick={() => setFilterMode('pending')}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border transition-all ${
                  filterMode === 'pending'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    : 'border-base-600 text-ink-500 hover:text-ink-200 hover:bg-base-800'
                }`}
              >
                ⚠️ VLAN ยังไม่ครบ
              </button>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border transition-all ${
                  filterMode === 'all'
                    ? 'border-cds/40 bg-cds/10 text-cds'
                    : 'border-base-600 text-ink-500 hover:text-ink-200 hover:bg-base-800'
                }`}
              >
                ทั้งหมด
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="ค้นหา Node ID, PE Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none transition-colors"
            />
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-base-600/20">
            {loading ? (
              <div className="p-8 text-center text-xs text-ink-600 font-mono">
                <span className="inline-block animate-spin mr-2">⚙️</span> กำลังโหลดข้อมูล...
              </div>
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item, idx) => {
                const itemKey = item.id || item.access_lsw_id || idx;
                const isSelected = selectedItemId === itemKey;
                const vlanOk = isVlanComplete(item);

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectItem(item)}
                    className={`w-full text-left px-4 py-3 transition-all duration-150 ${
                      isSelected
                        ? 'bg-cds/10 border-l-4 border-cds'
                        : 'hover:bg-base-800/50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-ink-100 font-mono">
                        {item.access_lsw_id || item.nodeId || '—'}
                      </span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                        vlanOk
                          ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                          : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                      }`}>
                        {vlanOk ? '✅ VLAN ครบ' : '⚠️ VLAN ไม่ครบ'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-ink-400 font-mono">
                      <span>PE: {item.pe_name || '—'}</span>
                      <span>·</span>
                      <span>AGG: {item.agg_id || '—'}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-ink-500 font-mono">
                      <span>VLAN: {item.pe_vlan_customer || '—'}</span>
                      <span>·</span>
                      <span>Mgmt: {item.access_lsw_vlan_management || '—'}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-ink-650 font-mono">
                {filterMode === 'pending' ? 'ไม่มีรายการที่ VLAN ยังไม่ครบ 🎉' : 'ไม่พบรายการ'}
              </div>
            )}
          </div>
        </div>

        {/* ===== RIGHT PANEL: VLAN Assignment Form ===== */}
        <div className="lg:col-span-3 rounded-xl border border-base-600 bg-base-900 overflow-hidden shadow-glow">
          {selectedItem ? (
            <>
              {/* Form Header — Selected Item Info */}
              <div className="p-5 border-b border-base-600/50 bg-base-950/50">
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cds/15 text-sm font-bold text-cds border border-cds/30">
                    🏷️
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-ink-100 font-display">
                      Assign VLAN
                    </h3>
                    <p className="text-[10px] text-ink-500 font-mono mt-0.5">
                      กำหนดค่า VLAN ให้กับรายการที่เลือก
                    </p>
                  </div>
                </div>

                {/* Selected Item Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Node ID', value: selectedItem.access_lsw_id || selectedItem.nodeId },
                    { label: 'PE Name', value: selectedItem.pe_name },
                    { label: 'IP Network', value: selectedItem.agg_ip_network },
                    { label: 'AGG', value: selectedItem.agg_id },
                  ].map((info, i) => (
                    <div key={i} className="rounded-lg border border-base-600/50 bg-base-900 px-3 py-2">
                      <p className="text-[9px] text-ink-500 uppercase font-mono tracking-wider">{info.label}</p>
                      <p className="text-xs text-ink-200 font-mono mt-0.5 truncate" title={info.value || '—'}>
                        {info.value || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* VLAN Form Fields */}
              <div className="p-5 space-y-5">
                {/* PE Vlan Customer */}
                <div>
                  <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-2 font-mono">
                    PE Vlan Customer
                  </label>
                  <p className="text-[10px] text-ink-500 mb-2">
                    VLAN ที่ลูกค้าใช้งานบนฝั่ง PE (ตามฟอร์แมต Customer_&lt;name&gt;_&lt;vid&gt;)
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={formData.pe_vlan_customer}
                      onChange={(e) => handleCustomerVlanChange(e.target.value)}
                      className="flex-1 rounded-lg border border-base-600 bg-base-950 px-3 py-2.5 text-sm text-ink-100 focus:border-cds focus:outline-none focus:ring-1 focus:ring-cds/30 transition-all"
                    >
                      <option value="">— เลือก Customer VLAN —</option>
                      {customerVlans.length > 0 ? (
                        customerVlans.map(v => (
                          <option key={v.id} value={v.vid}>
                            {v.name} (VID: {v.vid})
                          </option>
                        ))
                      ) : (
                        /* Fallback: ให้ใช้ VLAN ทั้งหมดเมื่อไม่มี Customer VLANs */
                        allVlans.map(v => (
                          <option key={v.id} value={v.vid}>
                            {v.name || v.display} (VID: {v.vid})
                          </option>
                        ))
                      )}
                    </select>
                    <input
                      type="text"
                      placeholder="หรือพิมพ์ VID"
                      value={formData.pe_vlan_customer}
                      onChange={(e) => handleCustomerVlanChange(e.target.value)}
                      className="w-28 rounded-lg border border-base-600 bg-base-950 px-3 py-2.5 text-sm text-ink-100 text-center focus:border-cds focus:outline-none focus:ring-1 focus:ring-cds/30 transition-all font-mono"
                    />
                  </div>
                  {formData.pe_vlan_customer && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-emerald-400 font-mono bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                        VID: {formData.pe_vlan_customer}
                      </span>
                      {customerVlans.find(v => String(v.vid) === String(formData.pe_vlan_customer)) && (
                        <span className="text-[10px] text-cds font-mono">
                          → {getCustomerName(customerVlans.find(v => String(v.vid) === String(formData.pe_vlan_customer))?.name) || ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* VLAN (Aggregation) */}
                <div>
                  <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-2 font-mono">
                    VLAN (Aggregation)
                  </label>
                  <p className="text-[10px] text-ink-500 mb-2">
                    VLAN สำหรับ Aggregation layer (ปกติค่าเดียวกับ PE Vlan Customer)
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={formData.agg_vlan}
                      onChange={(e) => handleFormChange('agg_vlan', e.target.value)}
                      className="flex-1 rounded-lg border border-base-600 bg-base-950 px-3 py-2.5 text-sm text-ink-100 focus:border-cds focus:outline-none focus:ring-1 focus:ring-cds/30 transition-all"
                    >
                      <option value="">— เลือก VLAN —</option>
                      {customerVlans.length > 0 ? (
                        customerVlans.map(v => (
                          <option key={v.id} value={v.vid}>
                            {v.name} (VID: {v.vid})
                          </option>
                        ))
                      ) : (
                        allVlans.map(v => (
                          <option key={v.id} value={v.vid}>
                            {v.name || v.display} (VID: {v.vid})
                          </option>
                        ))
                      )}
                    </select>
                    <input
                      type="text"
                      placeholder="VID"
                      value={formData.agg_vlan}
                      onChange={(e) => handleFormChange('agg_vlan', e.target.value)}
                      className="w-28 rounded-lg border border-base-600 bg-base-950 px-3 py-2.5 text-sm text-ink-100 text-center focus:border-cds focus:outline-none focus:ring-1 focus:ring-cds/30 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* VLAN Management */}
                <div>
                  <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-2 font-mono">
                    VLAN Management
                  </label>
                  <p className="text-[10px] text-ink-500 mb-2">
                    VLAN สำหรับ Management บน Access LSW (เช่น VLAN 99)
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={formData.access_lsw_vlan_management}
                      onChange={(e) => handleFormChange('access_lsw_vlan_management', e.target.value)}
                      className="flex-1 rounded-lg border border-base-600 bg-base-950 px-3 py-2.5 text-sm text-ink-100 focus:border-cds focus:outline-none focus:ring-1 focus:ring-cds/30 transition-all"
                    >
                      <option value="">— เลือก Management VLAN —</option>
                      {allVlans.map(v => (
                        <option key={v.id} value={v.vid}>
                          {v.name || v.display} (VID: {v.vid})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="VID"
                      value={formData.access_lsw_vlan_management}
                      onChange={(e) => handleFormChange('access_lsw_vlan_management', e.target.value)}
                      className="w-28 rounded-lg border border-base-600 bg-base-950 px-3 py-2.5 text-sm text-ink-100 text-center focus:border-cds focus:outline-none focus:ring-1 focus:ring-cds/30 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Summary Preview */}
                <div className="rounded-lg border border-base-600/50 bg-base-950 p-4">
                  <p className="text-[10px] text-ink-500 uppercase font-mono tracking-wider mb-3">สรุปค่า VLAN ที่จะบันทึก</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'PE Vlan Customer', value: formData.pe_vlan_customer, color: 'text-emerald-400' },
                      { label: 'VLAN (AGG)', value: formData.agg_vlan, color: 'text-emerald-400' },
                      { label: 'VLAN Mgmt', value: formData.access_lsw_vlan_management, color: 'text-blue-400' },
                    ].map((f, i) => (
                      <div key={i} className="text-center">
                        <p className="text-[9px] text-ink-500 uppercase font-mono">{f.label}</p>
                        <p className={`text-lg font-bold font-mono mt-1 ${f.value ? f.color : 'text-ink-600'}`}>
                          {f.value || '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || (!formData.pe_vlan_customer && !formData.agg_vlan && !formData.access_lsw_vlan_management)}
                    className="flex-1 px-4 py-2.5 text-sm font-bold rounded-lg bg-cds text-base-950 hover:bg-cds/90 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,154,61,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block animate-spin">⚙️</span> กำลังบันทึก...
                      </span>
                    ) : (
                      '💾 บันทึก VLAN Assignment'
                    )}
                  </button>
                  <button
                    onClick={() => { setSelectedItemId(null); setFormData({ pe_vlan_customer: '', agg_vlan: '', access_lsw_vlan_management: '' }); }}
                    className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-base-600 text-ink-400 hover:text-ink-100 hover:bg-base-800 transition-all"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Empty State - No item selected */
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-base-800 border border-base-600/50 mb-4">
                <span className="text-2xl">🏷️</span>
              </div>
              <h3 className="text-sm font-bold text-ink-300 font-display mb-2">
                เลือกรายการเพื่อ Assign VLAN
              </h3>
              <p className="text-xs text-ink-500 max-w-sm">
                เลือกรายการ Reserve จากแผงด้านซ้าย เพื่อกำหนดค่า PE Vlan Customer, VLAN, และ VLAN Management ให้ครบทุกฟิลด์
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
