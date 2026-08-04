import { useState, useEffect, useRef } from 'react';
import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';

export default function SyncInterfacesPage() {
  const [devices, setDevices] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchModelQuery, setSearchModelQuery] = useState('');
  const [selectedDeviceType, setSelectedDeviceType] = useState('');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncMode, setSyncMode] = useState('add_missing');
  const [removeUnused, setRemoveUnused] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Progress tracking state
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, currentDeviceName: '' });
  const abortRef = useRef(false);

  const loadData = async () => {
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
      console.error('Error fetching devices/device-types:', err);
      setErrorMessage(err.response?.data?.message || 'ไม่สามารถโหลดข้อมูลอุปกรณ์จาก NetBox ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter device types by searchModelQuery
  const filteredDeviceTypes = deviceTypes.filter(dt => {
    if (!searchModelQuery) return true;
    const model = (dt.model || dt.display || '').toLowerCase();
    const mfg = (dt.manufacturer?.name || '').toLowerCase();
    const q = searchModelQuery.toLowerCase();
    return model.includes(q) || mfg.includes(q);
  });

  // Filter devices
  const filteredDevices = devices.filter(dev => {
    if (!dev) return false;
    
    // 1. Check Model filter (if selected)
    if (selectedDeviceType) {
      const target = String(selectedDeviceType).toLowerCase();
      const devTypeObj = dev.device_type;
      const devTypeId = devTypeObj?.id ? String(devTypeObj.id) : (dev.device_type_id ? String(dev.device_type_id) : '');
      const devTypeModel = (devTypeObj?.model || devTypeObj?.display || dev.type || (typeof devTypeObj === 'string' ? devTypeObj : '')).toLowerCase();
      const devTypeSlug = (devTypeObj?.slug || '').toLowerCase();

      const matchType = devTypeId === target || devTypeModel === target || devTypeSlug === target;
      if (!matchType) return false;
    }
    
    // 2. Check Device Search Query (Name / IP / Site / Node ID / Model)
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const name = (dev.name || '').toLowerCase();
      const display = (dev.display || '').toLowerCase();
      const ip = (dev.ip || dev.primary_ip4 || '').toLowerCase();
      const site = (dev.site_name || dev.site || '').toLowerCase();
      const nodeId = (dev.nodeid || '').toLowerCase();
      const model = (dev.device_type?.model || dev.type || '').toLowerCase();

      const matchSearch = name.includes(q) || display.includes(q) || ip.includes(q) || site.includes(q) || nodeId.includes(q) || model.includes(q);
      if (!matchSearch) return false;
    }

    return true;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedDeviceIds(filteredDevices.map(d => d.id));
    } else {
      setSelectedDeviceIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedDeviceIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleRunSync = async () => {
    if (selectedDeviceIds.length === 0) {
      alert('กรุณาเลือกอย่างน้อย 1 อุปกรณ์ที่ต้องการซิงค์');
      return;
    }

    const confirmMsg = `ยืนยันการซิงค์ Interface สำหรับ ${selectedDeviceIds.length} อุปกรณ์กับ NetBox?`;
    if (!window.confirm(confirmMsg)) return;

    setSyncing(true);
    setSyncLogs(null);
    setErrorMessage('');
    abortRef.current = false;

    const total = selectedDeviceIds.length;
    setSyncProgress({ current: 0, total, currentDeviceName: 'กำลังเริ่มต้น...' });

    const allResults = [];

    for (let i = 0; i < total; i++) {
      if (abortRef.current) break;

      const deviceId = selectedDeviceIds[i];
      // Find device name for progress display
      const deviceInfo = devices.find(d => d.id === deviceId);
      const deviceName = deviceInfo?.name || deviceInfo?.display || `Device ID: ${deviceId}`;

      setSyncProgress({ current: i, total, currentDeviceName: deviceName });

      try {
        const payload = {
          deviceIds: [deviceId],
          mode: syncMode,
          removeUnused: removeUnused
        };
        const res = await ndsApi.syncDeviceInterfaces(payload);
        const logs = res.data?.data || res.data || [];
        const deviceLogs = Array.isArray(logs) ? logs : [logs];
        allResults.push(...deviceLogs);
      } catch (err) {
        console.error(`Error syncing device ${deviceName}:`, err);
        // Extract detailed error message
        const errMsg = err.response?.data?.message 
          || err.response?.data?.error 
          || err.message 
          || 'Unknown error';
        allResults.push({
          deviceName: deviceName,
          deviceTypeName: deviceInfo?.device_type?.model || deviceInfo?.device_type?.display || '-',
          success: false,
          error: errMsg,
          added: [],
          updated: [],
          deleted: [],
          skipped: []
        });
      }

      // Update logs in real-time
      setSyncLogs([...allResults]);
    }

    // Final progress
    setSyncProgress({ current: total, total, currentDeviceName: 'เสร็จสิ้น' });

    const failedCount = allResults.filter(r => r.success === false).length;
    const successCount = allResults.length - failedCount;

    if (failedCount > 0) {
      setErrorMessage(`ซิงค์เสร็จสิ้น: สำเร็จ ${successCount} / ล้มเหลว ${failedCount} จากทั้งหมด ${allResults.length} อุปกรณ์`);
    }

    setSyncing(false);
  };

  const handleAbortSync = () => {
    abortRef.current = true;
  };

  const progressPercent = syncProgress.total > 0 
    ? Math.round((syncProgress.current / syncProgress.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
        {/* Header Title & Summary */}
        <div className="rounded-xl border border-nds/20 bg-base-800/60 p-6 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-ink-100 flex items-center gap-2">
                Bulk Sync Device Interfaces with NetBox Model
              </h2>
              <p className="mt-1 text-sm text-ink-400">
                ซิงค์และอัปเดตพอร์ต (Interfaces) ของ Devices ในระบบ NetBox ให้ตรงตาม Interface Templates ล่าสุดของ Model (Device Type)
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={loading || syncing}
              className="inline-flex items-center gap-2 rounded-lg bg-base-700 px-4 py-2 text-sm font-medium text-ink-200 hover:bg-base-600 transition"
            >
              โหลดข้อมูลใหม่
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        {/* Progress Bar (visible during sync) */}
        {syncing && (
          <div className="rounded-xl border border-nds/30 bg-base-800/80 p-5 space-y-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-nds flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-nds animate-pulse" />
                กำลัง Sync...
              </h3>
              <button
                onClick={handleAbortSync}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 transition"
              >
                ยกเลิก
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 rounded-full bg-base-900 overflow-hidden border border-base-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-nds/80 to-nds transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-sm font-bold text-ink-100 tabular-nums min-w-[4rem] text-right">
                {syncProgress.current} / {syncProgress.total}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-ink-400">
              <span>
                กำลังประมวลผล: <span className="text-ink-200 font-medium">{syncProgress.currentDeviceName}</span>
              </span>
              <span>{progressPercent}%</span>
            </div>
          </div>
        )}

        {/* Sync Controls Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Filter Card */}
          <div className="rounded-xl border border-base-700 bg-base-800/40 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-nds tracking-wider uppercase">1. ค้นหา & กรองอุปกรณ์</h3>
            
            {/* Primary Device Search */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1">ค้นหาตามชื่อ / IP ของ Device (ค้นหาได้ทันที)</label>
              <input
                type="text"
                placeholder="พิมพ์ชื่ออุปกรณ์ หรือ IP Address เพื่อค้นหา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-nds/50 bg-base-900 px-3 py-2 text-sm text-ink-100 placeholder-ink-600 focus:border-nds focus:outline-none"
              />
            </div>

            {/* Optional Filter by Model */}
            <div className="space-y-2 pt-2 border-t border-base-700/60">
              <label className="block text-xs text-ink-400">กรองเพิ่มเติมตาม Model (Optional Filter)</label>
              <input
                type="text"
                placeholder="พิมพ์เพื่อกรองตาม Model..."
                value={searchModelQuery}
                onChange={(e) => setSearchModelQuery(e.target.value)}
                className="w-full rounded-lg border border-base-600 bg-base-900 px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:border-nds focus:outline-none"
              />
              <select
                value={selectedDeviceType}
                onChange={(e) => {
                  setSelectedDeviceType(e.target.value);
                  setSelectedDeviceIds([]);
                }}
                className="w-full rounded-lg border border-base-600 bg-base-900 px-3 py-2 text-xs text-ink-100 focus:border-nds focus:outline-none"
              >
                <option value="">-- แสดงอุปกรณ์ทุก Model ({filteredDeviceTypes.length}) --</option>
                {filteredDeviceTypes.map(dt => {
                  const val = dt.id || dt.model || dt.display;
                  return (
                    <option key={dt.id || dt.model} value={val}>
                      {dt.model || dt.display} ({dt.manufacturer?.name || 'Generic'})
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedDeviceType && (
              <button
                onClick={() => setSelectedDeviceIds(filteredDevices.map(d => d.id))}
                className="w-full rounded-lg border border-nds/40 bg-nds/10 px-3 py-1.5 text-xs font-medium text-nds hover:bg-nds/20 transition flex items-center justify-center gap-1.5"
              >
                เลือกทุก Device ที่ตรงกับตัวกรอง ({filteredDevices.length} เครื่อง)
              </button>
            )}
          </div>

          {/* Sync Options Card */}
          <div className="rounded-xl border border-base-700 bg-base-800/40 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-nds tracking-wider uppercase">2. ตั้งค่ารูปแบบการ Sync</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="syncMode"
                  value="add_missing"
                  checked={syncMode === 'add_missing'}
                  onChange={() => setSyncMode('add_missing')}
                  className="mt-1 accent-nds"
                />
                <div>
                  <span className="text-sm font-medium text-ink-100">Add Missing Only (ปลอดภัยที่สุด)</span>
                  <p className="text-xs text-ink-400">สร้างเฉพาะพอร์ตใหม่ที่เพิ่มเข้ามาใน Device Type โดยไม่แตะต้องพอร์ตเดิม</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="syncMode"
                  value="force_override"
                  checked={syncMode === 'force_override'}
                  onChange={() => setSyncMode('force_override')}
                  className="mt-1 accent-nds"
                />
                <div>
                  <span className="text-sm font-medium text-ink-100">Sync & Update Interface Types</span>
                  <p className="text-xs text-ink-400">เพิ่มพอร์ตใหม่ + ปรับเปลี่ยน Type (เช่น 1GE -&gt; 10GE) ของพอร์ตเดิมให้ตรง Model</p>
                </div>
              </label>

              <div className="pt-2 border-t border-base-700/50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removeUnused}
                    onChange={(e) => setRemoveUnused(e.target.checked)}
                    className="accent-red-500 rounded"
                  />
                  <span className="text-xs text-red-400">ลบ Interface ที่ไม่มีใน Device Type ออกด้วย (ใช้ความระมัดระวัง)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Card */}
          <div className="rounded-xl border border-base-700 bg-base-800/40 p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-nds tracking-wider uppercase">3. ดำเนินการ</h3>
              <p className="mt-2 text-xs text-ink-300">
                กดเลือกอุปกรณ์ตาม Model Type แล้วกดเริ่มการอัปเดตข้อมูลไปยัง NetBox
              </p>
              <div className="mt-4 rounded-lg bg-base-900/80 p-3 text-center border border-base-700">
                <span className="text-xs text-ink-400">เลือกแล้ว</span>
                <div className="text-2xl font-bold text-nds">{selectedDeviceIds.length} / {filteredDevices.length}</div>
                <span className="text-xs text-ink-400">อุปกรณ์</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={handleRunSync}
                disabled={syncing || selectedDeviceIds.length === 0}
                className="w-full rounded-lg bg-nds px-4 py-3 font-semibold text-base-950 hover:bg-nds/90 disabled:opacity-50 transition shadow-lg shadow-nds/20 flex items-center justify-center gap-2"
              >
                {syncing ? (
                  <>
                    กำลัง Sync... ({syncProgress.current}/{syncProgress.total})
                  </>
                ) : (
                  <>
                    อัปเดต Interface อุปกรณ์ที่เลือก ({selectedDeviceIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Devices Table */}
        <div className="rounded-xl border border-base-700 bg-base-800/60 overflow-hidden backdrop-blur-md">
          <div className="p-4 bg-base-800/80 border-b border-base-700 flex items-center justify-between">
            <span className="text-sm font-medium text-ink-200">
              รายการ Devices ใน NetBox ({filteredDevices.length} รายการ)
            </span>
            {filteredDevices.length > 0 && (
              <span className="text-xs text-ink-400">
                เลือกเพื่อเตรียม Sync
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-ink-400">กำลังโหลดรายการอุปกรณ์จาก NetBox...</div>
          ) : filteredDevices.length === 0 ? (
            <div className="p-12 text-center text-ink-400">ไม่พบข้อมูลอุปกรณ์ตามเงื่อนไขที่เลือก</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-ink-200">
                <thead className="bg-base-900/60 text-xs uppercase tracking-wider text-ink-400 border-b border-base-700">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedDeviceIds.length === filteredDevices.length && filteredDevices.length > 0}
                        onChange={handleSelectAll}
                        className="accent-nds rounded"
                      />
                    </th>
                    <th className="p-4">ชื่อ Device</th>
                    <th className="p-4">Model Type (Device Type)</th>
                    <th className="p-4">Site / Location</th>
                    <th className="p-4">Primary IP</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-700/50">
                  {filteredDevices.map(dev => {
                    const isSelected = selectedDeviceIds.includes(dev.id);
                    return (
                      <tr
                        key={dev.id}
                        onClick={() => handleToggleSelect(dev.id)}
                        className={`cursor-pointer transition hover:bg-base-700/40 ${isSelected ? 'bg-nds/5' : ''}`}
                      >
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(dev.id)}
                            className="accent-nds rounded"
                          />
                        </td>
                        <td className="p-4 font-semibold text-ink-100">
                          {dev.name || dev.display || `- (ID: ${dev.id})`}
                        </td>
                        <td className="p-4">
                          <span className="inline-block rounded bg-base-700 px-2 py-0.5 text-xs text-nds font-mono">
                            {dev.device_type?.model || dev.device_type?.display || dev.device_type || '-'}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-ink-300">
                          {dev.site?.name || dev.site?.display || '-'}
                        </td>
                        <td className="p-4 font-mono text-xs text-ink-300">
                          {dev.ip && dev.ip !== 'N/A' 
                            ? dev.ip 
                            : (dev.primary_ip4?.address || dev.primary_ip4 || dev.primary_ip?.address || dev.primary_ip || '-')}
                        </td>
                        <td className="p-4 text-xs">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            dev.status?.value === 'active' || dev.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {dev.status?.label || dev.status?.value || dev.status || 'active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sync Logs Result Section */}
        {syncLogs && (
          <div className="rounded-xl border border-emerald-500/30 bg-base-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-bold text-emerald-400 flex items-center gap-2">
                ผลลัพธ์การ Sync กับ NetBox (Sync Summary)
              </h3>
              {/* Summary counters */}
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-emerald-400 font-medium">
                  ✓ สำเร็จ {syncLogs.filter(l => l.success !== false).length}
                </span>
                {syncLogs.filter(l => l.success === false).length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-red-400 font-medium">
                    ✗ ล้มเหลว {syncLogs.filter(l => l.success === false).length}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-2">
              {syncLogs.map((log, idx) => (
                <div key={idx} className={`rounded-lg border p-4 font-mono text-xs ${
                  log.success === false
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-base-700 bg-base-800/80'
                }`}>
                  <div className="flex items-center justify-between border-b border-base-700 pb-2 mb-2">
                    <span className="font-bold text-ink-100 text-sm flex items-center gap-2">
                      {log.success === false ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                      ) : (
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                      {log.deviceName}
                    </span>
                    <span className="text-nds">{log.deviceTypeName}</span>
                  </div>

                  {/* Error message for failed devices */}
                  {log.success === false && log.error && (
                    <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 mb-2 text-red-400 flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">⚠</span>
                      <div>
                        <div className="font-semibold text-red-300 mb-0.5">Sync ล้มเหลว</div>
                        <div className="text-red-400/90 break-all">{log.error}</div>
                      </div>
                    </div>
                  )}

                  {/* Success details */}
                  {log.success !== false && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="text-emerald-400">
                        เพิ่มใหม่ ({log.added?.length || 0}): {log.added?.join(', ') || 'ไม่มี'}
                      </div>
                      <div className="text-amber-400">
                        อัปเดตพอร์ต ({log.updated?.length || 0}): {log.updated?.join(', ') || 'ไม่มี'}
                      </div>
                      <div className="text-ink-400">
                        ข้าม/ตรงอยู่แล้ว ({log.skipped?.length || 0}) พอร์ต
                      </div>
                    </div>
                  )}
                  {log.deleted && log.deleted.length > 0 && (
                    <div className="mt-2 text-red-400 border-t border-base-700/50 pt-1">
                      ลบออก ({log.deleted.length}): {log.deleted.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
  );
}
