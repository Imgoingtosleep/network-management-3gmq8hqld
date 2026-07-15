import { useEffect, useState, useMemo } from 'react';
import { cdsApi } from '../../api/cds.api.js';

export default function CDSDashboardPage() {
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // ฟังก์ชันดึงข้อมูลจาก API จริง
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await cdsApi.getDashboard();
      const resultList = res.data?.data || res.data || res || [];
      setData(resultList);
    } catch (err) {
      console.error('Failed to fetch CDS dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // คอลัมน์ทั้งหมดของตารางตามความต้องการ
  const headers = [
    { key: 'pe_name', label: 'PE Name' },
    { key: 'ip_loopback', label: 'IP Loopback' },
    { key: 'model', label: 'Model' },
    { key: 'type', label: 'Type' },
    { key: 'pe_port_list', label: 'PE Port List' },
    { key: 'pe_vlan_customer', label: 'PE Vlan Customer' },
    { key: 'agg_id', label: 'AGG ID' },
    { key: 'agg_ip_network', label: 'AGG IP Network' },
    { key: 'agg_vlan', label: 'AGG Vlan' },
    { key: 'nw_lsw_id', label: 'NW LSW ID' },
    { key: 'nw_lsw_ip', label: 'NW LSW IP' },
    { key: 'nw_lsw_use_for', label: 'NW LSW USE FOR' },
    { key: 'nw_lsw_port', label: 'NW LSW Port' },
    { key: 'access_lsw_id', label: 'Access LSW ID' },
    { key: 'access_lsw_model', label: 'Access LSW Model' },
    { key: 'access_lsw_port_uplink', label: 'Access LSW Port Uplink' },
    { key: 'access_lsw_port_customer', label: 'Access LSW Port Customer' },
    { key: 'access_lsw_ip', label: 'Access LSW IP' },
    { key: 'access_lsw_vlan_management', label: 'Access LSW Vlan Management' },
  ];

  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // ฟังก์ชันดาวน์โหลดข้อมูลเป็น CSV
  const handleExportCSV = () => {
    const csvRows = [];
    // เขียนหัวตาราง (Headers)
    csvRows.push(headers.map(h => `"${h.label.replace(/"/g, '""')}"`).join(','));
    
    // เขียนข้อมูลแถวตาราง
    for (const row of filteredData) {
      const values = headers.map(header => {
        const val = row[header.key] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvContent = "\uFEFF" + csvRows.join('\n'); // ป้องกันภาษาไทยเพี้ยนใน Excel (UTF-8 BOM)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cds_dashboard_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ฟังก์ชันรีเฟรชข้อมูลจริงจาก API หลังบ้าน
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6 text-left">
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
            {/* <svg
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15H19"
              />
            </svg> */}
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

      {/* Table Container - Horizontal scrollable and packed into single rows */}
      <div className="rounded-xl border border-base-600 bg-base-900 shadow-glow overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full table-auto border-collapse text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-base-600 bg-base-950/80">
                {headers.map((header) => (
                  <th
                    key={header.key}
                    className="whitespace-nowrap px-4 py-3 font-semibold text-ink-400 border-r border-base-600/50 last:border-r-0 tracking-wider uppercase"
                  >
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-base-600/40">
              {filteredData.length > 0 ? (
                filteredData.map((row, index) => (
                  <tr
                    key={index}
                    className="hover:bg-cds/5 transition-colors group"
                  >
                    {headers.map((header) => {
                      const value = row[header.key];
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
                ))
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
        </div>
      </div>
    </div>
  );
}
