import { useState, useEffect } from 'react';
import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';

const INTERFACE_TYPE_GROUPS = [
  {
    label: 'Ethernet (fixed)',
    options: [
      { value: '100base-tx', label: '100BASE-TX (10/100ME Copper)' },
      { value: '1000base-t', label: '1000BASE-T (1GE Copper)' },
      { value: '2.5gbase-t', label: '2.5GBASE-T (2.5GE Copper)' },
      { value: '5gbase-t', label: '5GBASE-T (5GE Copper)' },
      { value: '10gbase-t', label: '10GBASE-T (10GE Copper)' }
    ]
  },
  {
    label: 'Ethernet (modular / transceivers)',
    options: [
      { value: '100base-fx', label: '100BASE-FX (10/100ME Fiber)' },
      { value: '1000base-x-sfp', label: '1000BASE-X (SFP Fiber)' },
      { value: '10gbase-x-sfpp', label: '10GBASE-X (SFP+)' },
      { value: '25gbase-x-sfp28', label: '25GBASE-X (SFP28)' },
      { value: '50gbase-x-sfp56', label: '50GBASE-X (SFP56)' },
      { value: '40gbase-x-qsfpp', label: '40GBASE-X (QSFP+)' },
      { value: '100gbase-x-qsfp28', label: '100GBASE-X (QSFP28)' },
      { value: '200gbase-x-qsfp56', label: '200GBASE-X (QSFP56)' },
      { value: '400gbase-x-qsfpdd', label: '400GBASE-X (QSFP-DD)' }
    ]
  },
  {
    label: 'Virtual / Logical',
    options: [
      { value: 'virtual', label: 'Virtual (พอร์ตเสมือน)' },
      { value: 'lag', label: 'Link Aggregation Group (LAG)' }
    ]
  },
  {
    label: 'Other',
    options: [
      { value: 'other', label: 'Other (อื่นๆ)' }
    ]
  }
];

const groupInterfaceChoices = (rawChoices) => {
  if (!Array.isArray(rawChoices) || rawChoices.length === 0) return INTERFACE_TYPE_GROUPS;

  const groups = {
    'Ethernet (fixed)': [],
    'Ethernet (modular / transceivers)': [],
    'Virtual / Logical': [],
    'Other': []
  };

  rawChoices.forEach(choice => {
    const val = (choice.value || '').toLowerCase();
    const opt = { value: choice.value, label: choice.label || choice.value };

    if (['virtual', 'lag'].some(k => val.includes(k))) {
      groups['Virtual / Logical'].push(opt);
    } else if (['sfp', 'sfpp', 'sfp28', 'sfp56', 'qsfp', 'qsfpp', 'qsfp28', 'qsfp56', 'qsfpdd', 'xfp'].some(k => val.includes(k))) {
      groups['Ethernet (modular / transceivers)'].push(opt);
    } else if (['100base', '1000base', '10gbase', 'base-t'].some(k => val.includes(k))) {
      groups['Ethernet (fixed)'].push(opt);
    } else {
      groups['Other'].push(opt);
    }
  });

  return Object.entries(groups)
    .filter(([_, list]) => list.length > 0)
    .map(([label, options]) => ({ label, options }));
};

const filterPortTypeGroups = (groups, query) => {
  if (!query) return groups;
  const q = query.toLowerCase();
  return groups
    .map(g => ({
      ...g,
      options: g.options.filter(opt => {
        const val = (opt.value || '').toLowerCase();
        const lbl = (opt.label || '').toLowerCase();
        return val.includes(q) || lbl.includes(q);
      })
    }))
    .filter(g => g.options.length > 0);
};

const getRangePreview = (range) => {
  const start = parseInt(range.start);
  const count = parseInt(range.count);
  if (isNaN(start) || isNaN(count) || count <= 0) return 'N/A';
  const prefix = range.prefix || '';
  if (count === 1) {
    return `${prefix}${start}`;
  }
  return `${prefix}${start} - ${prefix}${start + count - 1}`;
};

export default function ModuleTypesPage() {
  const [selectedModuleTypes, setSelectedModuleTypes] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPortModalOpen, setIsPortModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Port Type Search state for modals
  const [searchPortTypeQuery, setSearchPortTypeQuery] = useState('');

  // Loaded choices & presets list
  const [presets, setPresets] = useState([]);
  const [moduleTypesList, setModuleTypesList] = useState([]);
  const [interfaceTypeChoices, setInterfaceTypeChoices] = useState([]);
  const [selectedModuleTypeId, setSelectedModuleTypeId] = useState('');

  // Form states
  const [moduleTypeFormData, setModuleTypeFormData] = useState({
    manufacturer: '',
    model: '',
    part_number: '',
    description: '',
    comments: '',
    selectedPresetId: ''
  });

  const [portSourceMode, setPortSourceMode] = useState('manual');
  const [selectedSourcePresetId, setSelectedSourcePresetId] = useState('');
  const [selectedSourceModuleTypeId, setSelectedSourceModuleTypeId] = useState('');
  const [sourceModuleInterfaces, setSourceModuleInterfaces] = useState([]);
  const [loadingSourceInterfaces, setLoadingSourceInterfaces] = useState(false);

  const [portRanges, setPortRanges] = useState([
    { prefix: '{module}/0/', start: 0, count: 4, type: '10gbase-x-sfpp', label: 'fiber' }
  ]);

  const [presetFormData, setPresetFormData] = useState({
    name: '',
    ranges: [
      { prefix: '{module}/0/', start: 0, count: 4, type: '10gbase-x-sfpp', label: 'fiber' }
    ]
  });

  const [importSpecText, setImportSpecText] = useState('');

  const [existingInterfaces, setExistingInterfaces] = useState([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);

  // Detail View Drawer
  const [viewingModuleType, setViewingModuleType] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingInterfaces, setViewingInterfaces] = useState([]);
  const [loadingViewingInterfaces, setLoadingViewingInterfaces] = useState(false);

  useEffect(() => {
    loadPresets();
    loadChoices();
  }, []);

  const loadPresets = async () => {
    try {
      const res = await ndsApi.getPortPresets();
      setPresets(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load port presets:', err);
    }
  };

  const loadChoices = async () => {
    try {
      const res = await ndsApi.getInterfaceTypeChoices();
      setInterfaceTypeChoices(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load interface type choices:', err);
    }
  };

  // Load existing interfaces when target module type changes in Add Ports modal
  useEffect(() => {
    if (!selectedModuleTypeId) {
      setExistingInterfaces([]);
      return;
    }
    const loadInterfaces = async () => {
      setLoadingInterfaces(true);
      try {
        const res = await ndsApi.getModuleTypeInterfaces(selectedModuleTypeId);
        setExistingInterfaces(res.data?.data || res.data || []);
      } catch (err) {
        console.error('Failed to load existing interfaces:', err);
        setExistingInterfaces([]);
      } finally {
        setLoadingInterfaces(false);
      }
    };
    loadInterfaces();
  }, [selectedModuleTypeId]);

  // Load source module type interfaces when cloning
  useEffect(() => {
    if (portSourceMode !== 'clone' || !selectedSourceModuleTypeId) {
      setSourceModuleInterfaces([]);
      return;
    }
    const loadSource = async () => {
      setLoadingSourceInterfaces(true);
      try {
        const res = await ndsApi.getModuleTypeInterfaces(selectedSourceModuleTypeId);
        setSourceModuleInterfaces(res.data?.data || res.data || []);
      } catch (err) {
        console.error('Failed to load source module interfaces:', err);
        setSourceModuleInterfaces([]);
      } finally {
        setLoadingSourceInterfaces(false);
      }
    };
    loadSource();
  }, [portSourceMode, selectedSourceModuleTypeId]);

  const handleViewInterfacesClick = async (mt) => {
    setViewingModuleType(mt);
    setIsViewModalOpen(true);
    setLoadingViewingInterfaces(true);
    try {
      const res = await ndsApi.getModuleTypeInterfaces(mt.id);
      setViewingInterfaces(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load interfaces for view:', err);
      setViewingInterfaces([]);
    } finally {
      setLoadingViewingInterfaces(false);
    }
  };

  const handleCreateClick = () => {
    setModuleTypeFormData({
      manufacturer: '',
      model: '',
      part_number: '',
      description: '',
      comments: '',
      selectedPresetId: ''
    });
    setSaveError(null);
    setIsCreateModalOpen(true);
  };

  const handlePortClick = () => {
    if (selectedModuleTypes.length === 1) {
      setSelectedModuleTypeId(selectedModuleTypes[0].id.toString());
    } else {
      setSelectedModuleTypeId('');
    }
    setPortSourceMode('manual');
    setSelectedSourcePresetId('');
    setSelectedSourceModuleTypeId('');
    setSourceModuleInterfaces([]);
    setPortRanges([
      { prefix: '{module}/0/', start: 0, count: 4, type: '10gbase-x-sfpp', label: 'fiber' }
    ]);
    setSaveError(null);
    setIsPortModalOpen(true);
  };

  const handleCreatePresetClick = () => {
    setPresetFormData({
      name: '',
      ranges: [
        { prefix: '{module}/0/', start: 0, count: 4, type: '10gbase-x-sfpp', label: 'fiber' }
      ]
    });
    setSaveError(null);
    setIsPresetModalOpen(true);
  };

  const handleSaveModuleType = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const payload = {
        manufacturer: moduleTypeFormData.manufacturer,
        model: moduleTypeFormData.model,
        part_number: moduleTypeFormData.part_number,
        description: moduleTypeFormData.description,
        comments: moduleTypeFormData.comments,
        clone_module_type_id: moduleTypeFormData.selectedPresetId || undefined
      };

      await ndsApi.createModuleType(payload);
      setIsCreateModalOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setSaveError(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการบันทึก Module Type');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreset = async (e) => {
    e.preventDefault();
    if (!presetFormData.name.trim()) {
      setSaveError('กรุณาระบุชื่อ Port Preset');
      return;
    }
    setSaving(true);
    setSaveError(null);

    try {
      await ndsApi.createPortPreset(presetFormData);
      setIsPresetModalOpen(false);
      await loadPresets();
    } catch (err) {
      setSaveError(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการสร้าง Port Preset');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePorts = async (e) => {
    e.preventDefault();
    if (!selectedModuleTypeId) {
      setSaveError('กรุณาเลือก Module Type (Model) ที่ต้องการสร้างพอร์ต');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      if (portSourceMode === 'manual') {
        await ndsApi.createModuleTypeInterfaces(selectedModuleTypeId, { ranges: portRanges });
      } else if (portSourceMode === 'preset') {
        const preset = presets.find(p => p.id.toString() === selectedSourcePresetId);
        if (!preset) throw new Error('กรุณาเลือก Port Preset ที่ต้องการ');
        await ndsApi.createModuleTypeInterfaces(selectedModuleTypeId, { ranges: preset.ranges });
      } else if (portSourceMode === 'clone') {
        if (!selectedSourceModuleTypeId) throw new Error('กรุณาเลือก Module Type ต้นทางที่ต้องการคัดลอก');
        const payloadIfaces = sourceModuleInterfaces.map(it => ({
          name: it.name,
          type: typeof it.type === 'object' ? it.type.value : it.type,
          label: it.label || ''
        }));
        await ndsApi.createModuleTypeInterfaces(selectedModuleTypeId, { interfaces: payloadIfaces });
      } else if (portSourceMode === 'import_spec') {
        const lines = importSpecText.split('\n').map(l => l.trim()).filter(Boolean);
        const parsedIfaces = [];
        for (const line of lines) {
          const parts = line.split(',').map(p => p.trim());
          if (parts.length >= 1 && parts[0]) {
            parsedIfaces.push({
              name: parts[0],
              type: parts[1] || '10gbase-x-sfpp',
              label: parts[2] || ''
            });
          }
        }
        if (parsedIfaces.length === 0) throw new Error('ไม่พบรายการพอร์ตจากข้อความที่ป้อน');
        await ndsApi.createModuleTypeInterfaces(selectedModuleTypeId, { interfaces: parsedIfaces });
      }

      setIsPortModalOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setSaveError(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการสร้าง Port Templates');
    } finally {
      setSaving(false);
    }
  };

  const handleRangeChange = (index, field, value) => {
    setPortRanges(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addPortRange = () => {
    setPortRanges(prev => [
      ...prev,
      { prefix: '{module}/0/', start: 0, count: 4, type: '10gbase-x-sfpp', label: 'fiber' }
    ]);
  };

  const removePortRange = (index) => {
    if (portRanges.length === 1) return;
    setPortRanges(prev => prev.filter((_, i) => i !== index));
  };

  const handlePresetRangeChange = (index, field, value) => {
    setPresetFormData(prev => {
      const updatedRanges = [...prev.ranges];
      updatedRanges[index] = { ...updatedRanges[index], [field]: value };
      return { ...prev, ranges: updatedRanges };
    });
  };

  const addPresetPortRange = () => {
    setPresetFormData(prev => ({
      ...prev,
      ranges: [
        ...prev.ranges,
        { prefix: '{module}/0/', start: 0, count: 4, type: '10gbase-x-sfpp', label: 'fiber' }
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

  const toggleSelectAll = (list) => {
    if (selectedModuleTypes.length === list.length && list.length > 0) {
      setSelectedModuleTypes([]);
    } else {
      setSelectedModuleTypes([...list]);
    }
  };

  const toggleSelectOne = (item) => {
    setSelectedModuleTypes(prev => {
      const exists = prev.some(i => i.id === item.id);
      if (exists) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const renderModuleTypesTable = (list) => {
    const isAllSelected = list.length > 0 && selectedModuleTypes.length === list.length;

    return (
      <table className="w-full text-left text-xs font-sans">
        <thead className="bg-base-900/90 text-ink-400 border-b border-base-600/30 uppercase tracking-wider font-mono">
          <tr>
            <th className="px-5 py-3.5 text-center w-12">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={() => toggleSelectAll(list)}
                className="rounded border-base-600 text-nds focus:ring-nds focus:ring-opacity-25 bg-base-950 w-4 h-4 cursor-pointer"
              />
            </th>
            <th className="px-5 py-3.5">รุ่นมอดูล (Model)</th>
            <th className="px-5 py-3.5">ผู้ผลิต (Manufacturer)</th>
            <th className="px-5 py-3.5">Part Number</th>
            <th className="px-5 py-3.5">คำอธิบาย</th>
            <th className="px-5 py-3.5 text-center">Port Templates</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-600/20">
          {list.map((item) => {
            const isSelected = selectedModuleTypes.some(i => i.id === item.id);
            const mfgName = typeof item.manufacturer === 'object' ? item.manufacturer?.name : item.manufacturer;
            return (
              <tr 
                key={item.id} 
                onClick={() => toggleSelectOne(item)}
                className={`hover:bg-base-700/20 transition-colors cursor-pointer ${isSelected ? 'bg-nds/5' : ''}`}
              >
                <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectOne(item)}
                    className="rounded border-base-600 text-nds focus:ring-nds focus:ring-opacity-25 bg-base-950 w-4 h-4 cursor-pointer"
                  />
                </td>
                <td className="px-5 py-4 font-bold text-nds font-mono">{item.model || item.display || 'N/A'}</td>
                <td className="px-5 py-4 font-semibold text-ink-100">{mfgName || 'N/A'}</td>
                <td className="px-5 py-4 text-ink-400 font-mono">{item.part_number || 'N/A'}</td>
                <td className="px-5 py-4 text-ink-400 font-sans">{item.description || item.comments || '-'}</td>
                <td className="px-5 py-4 text-center font-mono" onClick={(e) => e.stopPropagation()}>
                  {(item.interface_templates_count ?? item.interface_count ?? 0) > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleViewInterfacesClick(item)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-nds/10 border border-nds/30 px-3 py-1 text-xs font-semibold text-nds hover:bg-nds/20 hover:border-nds transition-all shadow-sm"
                      title="คลิกเพื่อเปิดดูรายละเอียดพอร์ตทั้งหมดของมอดูลนี้"
                    >
                      <span>{item.interface_templates_count ?? item.interface_count} พอร์ต</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModuleTypeId(item.id.toString());
                        setPortSourceMode('manual');
                        setIsPortModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-base-900 border border-base-700 px-3 py-1 text-xs text-ink-400 hover:border-nds hover:text-nds transition-all"
                      title="ยังไม่มีพอร์ต คลิกเพื่อเพิ่มพอร์ตตรงไปยังรุ่นนี้"
                    >
                      <span>0 พอร์ต (+เพิ่ม)</span>
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {list.length === 0 && (
            <tr>
              <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">
                ไม่พบข้อมูล Module Types ในระบบ
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  const fetchModuleTypes = async () => {
    const res = await ndsApi.getModuleTypes();
    const data = res.data?.data || res.data || [];
    setModuleTypesList(data);
    return data;
  };

  return (
    <div>
      {/* Top Toolbar */}
      <div className="mb-4 flex flex-wrap gap-4 justify-between items-center bg-base-900/40 p-4 rounded-xl border border-base-600/30">
        <div className="flex items-center gap-4">
          <span className="text-xs text-ink-400 font-mono">
            การจัดการข้อมูลรุ่นการ์ดมอดูล (Module Types)
          </span>
          {selectedModuleTypes.length > 0 && (
            <span className="text-xs font-mono text-ink-500 border-l border-base-600/50 pl-4 animate-in fade-in duration-200">
              Selected: <span className="text-nds font-bold">{selectedModuleTypes.length}</span> item
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCreateClick}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-nds border border-nds text-base-950 hover:bg-nds-hover transition-all shadow-[0_0_15px_rgba(76,141,255,0.15)]"
          >
            Create Module Type
          </button>
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
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-base-600 bg-base-950 text-ink-100 hover:bg-base-800 transition-all"
          >
            Add Ports directly
          </button>
        </div>
      </div>

      {/* Main Table */}
      <NDSPageContainer
        fetchData={fetchModuleTypes}
        onDataLoaded={(data) => setModuleTypesList(data)}
        refreshTrigger={refreshTrigger}
        renderTable={renderModuleTypesTable}
        placeholder="ค้นหาด่วน (เช่น ชื่อรุ่นมอดูล, ผู้ผลิต, Part Number)..."
      />

      {/* Create Module Type Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-xl border border-base-600 bg-base-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left my-8">
            <div className="flex justify-between items-center border-b border-base-600/30 pb-3">
              <h3 className="font-display text-lg font-semibold text-ink-100">
                เพิ่มรุ่นมอดูลใหม่ (Create Module Type)
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

            <form onSubmit={handleSaveModuleType} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-mono text-ink-400">Manufacturer (ผู้ผลิต) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={moduleTypeFormData.manufacturer}
                  onChange={(e) => setModuleTypeFormData({ ...moduleTypeFormData, manufacturer: e.target.value })}
                  placeholder="e.g. Huawei, Cisco, Juniper"
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Model Name (ชื่อรุ่นมอดูล) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={moduleTypeFormData.model}
                  onChange={(e) => setModuleTypeFormData({ ...moduleTypeFormData, model: e.target.value })}
                  placeholder="e.g. CR5D00E4GF10, SFP-10G-LR"
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Part number (รหัสสินค้า)</label>
                <input
                  type="text"
                  value={moduleTypeFormData.part_number}
                  onChange={(e) => setModuleTypeFormData({ ...moduleTypeFormData, part_number: e.target.value })}
                  placeholder="e.g. 03030XXX"
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400">Description (คำอธิบาย)</label>
                <input
                  type="text"
                  value={moduleTypeFormData.description}
                  onChange={(e) => setModuleTypeFormData({ ...moduleTypeFormData, description: e.target.value })}
                  placeholder="e.g. 4-Port 10GE Optical Interface Card"
                  className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-400 mb-1.5">
                  คัดลอก Port Templates จาก Module Type อื่น (Optional)
                </label>
                <select
                  value={moduleTypeFormData.selectedPresetId}
                  onChange={(e) => setModuleTypeFormData({ ...moduleTypeFormData, selectedPresetId: e.target.value })}
                  className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                >
                  <option value="">-- ไม่เลือก (สร้างมอดูลเปล่า) --</option>
                  {moduleTypesList.map(m => (
                    <option key={m.id} value={m.id}>
                      {typeof m.manufacturer === 'object' ? m.manufacturer?.name : m.manufacturer} - {m.model}
                    </option>
                  ))}
                </select>
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
                  {saving ? 'กำลังบันทึก...' : 'สร้าง Module Type'}
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
            <div className="flex justify-between items-center border-b border-base-600/30 pb-3 mb-4">
              <h3 className="font-display text-lg font-semibold text-ink-100 flex items-center gap-2">
                <span>สร้าง Port Templates ไปยังรุ่นมอดูลโดยตรง</span>
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
              <div>
                <label className="block text-xs font-mono text-ink-400 mb-1.5">Module Type (เลือกรุ่นการ์ดมอดูลใน NetBox) <span className="text-red-500">*</span></label>
                <select
                  value={selectedModuleTypeId}
                  onChange={(e) => setSelectedModuleTypeId(e.target.value)}
                  className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                  required
                >
                  <option value="">-- เลือก Module Type (Model) --</option>
                  {moduleTypesList.map(t => (
                    <option key={t.id} value={t.id}>
                      {typeof t.manufacturer === 'object' ? t.manufacturer?.name : t.manufacturer} - {t.model} {t.part_number ? `(${t.part_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedModuleTypeId && (
                <div className="border border-base-600/30 rounded-xl bg-base-950/20 p-4">
                  <h4 className="text-xs font-mono font-semibold text-ink-300 mb-2">
                    พอร์ตเดิมที่มีอยู่แล้วในรุ่นนี้ ({existingInterfaces.length} พอร์ต):
                  </h4>
                  {loadingInterfaces ? (
                    <div className="text-xs text-ink-500 font-mono animate-pulse">กำลังโหลดข้อมูลพอร์ตเดิมจาก NetBox...</div>
                  ) : existingInterfaces.length === 0 ? (
                    <div className="text-xs text-ink-500 font-mono">ไม่มีพอร์ตอยู่ในรุ่นนี้ (ว่างเปล่า)</div>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                      {existingInterfaces.map(it => (
                        <div 
                          key={it.id} 
                          className="px-2.5 py-1 rounded bg-base-950 border border-base-600/60 font-mono text-[10px] text-ink-400 flex items-center gap-2"
                        >
                          <span className="text-nds font-semibold">{it.name}</span>
                          <span className="text-ink-500">
                            ({typeof it.type === 'object' ? it.type?.label || it.type?.value || 'N/A' : it.type})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 border-b border-base-600/30 pb-3 mb-4">
                <button
                  type="button"
                  onClick={() => setPortSourceMode('manual')}
                  className={`pb-1 text-xs font-semibold border-b-2 transition-all ${
                    portSourceMode === 'manual'
                      ? 'border-nds text-nds'
                      : 'border-transparent text-ink-400 hover:text-ink-200'
                  }`}
                >
                  กำหนดพอร์ตเอง (Manual Table)
                </button>
                <button
                  type="button"
                  onClick={() => setPortSourceMode('preset')}
                  className={`pb-1 text-xs font-semibold border-b-2 transition-all ${
                    portSourceMode === 'preset'
                      ? 'border-nds text-nds'
                      : 'border-transparent text-ink-400 hover:text-ink-200'
                  }`}
                >
                  เลือกจากแม่แบบ (Port Preset)
                </button>
                <button
                  type="button"
                  onClick={() => setPortSourceMode('clone')}
                  className={`pb-1 text-xs font-semibold border-b-2 transition-all ${
                    portSourceMode === 'clone'
                      ? 'border-nds text-nds'
                      : 'border-transparent text-ink-400 hover:text-ink-200'
                  }`}
                >
                  คัดลอกพอร์ตจากรุ่นอื่น (Clone Module Type)
                </button>
                <button
                  type="button"
                  onClick={() => setPortSourceMode('import_spec')}
                  className={`pb-1 text-xs font-semibold border-b-2 transition-all ${
                    portSourceMode === 'import_spec'
                      ? 'border-nds text-nds'
                      : 'border-transparent text-ink-400 hover:text-ink-200'
                  }`}
                >
                  นำเข้าจากข้อความ / CSV (Import Spec)
                </button>
              </div>

              {/* Method 1: Manual Table */}
              {portSourceMode === 'manual' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-base-950/60 p-3 rounded-lg border border-base-600/30">
                    <span className="text-xs text-ink-300 font-medium">ค้นหาชนิดพอร์ต (Filter Port Types):</span>
                    <input
                      type="text"
                      placeholder="พิมพ์เพื่อค้นหาชนิดพอร์ต (e.g. sfp, 10g, copper...)"
                      value={searchPortTypeQuery}
                      onChange={(e) => setSearchPortTypeQuery(e.target.value)}
                      className="w-80 rounded-lg border border-base-600 bg-base-900 px-3 py-1 text-xs text-ink-100 placeholder-ink-500 focus:border-nds focus:outline-none"
                    />
                  </div>
                  <div className="overflow-x-auto border border-base-600/30 rounded-xl bg-base-950/40 p-4">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-ink-500 uppercase tracking-wider border-b border-base-600/30 pb-2">
                          <th className="pb-2 pr-4">Port Prefix / Format</th>
                          <th className="pb-2 pr-4 w-28">Start Index</th>
                          <th className="pb-2 pr-4 w-28">Count</th>
                          <th className="pb-2 pr-4">Port Type</th>
                          <th className="pb-2 pr-4 w-32">Label</th>
                          <th className="pb-2 w-16 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-base-600/10">
                        {portRanges.map((range, index) => (
                          <tr key={index} className="align-top">
                            <td className="py-3 pr-4">
                              <input
                                type="text"
                                value={range.prefix}
                                onChange={(e) => handleRangeChange(index, 'prefix', e.target.value)}
                                placeholder="e.g. {module}/0/ หรือ GE{module}/0/"
                                className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 focus:border-nds focus:outline-none"
                                required
                              />
                              <div className="mt-1 text-[10px] text-ink-500 font-mono whitespace-nowrap">
                                Preview: <span className="text-nds select-all font-semibold">{getRangePreview(range)}</span>
                              </div>
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
                                {filterPortTypeGroups(
                                  interfaceTypeChoices.length > 0 ? groupInterfaceChoices(interfaceTypeChoices) : INTERFACE_TYPE_GROUPS,
                                  searchPortTypeQuery
                                ).map((group) => (
                                  <optgroup key={group.label} label={group.label} className="bg-base-900 text-ink-300">
                                    {group.options.map((opt) => (
                                      <option key={opt.value} value={opt.value} className="bg-base-950 text-ink-100">
                                        {opt.label || opt.value}
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
                  </div>
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
              )}

              {/* Method 2: Port Preset */}
              {portSourceMode === 'preset' && (
                <div className="space-y-4 border border-base-600/30 rounded-xl bg-base-950/40 p-4">
                  <div>
                    <label className="block text-xs font-mono text-ink-400 mb-1.5">เลือก Port Preset (แม่แบบพอร์ตสำเร็จรูป) <span className="text-red-500">*</span></label>
                    <select
                      value={selectedSourcePresetId}
                      onChange={(e) => setSelectedSourcePresetId(e.target.value)}
                      className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    >
                      <option value="">-- เลือก Port Preset --</option>
                      {presets.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Method 3: Clone Module Type */}
              {portSourceMode === 'clone' && (
                <div className="space-y-4 border border-base-600/30 rounded-xl bg-base-950/40 p-4">
                  <div>
                    <label className="block text-xs font-mono text-ink-400 mb-1.5">เลือก Module Type ต้นทางที่ต้องการคัดลอกพอร์ต <span className="text-red-500">*</span></label>
                    <select
                      value={selectedSourceModuleTypeId}
                      onChange={(e) => setSelectedSourceModuleTypeId(e.target.value)}
                      className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                    >
                      <option value="">-- เลือก Module Type ต้นทาง --</option>
                      {moduleTypesList.filter(t => t.id.toString() !== selectedModuleTypeId).map(t => (
                        <option key={t.id} value={t.id}>
                          {typeof t.manufacturer === 'object' ? t.manufacturer?.name : t.manufacturer} - {t.model}
                        </option>
                      ))}
                    </select>
                  </div>
                  {loadingSourceInterfaces ? (
                    <div className="text-xs text-ink-500 font-mono animate-pulse">กำลังดึงรายการพอร์ตจากรุ่นต้นทาง...</div>
                  ) : sourceModuleInterfaces.length > 0 && (
                    <div className="text-xs text-ink-400 font-mono">
                      พบพอร์ตที่จะถูกคัดลอกทั้งหมด <span className="text-nds font-bold">{sourceModuleInterfaces.length}</span> พอร์ต
                    </div>
                  )}
                </div>
              )}

              {/* Method 4: Import Spec */}
              {portSourceMode === 'import_spec' && (
                <div className="space-y-3 border border-base-600/30 rounded-xl bg-base-950/40 p-4">
                  <label className="block text-xs font-mono text-ink-400">
                    วางข้อความแบบ CSV (รูปแบบ: <code className="text-nds">PortName, Type, Label</code> เช่น <code className="text-nds">{'{module}'}/0/0, 10gbase-x-sfpp, fiber</code>)
                  </label>
                  <textarea
                    rows={6}
                    value={importSpecText}
                    onChange={(e) => setImportSpecText(e.target.value)}
                    placeholder={`{module}/0/0, 10gbase-x-sfpp, fiber\n{module}/0/1, 10gbase-x-sfpp, fiber\n{module}/0/2, 10gbase-x-sfpp, fiber\n{module}/0/3, 10gbase-x-sfpp, fiber`}
                    className="w-full rounded-lg border border-base-600 bg-base-950 p-3 font-mono text-xs text-ink-100 focus:border-nds focus:outline-none"
                  />
                </div>
              )}

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
                  className="rounded-lg bg-nds px-5 py-2 text-xs font-semibold text-base-950 hover:bg-nds-hover disabled:opacity-50 transition-colors shadow-md"
                  disabled={saving}
                >
                  {saving ? 'กำลังบันทึก...' : 'สร้าง Port Templates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Port Preset Modal */}
      {isPresetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl border border-base-600 bg-base-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left my-8">
            <div className="flex justify-between items-center border-b border-base-600/30 pb-3 mb-4">
              <h3 className="font-display text-lg font-semibold text-ink-100">
                สร้างแม่แบบพอร์ตใหม่ (Create Port Preset)
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
                <label className="block text-xs font-mono text-ink-400 mb-1">ชื่อแม่แบบ (Preset Name) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={presetFormData.name}
                  onChange={(e) => setPresetFormData({ ...presetFormData, name: e.target.value })}
                  placeholder="e.g. 4-Port 10GE SFP+ Module Template"
                  className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
                  required
                />
              </div>

              <div className="overflow-x-auto border border-base-600/30 rounded-xl bg-base-950/40 p-4">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-ink-500 uppercase tracking-wider border-b border-base-600/30 pb-2">
                      <th className="pb-2 pr-4">Prefix</th>
                      <th className="pb-2 pr-4 w-24">Start</th>
                      <th className="pb-2 pr-4 w-24">Count</th>
                      <th className="pb-2 pr-4">Port Type</th>
                      <th className="pb-2 pr-4 w-28">Label</th>
                      <th className="pb-2 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-600/10">
                    {presetFormData.ranges.map((range, index) => (
                      <tr key={index} className="align-top">
                        <td className="py-3 pr-4">
                          <input
                            type="text"
                            value={range.prefix}
                            onChange={(e) => handlePresetRangeChange(index, 'prefix', e.target.value)}
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
                            {INTERFACE_TYPE_GROUPS.map(g => (
                              <optgroup key={g.label} label={g.label}>
                                {g.options.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                            className="p-1 rounded text-red-500 hover:bg-red-500/10 disabled:opacity-40 transition-all"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex justify-start">
                <button
                  type="button"
                  onClick={addPresetPortRange}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-base-600 bg-base-900 text-ink-300 hover:text-ink-100 hover:bg-base-800 transition-all"
                >
                  + Add Port Range
                </button>
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
                  className="rounded-lg bg-nds px-5 py-2 text-xs font-semibold text-base-950 hover:bg-nds-hover disabled:opacity-50 transition-colors"
                  disabled={saving}
                >
                  {saving ? 'กำลังบันทึก...' : 'สร้าง Port Preset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Interfaces Drawer */}
      {isViewModalOpen && viewingModuleType && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-base-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl h-full max-h-[90vh] rounded-xl border border-base-600 bg-base-900 p-6 shadow-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="flex justify-between items-center border-b border-base-600/30 pb-3">
                <div>
                  <h3 className="font-display text-base font-semibold text-ink-100 flex items-center gap-2">
                    Port Templates: <span className="text-nds font-mono">{viewingModuleType.model}</span>
                  </h3>
                  <span className="text-xs text-ink-400 font-mono">
                    ผู้ผลิต: {typeof viewingModuleType.manufacturer === 'object' ? viewingModuleType.manufacturer?.name : viewingModuleType.manufacturer}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModuleTypeId(viewingModuleType.id.toString());
                      setPortSourceMode('manual');
                      setIsViewModalOpen(false);
                      setIsPortModalOpen(true);
                    }}
                    className="rounded-lg bg-nds px-3 py-1.5 text-xs font-semibold text-base-950 hover:bg-nds-hover transition-all"
                  >
                    + เพิ่ม Port Templates
                  </button>
                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="text-ink-400 hover:text-ink-100 transition-colors text-lg px-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Info banner about {module} placeholder tag */}
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-300">
                <span className="font-bold block text-blue-200 mb-0.5">คำแนะนำชื่อพอร์ตมอดูล:</span>
                <p className="leading-relaxed font-sans text-[11px]">
                  ชื่อพอร์ตมอดูลควรใช้แท็ก <code className="font-mono bg-blue-950 px-1 py-0.5 rounded text-blue-200">{'{module}'}</code> เช่น <code className="font-mono bg-blue-950 px-1 py-0.5 rounded text-blue-200">{'{module}'}/0/1</code> โดย NetBox จะเปลี่ยนแท็กนี้เป็นตำแหน่ง Slot/Bay จริงเมื่อการ์ดมอดูลถูกติดตั้งในอุปกรณ์
                </p>
              </div>

              {loadingViewingInterfaces ? (
                <div className="p-8 text-center text-xs text-ink-500 font-mono animate-pulse">
                  กำลังโหลดข้อมูล Port Templates...
                </div>
              ) : viewingInterfaces.length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-500 font-mono">
                  ไม่มี Port Templates ในรุ่นมอดูลนี้
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-ink-400 font-mono mb-2">
                    รายการพอร์ตทั้งหมด ({viewingInterfaces.length} พอร์ต):
                  </div>
                  <div className="divide-y divide-base-600/20 border border-base-600/30 rounded-xl bg-base-950/40 overflow-hidden">
                    {viewingInterfaces.map(it => (
                      <div key={it.id} className="p-3 font-mono text-xs flex justify-between items-center hover:bg-base-800/30">
                        <span className="text-nds font-semibold select-all">{it.name}</span>
                        <div className="text-ink-400 text-[11px]">
                          <span className="bg-base-900 border border-base-700 px-2 py-0.5 rounded mr-2">
                            {typeof it.type === 'object' ? it.type?.label || it.type?.value || 'N/A' : it.type}
                          </span>
                          {it.label && <span className="text-amber-400">{it.label}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-base-600/30 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="rounded-lg border border-base-600 bg-base-950 px-4 py-2 text-xs text-ink-300 hover:bg-base-800 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
