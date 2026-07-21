import { useState, useRef, useEffect } from 'react';
import { cdsApi } from '../../api/cds.api.js';
import { ndsApi } from '../../api/nds.api.js';

const steps = [
  { number: 1, label: 'Select Network' },
  { number: 2, label: 'Reserve Port' },
];

const mockNodeData = [
  {
    nodeId: "85390",
    idNetwork: "NET-BCH-85390",
    areaGroup: "Metropolitan",
    area: "Bangkok",
    ipAddress: "10.134.100.10",
    siteName: "BCH Bangkok Center",
    nameThai: "ศูนย์บางกอก BCH",
    status: "Active",
    nodeType: "LSW_Network",
    nodeName: "85390_BCH-LSW",
    peName: "90134_BCH-MX480-PE",
    domain: "90134_BCH-MX480-PE",
    aggregation: "AGG-BCH-01",
    ipNetworks: ["10.134.100.0/24 (VLAN 100)", "10.134.115.0/24 (VLAN 115)"]
  },
  {
    nodeId: "BKK-SW-01",
    idNetwork: "NET-BKK-001",
    areaGroup: "Metropolitan",
    area: "Bangkok",
    ipAddress: "10.100.1.10",
    siteName: "Bangkok Head Office",
    nameThai: "สำนักงานใหญ่ กรุงเทพฯ",
    status: "Active",
    nodeType: "Core Switch",
    nodeName: "Bangkok-Core-01",
    peName: "90101_BKK-MX480-PE",
    domain: "90101_BKK-MX480-PE",
    aggregation: "AGG-BKK-01",
    ipNetworks: ["10.100.100.0/24 (VLAN 100)", "10.100.115.0/24 (VLAN 115)"]
  },
  {
    nodeId: "CNX-SW-02",
    idNetwork: "NET-CNX-002",
    areaGroup: "Northern",
    area: "Chiang Mai",
    ipAddress: "10.200.1.10",
    siteName: "Chiang Mai Branch",
    nameThai: "สาขาเชียงใหม่",
    status: "Active",
    nodeType: "Distribution Switch",
    nodeName: "ChiangMai-Dist-02",
    peName: "90200_CNX-MX480-PE",
    domain: "90200_CNX-MX480-PE",
    aggregation: "AGG-CNX-02",
    ipNetworks: ["10.200.100.0/24 (VLAN 100)", "10.200.115.0/24 (VLAN 115)"]
  },
  {
    nodeId: "HKT-SW-03",
    idNetwork: "NET-HKT-003",
    areaGroup: "Southern",
    area: "Phuket",
    ipAddress: "10.150.1.10",
    siteName: "Phuket DC",
    nameThai: "ศูนย์ข้อมูลภูเก็ต",
    status: "Planned",
    nodeType: "Access Switch",
    nodeName: "Phuket-Access-03",
    peName: "90150_HKT-MX480-PE",
    domain: "90150_HKT-MX480-PE",
    aggregation: "AGG-HKT-03",
    ipNetworks: ["10.150.100.0/24 (VLAN 100)", "10.150.115.0/24 (VLAN 115)"]
  }
];

// ตัวอย่าง Model LSW จาก Netbox (จะเปลี่ยนเป็นดึงจาก API ได้ภายหลัง)
const mockModelLSW = [
  'Cisco C9200L-24T-4G',
  'Cisco C9200L-48T-4G',
  'Cisco C9300-24T',
  'Cisco C9300-48T',
  'Huawei S5735-L24T4S-A',
  'Huawei S5735-L48T4S-A',
  'Juniper EX2300-24T',
  'Juniper EX2300-48T',
];

const DisplayField = ({ label, value, placeholder }) => (
  <div className="flex-1 min-w-0">
    <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">
      {label}
    </label>
    <div
      className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-all duration-300
        ${value
          ? 'border-cds/20 bg-cds/5 text-ink-100'
          : 'border-base-600/40 bg-base-950/50 text-ink-600 italic'
        }`}
    >
      {value || placeholder || 'รอเลือก Node ID'}
    </div>
  </div>
);

const InputField = ({ label, value, onChange, placeholder }) => (
  <div className="flex-1 min-w-0">
    <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">
      {label}
    </label>
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full rounded-lg border border-base-600 bg-base-950 px-4 py-2.5 text-sm text-ink-100 placeholder-ink-600 
                 focus:border-cds focus:outline-none focus:ring-1 focus:ring-cds/30 transition-all duration-200"
    />
  </div>
);

const SelectField = ({ label, value, onChange, options, placeholder }) => (
  <div className="flex-1 min-w-0">
    <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">
      {label}
    </label>
    <select
      value={value}
      onChange={onChange}
      className="w-full rounded-lg border border-base-600 bg-base-950 px-4 py-2.5 text-sm text-ink-100
                 focus:border-cds focus:outline-none focus:ring-1 focus:ring-cds/30 transition-all duration-200
                 appearance-none cursor-pointer"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B6D74'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        backgroundSize: '16px',
      }}
    >
      <option value="" className="bg-base-950 text-ink-600">{placeholder || 'เลือก...'}</option>
      {options.map((opt) => (
        <option key={opt} value={opt} className="bg-base-950 text-ink-100">{opt}</option>
      ))}
    </select>
  </div>
);

export default function CDSSearchReservePage() {
  const [activeStep, setActiveStep] = useState(1);

  const [formData, setFormData] = useState({
    idNetwork: '',
    areaGroup: '',
    area: '',
    siteName: '',
    nameThai: '',
    status: '',
    tenant: '',
    description: '',
    nodeId: '',
  });

  // เก็บ node object ที่เลือกไว้เพื่อส่งข้อมูลไป Step 2
  const [selectedNode, setSelectedNode] = useState(null);

  // Form state สำหรับ Step 2
  const [reserveData, setReserveData] = useState({
    remark: '',
    jobRef: '',
    ipAddress: '',
    ipGateway: '',
    modelLSW: '',
    ipNetwork: '',
    portUplinkMain: '',
    portUplinkBackup: '',
    portDownlinkMain: '',
    portDownlinkBackup: '',
  });

  // Search state สำหรับ Select Network (LSW_Network)
  const [networkSearch, setNetworkSearch] = useState('');
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const networkRef = useRef(null);

  // Search state สำหรับ Node ID
  const [nodeSearch, setNodeSearch] = useState('');
  const [showNodeDropdown, setShowNodeDropdown] = useState(false);
  const nodeRef = useRef(null);

  const [devicesList, setDevicesList] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const [modelOptions, setModelOptions] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // กรองอุปกรณ์เฉพาะ Device Role LSW_Network (หรือ LSW / Network)
  const lswNetworkDevices = devicesList.filter((d) => {
    const r = String(d.roleName || d.nodeType || d.role || '').toLowerCase();
    return r.includes('lsw_network') || r.includes('lsw network') || r.includes('lsw') || r.includes('network');
  });
  const networkOptions = lswNetworkDevices.length > 0 ? lswNetworkDevices : devicesList;

  // กรอง options ของ Select Network ตามคำค้นหา
  const filteredNetworkOptions = networkOptions.filter((net) => {
    if (!networkSearch.trim()) return true;
    const q = networkSearch.toLowerCase();
    return (
      (net.nodeId || '').toLowerCase().includes(q) ||
      (net.nodeName || '').toLowerCase().includes(q) ||
      (net.siteName || '').toLowerCase().includes(q)
    );
  });

  // 3 Node ID ล่าสุดในระบบ NetBox
  const recent3NodeIds = devicesList
    .map((d) => d.nodeId)
    .filter((id) => id && id !== '-')
    .slice(-3)
    .reverse();

  // คำนวณ Node ID ถัดไปสำหรับสร้างใหม่
  const getNextNodeId = (id) => {
    const match = String(id).match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const nextNum = parseInt(numStr, 10) + 1;
      const paddedNum = String(nextNum).padStart(numStr.length, '0');
      return `${prefix}${paddedNum}`;
    }
    return `${id}-01`;
  };

  // ตรวจสอบว่า Node ID ที่พิมพ์มีซ้ำใน NetBox หรือไม่
  const isNodeIdAlreadyExists = devicesList.some(
    (d) => d.nodeId && d.nodeId.toLowerCase() === nodeSearch.trim().toLowerCase()
  );

  // กรอง options ตาม search text
  const filteredNodeIdOptions = devicesList.filter((node) =>
    node.nodeId.toLowerCase().includes(nodeSearch.toLowerCase())
  );

  // ดึงข้อมูลดีไวซ์และ Model LSW จาก NetBox เมื่อโหลดหน้าจอ
  useEffect(() => {
    const fetchDevices = async () => {
      setLoadingDevices(true);
      try {
        const res = await ndsApi.getDevices();
        const rawList = res.data?.data || res.data || res || [];
        if (rawList.length > 0) {
          const mappedList = rawList.map(device => ({
            nodeId: device.nodeid !== '-' ? device.nodeid : device.name,
            idNetwork: 'NET-' + (device.site !== 'N/A' ? device.site : 'LOCAL'),
            areaGroup: device.region && device.region !== 'N/A' ? device.region : '',
            area: device.location && device.location !== 'N/A' ? device.location : '',
            siteName: device.site_name && device.site_name !== 'N/A' ? device.site_name : (device.site !== 'N/A' ? device.site : 'Main Site'),
            nameThai: device.name_thai !== 'N/A' ? device.name_thai : 'N/A',
            status: device.status || 'Active',
            tenant: device.tenant !== 'N/A' ? device.tenant : 'N/A',
            description: device.description !== 'N/A' ? device.description : '-',
            nodeType: device.type !== 'N/A' ? device.type : 'LSW',
            roleName: device.role_name || device.role || '',
            nodeName: device.name,
            peName: device.pe_name || (device.site !== 'N/A' ? `90134_${device.site.toUpperCase()}-MX480-PE` : '90134_BCH-MX480-PE'),
            domain: device.pe_name || (device.site !== 'N/A' ? `90134_${device.site.toUpperCase()}-MX480-PE` : '90134_BCH-MX480-PE'),
            aggregation: 'AGG-' + (device.site !== 'N/A' ? device.site : 'BKK'),
            ipNetworks: (() => {
              const primaryIp = device.ip !== 'N/A' ? device.ip.split('/')[0] : '10.134.100.1';
              const parts = primaryIp.split('.');
              if (parts.length === 4) {
                const basePrefix = `${parts[0]}.${parts[1]}`;
                return [
                  `${basePrefix}.100.0/24 (VLAN 100)`,
                  `${basePrefix}.115.0/24 (VLAN 115)`
                ];
              }
              return ['10.134.100.0/24 (VLAN 100)', '10.134.115.0/24 (VLAN 115)'];
            })()
          }));
          setDevicesList(mappedList);
        } else {
          setDevicesList(mockNodeData);
        }
      } catch (err) {
        console.error('Failed to load NetBox devices for search & reserve:', err);
        setDevicesList(mockNodeData);
      } finally {
        setLoadingDevices(false);
      }
    };

    const fetchModelTypes = async () => {
      setLoadingModels(true);
      try {
        const res = await ndsApi.getDeviceTypes();
        const rawList = res.data?.data || res.data || res || [];
        if (rawList.length > 0) {
          const mappedModels = rawList.map(dt => dt.display || dt.model || dt.name).filter(Boolean);
          const uniqueModels = [...new Set(mappedModels)];
          setModelOptions(uniqueModels);
        } else {
          setModelOptions(mockModelLSW);
        }
      } catch (err) {
        console.error('Failed to load NetBox device types / models:', err);
        setModelOptions(mockModelLSW);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchDevices();
    fetchModelTypes();
  }, []);

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (networkRef.current && !networkRef.current.contains(e.target)) {
        setShowNetworkDropdown(false);
      }
      if (nodeRef.current && !nodeRef.current.contains(e.target)) {
        setShowNodeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // เมื่อเลือก Select Network -> auto-fill ข้อมูล Network
  const handleNetworkSelect = (net) => {
    if (net) {
      const displayText = `${net.nodeId}${net.nodeName ? ` (${net.nodeName})` : ''}`;
      setNetworkSearch(displayText);
      setFormData((prev) => ({
        ...prev,
        networkDevice: net.nodeId,
        areaGroup: net.areaGroup,
        area: net.area,
        siteName: net.siteName,
        nameThai: net.nameThai,
        status: net.status,
        tenant: net.tenant,
        description: net.description,
      }));
      setSelectedNode(net);
    } else {
      setNetworkSearch('');
      setFormData((prev) => ({
        ...prev,
        networkDevice: '',
        areaGroup: '',
        area: '',
        siteName: '',
        nameThai: '',
        status: '',
        tenant: '',
        description: '',
      }));
      setSelectedNode(null);
    }
    setShowNetworkDropdown(false);
  };

  // เมื่อเลือก Node ID → auto-fill ข้อมูล Network ด้านบน + เก็บ node object
  const handleNodeSelect = (node) => {
    setFormData({
      nodeId: node.nodeId,
      idNetwork: node.idNetwork,
      areaGroup: node.areaGroup,
      area: node.area,
      siteName: node.siteName,
      nameThai: node.nameThai,
      status: node.status,
      tenant: node.tenant,
      description: node.description,
    });
    setSelectedNode(node);
    setNodeSearch(node.nodeId);
    setShowNodeDropdown(false);
  };

  // ล้างข้อมูลทั้งหมด
  const handleClearNode = () => {
    setFormData({ idNetwork: '', areaGroup: '', area: '', ipAddress: '', siteName: '', nameThai: '', nodeId: '' });
    setSelectedNode(null);
    setNodeSearch('');
    setShowNodeDropdown(false);
  };

  // ล้างข้อมูล Step 2 ทั้งหมด
  const handleClearReserve = () => {
    setReserveData({
      remark: '',
      jobRef: '',
      ipAddress: '',
      ipGateway: '',
      modelLSW: '',
      ipNetwork: '',
      portUplinkMain: '',
      portUplinkBackup: '',
      portDownlinkMain: '',
      portDownlinkBackup: '',
      selectedPeRows: [],
    });
  };

  const handleReserveChange = (field, value) => {
    setReserveData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReserveSubmit = async () => {
    if (!selectedNode) {
      alert('กรุณาเลือก Node ID ก่อน');
      return;
    }
    if (!reserveData.modelLSW || !reserveData.ipNetwork) {
      alert('กรุณากรอกข้อมูลและเลือก Model LSW / IP Network');
      return;
    }
    try {
      const newDashboardItem = {
        pe_name: 'PE-' + selectedNode.nodeId.split('-')[0] + '-01',
        ip_loopback: '10.0.0.' + (Math.floor(Math.random() * 250) + 10),
        model: 'Cisco ASR9001',
        type: 'Provider Edge',
        pe_port_list: 'GigabitEthernet0/0/1',
        pe_vlan_customer: String(Math.floor(Math.random() * 900) + 100),
        agg_id: selectedNode.aggregation,
        agg_ip_network: reserveData.ipNetwork,
        agg_vlan: '100',
        nw_lsw_id: 'NW-LSW-' + selectedNode.nodeId.split('-')[0] + '-01',
        nw_lsw_ip: selectedNode.ipAddress,
        nw_lsw_use_for: 'Office Network',
        nw_lsw_port: reserveData.portUplinkMain || 'GigabitEthernet0/1',
        access_lsw_id: selectedNode.nodeId,
        access_lsw_model: reserveData.modelLSW,
        access_lsw_port_uplink: reserveData.portUplinkMain || 'GigabitEthernet0/1',
        access_lsw_port_customer: reserveData.portDownlinkMain || 'GigabitEthernet0/2-24',
        access_lsw_ip: reserveData.ipAddress || selectedNode.ipAddress,
        access_lsw_vlan_management: '99',
      };
      // 1. บันทึกลง LocalStorage (Local Browser Storage)
      const localReserves = JSON.parse(localStorage.getItem('cds_local_reserves') || '[]');
      localReserves.unshift(newDashboardItem);
      localStorage.setItem('cds_local_reserves', JSON.stringify(localReserves));

      // 2. ส่งไปเก็บที่ In-memory Mock ใน Backend (ไม่ไปแตะ NetBox)
      try {
        await cdsApi.addDashboard(newDashboardItem);
      } catch (e) {
        console.warn('Cannot reach backend dashboard API, saved to LocalStorage only', e);
      }

      alert(`ทำการ Reserve Port สำหรับ Switch สำเร็จ!\nข้อมูลถูกบันทึกไว้ในระบบ Local เรียบร้อยแล้ว (ไม่ถูกส่งไปสร้างใน NetBox)\nNode: ${selectedNode.nodeId}\nModel LSW: ${reserveData.modelLSW}`);
      handleClearReserve();
      handleClearNode();
      setActiveStep(1);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };



  // Status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
      case 'Planned': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'Maintenance': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      default: return 'text-ink-400 bg-base-800 border-base-600';
    }
  };

  return (
    <div className="space-y-8 text-left">
      {/* Stepper Header */}
      <div className="rounded-xl border border-base-600 bg-base-900 p-8 shadow-glow">
        <div className="flex items-center justify-center">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    relative flex h-14 w-14 items-center justify-center rounded-full
                    border-2 transition-all duration-300 ease-out
                    font-display text-lg font-bold
                    ${
                      activeStep === step.number
                        ? 'border-cds bg-cds/15 text-cds shadow-[0_0_20px_rgba(255,154,61,0.25)]'
                        : activeStep > step.number
                        ? 'border-cds/60 bg-cds/10 text-cds/80'
                        : 'border-base-600 bg-base-800 text-ink-600'
                    }
                  `}
                >
                  {step.number}
                </div>
                <span
                  className={`
                    mt-3 text-sm font-semibold tracking-wide transition-colors duration-300
                    ${
                      activeStep === step.number
                        ? 'text-cds'
                        : activeStep > step.number
                        ? 'text-cds/60'
                        : 'text-ink-600'
                    }
                  `}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div className="relative mx-6 h-0.5 w-32 sm:w-48 lg:w-64 overflow-hidden rounded-full bg-base-600">
                  <div
                    className={`
                      absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out
                      ${activeStep > step.number ? 'w-full bg-cds/60' : 'w-0 bg-cds/40'}
                    `}
                  />
                  {activeStep >= step.number && (
                    <div className="absolute inset-0 overflow-hidden">
                      <div
                        className="h-full w-full"
                        style={{
                          backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,154,61,0.5) 50%, transparent 100%)',
                          backgroundSize: '40px 100%',
                          animation: 'stepperFlow 1.5s linear infinite',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content Area */}
      <div className="rounded-xl border border-base-600 bg-base-900 p-6 shadow-glow">

        {/* ==================== STEP 1: Select Network ==================== */}
        {activeStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-ink-100 font-display flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cds/15 text-sm font-bold text-cds border border-cds/30">1</span>
              Select Network
            </h2>

            {/* Select Network Field (Searchable Input Dropdown, Device Role: LSW_Network) */}
            <div className="max-w-md" ref={networkRef}>
              <label className="block text-xs font-semibold text-cds uppercase tracking-wider mb-2">
                Select Network (LSW_Network)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600 pointer-events-none">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="พิมพ์ค้นหา Network (LSW_Network)..."
                  value={networkSearch}
                  onChange={(e) => {
                    setNetworkSearch(e.target.value);
                    setShowNetworkDropdown(true);
                    if (!e.target.value) {
                      handleNetworkSelect(null);
                    }
                  }}
                  onFocus={() => setShowNetworkDropdown(true)}
                  className="w-full rounded-lg border border-base-600 bg-base-950 pl-10 pr-10 py-2.5 text-sm text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none focus:ring-1 focus:ring-cds/30 transition-all duration-200 font-mono"
                />
                {networkSearch && (
                  <button
                    onClick={() => handleNetworkSelect(null)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-600 hover:text-ink-100 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                {showNetworkDropdown && (
                  <div className="absolute z-30 mt-1.5 w-full rounded-lg border border-base-600 bg-base-800 shadow-glow overflow-hidden">
                    {loadingDevices ? (
                      <div className="px-4 py-6 text-center text-sm text-ink-500 font-mono animate-pulse">กำลังโหลดอุปกรณ์ LSW_Network จาก NetBox...</div>
                    ) : filteredNetworkOptions.length > 0 ? (
                      <ul className="max-h-56 overflow-y-auto py-1">
                        {filteredNetworkOptions.map((net) => (
                          <li
                            key={net.nodeId}
                            onClick={() => handleNetworkSelect(net)}
                            className={`flex flex-col gap-0.5 cursor-pointer px-4 py-2.5 text-sm transition-colors duration-150 border-b border-base-700/50 last:border-0 ${formData.networkDevice === net.nodeId ? 'bg-cds/15 text-cds' : 'text-ink-100 hover:bg-base-700'}`}
                          >
                            <div className="flex items-center justify-between font-mono font-semibold">
                              <span>{net.nodeId} {net.nodeName ? `(${net.nodeName})` : ''}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-base-950 text-ink-400 border border-base-600/30">{net.status}</span>
                            </div>
                            <div className="text-xs text-ink-500 flex items-center gap-3">
                              <span>Site: {net.siteName}</span>
                              {net.areaGroup && <span>Region: {net.areaGroup}</span>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-ink-600">ไม่พบ Network ที่ตรงกับคำค้นหา</div>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-1 text-[11px] text-ink-600">พิมพ์ค้นหาอุปกรณ์ LSW_Network จาก NetBox ตามชื่อ ID, Node Name หรือ Site</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DisplayField label="Area Group" value={formData.areaGroup} placeholder={selectedNode ? "-" : "รอเลือก Network"} />
              <DisplayField label="Area" value={formData.area} placeholder={selectedNode ? "-" : "รอเลือก Network"} />
              <DisplayField label="Status" value={formData.status} placeholder={selectedNode ? "-" : "รอเลือก Network"} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DisplayField label="Site Name" value={formData.siteName} placeholder={selectedNode ? "-" : "รอเลือก Network"} />
              <DisplayField label="Name Thai" value={formData.nameThai} placeholder={selectedNode ? "-" : "รอเลือก Network"} />
              <DisplayField label="Tenant" value={formData.tenant} placeholder={selectedNode ? "-" : "รอเลือก Network"} />
            </div>

            <div className="w-full">
              <DisplayField label="Description" value={formData.description} placeholder={selectedNode ? "-" : "รอเลือก Network"} />
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-base-600/60" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-base-900 px-4 text-xs font-mono text-ink-600 uppercase tracking-widest">Node ID (เตรียมสร้างใหม่)</span>
              </div>
            </div>

            {/* Node ID (เตรียมสร้างใหม่) */}
            <div className="max-w-md" ref={nodeRef}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider">Node ID (ใหม่)</label>
              </div>

              {/* 3 Node ID ล่าสุดในระบบ NetBox */}
              {recent3NodeIds.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  <span className="text-[11px] font-mono text-ink-500 block">3 Node ID ล่าสุดในระบบ NetBox:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {recent3NodeIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          const nextSuggestedId = getNextNodeId(id);
                          setNodeSearch(nextSuggestedId);
                          setFormData((prev) => ({ ...prev, nodeId: nextSuggestedId }));
                        }}
                        className="px-2.5 py-1 rounded-md text-xs font-mono bg-cds/10 border border-cds/30 text-cds hover:bg-cds/20 active:scale-95 transition-all flex items-center gap-1.5"
                        title={`คลิกเพื่อสร้าง Node ID ใหม่ถัดไป (${getNextNodeId(id)})`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-cds" />
                        {id} → <span className="underline font-bold">{getNextNodeId(id)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600 pointer-events-none">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="ระบุ Node ID ใหม่ที่ต้องการสร้าง..."
                  value={nodeSearch}
                  onChange={(e) => {
                    setNodeSearch(e.target.value);
                    setFormData((prev) => ({ ...prev, nodeId: e.target.value }));
                  }}
                  className="w-full rounded-lg border border-base-600 bg-base-950 pl-10 pr-10 py-2.5 text-sm text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none focus:ring-1 focus:ring-cds/30 transition-all duration-200 font-mono"
                />
                {nodeSearch && (
                  <button onClick={handleClearNode} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-600 hover:text-ink-100 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {nodeSearch.trim() ? (
                isNodeIdAlreadyExists ? (
                  <p className="mt-1.5 text-xs text-amber-400 font-mono flex items-center gap-1.5">
                    <span>⚠️</span> Node ID "{nodeSearch}" มีอยู่ในระบบ NetBox แล้ว (ไม่ใช่ Node ใหม่)
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                    <span>✓</span> Node ID "{nodeSearch}" เป็น Node ใหม่ (ยังไม่มีใน NetBox - พร้อมสำหรับเตรียมสร้าง)
                  </p>
                )
              ) : (
                <p className="mt-1.5 text-xs text-ink-600">ระบุชื่อ Node ID ใหม่ที่ยังไม่มีใน NetBox สำหรับเตรียมสร้างอุปกรณ์สวิตช์ขึ้นระบบ</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveStep(2)}
                className="inline-flex items-center gap-2 rounded-lg border border-cds/30 bg-cds/10 px-5 py-2.5 text-sm font-semibold text-cds hover:bg-cds/20 hover:border-cds/50 active:scale-[0.97] transition-all duration-200"
              >
                Next Step
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 2: Reserve Port ==================== */}
        {activeStep === 2 && (
          <div className="space-y-6">
            {/* Header + Status Badge */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-ink-100 font-display flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cds/15 text-sm font-bold text-cds border border-cds/30">2</span>
                Reserve Port
              </h2>
            </div>

            {/* LSW Access Section Header */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-cds/40 to-transparent" />
              <span className="text-xs font-mono font-bold text-cds uppercase tracking-widest">LSW Access</span>
              <div className="h-px flex-1 bg-gradient-to-l from-cds/40 to-transparent" />
            </div>

            {/* Network Trace Flow (LSW -> AGG -> PE -> VRF) */}
            {selectedNode && (
              <div className="rounded-lg border border-cds/20 bg-cds/5 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-ink-400 font-bold">Trace Chain:</span>
                  <span className="px-2 py-0.5 rounded bg-base-950 text-cds border border-cds/30">LSW: {selectedNode.nodeId}</span>
                  <span className="text-ink-600">➔</span>
                  <span className="px-2 py-0.5 rounded bg-base-950 text-ink-200 border border-base-600/30">AGG: {selectedNode.aggregation}</span>
                  <span className="text-ink-600">➔</span>
                  <span className="px-2 py-0.5 rounded bg-base-950 text-emerald-400 border border-emerald-500/30 font-bold">PE: {selectedNode.peName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
                  <span>VRF:</span>
                  <span className="font-bold">{selectedNode.domain}</span>
                </div>
              </div>
            )}

            {/* Row 1: Remark, Job Ref., Status */}
            <div className="space-y-4">
              <div className="w-full">
                <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">
                  Remark
                </label>
                <textarea
                  placeholder="ระบุหมายเหตุ..."
                  value={reserveData.remark}
                  onChange={(e) => handleReserveChange('remark', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-base-600 bg-base-950 px-4 py-2.5 text-sm text-ink-100 placeholder-ink-600 
                             focus:border-cds focus:outline-none focus:ring-1 focus:ring-cds/30 transition-all duration-200 resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Job Ref." value={reserveData.jobRef} onChange={(e) => handleReserveChange('jobRef', e.target.value)} placeholder="เช่น JOB-2025-001" />
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Status</label>
                  <div className="w-full rounded-lg border border-base-600/40 bg-base-950/50 px-4 py-2.5 text-sm flex items-center gap-2 h-[42px]">
                    {selectedNode ? (
                      <>
                        <span className={`inline-block h-2 w-2 rounded-full ${selectedNode.status === 'Active' ? 'bg-emerald-400' : selectedNode.status === 'Planned' ? 'bg-blue-400' : 'bg-amber-400'}`} />
                        <span className={`font-semibold ${selectedNode.status === 'Active' ? 'text-emerald-400' : selectedNode.status === 'Planned' ? 'text-blue-400' : 'text-amber-400'}`}>
                          {selectedNode.status}
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-600 italic">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Node Type, Area Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DisplayField label="Node Type" value={selectedNode?.nodeType} placeholder="—" />
              <DisplayField label="Area Group" value={selectedNode?.areaGroup} placeholder="—" />
            </div>

            {/* Row 3: Node ID, Node Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DisplayField label="Node ID" value={selectedNode?.nodeId} placeholder="—" />
              <DisplayField label="Node Name" value={selectedNode?.nodeName} placeholder="—" />
            </div>

            {/* Row 4: Domain (VRF), Aggregation, IP Network */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DisplayField label="Domain (VRF)" value={selectedNode?.domain} placeholder="—" />
              <DisplayField label="Aggregation" value={selectedNode?.aggregation} placeholder="—" />
              <SelectField label="IP Network" value={reserveData.ipNetwork} onChange={(e) => handleReserveChange('ipNetwork', e.target.value)} options={selectedNode?.ipNetworks || []} placeholder="------------" />
            </div>

            {/* Row 5: IP Address, IP Gateway */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="IP Address" value={reserveData.ipAddress} onChange={(e) => handleReserveChange('ipAddress', e.target.value)} placeholder="เช่น 10.0.1.10" />
              <InputField label="IP Gateway" value={reserveData.ipGateway} onChange={(e) => handleReserveChange('ipGateway', e.target.value)} placeholder="เช่น 10.0.1.1" />
            </div>

            {/* Row 6: Select Model LSW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Select Model LSW" value={reserveData.modelLSW} onChange={(e) => handleReserveChange('modelLSW', e.target.value)} options={modelOptions} placeholder={loadingModels ? "กำลังโหลด Model จาก NetBox..." : "------------"} />
            </div>

            {/* Row 7: Port Uplink Main (แดง) & Backup (ส้ม) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                  Port Uplink Main
                </label>
                <input
                  type="text"
                  placeholder="เช่น GigabitEthernet0/1"
                  value={reserveData.portUplinkMain}
                  onChange={(e) => handleReserveChange('portUplinkMain', e.target.value)}
                  className="w-full rounded-lg border border-red-500/30 bg-base-950 px-4 py-2.5 text-sm text-red-400 placeholder-red-400/40 
                             focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all duration-200"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">
                  Port Uplink Backup
                </label>
                <input
                  type="text"
                  placeholder="เช่น GigabitEthernet0/2"
                  value={reserveData.portUplinkBackup}
                  onChange={(e) => handleReserveChange('portUplinkBackup', e.target.value)}
                  className="w-full rounded-lg border border-orange-500/30 bg-base-950 px-4 py-2.5 text-sm text-orange-400 placeholder-orange-400/40 
                             focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all duration-200"
                />
              </div>
            </div>

            {/* LSW NETWORK Section Header */}
            <div className="flex items-center gap-3 pt-4">
              <div className="h-px flex-1 bg-gradient-to-r from-cds/40 to-transparent" />
              <span className="text-xs font-mono font-bold text-cds uppercase tracking-widest">LSW NETWORK</span>
              <div className="h-px flex-1 bg-gradient-to-l from-cds/40 to-transparent" />
            </div>

            {/* LSW NETWORK Row 1: Port Downlink Main (แดง) & Port Downlink Backup (ส้ม) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                  Port Downlink Main
                </label>
                <input
                  type="text"
                  placeholder="เช่น GigabitEthernet0/3"
                  value={reserveData.portDownlinkMain}
                  onChange={(e) => handleReserveChange('portDownlinkMain', e.target.value)}
                  className="w-full rounded-lg border border-red-500/30 bg-base-950 px-4 py-2.5 text-sm text-red-400 placeholder-red-400/40 
                             focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all duration-200"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">
                  Port Downlink Backup
                </label>
                <input
                  type="text"
                  placeholder="เช่น GigabitEthernet0/4"
                  value={reserveData.portDownlinkBackup}
                  onChange={(e) => handleReserveChange('portDownlinkBackup', e.target.value)}
                  className="w-full rounded-lg border border-orange-500/30 bg-base-950 px-4 py-2.5 text-sm text-orange-400 placeholder-orange-400/40 
                             focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all duration-200"
                />
              </div>
            </div>

            {/* LSW NETWORK Row 2: ID LSW Network, Area Group, Area */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DisplayField label="ID LSW Network" value={selectedNode?.idNetwork} placeholder="—" />
              <DisplayField label="Area Group" value={selectedNode?.areaGroup} placeholder="—" />
              <DisplayField label="Area" value={selectedNode?.area} placeholder="—" />
            </div>

            {/* LSW NETWORK Row 3: IP Address, Site Code, Site Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DisplayField label="IP Address" value={selectedNode?.ipAddress} placeholder="—" />
              <DisplayField label="Site Code" value={selectedNode?.siteCode} placeholder="—" />
              <DisplayField label="Site Name" value={selectedNode?.siteName} placeholder="—" />
            </div>

            {/* LSW NETWORK Row 4: Use For, Ring Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DisplayField label="Use For" value={selectedNode?.useFor} placeholder="—" />
              <DisplayField label="Ring Name" value={selectedNode?.ringName} placeholder="—" />
            </div>

            {/* Select Port PE Section Header */}
            <div className="flex items-center gap-3 pt-4">
              <div className="h-px flex-1 bg-gradient-to-r from-cds/40 to-transparent" />
              <span className="text-xs font-mono font-bold text-cds uppercase tracking-widest">Select Port PE</span>
              <div className="h-px flex-1 bg-gradient-to-l from-cds/40 to-transparent" />
            </div>

            {/* Select Port PE Table */}
            <div className="rounded-xl border border-base-600 bg-base-950 overflow-hidden shadow-glow">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-base-600 bg-base-900/80 text-ink-400 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3 text-center w-12">Select</th>
                      <th className="px-4 py-3">PE ID</th>
                      <th className="px-4 py-3">PE Name</th>
                      <th className="px-4 py-3">PE IP</th>
                      <th className="px-4 py-3">PE Port (MTU)</th>
                      <th className="px-4 py-3">AGG Name</th>
                      <th className="px-4 py-3">AGG Port</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-600/30 text-ink-100">
                    {[
                      { peId: 'PE-01', peName: 'PE-BKK-01', peIp: '10.254.1.1', pePort: 'GigabitEthernet0/0/1', mtu: '1500', aggName: selectedNode?.aggregation || 'AGG-BKK-01', aggPort: '10G-Port-1/1' },
                      { peId: 'PE-02', peName: 'PE-BKK-02', peIp: '10.254.1.2', pePort: 'GigabitEthernet0/0/2', mtu: '9000', aggName: selectedNode?.aggregation || 'AGG-BKK-01', aggPort: '10G-Port-1/2' },
                    ].map((row, idx) => {
                      const isRowSelected = reserveData.selectedPeRows?.includes(row.peId) || false;
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-cds/5 transition-colors duration-150 ${isRowSelected ? 'bg-cds/5' : ''}`}
                        >
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={(e) => {
                                const selected = reserveData.selectedPeRows || [];
                                const nextSelected = e.target.checked
                                  ? [...selected, row.peId]
                                  : selected.filter(id => id !== row.peId);
                                handleReserveChange('selectedPeRows', nextSelected);
                              }}
                              className="rounded border-base-600 bg-base-950 text-cds focus:ring-0 focus:ring-offset-0 h-4 w-4 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-semibold text-cds">{row.peId}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{row.peName}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-blue-400">{row.peIp}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span>{row.pePort}</span>
                              <span className="text-[10px] text-ink-600">MTU: {row.mtu}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{row.aggName}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{row.aggPort}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveStep(1)}
                  className="inline-flex items-center gap-2 rounded-lg border border-base-600 bg-base-950/60 px-5 py-2.5 text-sm font-semibold text-ink-400 
                             hover:text-ink-100 hover:bg-base-800 active:scale-[0.97] transition-all duration-200"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleClearReserve}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 
                             hover:bg-red-500/20 active:scale-[0.97] transition-all duration-200"
                >
                  Clear
                </button>
              </div>
              <button
                onClick={handleReserveSubmit}
                className="inline-flex items-center gap-2 rounded-lg border border-cds/30 bg-cds px-6 py-2.5 text-sm font-semibold text-base-950 
                           hover:bg-cds/90 active:scale-[0.97] transition-all duration-200 shadow-[0_0_20px_rgba(255,154,61,0.2)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Reserve Port
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSS for stepper animation */}
      <style>{`
        @keyframes stepperFlow {
          0% { background-position: -40px 0; }
          100% { background-position: 40px 0; }
        }
      `}</style>
    </div>
  );
}
