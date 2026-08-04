import { useState, useEffect, useMemo } from 'react';
import { ndsApi } from '../../api/nds.api.js';

export default function ReplaceDevicePage() {
  const [devices, setDevices] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Selection States
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedNewDeviceTypeId, setSelectedNewDeviceTypeId] = useState('');
  const [vlanifOption, setVlanifOption] = useState('vlanif115'); // 'vlanif115' | 'vlanif100' | 'both' | 'none'
  const [vlanifIpMode, setVlanifIpMode] = useState('existing'); // 'existing' | 'new'
  const [customVlanifIp, setCustomVlanifIp] = useState('');
  
  // Interfaces
  const [oldInterfaces, setOldInterfaces] = useState([]);
  const [newDeviceTypeTemplates, setNewDeviceTypeTemplates] = useState([]);
  const [loadingOldIfaces, setLoadingOldIfaces] = useState(false);
  const [loadingNewTemplates, setLoadingNewTemplates] = useState(false);
  
  const [interfaceMappings, setInterfaceMappings] = useState([]);
  
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [searchDevice, setSearchDevice] = useState('');
  const [searchDeviceType, setSearchDeviceType] = useState('');

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [devRes, dtRes] = await Promise.all([
        ndsApi.getDevices(),
        ndsApi.getDeviceTypes()
      ]);
      const rawDevs = devRes.data?.data || devRes.data || [];
      const rawDts = dtRes.data?.data || dtRes.data || [];
      setDevices(Array.isArray(rawDevs) ? rawDevs : []);
      setDeviceTypes(Array.isArray(rawDts) ? rawDts : []);
    } catch (err) {
      setErrorMessage('ไม่สามารถโหลดข้อมูลอุปกรณ์หรือ Model จากระบบได้');
    } finally {
      setLoading(false);
    }
  };

  // 1. เลือก Device ที่ต้องการเปลี่ยน Model
  const handleSelectDevice = async (deviceId) => {
    setSelectedDeviceId(deviceId);
    setLoadingOldIfaces(true);
    setErrorMessage('');
    setResult(null);
    try {
      const res = await ndsApi.getDeviceInterfaces(deviceId);
      const ifaces = res.data?.data || res.data || [];
      const parsedIfaces = Array.isArray(ifaces) ? ifaces : [];
      setOldInterfaces(parsedIfaces);
      generateMappings(parsedIfaces, newDeviceTypeTemplates);
    } catch (err) {
      setErrorMessage('ไม่สามารถโหลดรายการ Interface ของอุปกรณ์เดิมได้');
    } finally {
      setLoadingOldIfaces(false);
    }
  };

  // 2. เลือก Device Type (Model) ใหม่
  const handleSelectDeviceType = async (deviceTypeId) => {
    setSelectedNewDeviceTypeId(deviceTypeId);
    setLoadingNewTemplates(true);
    setErrorMessage('');
    setResult(null);
    try {
      const res = await ndsApi.getInterfaceTemplates(deviceTypeId);
      const templates = res.data?.data || res.data || [];
      const parsedTemplates = Array.isArray(templates) ? templates : [];
      setNewDeviceTypeTemplates(parsedTemplates);
      generateMappings(oldInterfaces, parsedTemplates);
    } catch (err) {
      setErrorMessage('ไม่สามารถโหลด Port Templates ของ Model ใหม่ได้');
    } finally {
      setLoadingNewTemplates(false);
    }
  };

  // 3. คำนวณการจับคู่อัตโนมัติ (Auto Match - กรองเอาเฉพาะ Physical Interfaces)
  const generateMappings = (oldIfaces, targetTemplates) => {
    if (!oldIfaces.length) return;
    
    // กรองพวก Virtual Interface เช่น Vlanif, Loopback, Bridge, LAG ออก ไม่ให้แสดงในตารางย้าย Interface
    const physicalOnly = oldIfaces.filter(oldIf => {
      const nameLower = (oldIf.name || '').toLowerCase();
      const typeLower = (oldIf.type?.value || oldIf.type?.label || oldIf.type || '').toLowerCase();
      const isVirtual = ['virtual', 'loopback', 'bridge', 'lag', 'vlan'].some(x => typeLower.includes(x) || nameLower.includes(x));
      return !isVirtual;
    });

    const mappings = physicalOnly.map(oldIf => {
      // ลองค้นหาชื่อพอร์ตตรงกันจาก Model ใหม่
      const matchingTemplate = targetTemplates.find(tmpl => tmpl.name === oldIf.name);
      
      return {
        oldInterfaceId: oldIf.id,
        oldInterfaceName: oldIf.name,
        newInterfaceName: matchingTemplate ? matchingTemplate.name : (targetTemplates[0]?.name || oldIf.name),
        selected: true, // ค่าเริ่มต้นเลือก Physical Interface ทั้งหมด
        description: oldIf.description || '',
        type: oldIf.type?.label || oldIf.type?.value || 'Physical',
        untagged_vlan: oldIf.untagged_vlan?.vid ? `VLAN ${oldIf.untagged_vlan.vid}` : null
      };
    });
    setInterfaceMappings(mappings);
  };

  const toggleMappingSelection = (index) => {
    const newMappings = [...interfaceMappings];
    newMappings[index].selected = !newMappings[index].selected;
    setInterfaceMappings(newMappings);
  };

  const updateMappingTarget = (index, targetName) => {
    const newMappings = [...interfaceMappings];
    newMappings[index].newInterfaceName = targetName;
    newMappings[index].selected = !!targetName;
    setInterfaceMappings(newMappings);
  };

  const selectAllPhysical = (select) => {
    setInterfaceMappings(interfaceMappings.map(m => (!m.isVirtual ? { ...m, selected: select } : m)));
  };

  const deselectAll = () => {
    setInterfaceMappings(interfaceMappings.map(m => ({ ...m, selected: false })));
  };

  const handleExecute = async () => {
    const selectedMappings = interfaceMappings.filter(m => m.selected && m.newInterfaceName);
    if (!selectedDeviceId) {
      alert('กรุณาเลือกอุปกรณ์ที่ต้องการเปลี่ยน Model');
      return;
    }
    if (!selectedNewDeviceTypeId) {
      alert('กรุณาเลือก Model ใหม่ที่ต้องการเปลี่ยนไปใช้');
      return;
    }
    if (selectedMappings.length === 0) {
      alert('กรุณาเลือกอย่างน้อย 1 Interface ที่ต้องการย้าย');
      return;
    }
    if (vlanifIpMode === 'new' && (!customVlanifIp || !customVlanifIp.trim())) {
      alert('กรุณาระบุ IP Address สำหรับ Vlanif ใหม่ (เช่น 10.100.1.1/24)');
      return;
    }

    const currentDev = devices.find(d => String(d.id) === String(selectedDeviceId));
    const targetDt = deviceTypes.find(dt => String(dt.id) === String(selectedNewDeviceTypeId));

    const confirmMsg = `ยืนยันการเปลี่ยน Model อุปกรณ์ "${currentDev?.name || selectedDeviceId}" เป็น "${targetDt?.model || targetDt?.display || selectedNewDeviceTypeId}" พร้อมย้ายข้อมูล ${selectedMappings.length} พอร์ต?`;
    if (!window.confirm(confirmMsg)) return;

    setExecuting(true);
    setErrorMessage('');
    setResult(null);

    try {
      const res = await ndsApi.replaceDevice({
        deviceId: selectedDeviceId,
        newDeviceTypeId: selectedNewDeviceTypeId,
        vlanifOption: vlanifOption,
        vlanifIpMode: vlanifIpMode,
        customVlanifIp: customVlanifIp,
        interfaceMappings: selectedMappings.map(m => ({
          oldInterfaceId: m.oldInterfaceId,
          newInterfaceName: m.newInterfaceName
        }))
      });
      setResult(res.data?.data || res.data || { success: true, message: 'เปลี่ยน Model เรียบร้อยแล้ว' });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเปลี่ยน Model อุปกรณ์');
    } finally {
      setExecuting(false);
    }
  };

  const filteredDevices = useMemo(() => {
    if (!searchDevice) return devices;
    const lower = searchDevice.toLowerCase();
    return devices.filter(d => 
      d.name?.toLowerCase().includes(lower) || 
      d.site_name?.toLowerCase().includes(lower) || 
      d.ip?.toLowerCase().includes(lower) ||
      d.nodeid?.toLowerCase().includes(lower)
    );
  }, [devices, searchDevice]);

  const filteredDeviceTypes = useMemo(() => {
    if (!searchDeviceType) return deviceTypes;
    const lower = searchDeviceType.toLowerCase();
    return deviceTypes.filter(dt => 
      (dt.model || dt.display || '').toLowerCase().includes(lower) ||
      (dt.manufacturer?.name || dt.manufacturer || '').toLowerCase().includes(lower)
    );
  }, [deviceTypes, searchDeviceType]);

  const selectedDeviceDetails = useMemo(() => devices.find(d => String(d.id) === String(selectedDeviceId)), [devices, selectedDeviceId]);
  const selectedDeviceTypeDetails = useMemo(() => deviceTypes.find(dt => String(dt.id) === String(selectedNewDeviceTypeId)), [deviceTypes, selectedNewDeviceTypeId]);

  const physicalMappings = interfaceMappings.filter(m => !m.isVirtual);
  const virtualMappings = interfaceMappings.filter(m => m.isVirtual);
  const selectedCount = interfaceMappings.filter(m => m.selected && m.newInterfaceName).length;

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="rounded-xl border border-nds/20 bg-base-800/60 p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink-100 flex items-center gap-2">
              <span className="text-nds">⚙️</span> Device Replace Model (เปลี่ยนรุ่นอุปกรณ์)
            </h2>
            <p className="mt-1 text-sm text-ink-400">
              เปลี่ยนรุ่นอุปกรณ์ (Device Type) บนอุปกรณ์เดิม โดยรักษาชื่อเครื่อง IP Address และการตั้งค่า Interface (VLAN, Description) ให้ย้ายไปอยู่ตามพอร์ตของ Model ใหม่
            </p>
          </div>
          <button 
            onClick={loadInitialData}
            className="inline-flex items-center gap-2 rounded-lg bg-base-700 px-4 py-2 text-sm font-medium text-ink-200 hover:bg-base-600 transition"
            disabled={loading}
          >
            {loading ? 'กำลังโหลด...' : 'รีโหลดข้อมูล'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-red-500/10 p-4 border border-red-500/30">
          <p className="text-sm text-red-400 font-medium">⚠️ {errorMessage}</p>
        </div>
      )}

      {/* Step 1 & Step 2: Selection Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Select Existing Device */}
        <div className="rounded-xl border border-base-700 bg-base-800/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-nds tracking-wider uppercase flex items-center gap-2">
              <span>1. เลือกอุปกรณ์ที่ต้องการเปลี่ยน Model</span>
            </h3>
            {loadingOldIfaces && <span className="text-xs text-nds animate-pulse">กำลังโหลด Interfaces...</span>}
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="ค้นหาอุปกรณ์ (ชื่อ / Node ID / IP / Site)..."
              value={searchDevice}
              onChange={(e) => setSearchDevice(e.target.value)}
              className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 placeholder-ink-600 focus:border-nds focus:outline-none"
            />
            <select
              value={selectedDeviceId}
              onChange={(e) => handleSelectDevice(e.target.value)}
              className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
            >
              <option value="">-- เลือกอุปกรณ์ ({filteredDevices.length} รายการ) --</option>
              {filteredDevices.map(dev => (
                <option key={dev.id} value={dev.id}>
                  {dev.name} {dev.site_name ? `(${dev.site_name})` : ''} - Model: {dev.device_type?.model || dev.type || 'N/A'}
                </option>
              ))}
            </select>
          </div>

          {selectedDeviceDetails && (
            <div className="rounded-lg border border-base-700 bg-base-900/60 p-4 text-xs space-y-2 font-mono">
              <div className="flex justify-between border-b border-base-700 pb-1">
                <span className="text-ink-400">Device Name:</span>
                <span className="text-ink-100 font-bold">{selectedDeviceDetails.name}</span>
              </div>
              <div className="flex justify-between border-b border-base-700 pb-1">
                <span className="text-ink-400">Current Model:</span>
                <span className="text-amber-400 font-bold">{selectedDeviceDetails.device_type?.model || selectedDeviceDetails.type || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-base-700 pb-1">
                <span className="text-ink-400">Primary IP / Site:</span>
                <span className="text-ink-100">{selectedDeviceDetails.ip || 'N/A'} ({selectedDeviceDetails.site_name || 'N/A'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-400">Total Interfaces:</span>
                <span className="text-nds font-bold">{oldInterfaces.length} พอร์ต</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Card: Select Target New Device Type (Model) */}
        <div className="rounded-xl border border-base-700 bg-base-800/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-green-400 tracking-wider uppercase flex items-center gap-2">
              <span>2. เลือก Model (Device Type) ใหม่</span>
            </h3>
            {loadingNewTemplates && <span className="text-xs text-green-400 animate-pulse">กำลังโหลด Port Templates...</span>}
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="ค้นหา Model ใหม่ (ชื่อรุ่น / Manufacturer)..."
              value={searchDeviceType}
              onChange={(e) => setSearchDeviceType(e.target.value)}
              className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-xs text-ink-100 placeholder-ink-600 focus:border-green-500 focus:outline-none"
            />
            <select
              value={selectedNewDeviceTypeId}
              onChange={(e) => handleSelectDeviceType(e.target.value)}
              className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-green-500 focus:outline-none"
            >
              <option value="">-- เลือก Model ใหม่ที่ต้องการเปลี่ยนไปใช้ ({filteredDeviceTypes.length}) --</option>
              {filteredDeviceTypes.map(dt => (
                <option key={dt.id} value={dt.id}>
                  {dt.model || dt.display} ({dt.manufacturer?.name || dt.manufacturer || 'Generic'})
                </option>
              ))}
            </select>
          </div>

          {selectedDeviceTypeDetails && (
            <div className="rounded-lg border border-base-700 bg-base-900/60 p-4 text-xs space-y-3 font-mono">
              <div className="flex justify-between border-b border-base-700 pb-1">
                <span className="text-ink-400">Target Model:</span>
                <span className="text-green-400 font-bold">{selectedDeviceTypeDetails.model || selectedDeviceTypeDetails.display}</span>
              </div>
              <div className="flex justify-between border-b border-base-700 pb-1">
                <span className="text-ink-400">Manufacturer:</span>
                <span className="text-ink-100">{selectedDeviceTypeDetails.manufacturer?.name || selectedDeviceTypeDetails.manufacturer || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-base-700 pb-1">
                <span className="text-ink-400">Port Templates ของ Model ใหม่:</span>
                <span className="text-green-400 font-bold">{newDeviceTypeTemplates.length} พอร์ต</span>
              </div>

              {/* Vlanif Interface Selection */}
              <div className="pt-2 space-y-3 font-sans">
                <span className="block text-ink-200 font-semibold">เลือกประเภท Virtual Interface สำหรับ Model ใหม่:</span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer font-bold text-sm transition ${vlanifOption === 'vlanif100' ? 'border-nds bg-nds/15 text-nds shadow-md' : 'border-base-700 bg-base-950 text-ink-400 hover:border-base-600'}`}>
                    <input
                      type="radio"
                      name="vlanifOpt"
                      value="vlanif100"
                      checked={vlanifOption === 'vlanif100'}
                      onChange={(e) => setVlanifOption(e.target.value)}
                      className="text-nds focus:ring-nds"
                    />
                    <span>Vlanif100</span>
                  </label>

                  <label className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer font-bold text-sm transition ${vlanifOption === 'vlanif115' ? 'border-nds bg-nds/15 text-nds shadow-md' : 'border-base-700 bg-base-950 text-ink-400 hover:border-base-600'}`}>
                    <input
                      type="radio"
                      name="vlanifOpt"
                      value="vlanif115"
                      checked={vlanifOption === 'vlanif115'}
                      onChange={(e) => setVlanifOption(e.target.value)}
                      className="text-nds focus:ring-nds"
                    />
                    <span>Vlanif115</span>
                  </label>
                </div>

                {/* IP Mode Selection (ใช้ IP เดิม vs ระบุ IP ใหม่) */}
                <div className="pt-2 border-t border-base-700/60 space-y-2">
                  <span className="block text-xs font-semibold text-ink-200">การตั้งค่า IP Address ของ {vlanifOption === 'vlanif100' ? 'Vlanif100' : 'Vlanif115'}:</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${vlanifIpMode === 'existing' ? 'border-nds/60 bg-nds/10 text-nds font-medium' : 'border-base-700 bg-base-950 text-ink-400 hover:border-base-600'}`}>
                      <input
                        type="radio"
                        name="vlanifIpMode"
                        value="existing"
                        checked={vlanifIpMode === 'existing'}
                        onChange={(e) => setVlanifIpMode(e.target.value)}
                        className="text-nds focus:ring-nds"
                      />
                      <span>ย้าย IP VLAN เดิม</span>
                    </label>

                    <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${vlanifIpMode === 'new' ? 'border-nds/60 bg-nds/10 text-nds font-medium' : 'border-base-700 bg-base-950 text-ink-400 hover:border-base-600'}`}>
                      <input
                        type="radio"
                        name="vlanifIpMode"
                        value="new"
                        checked={vlanifIpMode === 'new'}
                        onChange={(e) => setVlanifIpMode(e.target.value)}
                        className="text-nds focus:ring-nds"
                      />
                      <span>ระบุ IP VLAN ใหม่</span>
                    </label>
                  </div>

                  {vlanifIpMode === 'existing' && (
                    <div className="mt-2 p-3 rounded-lg bg-base-950 border border-base-700 space-y-1">
                      <span className="block text-[11px] font-semibold text-nds font-sans">ข้อมูล IP / Interface VLAN เดิมของอุปกรณ์:</span>
                      {(() => {
                        const existingVlanifs = oldInterfaces.filter(i => (i.name || '').toLowerCase().includes('vlan'));
                        if (existingVlanifs.length === 0) {
                          return <p className="text-[11px] text-ink-400 font-mono">- ไม่พบ Virtual Interface / Vlanif เดิมบนอุปกรณ์นี้</p>;
                        }
                        return (
                          <div className="space-y-1 font-mono text-[11px]">
                            {existingVlanifs.map(vif => {
                              const ipList = vif.ip_addresses?.map(ip => ip.address || ip) || (vif.ip_address ? [vif.ip_address] : []);
                              const ipStr = ipList.length > 0 ? ipList.join(', ') : 'ไม่มี IP Address ผูกอยู่';
                              return (
                                <div key={vif.id || vif.name} className="flex items-center justify-between text-ink-200 bg-base-900 px-2 py-1 rounded border border-base-800">
                                  <span className="font-bold text-amber-400">{vif.name}</span>
                                  <span className="text-emerald-400 font-semibold">{ipStr}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {vlanifIpMode === 'new' && (
                    <div className="mt-2 space-y-1">
                      <label className="block text-[11px] font-semibold text-emerald-400">กรอก IP Address ใหม่ (พร้อม Subnet Mask / CIDR):</label>
                      <input
                        type="text"
                        placeholder="เช่น 10.120.5.1/24"
                        value={customVlanifIp}
                        onChange={(e) => setCustomVlanifIp(e.target.value)}
                        className="w-full rounded-lg border border-emerald-500/50 bg-base-950 px-3 py-2 text-xs font-mono text-ink-100 placeholder-ink-600 focus:border-emerald-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-ink-400">ระบบจะสร้างและผูก IP ใหม่นี้เข้ากับ {vlanifOption === 'vlanif100' ? 'Vlanif100' : 'Vlanif115'} บน NetBox โดยอัตโนมัติ</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Interface Mapping Area */}
      {selectedDeviceId && selectedNewDeviceTypeId && (
        <div className="rounded-xl border border-base-700 bg-base-800/40 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-base-700 pb-4">
            <div>
              <h3 className="text-base font-bold text-ink-100 flex items-center gap-2">
                <span>🔀</span> จับคู่การย้าย Interface ({selectedCount} / {interfaceMappings.length} พอร์ตถูกเลือก)
              </h3>
              <p className="text-xs text-ink-400 mt-0.5">
                เลือกพอร์ตบน Model ใหม่ที่จะรองรับข้อมูล (Description/VLAN/IP) จากพอร์ตของอุปกรณ์เดิม
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => selectAllPhysical(true)}
                className="rounded bg-base-700 px-3 py-1.5 text-xs text-ink-200 hover:bg-base-600 transition"
              >
                เลือก Physical ทั้งหมด
              </button>
              <button
                onClick={deselectAll}
                className="rounded bg-base-700 px-3 py-1.5 text-xs text-ink-200 hover:bg-base-600 transition"
              >
                ยกเลิกทั้งหมด
              </button>
            </div>
          </div>

          {/* Physical Interfaces Table */}
          <div className="space-y-2">
            <div className="overflow-x-auto rounded-lg border border-base-700 bg-base-950">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-base-900/80 text-ink-400 border-b border-base-700">
                  <tr>
                    <th className="p-3 text-center w-10">เลือก</th>
                    <th className="p-3">Physical Interface เดิม</th>
                    <th className="p-3">รายละเอียดเดิม (Description / Config)</th>
                    <th className="p-3 text-center w-12">➡️</th>
                    <th className="p-3">ตกพอร์ตปลายทางบน Model ใหม่</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-800">
                  {interfaceMappings.map((m, globalIdx) => {
                    return (
                      <tr key={m.oldInterfaceId} className={m.selected ? 'bg-nds/5' : 'opacity-60'}>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={m.selected}
                            onChange={() => toggleMappingSelection(globalIdx)}
                            className="rounded border-base-600 bg-base-900 text-nds focus:ring-nds"
                          />
                        </td>
                        <td className="p-3 font-bold text-ink-100">
                          {m.oldInterfaceName}
                          <span className="block text-[10px] text-ink-600 font-normal">{m.type}</span>
                        </td>
                        <td className="p-3 text-ink-400">
                          {m.description ? <span className="text-ink-200">{m.description}</span> : <span className="text-ink-600">-</span>}
                          {m.untagged_vlan && <span className="ml-2 rounded bg-base-800 px-1.5 py-0.5 text-[10px] text-amber-400">{m.untagged_vlan}</span>}
                        </td>
                        <td className="p-3 text-center text-ink-600">➔</td>
                        <td className="p-3">
                          <select
                            value={m.newInterfaceName}
                            onChange={(e) => updateMappingTarget(globalIdx, e.target.value)}
                            disabled={!m.selected}
                            className="w-full rounded border border-base-600 bg-base-900 px-2 py-1 text-xs text-green-400 focus:border-green-500 focus:outline-none disabled:opacity-50"
                          >
                            <option value="">-- เลือกพอร์ตของ Model ใหม่ --</option>
                            {newDeviceTypeTemplates.map(tmpl => (
                              <option key={tmpl.id || tmpl.name} value={tmpl.name}>
                                {tmpl.name} ({tmpl.type?.label || tmpl.type || 'Port'})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Execution Action Button */}
          <div className="pt-4 flex items-center justify-between border-t border-base-700">
            <div className="text-xs text-ink-400">
              พร้อมเปลี่ยน Model อุปกรณ์เป็น <span className="text-green-400 font-bold">{selectedDeviceTypeDetails?.model}</span> (เลือกไว้ {selectedCount} พอร์ต)
            </div>
            <button
              onClick={handleExecute}
              disabled={executing || selectedCount === 0}
              className="rounded-lg bg-nds px-6 py-2.5 text-sm font-semibold text-base-950 hover:bg-nds/90 disabled:opacity-50 transition shadow-lg shadow-nds/20"
            >
              {executing ? 'กำลังดำเนินการเปลี่ยน Model...' : 'ยืนยันเปลี่ยน Model อุปกรณ์ (Execute Replace)'}
            </button>
          </div>
        </div>
      )}

      {/* Migration Results Banner */}
      {result && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 space-y-4">
          <h3 className="text-base font-bold text-green-400 flex items-center gap-2">
            <span>✅</span> เปลี่ยน Model อุปกรณ์สำเร็จ! (Replace Model Completed)
          </h3>
          <div className="space-y-2 text-xs font-mono">
            {result.migrated?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between rounded bg-base-900/60 p-2 text-ink-200">
                <span>ย้ายพอร์ต <strong className="text-ink-100">{item.oldInterface}</strong> ➔ <strong className="text-green-400">{item.newInterface}</strong></span>
                <span className="text-ink-400">IPs: {item.ipsTransferred} | Config: {item.propertiesCopied?.length || 0} รายการ</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
