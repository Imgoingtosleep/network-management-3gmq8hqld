import { useState, useRef, useEffect } from 'react';

const steps = [
  { number: 1, label: 'Select Network' },
  { number: 2, label: 'Reserve Port' },
];

// ตัวอย่างข้อมูล Node ID พร้อมรายละเอียด Network (จะเปลี่ยนเป็นดึงจาก API ได้ภายหลัง)
const mockNodeData = [
  { nodeId: 'ACC-SW-BKK-01', idNetwork: 'NW-001', areaGroup: 'Central', area: 'Bangkok', ipAddress: '10.0.1.1', siteCode: 'BKK-DC-01', siteName: 'Bangkok Data Center 1', nodeType: 'Access Switch', nodeName: 'BKK-ACC-SW-01', status: 'Active', domain: 'VRF-CUSTOMER-A', aggregation: 'AGG-BKK-01', ipNetworks: ['10.0.1.0/24', '10.0.1.128/25', '172.16.1.0/24'], useFor: 'Corporate Clients', ringName: 'RING-BKK-01' },
  { nodeId: 'ACC-SW-BKK-02', idNetwork: 'NW-002', areaGroup: 'Central', area: 'Bangkok', ipAddress: '10.0.1.2', siteCode: 'BKK-DC-02', siteName: 'Bangkok Data Center 2', nodeType: 'Access Switch', nodeName: 'BKK-ACC-SW-02', status: 'Active', domain: 'VRF-CUSTOMER-B', aggregation: 'AGG-BKK-02', ipNetworks: ['10.0.2.0/24', '10.0.2.128/25'], useFor: 'Government Projects', ringName: 'RING-BKK-02' },
  { nodeId: 'ACC-SW-CNX-01', idNetwork: 'NW-003', areaGroup: 'North', area: 'Chiang Mai', ipAddress: '10.0.2.1', siteCode: 'CNX-DC-01', siteName: 'Chiang Mai Data Center', nodeType: 'Distribution Switch', nodeName: 'CNX-ACC-SW-01', status: 'Active', domain: 'VRF-CUSTOMER-A', aggregation: 'AGG-CNX-01', ipNetworks: ['10.0.3.0/24', '172.16.3.0/24'], useFor: 'Retail Chain', ringName: 'RING-CNX-01' },
  { nodeId: 'ACC-SW-CNX-02', idNetwork: 'NW-004', areaGroup: 'North', area: 'Chiang Mai', ipAddress: '10.0.2.2', siteCode: 'CNX-DC-02', siteName: 'Chiang Mai Data Center 2', nodeType: 'Access Switch', nodeName: 'CNX-ACC-SW-02', status: 'Planned', domain: 'VRF-CUSTOMER-C', aggregation: 'AGG-CNX-01', ipNetworks: ['10.0.4.0/24'], useFor: 'Public Wi-Fi', ringName: 'RING-CNX-02' },
  { nodeId: 'ACC-SW-HKT-01', idNetwork: 'NW-005', areaGroup: 'South', area: 'Phuket', ipAddress: '10.0.3.1', siteCode: 'HKT-DC-01', siteName: 'Phuket Data Center', nodeType: 'Access Switch', nodeName: 'HKT-ACC-SW-01', status: 'Active', domain: 'VRF-CUSTOMER-A', aggregation: 'AGG-HKT-01', ipNetworks: ['10.0.5.0/24', '172.16.5.0/24'], useFor: 'Hotel Group', ringName: 'RING-HKT-01' },
  { nodeId: 'ACC-SW-KKN-01', idNetwork: 'NW-006', areaGroup: 'Northeast', area: 'Khon Kaen', ipAddress: '10.0.4.1', siteCode: 'KKN-DC-01', siteName: 'Khon Kaen Data Center', nodeType: 'Distribution Switch', nodeName: 'KKN-ACC-SW-01', status: 'Active', domain: 'VRF-CUSTOMER-B', aggregation: 'AGG-KKN-01', ipNetworks: ['10.0.6.0/24'], useFor: 'University Network', ringName: 'RING-KKN-01' },
  { nodeId: 'ACC-SW-NKR-01', idNetwork: 'NW-007', areaGroup: 'Central', area: 'Nakhon Ratchasima', ipAddress: '10.0.5.1', siteCode: 'NKR-DC-01', siteName: 'Nakhon Ratchasima DC', nodeType: 'Access Switch', nodeName: 'NKR-ACC-SW-01', status: 'Maintenance', domain: 'VRF-CUSTOMER-A', aggregation: 'AGG-NKR-01', ipNetworks: ['10.0.7.0/24', '172.16.7.0/24'], useFor: 'Industrial Zone', ringName: 'RING-NKR-01' },
  { nodeId: 'ACC-SW-UDN-01', idNetwork: 'NW-008', areaGroup: 'Northeast', area: 'Udon Thani', ipAddress: '10.0.6.1', siteCode: 'UDN-DC-01', siteName: 'Udon Thani Data Center', nodeType: 'Access Switch', nodeName: 'UDN-ACC-SW-01', status: 'Active', domain: 'VRF-CUSTOMER-C', aggregation: 'AGG-UDN-01', ipNetworks: ['10.0.8.0/24'], useFor: 'Smart City Project', ringName: 'RING-UDN-01' },
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

export default function CDSSearchReservePage() {
  const [activeStep, setActiveStep] = useState(1);

  // Form state สำหรับ Step 1
  const [formData, setFormData] = useState({
    idNetwork: '',
    areaGroup: '',
    area: '',
    ipAddress: '',
    siteCode: '',
    siteName: '',
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

  // Search state สำหรับ Node ID
  const [nodeSearch, setNodeSearch] = useState('');
  const [showNodeDropdown, setShowNodeDropdown] = useState(false);
  const nodeRef = useRef(null);

  // กรอง options ตาม search text
  const filteredNodeIdOptions = mockNodeData.filter((node) =>
    node.nodeId.toLowerCase().includes(nodeSearch.toLowerCase())
  );

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (nodeRef.current && !nodeRef.current.contains(e.target)) {
        setShowNodeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // เมื่อเลือก Node ID → auto-fill ข้อมูล Network ด้านบน + เก็บ node object
  const handleNodeSelect = (node) => {
    setFormData({
      nodeId: node.nodeId,
      idNetwork: node.idNetwork,
      areaGroup: node.areaGroup,
      area: node.area,
      ipAddress: node.ipAddress,
      siteCode: node.siteCode,
      siteName: node.siteName,
    });
    setSelectedNode(node);
    setNodeSearch(node.nodeId);
    setShowNodeDropdown(false);
  };

  // ล้างข้อมูลทั้งหมด
  const handleClearNode = () => {
    setFormData({ idNetwork: '', areaGroup: '', area: '', ipAddress: '', siteCode: '', siteName: '', nodeId: '' });
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

  // Reusable read-only display field component
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

  // Reusable input field component สำหรับ Step 2
  const InputField = ({ label, field, placeholder }) => (
    <div className="flex-1 min-w-0">
      <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={reserveData[field]}
        onChange={(e) => handleReserveChange(field, e.target.value)}
        className="w-full rounded-lg border border-base-600 bg-base-950 px-4 py-2.5 text-sm text-ink-100 placeholder-ink-600 
                   focus:border-cds focus:outline-none focus:ring-1 focus:ring-cds/30 transition-all duration-200"
      />
    </div>
  );

  // Reusable select field component
  const SelectField = ({ label, field, options, placeholder }) => (
    <div className="flex-1 min-w-0">
      <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">
        {label}
      </label>
      <select
        value={reserveData[field]}
        onChange={(e) => handleReserveChange(field, e.target.value)}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DisplayField label="ID Network" value={formData.idNetwork} />
              <DisplayField label="Area Group" value={formData.areaGroup} />
              <DisplayField label="Area" value={formData.area} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DisplayField label="IP Address" value={formData.ipAddress} />
              <DisplayField label="Site Code" value={formData.siteCode} />
              <DisplayField label="Site Name" value={formData.siteName} />
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-base-600/60" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-base-900 px-4 text-xs font-mono text-ink-600 uppercase tracking-widest">Node</span>
              </div>
            </div>

            {/* Node ID Search */}
            <div className="max-w-md" ref={nodeRef}>
              <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Node ID</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600 pointer-events-none">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="ค้นหา Node ID..."
                  value={nodeSearch}
                  onChange={(e) => { setNodeSearch(e.target.value); setShowNodeDropdown(true); }}
                  onFocus={() => setShowNodeDropdown(true)}
                  className="w-full rounded-lg border border-base-600 bg-base-950 pl-10 pr-10 py-2.5 text-sm text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none focus:ring-1 focus:ring-cds/30 transition-all duration-200"
                />
                {nodeSearch && (
                  <button onClick={handleClearNode} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-600 hover:text-ink-100 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                {showNodeDropdown && (
                  <div className="absolute z-20 mt-1.5 w-full rounded-lg border border-base-600 bg-base-800 shadow-glow overflow-hidden">
                    {filteredNodeIdOptions.length > 0 ? (
                      <ul className="max-h-48 overflow-y-auto py-1">
                        {filteredNodeIdOptions.map((node) => (
                          <li
                            key={node.nodeId}
                            onClick={() => handleNodeSelect(node)}
                            className={`flex items-center gap-3 cursor-pointer px-4 py-2.5 text-sm transition-colors duration-150 ${formData.nodeId === node.nodeId ? 'bg-cds/10 text-cds' : 'text-ink-100 hover:bg-base-700'}`}
                          >
                            <span className={`flex-shrink-0 h-2 w-2 rounded-full ${formData.nodeId === node.nodeId ? 'bg-cds' : 'bg-ink-600'}`} />
                            <span className="font-mono">{node.nodeId}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-ink-600">ไม่พบ Node ID ที่ค้นหา</div>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-xs text-ink-600">เลือก Node ID เพื่อแสดงข้อมูล Network ด้านบนอัตโนมัติ</p>
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
                <InputField label="Job Ref." field="jobRef" placeholder="เช่น JOB-2025-001" />
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
              <SelectField label="IP Network" field="ipNetwork" options={selectedNode?.ipNetworks || []} placeholder="------------" />
            </div>

            {/* Row 5: IP Address, IP Gateway */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="IP Address" field="ipAddress" placeholder="เช่น 10.0.1.10" />
              <InputField label="IP Gateway" field="ipGateway" placeholder="เช่น 10.0.1.1" />
            </div>

            {/* Row 6: Select Model LSW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Select Model LSW" field="modelLSW" options={mockModelLSW} placeholder="------------" />
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
