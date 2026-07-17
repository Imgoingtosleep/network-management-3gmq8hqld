import { useState, useRef } from 'react';

const categories = [
  { 
    id: 'lsw_network', 
    label: 'LSW Network', 
    headers: ['nodeId', 'idNetwork', 'areaGroup', 'area', 'ipAddress', 'siteCode', 'siteName', 'nodeType', 'nodeName', 'status', 'useFor', 'ringName'] 
  },
  { 
    id: 'ip_prefix', 
    label: 'IP Prefix', 
    headers: ['prefix', 'vrf', 'vlan', 'ringname', 'status'] 
  },
  { 
    id: 'ip_address', 
    label: 'IP Address', 
    headers: ['address', 'vrf', 'device', 'interface', 'status', 'description'] 
  },
  { 
    id: 'pe_port_map', 
    label: 'PE Port Map', 
    headers: ['peId', 'peName', 'peIp', 'pePort', 'mtu', 'aggName', 'aggPort'] 
  },
];

export default function CDSBulkImportPage() {
  const [activeTab, setActiveTab] = useState(categories[0].id);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);

  // เปลี่ยนหมวดหมู่ให้นำข้อมูลเก่าออก
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    handleClear();
  };

  // Handle Drag Events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Process CSV Content
  const processCSV = (text) => {
    try {
      // Split lines and filter empty lines
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length === 0) {
        setErrorMessage("ไฟล์ CSV ไม่มีข้อมูล");
        return;
      }

      // Simple CSV parser supporting quotes
      const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      // Extract Headers
      const rawHeaders = parseCSVLine(lines[0]);
      setHeaders(rawHeaders);

      // Extract Rows
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === rawHeaders.length) {
          const rowObj = {};
          rawHeaders.forEach((header, index) => {
            rowObj[header] = values[index];
          });
          rows.push(rowObj);
        }
      }

      setParsedData(rows);
      setSuccessMessage(`โหลดไฟล์เรียบร้อย! ตรวจพบข้อมูลทั้งหมด ${rows.length} แถว`);
      setErrorMessage('');
    } catch (err) {
      console.error(err);
      setErrorMessage("เกิดข้อผิดพลาดในการแยกวิเคราะห์ (Parse) ไฟล์ CSV");
    }
  };

  // Handle File Drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv') || droppedFile.type === "text/csv") {
        setFile(droppedFile);
        const reader = new FileReader();
        reader.onload = (event) => processCSV(event.target.result);
        reader.readAsText(droppedFile);
      } else {
        setErrorMessage("กรุณาอัปโหลดเฉพาะไฟล์นามสกุล .csv เท่านั้น");
      }
    }
  };

  // Handle File Input Change
  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => processCSV(event.target.result);
      reader.readAsText(selectedFile);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  // Mock Upload to Server
  const handleImportSubmit = async () => {
    if (parsedData.length === 0) return;
    setImporting(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      // จำลองการเชื่อมต่อ API หลังบ้าน 1.5 วินาที
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccessMessage("นำเข้าข้อมูล (Bulk Import) สำเร็จเรียบร้อยแล้ว!");
      setFile(null);
      setParsedData([]);
      setHeaders([]);
    } catch (err) {
      setErrorMessage("การนำเข้าข้อมูลล้มเหลว กรุณาลองใหม่อีกครั้ง");
    } finally {
      setImporting(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const activeCategory = categories.find(c => c.id === activeTab);

  return (
    <div className="space-y-6 text-left">
      {/* Category Tabs */}
      <div className="flex flex-col gap-3">
        <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider">
          เลือกหัวข้อการนำเข้า (Import Category)
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleTabChange(cat.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all duration-200
                  ${isActive
                    ? 'bg-cds/10 border-cds text-cds shadow-[0_0_15px_rgba(255,154,61,0.15)] font-bold'
                    : 'bg-base-900 border-base-600 text-ink-400 hover:text-ink-200 hover:border-base-650'
                  }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Required Headers List */}
        <div className="rounded-lg border border-base-650/40 bg-base-950/40 p-3.5 space-y-2">
          <span className="block text-[11px] font-bold text-cds uppercase tracking-wide">
            หัวตาราง (Headers) ที่จำเป็นต้องใช้ในไฟล์ CSV:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {activeCategory?.headers.map((h) => (
              <span key={h} className="rounded bg-base-950 px-2 py-0.5 font-mono text-[10px] text-ink-300 border border-base-600/50">
                {h}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CSV Drag & Drop Uploader */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-all duration-350 shadow-glow
          ${dragActive 
            ? 'border-cds bg-cds/5' 
            : file 
              ? 'border-cds/40 bg-base-900' 
              : 'border-base-600 bg-base-900 hover:border-base-600/80'
          }`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".csv"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-cds/10 rounded-full border border-cds/20 text-cds">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          {file ? (
            <div>
              <p className="text-sm font-semibold text-ink-100 font-mono">{file.name}</p>
              <p className="text-xs text-ink-600 font-mono mt-1">({(file.size / 1024).toFixed(2)} KB)</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-ink-200">
                ลากและวางไฟล์ CSV ของคุณลงที่นี่ หรือ{" "}
                <button onClick={handleButtonClick} className="text-cds hover:underline font-semibold focus:outline-none">
                  คลิกเพื่อเลือกไฟล์
                </button>
              </p>
              <p className="text-xs text-ink-650 mt-1 font-mono">รองรับไฟล์ CSV (.csv) เท่านั้น</p>
            </div>
          )}
        </div>
      </div>

      {/* Message Area */}
      {errorMessage && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400 font-mono">
          ⚠️ {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400 font-mono">
          ✓ {successMessage}
        </div>
      )}

      {/* CSV Data Preview Table */}
      {parsedData.length > 0 && (
        <div className="rounded-xl border border-base-600 bg-base-900 overflow-hidden shadow-glow space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-100 uppercase tracking-wider font-mono">
              ข้อมูลตัวอย่างก่อนนำเข้า (CSV Preview)
            </h3>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleClear}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-base-600 bg-base-950 text-ink-450 hover:text-ink-100 hover:bg-base-800 transition-all font-mono"
              >
                ล้างข้อมูล
              </button>
              <button 
                onClick={handleImportSubmit}
                disabled={importing}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-cds text-base-950 hover:bg-cds/95 transition-all shadow-[0_0_15px_rgba(255,154,61,0.15)] disabled:opacity-50 font-mono"
              >
                {importing ? 'กำลังนำเข้าข้อมูล...' : 'เริ่มการนำเข้าข้อมูล'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-base-600/40 bg-base-950">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-base-600 bg-base-900/60 text-ink-400 font-semibold uppercase tracking-wider">
                  {headers.map((h, i) => (
                    <th key={i} className="px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-base-600/20 text-ink-300">
                {parsedData.slice(0, 5).map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-base-900/20 transition-all">
                    {headers.map((h, colIdx) => (
                      <td key={colIdx} className="px-4 py-2.5 whitespace-nowrap">{row[h] || '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedData.length > 5 && (
            <p className="text-[11px] text-ink-600 italic font-mono text-center">
              ...และข้อมูลอื่นๆ อีก {parsedData.length - 5} แถว...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
