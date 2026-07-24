import { useEffect, useState, useMemo } from 'react';
import { cdsApi } from '../../api/cds.api.js';

export default function CDSDashboardPage() {
  // === State ===
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('node'); // 'node' หรือ 'vlan'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // === State สำหรับ VLAN Assignment (ใช้เฉพาะแท็บ VLAN) ===
  const [vlans, setVlans] = useState([]);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [editForm, setEditForm] = useState({ pe_vlan_customer: '', agg_vlan: '', access_lsw_vlan_management: '' });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'success'|'error', text: '...' }

  // === Constants ===
  const originalHeaders = [
    { key: 'pe_name', label: 'PE Name' },
    { key: 'ip_loopback', label: 'IP Loopback' },
    { key: 'model', label: 'Model' },
    { key: 'type', label: 'Role' },
    { key: 'pe_port_list', label: 'PE Port List' },
    { key: 'pe_vlan_customer', label: 'PE Vlan Customer' },
    { key: 'agg_id', label: 'Aggregation' },
    { key: 'agg_ip_network', label: 'IP Network' },
    { key: 'agg_vlan', label: 'VLAN' },
    { key: 'nw_lsw_id', label: 'ID LSW Network' },
    { key: 'nw_lsw_ip', label: 'IP Address (NW LSW)' },
    { key: 'nw_lsw_use_for', label: 'Use For (NW LSW)' },
    { key: 'nw_lsw_port', label: 'Port Downlink Main (NW LSW)' },
    { key: 'nw_lsw_port_backup', label: 'Port Downlink Backup (NW LSW)' },
    { key: 'access_lsw_id', label: 'Node ID' },
    { key: 'access_lsw_model', label: 'Model LSW' },
    { key: 'access_lsw_port_uplink', label: 'Port Uplink Main' },
    { key: 'access_lsw_port_uplink_backup', label: 'Port Uplink Backup' },
    { key: 'access_lsw_ip', label: 'IP Address (Access LSW)' },
    { key: 'access_lsw_vlan_management', label: 'VLAN Management' },
    { key: 'ring_name', label: 'Ring Name' },
    { key: 'timestamp', label: 'Timestamp' },
  ];

  const nodeHeaders = originalHeaders.filter(h => !h.key.includes('vlan'));
  const vlanHeaders = originalHeaders;
  // เพิ่มคอลัมน์ Action ในแท็บ VLAN
  const vlanHeadersWithAction = [...vlanHeaders, { key: '_action', label: 'Action' }];
  const headers = activeTab === 'node' ? nodeHeaders : vlanHeadersWithAction;

  // === ฟิลด์ VLAN ที่แก้ไขได้ ===
  const editableVlanKeys = ['pe_vlan_customer', 'agg_vlan', 'access_lsw_vlan_management'];

  // === Effects/API ===

  /**
   * Fetches dashboard data from the API and local storage,
   * combining and sorting them by ID and timestamp.
   */
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await cdsApi.getDashboard();
      const resultList = res.data?.data || res.data || res || [];
      const localReserves = JSON.parse(localStorage.getItem('cds_local_reserves') || '[]');
      
      // รวมข้อมูล local reserves ไว้ด้านบนตาราง
      const combined = [...localReserves, ...resultList];
      
      // เรียงข้อมูลเพื่อให้ข้อมูลใหม่สุดอยู่ด้านบนเสมอ
      combined.sort((a, b) => {
        const idA = typeof a.id === 'string' && a.id.startsWith('LSR-') ? parseInt(a.id.split('-')[1], 10) : 0;
        const idB = typeof b.id === 'string' && b.id.startsWith('LSR-') ? parseInt(b.id.split('-')[1], 10) : 0;
        
        if (idA !== idB) {
          return idB - idA;
        }
        
        const timeA = a.timestamp || '';
        const timeB = b.timestamp || '';
        if (timeA !== timeB) {
          return timeB.localeCompare(timeA);
        }
        
        return 0;
      });

      setData(combined);
    } catch (err) {
      console.error('Failed to fetch CDS dashboard data:', err);
      const localReserves = JSON.parse(localStorage.getItem('cds_local_reserves') || '[]');
      setData(localReserves);
    } finally {
      setLoading(false);
    }
  };

  // โหลด VLAN List จาก NetBox เมื่อสลับไปแท็บ VLAN
  const fetchVlans = async () => {
    try {
      const res = await cdsApi.getVlans();
      setVlans(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch VLANs:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'vlan' && vlans.length === 0) {
      fetchVlans();
    }
    // ปิด editing เมื่อสลับแท็บ
    setEditingRowIndex(null);
    setStatusMsg(null);
  }, [activeTab]);

  // === Handlers ===

  /**
   * Refreshes the dashboard data.
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    if (activeTab === 'vlan') await fetchVlans();
    setIsRefreshing(false);
  };

  /**
   * Exports the currently filtered dashboard data to a CSV file.
   */
  const handleExportCSV = () => {
    const exportHeaders = activeTab === 'node' ? nodeHeaders : vlanHeaders;
    const csvRows = [];
    csvRows.push(exportHeaders.map(h => `"${h.label.replace(/"/g, '""')}"`).join(','));
    
    for (const row of filteredData) {
      const values = exportHeaders.map(header => {
        const val = row[header.key] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvContent = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cds_dashboard_${activeTab}_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // === State สำหรับ Show PE Port Modal & Selection (Single Select Only) ===
  const [showPePortModal, setShowPePortModal] = useState(false);
  const [selectedPeNode, setSelectedPeNode] = useState(null);
  const [pePorts, setPePorts] = useState([]);
  const [loadingPePorts, setLoadingPePorts] = useState(false);
  const [devicesList, setDevicesList] = useState([]);
  const [selectedPePortId, setSelectedPePortId] = useState(null); // เลือกได้เพียง 1 พอร์ตเท่านั้น

  const handleTogglePePort = (peId) => {
    setSelectedPePortId(prev => (prev === peId ? null : peId));
  };

  // ฟังก์ชัน Assign พอร์ต PE ที่เลือกกลับไปยังแถวของ Node Dashboard
  const handleAssignPePort = () => {
    if (!selectedPePortId || !selectedPeNode) return;
    const chosenPortObj = pePorts.find(p => p.peId === selectedPePortId);
    if (!chosenPortObj) return;

    const assignedPortName = chosenPortObj.pePort;
    const targetRowIndex = selectedPeNode._rowIndex;
    const targetId = selectedPeNode.id || selectedPeNode.access_lsw_id || selectedPeNode.nodeId;

    // อัปเดตข้อมูลเฉพาะแถวเดียวใน State (อ้างอิง _rowIndex หรือ Unique ID ตรงๆ)
    setData(prev => prev.map((item, idx) => {
      if (typeof targetRowIndex === 'number' ? idx === targetRowIndex : (item.id === targetId || item.access_lsw_id === targetId)) {
        return { ...item, pe_port_list: assignedPortName };
      }
      return item;
    }));

    // อัปเดตข้อมูลใน LocalStorage เฉพาะรายการที่ตรงกัน
    const localReserves = JSON.parse(localStorage.getItem('cds_local_reserves') || '[]');
    const localIdx = localReserves.findIndex(r =>
      r.id === targetId || r.access_lsw_id === targetId || r.nodeId === targetId
    );
    if (localIdx !== -1) {
      localReserves[localIdx] = { ...localReserves[localIdx], pe_port_list: assignedPortName };
      localStorage.setItem('cds_local_reserves', JSON.stringify(localReserves));
    }

    setStatusMsg({
      type: 'success',
      text: `Assign PE Port "${assignedPortName}" ให้กับ ${selectedPeNode.access_lsw_id || selectedPeNode.pe_name || 'แถวที่เลือก'} เรียบร้อยแล้ว`
    });

    setActiveTab('node');
  };

  // ดึงรายการอุปกรณ์เพื่อใช้ค้นหา PE
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const res = await cdsApi.getDevices();
        setDevicesList(res.data?.data || res.data || []);
      } catch (err) {
        console.warn('Failed to load devices list for PE Port resolution:', err);
      }
    };
    loadDevices();
  }, []);

  // ฟังก์ชันสแกนหาพอร์ต PE จาก NetBox (ใช้ Logic เดียวกันกับหน้า Reserve Port)
  const handleOpenPePortModal = async (row, rowIndex = null) => {
    setSelectedPeNode({ ...row, _rowIndex: rowIndex });
    setSelectedPePortId(null); // ล้างค่าพอร์ตที่เลือกเดิมเมื่อสลับดู PE ตัวใหม่
    setShowPePortModal(true);
    setLoadingPePorts(true);
    setPePorts([]);

    try {
      const aggName = row.agg_id || row.aggregation || '';
      let siteAbbrev = 'BKK';
      
      const siteMatches = aggName.match(/(BCH|BKK|CNX|HKT)/i);
      if (siteMatches) {
        siteAbbrev = siteMatches[0].toUpperCase();
      } else if (row.pe_name) {
        const peMatches = row.pe_name.match(/(BCH|BKK|CNX|HKT)/i);
        if (peMatches) {
          siteAbbrev = peMatches[0].toUpperCase();
        }
      }

      const siteCode = row.siteCode || siteAbbrev;
      const allPorts = [];

      // 1. ดึงข้อมูลพอร์ตเชื่อมต่อจาก Site Topology (AGG <-> PE)
      try {
        const topoRes = await cdsApi.getSiteTopology(siteCode);
        const topology = topoRes.data?.data || topoRes.data || {};
        const siteGateways = topology.gateways || [];
        const topoLinks = topology.links || [];
        const topoDevices = topology.devices || [];

        topoLinks.forEach(link => {
          const sourceDev = topoDevices.find(d => d.id === link.source);
          const targetDev = topoDevices.find(d => d.id === link.target);
          
          const sourceRole = String(sourceDev?.role || link.target_role || '').toLowerCase();
          const targetRole = String(targetDev?.role || link.target_role || '').toLowerCase();
          
          const isSourcePe = sourceRole.includes('pe') || sourceRole.includes('edge') || sourceRole.includes('router');
          const isTargetPe = targetRole.includes('pe') || targetRole.includes('edge') || targetRole.includes('router');
          
          const isSourceAgg = sourceRole.includes('agg') || sourceRole.includes('dist');
          const isTargetAgg = targetRole.includes('agg') || targetRole.includes('dist');
          
          if ((isSourcePe && isTargetAgg) || (isTargetPe && isSourceAgg)) {
            const peDev = isSourcePe ? sourceDev : targetDev;
            const aggDev = isSourcePe ? targetDev : sourceDev;
            
            const pePortName = isSourcePe ? link.source_port : link.target_port;
            const aggPortName = isSourcePe ? link.target_port : link.source_port;
            
            const gwObj = siteGateways.find(g => String(g.id) === String(peDev?.id));
            const peIpVal = gwObj?.ip ? gwObj.ip.split('/')[0] : (peDev?.primary_ip || row.ip_loopback || '10.254.1.1');
            
            allPorts.push({
              peId: `PE-${peDev?.id || 'pe'}-${link.source}-${link.target}`,
              peName: peDev?.name || row.pe_name || 'PE',
              peIp: peIpVal,
              pePort: pePortName || 'Logical',
              mtu: '9000',
              aggName: aggDev?.name || aggName || 'AGG',
              aggPort: aggPortName || 'Logical',
              description: gwObj?.interface ? `Connected via ${gwObj.interface}` : 'Topology Connection'
            });
          }
        });
      } catch (topoErr) {
        console.warn('Failed to load topology links:', topoErr);
      }

      // 2. หากไม่พบใน Topology ให้ fallback ดึงจาก NetBox PE Interfaces
      if (allPorts.length === 0) {
        let peDevices = [];
        if (row.pe_name) {
          const cleanPeName = row.pe_name.toLowerCase();
          peDevices = devicesList.filter(d => {
            const dName = String(d.nodeName || d.nodeId || '').toLowerCase();
            return dName.includes(cleanPeName) || cleanPeName.includes(dName);
          });
        }

        if (peDevices.length === 0 && devicesList.length > 0) {
          peDevices = devicesList.filter(d => {
            const role = String(d.roleName || d.nodeType || '').toLowerCase();
            const dName = String(d.nodeName || d.nodeId || '').toLowerCase();
            return role.includes('pe') || role.includes('edge') || role.includes('router') || dName.includes('pe');
          });
        }

        await Promise.all(peDevices.map(async (pe) => {
          try {
            const res = await cdsApi.getDeviceInterfaces?.(pe.id) || [];
            const interfaces = res.data?.data || res.data || res || [];
            interfaces.forEach(iface => {
              if (iface.name && 
                 (iface.name.toLowerCase().includes('gigabit') || 
                  iface.name.toLowerCase().includes('eth') || 
                  iface.name.toLowerCase().includes('xe-') || 
                  iface.name.toLowerCase().includes('ge-') ||
                  iface.name.toLowerCase().includes('et-'))) {
                
                let formattedMtu = '';
                if (iface.mtu) {
                  const mtuStr = String(iface.mtu);
                  if (mtuStr.startsWith('9')) formattedMtu = '9000';
                  else if (mtuStr.startsWith('15')) formattedMtu = '1500';
                  else formattedMtu = mtuStr;
                }

                allPorts.push({
                  peId: `PE-${pe.id}-${iface.id}`,
                  peName: pe.nodeName || row.pe_name,
                  peIp: pe.ipAddress || row.ip_loopback || '10.254.1.1',
                  pePort: iface.name,
                  mtu: formattedMtu,
                  aggName: aggName || '-',
                  aggPort: '10G-Port-1/1',
                  description: iface.description || 'Interface'
                });
              }
            });
          } catch (e) {
            console.error('Error fetching interfaces:', e);
          }
        }));
      }

      setPePorts(allPorts);
    } catch (err) {
      console.error('Error in handleOpenPePortModal:', err);
      setPePorts([]);
    } finally {
      setLoadingPePorts(false);
    }
  };

  // === VLAN Assignment Handlers ===

  const handleEditRow = (index, row) => {
    setEditingRowIndex(index);
    setEditForm({
      pe_vlan_customer: row.pe_vlan_customer || '',
      agg_vlan: row.agg_vlan || '',
      access_lsw_vlan_management: row.access_lsw_vlan_management || '',
    });
    setStatusMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingRowIndex(null);
    setEditForm({ pe_vlan_customer: '', agg_vlan: '', access_lsw_vlan_management: '' });
  };

  const handleSaveVlan = async (row) => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const itemId = row.id || row.access_lsw_id || row.nodeId;

      // 1. บันทึกผ่าน Backend API
      try {
        await cdsApi.updateDashboard(itemId, editForm);
      } catch (apiErr) {
        console.warn('Backend API update failed, updating locally:', apiErr);
      }

      // 2. อัปเดต LocalStorage
      const localReserves = JSON.parse(localStorage.getItem('cds_local_reserves') || '[]');
      const localIdx = localReserves.findIndex(r =>
        r.id === itemId || r.access_lsw_id === itemId || r.nodeId === itemId
      );
      if (localIdx !== -1) {
        localReserves[localIdx] = { ...localReserves[localIdx], ...editForm };
        localStorage.setItem('cds_local_reserves', JSON.stringify(localReserves));
      }

      // 3. อัปเดต State
      setData(prev => prev.map((item, idx) => {
        if (idx === editingRowIndex) {
          return { ...item, ...editForm };
        }
        return item;
      }));

      setStatusMsg({ type: 'success', text: `บันทึก VLAN สำเร็จสำหรับ ${row.access_lsw_id || row.pe_name || itemId}` });
      setEditingRowIndex(null);
    } catch (err) {
      console.error('Failed to save VLAN:', err);
      setStatusMsg({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึก: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  // === Memoized Values ===

  // ฟังก์ชันสำหรับการฟิลเตอร์ข้อมูล
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((item) =>
      Object.values(item).some((value) =>
        String(value).toLowerCase().includes(query)
      )
    );
  }, [data, searchQuery]);

  // ตรวจสอบว่า VLAN ครบหรือไม่
  const isVlanComplete = (row) => {
    return row.pe_vlan_customer && row.agg_vlan && row.access_lsw_vlan_management &&
      row.pe_vlan_customer !== '' && row.agg_vlan !== '' && row.access_lsw_vlan_management !== '';
  };

  // === Render VLAN Cell (Editable/Readonly) ===
  const renderVlanCell = (header, row, rowIndex, value) => {
    const isEditing = editingRowIndex === rowIndex && editableVlanKeys.includes(header.key);

    if (isEditing) {
      return (
        <td key={header.key} className="whitespace-nowrap px-2 py-1.5 border-r border-base-600/30 last:border-r-0">
          <div className="flex items-center gap-1">
            <select
              value={editForm[header.key]}
              onChange={(e) => {
                const newVal = e.target.value;
                setEditForm(prev => ({ ...prev, [header.key]: newVal }));
              }}
              className="w-24 rounded border border-cds/40 bg-base-950 px-1.5 py-1 text-[11px] text-emerald-400 focus:border-cds focus:outline-none font-mono"
            >
              <option value="">—</option>
              {vlans.map(v => (
                <option key={v.id} value={v.vid}>
                  {v.vid} - {v.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={editForm[header.key]}
              onChange={(e) => {
                const newVal = e.target.value;
                setEditForm(prev => ({ ...prev, [header.key]: newVal }));
              }}
              placeholder="VID"
              className="w-14 rounded border border-base-600 bg-base-950 px-1.5 py-1 text-[11px] text-emerald-400 text-center focus:border-cds focus:outline-none font-mono"
            />
          </div>
        </td>
      );
    }

    // Readonly cell — สีปกติ
    let cellClass = "whitespace-nowrap px-4 py-3 text-ink-100 border-r border-base-600/30 last:border-r-0";
    if (header.key === 'pe_name') {
      cellClass += " font-bold text-cds";
    } else if (header.key.includes('ip') || header.key.includes('loopback')) {
      cellClass += " text-blue-400";
    } else if (header.key.includes('vlan')) {
      cellClass += " text-emerald-400";
    }

    return (
      <td key={header.key} className={cellClass}>
        {value || '-'}
      </td>
    );
  };

  return (
    <div className="space-y-6 text-left">
      {/* Status Message */}
      {statusMsg && (
        <div className={`rounded-lg border p-3 text-xs font-mono flex items-center justify-between transition-all ${
          statusMsg.type === 'success'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
            : 'border-red-500/20 bg-red-500/10 text-red-400'
        }`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="ml-4 hover:opacity-70">✕</button>
        </div>
      )}

      {/* Sub-tabs: Node / VLAN */}
      <div className="flex border-b border-base-600/50 gap-2">
        <button
          onClick={() => setActiveTab('node')}
          className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
            activeTab === 'node'
              ? 'border-cds text-cds bg-cds/5'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          Node Dashboard
        </button>
        <button
          onClick={() => setActiveTab('vlan')}
          className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
            activeTab === 'vlan'
              ? 'border-cds text-cds bg-cds/5'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          VLAN Dashboard
        </button>
      </div>

      {/* Search Header & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-base-600 bg-base-900 p-4 shadow-glow">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="ค้นหาข้อมูลในตาราง (PE, Model, IP, Switch...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-base-600 bg-base-950 px-4 py-2 text-sm text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none transition-colors pl-10"
          />
          <span className="absolute left-3.5 top-3 text-ink-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-mono text-ink-400 mr-2">
            พบข้อมูล {filteredData.length} แถว
          </span>

          {/* ปุ่ม Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-base-600 bg-base-950/60 px-3.5 py-2 text-xs font-semibold text-ink-400 hover:text-ink-100 hover:bg-base-800 transition-all disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <span>{isRefreshing ? '' : '↻'}</span>
          </button>

          {/* ปุ่ม Export CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-cds/30 bg-cds/10 px-3.5 py-2 text-xs font-semibold text-cds hover:bg-cds/20 active:scale-[0.98] transition-all"
            title="ส่งออกข้อมูลเป็นไฟล์ CSV"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container - Horizontal scrollable */}
      {activeTab === 'pe_ports' && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-cds/30 bg-cds/5 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="font-bold text-cds text-sm">PE Port Details: {selectedPeNode?.pe_name || '-'}</span>
            <span className="text-ink-400">({pePorts.length} Ports found)</span>
            {selectedPePortId && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                เลือกพอร์ต: {pePorts.find(p => p.peId === selectedPePortId)?.pePort || selectedPePortId}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {selectedPePortId && (
              <button
                onClick={handleAssignPePort}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 text-base-950 font-bold hover:bg-emerald-400 active:scale-95 transition-all text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 animate-pulse"
              >
                <span>✓ Assign PE Port ให้ {selectedPeNode?.pe_name || 'Node'}</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('node')}
              className="px-3 py-1.5 rounded-lg bg-base-950 border border-base-600 text-ink-300 hover:text-white transition-all text-xs flex items-center gap-1 font-bold"
            >
              ← ย้อนกลับ
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-base-600 bg-base-900 shadow-glow overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          {activeTab === 'pe_ports' ? (
            <table className="w-full table-auto border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-base-600 bg-base-950/80 text-ink-400 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3 w-10 text-center">Select</th>
                  <th className="px-4 py-3">PE Name</th>
                  <th className="px-4 py-3">PE Port</th>
                  <th className="px-4 py-3">PE IP</th>
                  <th className="px-4 py-3">Description (MTU)</th>
                  <th className="px-4 py-3">AGG Name</th>
                  <th className="px-4 py-3">AGG Port</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-600/40 text-ink-100">
                {loadingPePorts ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-xs text-ink-500 font-mono animate-pulse">
                      กำลังสแกนหาพอร์ตและลิงก์ PE จาก NetBox และ Topology...
                    </td>
                  </tr>
                ) : pePorts.length > 0 ? (
                  pePorts.map((row, idx) => {
                    const isSelected = selectedPePortId === row.peId;
                    return (
                      <tr
                        key={idx}
                        className={`transition-colors duration-150 cursor-pointer ${
                          isSelected ? 'bg-cds/10 border-l-2 border-l-cds' : 'hover:bg-cds/5'
                        }`}
                        onClick={() => handleTogglePePort(row.peId)}
                      >
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleTogglePePort(row.peId)}
                            className="rounded border-base-600 bg-base-950 text-cds focus:ring-cds/30 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-cds">{row.peName}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-emerald-400">{row.pePort}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-blue-400">{row.peIp}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span>{row.description || 'ไม่มีคำอธิบาย'}</span>
                            {row.mtu && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-ink-600 font-mono">MTU: {row.mtu}</span>
                                {row.mtu === '9000' && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/30 uppercase">
                                    Jumbo
                                  </span>
                                )}
                                {row.mtu === '1500' && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase">
                                    Standard
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-ink-300">{row.aggName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-ink-300">{row.aggPort}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-xs text-ink-600 italic">
                      {selectedPeNode ? 'ไม่พบข้อมูลอินเตอร์เฟสสำหรับ PE นี้ใน NetBox' : 'กรุณาเลือก PE หรือคลิกปุ่ม Show PE Port บนตาราง Node/VLAN'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full table-auto border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-base-600 bg-base-950/80">
                  {headers.map((header) => (
                    <th
                      key={header.key}
                      className={`whitespace-nowrap px-4 py-3 font-semibold text-ink-400 border-r border-base-600/50 last:border-r-0 tracking-wider uppercase ${
                        editableVlanKeys.includes(header.key) && activeTab === 'vlan'
                          ? 'bg-emerald-500/5 text-emerald-400/80'
                          : ''
                      }`}
                    >
                      {header.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-base-600/40">
                {filteredData.length > 0 ? (
                  filteredData.map((row, index) => {
                    const isEditing = editingRowIndex === index;
                    const vlanOk = isVlanComplete(row);

                    return (
                      <tr
                        key={index}
                        className={`transition-colors group ${
                          isEditing
                            ? 'bg-cds/10 ring-1 ring-inset ring-cds/30'
                            : 'hover:bg-cds/5'
                        }`}
                      >
                        {headers.map((header) => {
                          const value = row[header.key];

                          // คอลัมน์ Action (เฉพาะ VLAN tab)
                          if (header.key === '_action') {
                            return (
                              <td key="_action" className="whitespace-nowrap px-3 py-2 border-r border-base-600/30 last:border-r-0">
                                {isEditing ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleSaveVlan(row)}
                                      disabled={saving}
                                      className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-emerald-500 text-base-950 hover:bg-emerald-400 transition-all disabled:opacity-50"
                                    >
                                      {saving ? '...' : 'Save'}
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-2 py-1 text-[10px] font-semibold rounded-md border border-base-600 text-ink-400 hover:text-ink-100 hover:bg-base-800 transition-all"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleEditRow(index, row)}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md border transition-all ${
                                      vlanOk
                                        ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                                        : 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 animate-pulse'
                                    }`}
                                  >
                                    {vlanOk ? 'Edit' : 'Assign'}
                                  </button>
                                )}
                              </td>
                            );
                          }

                          // คอลัมน์ PE Port List (ให้สามารถกดสลับไปดูหน้า PE Port Details เต็มรูปแบบเพื่อแก้ไขได้)
                          if (header.key === 'pe_port_list') {
                            const hasAssigned = value && value !== '-' && value !== 'Show PE Port';

                            return (
                              <td key="pe_port_list" className="whitespace-nowrap px-3 py-2 border-r border-base-600/30 last:border-r-0">
                                <button
                                  onClick={() => {
                                    handleOpenPePortModal(row, index);
                                    setActiveTab('pe_ports');
                                  }}
                                  className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                                    hasAssigned
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                                      : 'bg-cds/10 text-cds border border-cds/30 hover:bg-cds/20'
                                  }`}
                                  title="คลิกเพื่อสลับไปดูตารางรายละเอียด PE Port หรือแก้ไขพอร์ตของ PE นี้"
                                >
                                  {hasAssigned ? (
                                    <>
                                      <span>{value}</span>
                                      <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-normal uppercase">Edit</span>
                                    </>
                                  ) : (
                                    <span>Show PE Port</span>
                                  )}
                                </button>
                              </td>
                            );
                          }

                          // VLAN editable cells
                          if (activeTab === 'vlan' && editableVlanKeys.includes(header.key)) {
                            return renderVlanCell(header, row, index, value);
                          }

                          // ไฮไลต์สีให้พิเศษตามประเภทข้อมูล
                          let cellClass = "whitespace-nowrap px-4 py-3 text-ink-100 border-r border-base-600/30 last:border-r-0";
                          
                          if (header.key === 'pe_name') {
                            cellClass += " font-bold text-cds";
                          } else if (header.key.includes('ip') || header.key.includes('loopback')) {
                            cellClass += " text-blue-400";
                          } else if (header.key.includes('vlan')) {
                            cellClass += " text-emerald-400";
                          }

                          return (
                            <td key={header.key} className={cellClass}>
                              {value || '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={headers.length}
                      className="px-4 py-8 text-center text-ink-600"
                    >
                      ไม่พบข้อมูลที่ค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
