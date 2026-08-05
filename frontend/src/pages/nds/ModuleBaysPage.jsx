import { useState, useEffect } from 'react';
import { ndsApi } from '../../api/nds.api.js';

export default function ModuleBaysPage() {
  const [devices, setDevices] = useState([]);
  const [moduleTypes, setModuleTypes] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [moduleBays, setModuleBays] = useState([]);
  
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingBays, setLoadingBays] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchModuleQuery, setSearchModuleQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Dragging State
  const [draggedModuleType, setDraggedModuleType] = useState(null);
  const [dragOverBayId, setDragOverBayId] = useState(null);
  const [processingBayId, setProcessingBayId] = useState(null);

  // Detail Modal State
  const [selectedModuleDetail, setSelectedModuleDetail] = useState(null);
  const [moduleInterfaces, setModuleInterfaces] = useState([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);

  const handleOpenDetail = async (mType) => {
    setSelectedModuleDetail(mType);
    setLoadingInterfaces(true);
    setModuleInterfaces([]);
    try {
      const res = await ndsApi.getModuleTypeInterfaces(mType.id);
      const rawIfaces = res.data?.data || res.data || [];
      setModuleInterfaces(Array.isArray(rawIfaces) ? rawIfaces : []);
    } catch (err) {
      console.error('Error fetching module interfaces:', err);
      setModuleInterfaces([]);
    } finally {
      setLoadingInterfaces(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedModuleDetail(null);
    setModuleInterfaces([]);
  };

  // Load initial devices & module types
  const loadInitialData = async () => {
    setLoadingDevices(true);
    setErrorMessage('');
    try {
      const [devRes, mtRes] = await Promise.all([
        ndsApi.getDevices(),
        ndsApi.getModuleTypes()
      ]);
      const rawDevs = devRes.data?.data || devRes.data || [];
      const rawMts = mtRes.data?.data || mtRes.data || [];
      setDevices(Array.isArray(rawDevs) ? rawDevs : []);
      setModuleTypes(Array.isArray(rawMts) ? rawMts : []);

      // Auto select first device if available
      if (Array.isArray(rawDevs) && rawDevs.length > 0) {
        handleSelectDevice(rawDevs[0]);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setErrorMessage(err.response?.data?.message || 'ไม่สามารถโหลดข้อมูลอุปกรณ์ หรือ Module Types ได้');
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch Module Bays for selected device
  const handleSelectDevice = async (device) => {
    setSelectedDevice(device);
    setLoadingBays(true);
    setErrorMessage('');
    setActionSuccess('');
    try {
      const res = await ndsApi.getDeviceModuleBays(device.id);
      const rawBays = res.data?.data || res.data || [];
      setModuleBays(Array.isArray(rawBays) ? rawBays : []);
    } catch (err) {
      console.error('Error fetching module bays:', err);
      setErrorMessage(err.response?.data?.message || 'ไม่สามารถดึงข้อมูล Module Bays ของอุปกรณ์นี้ได้');
      setModuleBays([]);
    } finally {
      setLoadingBays(false);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, mType) => {
    setDraggedModuleType(mType);
    e.dataTransfer.setData('application/json', JSON.stringify(mType));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e, bayId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverBayId !== bayId) {
      setDragOverBayId(bayId);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverBayId(null);
  };

  const handleDrop = async (e, bay) => {
    e.preventDefault();
    setDragOverBayId(null);
    if (!draggedModuleType) return;

    if (bay.installed_module) {
      if (!window.confirm(`ช่อง ${bay.name} มีการ์ด ${bay.installed_module.display || bay.installed_module.name} เสียบอยู่แล้ว ต้องการเปลี่ยนเป็น ${draggedModuleType.model} ใช่หรือไม่?`)) {
        setDraggedModuleType(null);
        return;
      }
      // Remove old module first if present
      try {
        await ndsApi.removeModuleFromBay(bay.installed_module.id);
      } catch (rmErr) {
        console.warn('Failed to remove old module:', rmErr.message);
      }
    }

    setProcessingBayId(bay.id);
    setErrorMessage('');
    setActionSuccess('');

    try {
      await ndsApi.installModuleInBay({
        moduleBayId: bay.id,
        moduleTypeId: draggedModuleType.id
      });
      setActionSuccess(`เสียบการ์ด ${draggedModuleType.model} เข้าช่อง ${bay.name} สำเร็จ!`);
      // Refresh bays for selected device
      await handleSelectDevice(selectedDevice);
    } catch (err) {
      console.error('Error installing module:', err);
      setErrorMessage(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเสียบการ์ดเข้า Module Bay');
    } finally {
      setProcessingBayId(null);
      setDraggedModuleType(null);
    }
  };

  // Remove Module Handler
  const handleRemoveModule = async (bay) => {
    if (!bay.installed_module) return;
    const confirmMsg = `ยืนยันการถอดมอดูล ${bay.installed_module.display || bay.installed_module.name || ''} ออกจากช่อง ${bay.name}?`;
    if (!window.confirm(confirmMsg)) return;

    setProcessingBayId(bay.id);
    setErrorMessage('');
    setActionSuccess('');

    try {
      await ndsApi.removeModuleFromBay(bay.installed_module.id);
      setActionSuccess(`ถอดมอดูลออกจากช่อง ${bay.name} เรียบร้อยแล้ว`);
      await handleSelectDevice(selectedDevice);
    } catch (err) {
      console.error('Error removing module:', err);
      setErrorMessage(err.response?.data?.message || 'เกิดข้อผิดพลาดในการถอดมอดูล');
    } finally {
      setProcessingBayId(null);
    }
  };

  // Filtered devices
  const filteredDevices = devices.filter(dev => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (dev.name || dev.display || '').toLowerCase();
    const model = (dev.device_type?.model || '').toLowerCase();
    return name.includes(q) || model.includes(q);
  });

  // Filtered module types
  const filteredModuleTypes = moduleTypes.filter(mt => {
    if (!searchModuleQuery) return true;
    const q = searchModuleQuery.toLowerCase();
    const model = (mt.model || mt.display || '').toLowerCase();
    const mfg = (mt.manufacturer?.name || '').toLowerCase();
    return model.includes(q) || mfg.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="rounded-xl border border-nds/20 bg-base-800/60 p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink-100 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-nds animate-pulse" />
              Module Bay Provisioning (เติมการ์ด/มอดูลแบบ Drag & Drop)
            </h2>
            <p className="mt-1 text-sm text-ink-400">
              เลือกลากการ์ด/มอดูล (Module Types) จากฝั่งซ้าย มาวางใส่ช่องเสียบ (Module Bays) ของอุปกรณ์จริงทางฝั่งขวาเพื่อติดตั้งมอดูลเข้ากับ NetBox
            </p>
          </div>
          <button
            onClick={loadInitialData}
            disabled={loadingDevices}
            className="inline-flex items-center gap-2 rounded-lg bg-base-700 px-4 py-2 text-sm font-medium text-ink-200 hover:bg-base-600 transition"
          >
            โหลดข้อมูลใหม่
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="text-xs underline">ปิด</button>
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400 flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess('')} className="text-xs underline">ปิด</button>
        </div>
      )}

      {/* Main Interactive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column 1: Device Selector (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border border-base-700 bg-base-800/40 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-nds uppercase tracking-wider">1. เลือกอุปกรณ์ (Device)</h3>
            <input
              type="text"
              placeholder="ค้นหาชื่อ Device หรือ Model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-base-700 bg-base-900 px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:border-nds focus:outline-none"
            />

            <div className="max-h-[32rem] overflow-y-auto space-y-1.5 pr-1">
              {loadingDevices ? (
                <div className="p-4 text-center text-xs text-ink-400">กำลังโหลดรายการ Device...</div>
              ) : filteredDevices.length === 0 ? (
                <div className="p-4 text-center text-xs text-ink-400">ไม่พบอุปกรณ์</div>
              ) : (
                filteredDevices.map(dev => {
                  const isSelected = selectedDevice?.id === dev.id;
                  return (
                    <button
                      key={dev.id}
                      onClick={() => handleSelectDevice(dev)}
                      className={`w-full text-left p-3 rounded-lg border text-xs transition flex flex-col gap-1 ${
                        isSelected 
                          ? 'border-nds bg-nds/10 text-ink-100 font-semibold shadow-md shadow-nds/10' 
                          : 'border-base-700/60 bg-base-900/50 text-ink-300 hover:bg-base-700/40'
                      }`}
                    >
                      <div className="truncate font-mono">{dev.name || dev.display}</div>
                      <div className="flex items-center justify-between text-[11px] text-ink-400">
                        <span>{dev.device_type?.model || dev.type || '-'}</span>
                        <span className="text-nds font-mono">ID:{dev.id}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Middle Column 2: Available Modules Library (Drag Source - 3 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-base-700 bg-base-800/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-nds uppercase tracking-wider">2. Select Module (Drag & Drop)</h3>
              <span className="text-[10px] text-ink-400 bg-base-900 px-2 py-0.5 rounded border border-base-700">
                {filteredModuleTypes.length} Module Types
              </span> 
            </div>

            <input
              type="text"
              placeholder="ค้นหารุ่นการ์ด / Module..."
              value={searchModuleQuery}
              onChange={(e) => setSearchModuleQuery(e.target.value)}
              className="w-full rounded-lg border border-base-700 bg-base-900 px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:border-nds focus:outline-none"
            />

            <div className="max-h-[32rem] overflow-y-auto space-y-2 pr-1">
              {filteredModuleTypes.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-400">ไม่พบ Module Types</div>
              ) : (
                filteredModuleTypes.map(mType => (
                  <div
                    key={mType.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, mType)}
                    className="p-3 rounded-lg border border-nds/30 bg-base-900 hover:border-nds hover:bg-nds/5 cursor-grab active:cursor-grabbing transition group shadow-sm flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-mono font-bold text-xs text-ink-100 group-hover:text-nds">
                        {mType.model}
                      </div>
                      <div className="text-[10px] text-ink-400 mt-0.5">
                        ผู้ผลิต: {mType.manufacturer?.name || 'Generic'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(mType);
                        }}
                        className="px-2 py-1 text-[11px] font-medium text-ink-200 bg-base-800 hover:bg-base-700 hover:text-white border border-base-700 rounded transition"
                      >
                        รายละเอียด
                      </button>
                      <div className="text-xs text-nds bg-nds/10 border border-nds/20 px-2 py-1 rounded font-mono flex items-center gap-1">
                        <span className="text-sm">≡</span> ลาก
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column 3: Device Slots / Module Bays Chassis (Drop Target - 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-base-700 bg-base-800/40 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-base-700/60 pb-3">
              <div>
                <h3 className="text-xs font-semibold text-nds uppercase tracking-wider">3. ช่องเสียบ (Module Bays Slots)</h3>
                <span className="text-xs text-ink-200 font-semibold">
                  {selectedDevice ? selectedDevice.name : 'กรุณาเลือกอุปกรณ์'}
                </span>
              </div>
              {selectedDevice && (
                <span className="text-xs font-mono text-nds bg-nds/10 border border-nds/20 px-2 py-1 rounded">
                  {selectedDevice.device_type?.model || 'Modular Switch'}
                </span>
              )}
            </div>

            {!selectedDevice ? (
              <div className="p-12 text-center text-xs text-ink-400">กรุณาเลือกอุปกรณ์ทางฝั่งซ้ายเพื่อแสดงช่องเสียบ</div>
            ) : loadingBays ? (
              <div className="p-12 text-center text-xs text-ink-400">กำลังโหลด Module Bays...</div>
            ) : moduleBays.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-400 rounded-lg border border-dashed border-base-700 bg-base-900/40 space-y-2">
                <p>อุปกรณ์นี้ยังไม่มี Module Bay ในระบบ NetBox</p>
                <p className="text-[11px] text-ink-500">สามารถเลือก Sync Device Interfaces เพื่อดึง Template ล่าสุดได้</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
                {moduleBays.map((bay, idx) => {
                  const isHovered = dragOverBayId === bay.id;
                  const isProcessing = processingBayId === bay.id;
                  const hasModule = Boolean(bay.installed_module);

                  return (
                    <div
                      key={bay.id || idx}
                      onDragOver={(e) => handleDragOver(e, bay.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, bay)}
                      className={`p-4 rounded-xl border transition duration-200 relative ${
                        isHovered 
                          ? 'border-nds bg-nds/20 ring-2 ring-nds/40 scale-[1.01]' 
                          : hasModule
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'border-dashed border-base-600 bg-base-900/80 hover:border-base-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-nds" />
                          <span className="font-mono font-bold text-xs text-ink-100">
                            {bay.name} {bay.label ? `(${bay.label})` : ''}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-ink-400 bg-base-800 px-2 py-0.5 rounded border border-base-700">
                          Position: {bay.position || idx + 1}
                        </span>
                      </div>

                      {/* Slot Inner Content */}
                      {isProcessing ? (
                        <div className="p-3 text-center text-xs text-nds animate-pulse font-mono">
                          กำลังประมวลผลการเติมมอดูล...
                        </div>
                      ) : hasModule ? (
                        <div className="mt-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-emerald-300 font-mono">
                              [INSTALLED] {bay.installed_module.display || bay.installed_module.name || bay.installed_module.module_type?.model}
                            </div>
                            <div className="text-[10px] text-emerald-400/80 mt-0.5">
                              ID: {bay.installed_module.id} | สภาพ: ติดตั้งพร้อมใช้งาน
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveModule(bay)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded transition"
                          >
                            ถอดออก
                          </button>
                        </div>
                      ) : (
                        <div className={`mt-2 p-3 rounded-lg border border-dashed text-center text-xs transition ${
                          isHovered 
                            ? 'border-nds bg-nds/10 text-nds font-bold' 
                            : 'border-base-700 bg-base-950/40 text-ink-500'
                        }`}>
                          {isHovered ? 'วางการ์ดลงที่นี่เพื่อเสียบมอดูล!' : 'ช่องเสียบว่าง (ลากมอดูลมาวางเพื่อติดตั้ง)'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Module Type Details Modal */}
      {selectedModuleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-xl border border-base-700 bg-base-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-base-800 flex items-center justify-between bg-base-950">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-ink-100 font-mono">
                    {selectedModuleDetail.model}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded border border-nds/30 bg-nds/10 text-nds font-mono">
                    ID: {selectedModuleDetail.id}
                  </span>
                </div>
                <p className="text-xs text-ink-400 mt-0.5">
                  รายละเอียดข้อมูลและ พอร์ต (Ports / Interfaces) ของมอดูล
                </p>
              </div>
              <button
                onClick={handleCloseDetail}
                className="text-ink-400 hover:text-white text-lg font-bold px-2 py-1 rounded bg-base-800 hover:bg-base-700"
              >
                X
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Module Metadata Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg border border-base-800 bg-base-950/60 text-xs">
                <div>
                  <span className="text-ink-400 block mb-1">Manufacturer (ผู้ผลิต)</span>
                  <span className="font-semibold text-ink-100">{selectedModuleDetail.manufacturer?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-ink-400 block mb-1">Part Number</span>
                  <span className="font-semibold text-ink-100 font-mono">{selectedModuleDetail.part_number || '-'}</span>
                </div>
                <div>
                  <span className="text-ink-400 block mb-1">Total Ports</span>
                  <span className="font-semibold text-nds font-mono">{moduleInterfaces.length} Ports</span>
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <span className="text-ink-400 block mb-1">Description (คำอธิบาย)</span>
                  <span className="text-ink-200">{selectedModuleDetail.description || 'ไม่มีคำอธิบายเพิ่มเติม'}</span>
                </div>
              </div>

              {/* Ports Table */}
              <div>
                <h4 className="text-xs font-semibold text-nds uppercase tracking-wider mb-3">
                  รายการพอร์ตภายในมอดูล (Interface Templates)
                </h4>
                {loadingInterfaces ? (
                  <div className="p-8 text-center text-xs text-ink-400">กำลังโหลดรายการพอร์ต...</div>
                ) : moduleInterfaces.length === 0 ? (
                  <div className="p-8 text-center text-xs text-ink-400 border border-dashed border-base-800 rounded-lg">
                    ไม่พบรายการพอร์ตสำหรับมอดูลนี้
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-base-800 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-base-950 text-ink-400 border-b border-base-800">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">#</th>
                          <th className="py-2.5 px-3 font-semibold">Port Name</th>
                          <th className="py-2.5 px-3 font-semibold">Label</th>
                          <th className="py-2.5 px-3 font-semibold">Type</th>
                          <th className="py-2.5 px-3 font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-base-800/60 text-ink-200">
                        {moduleInterfaces.map((iface, idx) => (
                          <tr key={iface.id || idx} className="hover:bg-base-800/40 font-mono">
                            <td className="py-2 px-3 text-ink-500">{idx + 1}</td>
                            <td className="py-2 px-3 text-nds font-bold">{iface.name}</td>
                            <td className="py-2 px-3 text-ink-300">{iface.label || '-'}</td>
                            <td className="py-2 px-3 text-ink-100">
                              <span className="bg-base-800 px-2 py-0.5 rounded border border-base-700 text-[11px]">
                                {iface.type?.label || iface.type?.value || iface.type || '-'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-ink-400 text-[11px]">{iface.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-base-800 bg-base-950 flex justify-end">
              <button
                onClick={handleCloseDetail}
                className="px-4 py-1.5 text-xs font-semibold text-ink-200 bg-base-800 hover:bg-base-700 rounded transition"
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
