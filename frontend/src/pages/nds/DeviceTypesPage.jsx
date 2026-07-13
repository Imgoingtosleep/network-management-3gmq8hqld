import { useState, useEffect } from 'react';
import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';

const INTERFACE_TYPE_GROUPS = [
  {
    label: 'Virtual',
    options: [
      { value: 'virtual', label: 'Virtual (พอร์ตเสมือน)' },
      { value: 'lag', label: 'Link Aggregation Group (LAG)' },
      { value: 'bridge', label: 'Bridge' }
    ]
  },
  {
    label: 'Ethernet (fixed)',
    options: [
      { value: '100base-tx', label: '100BASE-TX (10/100ME Copper)' },
      { value: '1000base-t', label: '1000BASE-T (1GE Copper)' },
      { value: '2.5gbase-t', label: '2.5GBASE-T (2.5GE Copper)' },
      { value: '5gbase-t', label: '5GBASE-T (5GE Copper)' },
      { value: '10gbase-t', label: '10GBASE-T (10GE Copper)' },
      { value: '100base-t1', label: '100BASE-T1 (Single Pair)' },
      { value: '1000base-t1', label: '1000BASE-T1 (Single Pair)' }
    ]
  },
  {
    label: 'Ethernet (modular)',
    options: [
      { value: '100base-fx', label: '100BASE-FX (10/100ME Fiber)' },
      { value: '100base-lfx', label: '100BASE-LFX (10/100ME Fiber)' },
      { value: '1000base-x-sfp', label: '1000BASE-X (SFP Fiber)' },
      { value: '10gbase-x-sfpp', label: '10GBASE-X (SFP+)' },
      { value: '10gbase-x-cx4', label: '10GBASE-CX4 (10GE Coaxial)' },
      { value: '25gbase-x-sfp28', label: '25GBASE-X (SFP28)' },
      { value: '50gbase-x-sfp56', label: '50GBASE-X (SFP56)' },
      { value: '40gbase-x-qsfpp', label: '40GBASE-X (QSFP+)' },
      { value: '100gbase-x-cfp', label: '100GBASE-X (CFP)' },
      { value: '100gbase-x-cfp2', label: '100GBASE-X (CFP2)' },
      { value: '100gbase-x-cfp4', label: '100GBASE-X (CFP4)' },
      { value: '100gbase-x-qsfp28', label: '100GBASE-X (QSFP28)' },
      { value: '200gbase-x-qsfp56', label: '200GBASE-X (QSFP56)' },
      { value: '200gbase-x-cfp2', label: '200GBASE-X (CFP2)' },
      { value: '400gbase-x-qsfpdd', label: '400GBASE-X (QSFP-DD)' },
      { value: '400gbase-x-osfp', label: '400GBASE-X (OSFP)' },
      { value: '800gbase-x-qsfpdd8', label: '800GBASE-X (QSFP-DD8)' },
      { value: '800gbase-x-osfp8', label: '800GBASE-X (OSFP8)' }
    ]
  },
  {
    label: 'Wireless',
    options: [
      { value: 'ieee802.11a', label: 'IEEE 802.11a' },
      { value: 'ieee802.11g', label: 'IEEE 802.11g' },
      { value: 'ieee802.11n', label: 'IEEE 802.11n' },
      { value: 'ieee802.11ac', label: 'IEEE 802.11ac' },
      { value: 'ieee802.11ad', label: 'IEEE 802.11ad' },
      { value: 'ieee802.11ax', label: 'IEEE 802.11ax' },
      { value: 'ieee802.11ay', label: 'IEEE 802.11ay' },
      { value: 'ieee802.15.4', label: 'IEEE 802.15.4 (PAN)' }
    ]
  },
  {
    label: 'Cellular',
    options: [
      { value: 'gsm', label: 'GSM (Cellular)' },
      { value: 'cdma', label: 'CDMA (Cellular)' },
      { value: 'lte', label: 'LTE (4G Cellular)' }
    ]
  },
  {
    label: 'PON',
    options: [
      { value: 'gpon', label: 'GPON (ITU-T G.984)' },
      { value: 'xg-pon', label: 'XG-PON (ITU-T G.987)' },
      { value: 'xgs-pon', label: 'XGS-PON (ITU-T G.9807.1)' },
      { value: 'ng-pon2', label: 'NG-PON2 (ITU-T G.989)' },
      { value: 'epon', label: 'EPON (IEEE 802.3ah)' },
      { value: '10g-epon', label: '10G-EPON (IEEE 802.3av)' }
    ]
  },
  {
    label: 'Stacking',
    options: [
      { value: 'cisco-stackwise', label: 'Cisco StackWise' },
      { value: 'cisco-stackwise-plus', label: 'Cisco StackWise Plus' },
      { value: 'juniper-vcp', label: 'Juniper VCP' },
      { value: 'extreme-summitstack', label: 'Extreme SummitStack' },
      { value: 'extreme-summitstack-128', label: 'Extreme SummitStack-128' },
      { value: 'extreme-summitstack-256', label: 'Extreme SummitStack-256' },
      { value: 'extreme-summitstack-i', label: 'Extreme SummitStack-i' }
    ]
  },
  {
    label: 'Fibre Channel',
    options: [
      { value: 'fibrechannel-sf', label: 'FibreChannel (1G/2G/4G SFP)' },
      { value: 'fibrechannel-sfp', label: 'FibreChannel (4G/8G/16G SFP+)' },
      { value: 'fibrechannel-sfpp', label: 'FibreChannel (8G/16G/32G SFP+)' },
      { value: 'fibrechannel-qsfpp', label: 'FibreChannel (QSFP)' }
    ]
  },
  {
    label: 'Serial',
    options: [
      { value: 't1', label: 'T1 (1.544 Mbps)' },
      { value: 'e1', label: 'E1 (2.048 Mbps)' },
      { value: 't3', label: 'T3 (44.736 Mbps)' },
      { value: 'e3', label: 'E3 (34.368 Mbps)' },
      { value: 'sis', label: 'SIS' }
    ]
  },
  {
    label: 'Other',
    options: [
      { value: 'other', label: 'Other (อื่นๆ)' }
    ]
  }
];

export default function DeviceTypesPage() {
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPortModalOpen, setIsPortModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false); // Modal to create a new Port Preset

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Loaded presets list
  const [presets, setPresets] = useState([]);

  // Device Type Form state
  const [deviceTypeFormData, setDeviceTypeFormData] = useState({
    manufacturer: '',
    model: '',
    part_number: '',
    u_height: 1,
    is_full_depth: false,
    selectedPresetId: '' // Selected preset template
  });

  // Custom Port Templates state (for direct assignment modal)
  const [portRanges, setPortRanges] = useState([
    { prefix: 'GigabitEthernet0/0/', start: 0, count: 20, type: '1000base-x-sfp', label: 'fiber' }
  ]);

  // Port Preset Form state (for creating a reusable template)
  const [presetFormData, setPresetFormData] = useState({
    name: '',
    ranges: [
      { prefix: 'GigabitEthernet0/0/', start: 0, count: 20, type: '1000base-x-sfp', label: 'fiber' }
    ]
  });

  // Load presets on mount and after changes
  const loadPresets = async () => {
    try {
      const res = await ndsApi.getPortPresets();
      setPresets(res.data?.data || res.data || res || []);
    } catch (err) {
      console.error('Failed to load port presets:', err);
    }
  };

  useEffect(() => {
    loadPresets();
  }, []);

  const handleDeviceTypeInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDeviceTypeFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRangeChange = (index, field, value) => {
    setPortRanges(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const addPortRange = () => {
    setPortRanges(prev => [
      ...prev,
      { prefix: 'TenGigabitEthernet0/1/', start: 1, count: 4, type: '10gbase-x-sfpp', label: 'fiber' }
    ]);
  };

  const removePortRange = (index) => {
    if (portRanges.length === 1) return;
    setPortRanges(prev => prev.filter((_, i) => i !== index));
  };

  // Preset Ranges handlers
  const handlePresetRangeChange = (index, field, value) => {
    setPresetFormData(prev => {
      const updatedRanges = [...prev.ranges];
      updatedRanges[index] = {
        ...updatedRanges[index],
        [field]: value
      };
      return {
        ...prev,
        ranges: updatedRanges
      };
    });
  };

  const addPresetPortRange = () => {
    setPresetFormData(prev => ({
      ...prev,
      ranges: [
        ...prev.ranges,
        { prefix: 'TenGigabitEthernet0/1/', start: 1, count: 4, type: '10gbase-x-sfpp', label: 'fiber' }
      ]
    }));
  };

  const removePresetPortRange = (index) => {
    if (presetFormData.ranges.length === 1) return;
    setPresetFormData(prev => ({
      ...prev,
      ranges: prev.ranges.filter((_, i) => i !== index)
    }));
  };

  const handleCreateClick = () => {
    setDeviceTypeFormData({
      manufacturer: '',
      model: '',
      part_number: '',
      u_height: 1,
      is_full_depth: false,
      selectedPresetId: ''
    });
    setSaveError(null);
    setIsCreateModalOpen(true);
  };

  const handlePortClick = () => {
    if (selectedDeviceTypes.length !== 1) return;
    setPortRanges([
      { prefix: 'GigabitEthernet0/0/', start: 0, count: 20, type: '1000base-x-sfp', label: 'fiber' }
    ]);
    setSaveError(null);
    setIsPortModalOpen(true);
  };

  const handleCreatePresetClick = () => {
    setPresetFormData({
      name: '',
      ranges: [
        { prefix: 'GigabitEthernet0/0/', start: 0, count: 24, type: '1000base-t', label: 'copper' }
      ]
    });
    setSaveError(null);
    setIsPresetModalOpen(true);
  };

  const handleSaveDeviceType = async (e) => {
    e.preventDefault();
    if (!deviceTypeFormData.manufacturer.trim() || !deviceTypeFormData.model.trim()) {
      setSaveError('กรุณากรอกข้อมูลที่จำเป็น (Manufacturer, Model) ให้ครบถ้วน');
      return;
    }

    setSaving(true);
    setSaveError(null);

    // Resolve ranges from selected preset if any
    let selectedRanges = [];
    if (deviceTypeFormData.selectedPresetId) {
      const selectedPreset = presets.find(p => p.id === parseInt(deviceTypeFormData.selectedPresetId));
      if (selectedPreset) {
        selectedRanges = selectedPreset.ranges || [];
      }
    }

    try {
      await ndsApi.createDeviceType({
        manufacturer: deviceTypeFormData.manufacturer.trim(),
        model: deviceTypeFormData.model.trim(),
        part_number: deviceTypeFormData.part_number.trim(),
        u_height: parseInt(deviceTypeFormData.u_height) || 1,
        is_full_depth: deviceTypeFormData.is_full_depth,
        interface_ranges: selectedRanges
      });
      setIsCreateModalOpen(false);
      setSelectedDeviceTypes([]);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setSaveError(err.message || 'เกิดข้อผิดพลาดในการสร้าง Device Type');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePorts = async (e) => {
    e.preventDefault();
    const invalidRange = portRanges.some(r => !r.prefix.trim() || isNaN(parseInt(r.count)) || parseInt(r.count) <= 0);
    if (invalidRange) {
      setSaveError('กรุณากรอกข้อมูล Prefix และจำนวนพอร์ตให้ถูกต้องและมากกว่า 0 ทุกแถว');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const selectedId = selectedDeviceTypes[0].id;
      await ndsApi.createInterfaceTemplates(selectedId, {
        ranges: portRanges.map(r => ({
          prefix: r.prefix.trim(),
          start: parseInt(r.start) || 0,
          count: parseInt(r.count) || 0,
          type: r.type
        }))
      });
      setIsPortModalOpen(false);
      setSelectedDeviceTypes([]);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setSaveError(err.message || 'เกิดข้อผิดพลาดในการสร้าง Port Templates');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreset = async (e) => {
    e.preventDefault();
    if (!presetFormData.name.trim()) {
      setSaveError('กรุณากรอกชื่อแม่แบบพอร์ต (Preset Name)');
      return;
    }

    const invalidRange = presetFormData.ranges.some(r => !r.prefix.trim() || isNaN(parseInt(r.count)) || parseInt(r.count) <= 0);
    if (invalidRange) {
      setSaveError('กรุณากรอกข้อมูลพอร์ตให้ถูกต้องและมีจำนวนมากกว่า 0 ทุกแถว');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await ndsApi.createPortPreset({
        name: presetFormData.name.trim(),
        ranges: presetFormData.ranges.map(r => ({
          prefix: r.prefix.trim(),
          start: parseInt(r.start) || 0,
          count: parseInt(r.count) || 0,
          type: r.type
        }))
      });
      setIsPresetModalOpen(false);
      await loadPresets(); // reload dropdown configurations
    } catch (err) {
      setSaveError(err.message || 'เกิดข้อผิดพลาดในการบันทึกแม่แบบพอร์ต');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectAll = (list) => {
    if (selectedDeviceTypes.length === list.length) {
      setSelectedDeviceTypes([]);
    } else {
      setSelectedDeviceTypes(list);
    }
  };

  const toggleSelectOne = (item) => {
    if (selectedDeviceTypes.some(d => d.id === item.id)) {
      setSelectedDeviceTypes(prev => prev.filter(d => d.id !== item.id));
    } else {
      setSelectedDeviceTypes(prev => [...prev, item]);
    }
  };

  const renderDeviceTypesTable = (list) => {
    return (
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
          <tr>
            <th className="px-5 py-3.5 text-center w-12">
              <input
                type="checkbox"
                checked={list.length > 0 && selectedDeviceTypes.length === list.length}
                onChange={() => toggleSelectAll(list)}
                className="rounded border-base-600 text-nds focus:ring-nds focus:ring-opacity-25 bg-base-950 w-4 h-4 cursor-pointer"
              />
            </th>
            <th className="px-5 py-3.5">Device Type</th>
            <th className="px-5 py-3.5">Manufacturer</th>
            <th className="px-5 py-3.5">Part number</th>
            <th className="px-5 py-3.5">U Height</th>
            <th className="px-5 py-3.5">Full Depth</th>
            <th className="px-5 py-3.5">Device Count</th>
            <th className="px-5 py-3.5">Interfaces</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-600/30">
          {list.map(item => {
            const isSelected = selectedDeviceTypes.some(d => d.id === item.id);
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
                <td className="px-5 py-4 font-medium text-nds font-mono">{item.model || 'N/A'}</td>
                <td className="px-5 py-4 font-semibold text-ink-100">{item.manufacturer || 'N/A'}</td>
                <td className="px-5 py-4 text-ink-400 font-mono">{item.part_number || 'N/A'}</td>
                <td className="px-5 py-4 text-ink-400 font-mono">{item.u_height ? `${item.u_height}U` : '0U'}</td>
                <td className="px-5 py-4 text-ink-400">{item.is_full_depth || 'No'}</td>
                <td className="px-5 py-4 text-ink-400 font-mono">{item.device_count || 0}</td>
                <td className="px-5 py-4 text-ink-400 font-mono">{item.interface_count || 0}</td>
              </tr>
            );
          })}
          {list.length === 0 && (
            <tr>
              <td colSpan={8} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">
                ไม่พบข้อมูล Device Types ในระบบ
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  return (
    <div>
      {/* Top Toolbar */}
      <div className="mb-4 flex flex-wrap gap-4 justify-between items-center bg-base-900/40 p-4 rounded-xl border border-base-600/30">
        <div className="flex items-center gap-4">
          <span className="text-xs text-ink-400 font-mono">
            การจัดการข้อมูลประเภทและรุ่นอุปกรณ์
          </span>
          {selectedDeviceTypes.length > 0 && (
            <span className="text-xs font-mono text-ink-500 border-l border-base-600/50 pl-4 animate-in fade-in duration-200">
              Selected: <span className="text-nds font-bold">{selectedDeviceTypes.length}</span> item
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCreatePresetClick}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-base-600 bg-base-950 text-ink-100 hover:bg-base-800 transition-all"
          >
            Create Port Template
          </button>
          <button
            type="button"
            onClick={handlePortClick}
            disabled={selectedDeviceTypes.length !== 1}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
              selectedDeviceTypes.length === 1
                ? 'bg-base-950 border-base-600 text-ink-100 hover:bg-base-800'
                : 'bg-base-950 border-base-600 text-ink-500 cursor-not-allowed opacity-50'
            }`}
          >
            Add Ports directly
          </button>
          <button
            type="button"
            onClick={handleCreateClick}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-nds border border-nds text-base-950 hover:bg-nds-hover transition-all shadow-[0_0_15px_rgba(76,141,255,0.15)]"
          >
            Create Device Type
          </button>
        </div>
      </div>

      {/* Main Table */}
      <NDSPageContainer
        fetchData={() => ndsApi.getDeviceTypes()}
        refreshTrigger={refreshTrigger}
        renderTable={renderDeviceTypesTable}
        placeholder="ค้นหาด่วน (เช่น ชื่อรุ่น, ผู้ผลิต)..."
      />

      {/* Create Device Type Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-xl border border-base-600 bg-base-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left my-8">
            <div className="flex justify-between items-center border-b border-base-600/30 pb-3">
              <h3 className="font-display text-lg font-semibold text-ink-100">
                เพิ่มประเภทอุปกรณ์ใหม่ (Create Device Type)
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-ink-400 hover:text-ink-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {saveError && (
              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 font-mono">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSaveDeviceType} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-mono text-ink-400">Manufacturer (ผู้ผลิต) *</label>
                <input
                  type="text"
                  name="manufacturer"
                  value={deviceTypeFormData.manufacturer}
                  onChange={handleDeviceTypeInputChange}
                  placeholder="e.g. Cisco, Juniper, Huawei"
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Model Name (ชื่อรุ่น) *</label>
                <input
                  type="text"
                  name="model"
                  value={deviceTypeFormData.model}
                  onChange={handleDeviceTypeInputChange}
                  placeholder="e.g. ASR 9010, Catalyst 9300"
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Part number (รหัสสินค้า)</label>
                <input
                  type="text"
                  name="part_number"
                  value={deviceTypeFormData.part_number}
                  onChange={handleDeviceTypeInputChange}
                  placeholder="e.g. ASR-9010-AC"
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Interface Template</label>
                <select
                  name="selectedPresetId"
                  value={deviceTypeFormData.selectedPresetId}
                  onChange={handleDeviceTypeInputChange}
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                >
                  <option value="">-- ไม่สร้างพอร์ตล่วงหน้า (No port template) --</option>
                  {presets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-ink-400">U Height (ขนาด U)</label>
                  <input
                    type="number"
                    name="u_height"
                    value={deviceTypeFormData.u_height}
                    onChange={handleDeviceTypeInputChange}
                    min="1"
                    className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="is_full_depth"
                    name="is_full_depth"
                    checked={deviceTypeFormData.is_full_depth}
                    onChange={handleDeviceTypeInputChange}
                    className="rounded border-base-600 text-nds focus:ring-nds focus:ring-opacity-25 bg-base-950 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="is_full_depth" className="ml-2 text-xs font-mono text-ink-400 cursor-pointer">
                    Full Depth (ลึกเต็มตู้)
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-base-600/30 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg border border-base-600 bg-base-950 px-4 py-2 text-xs text-ink-400 hover:bg-base-800 transition-colors"
                  disabled={saving}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-nds px-4 py-2 text-xs font-semibold text-base-950 hover:bg-nds-hover disabled:opacity-50 transition-colors"
                  disabled={saving}
                >
                  {saving ? 'กำลังบันทึก...' : 'สร้าง Device Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Ports Directly Modal */}
      {isPortModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-xl border border-base-600 bg-base-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left my-8">
            <div className="flex justify-between items-center border-b border-base-600/30 pb-3">
              <h3 className="font-display text-lg font-semibold text-ink-100 flex items-center gap-2">
                <span>สร้าง Port Templates ไปยังรุ่นโดยตรง</span>
                <span className="text-xs bg-nds/10 border border-nds/20 px-2.5 py-0.5 rounded-full font-mono text-nds font-medium">
                  {selectedDeviceTypes[0]?.manufacturer || ''} {selectedDeviceTypes[0]?.model || ''}
                </span>
              </h3>
              <button 
                onClick={() => setIsPortModalOpen(false)}
                className="text-ink-400 hover:text-ink-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {saveError && (
              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 font-mono">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSavePorts} className="mt-4 space-y-4">
              <div className="overflow-x-auto border border-base-600/30 rounded-xl bg-base-950/40 p-4">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-ink-500 uppercase tracking-wider border-b border-base-600/30 pb-2">
                      <th className="pb-2 pr-4">Port Prefix / Slot</th>
                      <th className="pb-2 pr-4 w-28">Start Index</th>
                      <th className="pb-2 pr-4 w-28">Count</th>
                      <th className="pb-2 pr-4">Port Type</th>
                      <th className="pb-2 pr-4 w-32">UDP Type</th>
                      <th className="pb-2 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-600/10">
                    {portRanges.map((range, index) => (
                      <tr key={index} className="align-middle">
                        <td className="py-3 pr-4">
                          <input
                            type="text"
                            value={range.prefix}
                            onChange={(e) => handleRangeChange(index, 'prefix', e.target.value)}
                            placeholder="e.g. GigabitEthernet0/0/"
                            className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 focus:border-nds focus:outline-none"
                            required
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <input
                            type="number"
                            value={range.start}
                            onChange={(e) => handleRangeChange(index, 'start', e.target.value)}
                            className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 focus:border-nds focus:outline-none"
                            min="0"
                            required
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <input
                            type="number"
                            value={range.count}
                            onChange={(e) => handleRangeChange(index, 'count', e.target.value)}
                            className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 focus:border-nds focus:outline-none"
                            min="1"
                            required
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <select
                            value={range.type}
                            onChange={(e) => handleRangeChange(index, 'type', e.target.value)}
                            className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 focus:border-nds focus:outline-none"
                          >
                            {INTERFACE_TYPE_GROUPS.map((group) => (
                              <optgroup key={group.label} label={group.label} className="bg-base-900 text-ink-300">
                                {group.options.map((opt) => (
                                  <option key={opt.value} value={opt.value} className="bg-base-950 text-ink-100">
                                    {opt.label}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pr-4">
                          <select
                            value={range.label || 'fiber'}
                            onChange={(e) => handleRangeChange(index, 'label', e.target.value)}
                            className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 focus:border-nds focus:outline-none"
                          >
                            <option value="fiber">fiber</option>
                            <option value="copper">copper</option>
                            <option value="combo">combo</option>
                          </select>
                        </td>
                        <td className="py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removePortRange(index)}
                            disabled={portRanges.length === 1}
                            className="p-1 rounded text-red-500 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            title="ลบแถวนี้"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-3 flex justify-start">
                  <button
                    type="button"
                    onClick={addPortRange}
                    className="px-3 py-1.5 text-xs font-semibold rounded border border-base-600 bg-base-900 text-ink-300 hover:text-ink-100 hover:bg-base-800 transition-all"
                  >
                    + Add Port Range (เพิ่มกลุ่มพอร์ต)
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-base-600/30 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPortModalOpen(false)}
                  className="rounded-lg border border-base-600 bg-base-950 px-4 py-2 text-xs text-ink-400 hover:bg-base-800 transition-colors"
                  disabled={saving}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-nds px-4 py-2 text-xs font-semibold text-base-950 hover:bg-nds-hover disabled:opacity-50 transition-colors"
                  disabled={saving}
                >
                  {saving ? 'กำลังสร้าง...' : 'สร้าง Port Templates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Port Preset Modal */}
      {isPresetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-xl border border-base-600 bg-base-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left my-8">
            <div className="flex justify-between items-center border-b border-base-600/30 pb-3">
              <h3 className="font-display text-lg font-semibold text-ink-100">
                สร้างแม่แบบพอร์ตสำเร็จรูป (Create Port Preset)
              </h3>
              <button 
                onClick={() => setIsPresetModalOpen(false)}
                className="text-ink-400 hover:text-ink-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {saveError && (
              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 font-mono">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSavePreset} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-mono text-ink-400">Preset Name (ชื่อแม่แบบสำเร็จรูป) *</label>
                <input
                  type="text"
                  name="name"
                  value={presetFormData.name}
                  onChange={(e) => setPresetFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. 24G Copper + 4XG SFP+ Profile"
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none animate-in"
                  required
                />
              </div>

              <div className="overflow-x-auto border border-base-600/30 rounded-xl bg-base-950/40 p-4">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-ink-500 uppercase tracking-wider border-b border-base-600/30 pb-2">
                      <th className="pb-2 pr-4">Port Prefix / Slot</th>
                      <th className="pb-2 pr-4 w-20">Start Index</th>
                      <th className="pb-2 pr-4 w-20">Count</th>
                      <th className="pb-2 pr-4">Port Type</th>
                      <th className="pb-2 pr-4 w-28">Label</th>
                      <th className="pb-2 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-600/10">
                    {presetFormData.ranges.map((range, index) => (
                      <tr key={index} className="align-middle">
                        <td className="py-3 pr-4">
                          <input
                            type="text"
                            value={range.prefix}
                            onChange={(e) => handlePresetRangeChange(index, 'prefix', e.target.value)}
                            placeholder="e.g. GigabitEthernet0/0/"
                            className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 focus:border-nds focus:outline-none"
                            required
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <input
                            type="number"
                            value={range.start}
                            onChange={(e) => handlePresetRangeChange(index, 'start', e.target.value)}
                            className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 focus:border-nds focus:outline-none"
                            min="0"
                            required
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <input
                            type="number"
                            value={range.count}
                            onChange={(e) => handlePresetRangeChange(index, 'count', e.target.value)}
                            className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 focus:border-nds focus:outline-none"
                            min="1"
                            required
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <select
                            value={range.type}
                            onChange={(e) => handlePresetRangeChange(index, 'type', e.target.value)}
                            className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 focus:border-nds focus:outline-none"
                          >
                            {INTERFACE_TYPE_GROUPS.map((group) => (
                              <optgroup key={group.label} label={group.label} className="bg-base-900 text-ink-300">
                                {group.options.map((opt) => (
                                  <option key={opt.value} value={opt.value} className="bg-base-950 text-ink-100">
                                    {opt.label}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pr-4">
                          <select
                            value={range.label || 'fiber'}
                            onChange={(e) => handlePresetRangeChange(index, 'label', e.target.value)}
                            className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 focus:border-nds focus:outline-none"
                          >
                            <option value="fiber">fiber</option>
                            <option value="copper">copper</option>
                            <option value="combo">combo</option>
                          </select>
                        </td>
                        <td className="py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removePresetPortRange(index)}
                            disabled={presetFormData.ranges.length === 1}
                            className="p-1 rounded text-red-500 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            title="ลบแถวนี้"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-3 flex justify-start">
                  <button
                    type="button"
                    onClick={addPresetPortRange}
                    className="px-3 py-1.5 text-xs font-semibold rounded border border-base-600 bg-base-900 text-ink-300 hover:text-ink-100 hover:bg-base-800 transition-all"
                  >
                    + Add Port Range (เพิ่มกลุ่มพอร์ต)
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-base-600/30 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPresetModalOpen(false)}
                  className="rounded-lg border border-base-600 bg-base-950 px-4 py-2 text-xs text-ink-400 hover:bg-base-800 transition-colors"
                  disabled={saving}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-nds px-4 py-2 text-xs font-semibold text-base-950 hover:bg-nds-hover disabled:opacity-50 transition-colors"
                  disabled={saving}
                >
                  {saving ? 'กำลังบันทึก...' : 'สร้างแม่แบบ (Save Preset)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
