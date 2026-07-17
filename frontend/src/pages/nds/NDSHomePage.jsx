import { useEffect, useState } from 'react';
import { ndsApi } from '../../api/nds.api.js';
import Sidebar from '../../components/Sidebar.jsx';

const getUtilColor = (utilStr) => {
  const val = parseInt(utilStr);
  if (isNaN(val)) return 'text-ink-400';
  if (val >= 85) return 'text-red-400 font-semibold';
  if (val >= 50) return 'text-yellow-400 font-semibold';
  return 'text-green-400';
};

const getUtilBarColor = (val) => {
  if (val >= 85) return 'bg-red-500';
  if (val >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
};

const renderUtilBar = (utilStr) => {
  const val = parseInt(utilStr) || 0;
  const barColor = getUtilBarColor(val);
  return (
    <div className="flex items-center gap-2.5 min-w-[110px]">
      <div className="w-14 h-2 bg-base-950 rounded-full overflow-hidden border border-base-600/30">
        <div 
          className={`h-full ${barColor} transition-all duration-500`} 
          style={{ width: `${val}%` }}
        />
      </div>
      <span className={`font-mono text-xs ${getUtilColor(utilStr)}`}>{utilStr}</span>
    </div>
  );
};

const menuItems = [
  { label: 'Site Management', value: 'sites' },
  { label: 'PE Devices', value: 'pes' },
  { label: 'LSW / NT Devices', value: 'lsw_nts' },
  { label: 'IP Management (Prefix)', value: 'prefixes' },
  { label: 'AGG Devices', value: 'aggs' },
  { label: 'Domains', value: 'domains' },
  { label: 'Assign Ring Name', value: 'rings' },
];

export default function NDSHomePage() {
  const [activeTab, setActiveTab] = useState('sites');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination and Search state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 50;

  // Data states
  const [sites, setSites] = useState([]);
  const [pes, setPEs] = useState([]);
  const [lswNts, setLswNts] = useState([]);
  const [prefixes, setPrefixes] = useState([]);
  const [aggs, setAggs] = useState([]);
  const [domains, setDomains] = useState([]);
  const [rings, setRings] = useState([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setCurrentPage(1); // Reset page on tab switch
    setSearchQuery(''); // Reset search on tab switch

    const loadData = async () => {
      try {
        const res = await ndsApi[activeTab].list();
        const resSites = await ndsApi.sites.list();
        const resAggs = await ndsApi.aggs.list();
        const resDom = await ndsApi.domains.list();
        
        if (mounted) {
          setSites(resSites.data?.data || []);
          setAggs(resAggs.data?.data || []);
          setDomains(resDom.data?.data || []);
          
          if (activeTab === 'sites') setSites(res.data?.data || []);
          if (activeTab === 'pes') setPEs(res.data?.data || []);
          if (activeTab === 'lsw_nts') setLswNts(res.data?.data || []);
          if (activeTab === 'prefixes') setPrefixes(res.data?.data || []);
          if (activeTab === 'aggs') setAggs(res.data?.data || []);
          if (activeTab === 'domains') setDomains(res.data?.data || []);
          if (activeTab === 'rings') setRings(res.data?.data || []);
        }
      } catch (err) {
        if (mounted) setError('ไม่สามารถเชื่อมต่อดึงข้อมูลหลังบ้านได้');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, [activeTab]);

  // Helper to resolve site name
  const getSiteName = (siteId) => {
    const site = sites.find(s => s.id === Number(siteId));
    return site ? site.name : 'Unknown Site';
  };

  // Helper to resolve Agg / Domain name
  const getAggName = (aggId) => {
    const agg = aggs.find(a => a.id === Number(aggId));
    return agg ? agg.name : 'Unknown AGG';
  };

  const getDomainName = (domId) => {
    const dom = domains.find(d => d.id === Number(domId));
    return dom ? dom.name : 'Unknown Domain';
  };

  // Search logic
  const getFilteredData = (dataList) => {
    if (!searchQuery) return dataList;
    const query = searchQuery.toLowerCase().trim();
    return dataList.filter(item => {
      return Object.entries(item).some(([key, val]) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') {
          return Object.values(val).some(nestedVal => 
            nestedVal && String(nestedVal).toLowerCase().includes(query)
          );
        }
        return String(val).toLowerCase().includes(query);
      });
    });
  };

  // Pagination Helpers
  const paginate = (dataList) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return dataList.slice(startIndex, startIndex + itemsPerPage);
  };

  const renderPagination = (totalItems) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        
        if (currentPage <= 2) {
          end = 3;
        }
        if (currentPage >= totalPages - 1) {
          start = totalPages - 2;
        }
        
        if (start > 2) pages.push('...');
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
      return pages;
    };

    const pageNumbers = getPageNumbers();
    
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 px-5 py-4 border-t border-base-600/30 gap-4">
        <span className="text-xs text-ink-600 font-mono">
          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
        </span>
        <div className="flex gap-1.5 items-center">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-xs rounded border border-base-600 bg-base-900 text-ink-400 hover:bg-base-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Prev
          </button>
          {pageNumbers.map((pageNum, index) => {
            if (pageNum === '...') {
              return <span key={`ellipsis-${index}`} className="px-2 text-xs text-ink-600 font-mono">...</span>;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1.5 text-xs rounded border transition-all ${
                  currentPage === pageNum
                    ? 'border-nds bg-nds/20 text-nds font-semibold'
                    : 'border-base-600 bg-base-900 text-ink-400 hover:bg-base-800'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-xs rounded border border-base-600 bg-base-900 text-ink-400 hover:bg-base-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const rawList = getActiveList();
  const filteredList = getFilteredData(rawList);

  function getActiveList() {
    if (activeTab === 'sites') return sites;
    if (activeTab === 'pes') return pes;
    if (activeTab === 'lsw_nts') return lswNts;
    if (activeTab === 'prefixes') return prefixes;
    if (activeTab === 'aggs') return aggs;
    if (activeTab === 'domains') return domains;
    if (activeTab === 'rings') return rings;
    return [];
  }

  return (
    <div className="flex gap-10">
      <Sidebar accent="nds" items={menuItems} activeTab={activeTab} onSelectTab={setActiveTab} />

      <section className="flex-1 overflow-hidden">
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-base-600/30 pb-6">
          <div>
            <span className="rounded-full border border-nds/30 bg-nds/10 px-3 py-1 font-mono text-xs tracking-widest text-nds">
              NDS NETWORK MANAGEMENT
            </span>
            <h1 className="mt-4 font-display text-3xl font-semibold text-ink-100 uppercase tracking-wide">
              {menuItems.find(t => t.value === activeTab)?.label}
            </h1>
          </div>
        </div>

        {/* Alerts / Error Messages */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 font-mono">
            ⚠️ {error}
          </div>
        )}

        {/* Search & Dynamic Status Header */}
        {!loading && (
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-between items-center bg-base-800/40 p-4 rounded-xl border border-base-600/50">
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="ค้นหาด่วน (เช่น ชื่อ, IP, รุ่น, ไซต์)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-base-600 bg-base-950 px-3.5 py-2 pl-9 text-xs text-ink-100 placeholder-ink-500 focus:border-nds focus:outline-none focus:ring-1 focus:ring-nds"
              />
              <span className="absolute left-3 top-2.5 text-xs opacity-60">🔍</span>
            </div>
            <div className="text-xs text-ink-400 font-mono">
              ข้อมูลทั้งหมด: <span className="text-nds font-bold text-sm mx-1">{rawList.length}</span> รายการ
              {searchQuery && (
                <>
                  {' '}| ค้นพบ: <span className="text-green-400 font-bold text-sm mx-1">{filteredList.length}</span> รายการ
                </>
              )}
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <p className="mt-10 text-sm text-ink-400 animate-pulse text-center">กำลังโหลดข้อมูลระบบ...</p>
        )}

        {/* Render Tab Contents */}
        {!loading && (
          <div className="mt-4">
            {/* Sites Tab */}
            {activeTab === 'sites' && (
              <div className="overflow-hidden rounded-xl border border-base-600/60 bg-base-800/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
                      <tr>
                        <th className="px-5 py-3.5">Site Name</th>
                        <th className="px-5 py-3.5">Slug</th>
                        <th className="px-5 py-3.5">Region</th>
                        <th className="px-5 py-3.5">Tenant</th>
                        <th className="px-5 py-3.5">Facility</th>
                        <th className="px-5 py-3.5">ASN</th>
                        <th className="px-5 py-3.5">Physical Address</th>
                        <th className="px-5 py-3.5">Description</th>
                        <th className="px-5 py-3.5">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-600/30">
                      {paginate(filteredList).map(item => (
                        <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                          <td className="px-5 py-4 font-medium text-ink-100">{item.name}</td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.slug}</td>
                          <td className="px-5 py-4 text-ink-400">{item.region}</td>
                          <td className="px-5 py-4 text-ink-400">{item.tenant}</td>
                          <td className="px-5 py-4 text-ink-400">{item.facility}</td>
                          <td className="px-5 py-4 font-mono text-xs text-nds">{item.asn}</td>
                          <td className="px-5 py-4 text-ink-400 max-w-xs truncate">{item.physical_address}</td>
                          <td className="px-5 py-4 text-ink-400 max-w-xs truncate">{item.description}</td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-600">{item.last_updated}</td>
                        </tr>
                      ))}
                      {filteredList.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลผลลัพธ์ที่ค้นหา</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPagination(filteredList.length)}
              </div>
            )}

            {/* PE Devices Tab */}
            {activeTab === 'pes' && (
              <div className="overflow-hidden rounded-xl border border-base-600/60 bg-base-800/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
                      <tr>
                        <th className="px-5 py-3.5">Router Name</th>
                        <th className="px-5 py-3.5">Vendor/MFG</th>
                        <th className="px-5 py-3.5">Model</th>
                        <th className="px-5 py-3.5">Loopback IP</th>
                        <th className="px-5 py-3.5">Site Location</th>
                        <th className="px-5 py-3.5">Location</th>
                        <th className="px-5 py-3.5">Rack</th>
                        <th className="px-5 py-3.5">Serial</th>
                        <th className="px-5 py-3.5">Asset Tag</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-600/30">
                      {paginate(filteredList).map(item => (
                        <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                          <td className="px-5 py-4 font-mono font-medium text-ink-100">{item.name}</td>
                          <td className="px-5 py-4 text-ink-400">{item.manufacturer}</td>
                          <td className="px-5 py-4 text-ink-400">{item.model}</td>
                          <td className="px-5 py-4 font-mono text-nds">{item.ip}</td>
                          <td className="px-5 py-4 text-ink-400">{item.siteName || getSiteName(item.siteId)}</td>
                          <td className="px-5 py-4 text-ink-400">{item.location}</td>
                          <td className="px-5 py-4 text-ink-400">{item.rack}</td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.serial}</td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.asset_tag}</td>
                          <td className="px-5 py-4">
                            <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-400 border border-green-500/20">{item.status}</span>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-600">{item.last_updated}</td>
                        </tr>
                      ))}
                      {filteredList.length === 0 && (
                        <tr>
                          <td colSpan={11} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลผลลัพธ์ที่ค้นหา</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPagination(filteredList.length)}
              </div>
            )}

            {/* LSW / NT Devices Tab */}
            {activeTab === 'lsw_nts' && (
              <div className="overflow-hidden rounded-xl border border-base-600/60 bg-base-800/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
                      <tr>
                        <th className="px-5 py-3.5">Device Name</th>
                        <th className="px-5 py-3.5">Device Role</th>
                        <th className="px-5 py-3.5">Vendor/MFG</th>
                        <th className="px-5 py-3.5">Model</th>
                        <th className="px-5 py-3.5">Management IP</th>
                        <th className="px-5 py-3.5">Site Location</th>
                        <th className="px-5 py-3.5">Location</th>
                        <th className="px-5 py-3.5">Rack</th>
                        <th className="px-5 py-3.5">Serial</th>
                        <th className="px-5 py-3.5">Asset Tag</th>
                        <th className="px-5 py-3.5">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-600/30">
                      {paginate(filteredList).map(item => (
                        <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                          <td className="px-5 py-4 font-mono font-medium text-ink-100">{item.name}</td>
                          <td className="px-5 py-4 text-ink-400 font-semibold text-xs">{item.role}</td>
                          <td className="px-5 py-4 text-ink-400">{item.manufacturer}</td>
                          <td className="px-5 py-4 text-ink-400">{item.model}</td>
                          <td className="px-5 py-4 font-mono text-nds">{item.ip}</td>
                          <td className="px-5 py-4 text-ink-400">{item.siteName || getSiteName(item.siteId)}</td>
                          <td className="px-5 py-4 text-ink-400">{item.location}</td>
                          <td className="px-5 py-4 text-ink-400">{item.rack}</td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.serial}</td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.asset_tag}</td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-600">{item.last_updated}</td>
                        </tr>
                      ))}
                      {filteredList.length === 0 && (
                        <tr>
                          <td colSpan={11} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลผลลัพธ์ที่ค้นหา</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPagination(filteredList.length)}
              </div>
            )}

            {/* IP Management (Prefix) Tab */}
            {activeTab === 'prefixes' && (
              <div className="overflow-hidden rounded-xl border border-base-600/60 bg-base-800/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
                      <tr>
                        <th className="px-5 py-3.5">VRF</th>
                        <th className="px-5 py-3.5">Ring Name</th>
                        <th className="px-5 py-3.5">IP Prefix Block</th>
                        <th className="px-5 py-3.5">VLAN ID</th>
                        <th className="px-5 py-3.5">Utilization</th>
                        <th className="px-5 py-3.5">Tenant</th>
                        <th className="px-5 py-3.5">Role</th>
                        <th className="px-5 py-3.5">Description</th>
                        <th className="px-5 py-3.5">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-600/30">
                      {paginate(filteredList).map(item => (
                        <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                          <td className="px-5 py-4 text-ink-400 font-mono text-xs">{item.vrf}</td>
                          <td className="px-5 py-4 font-mono text-xs">
                            {item.ringname && item.ringname !== 'N/A' ? (
                              <span className="text-nds font-semibold uppercase">
                                {item.ringname}
                              </span>
                            ) : (
                              <span className="text-ink-600">N/A</span>
                            )}
                          </td>
                          <td className="px-5 py-4 font-mono font-medium text-nds">{item.prefix}</td>
                          <td className="px-5 py-4 font-mono text-ink-400">{item.vlan}</td>
                          <td className="px-5 py-4">{renderUtilBar(item.utilization)}</td>
                          <td className="px-5 py-4 text-ink-400">{item.tenant}</td>
                          <td className="px-5 py-4 text-ink-400 text-xs">{item.role}</td>
                          <td className="px-5 py-4 text-ink-400 max-w-xs truncate">{item.description}</td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-600">{item.last_updated}</td>
                        </tr>
                      ))}
                      {filteredList.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลผลลัพธ์ที่ค้นหา</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPagination(filteredList.length)}
              </div>
            )}

            {/* AGG Devices Tab */}
            {activeTab === 'aggs' && (
              <div className="overflow-hidden rounded-xl border border-base-600/60 bg-base-800/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
                      <tr>
                        <th className="px-5 py-3.5">AGG Router Name</th>
                        <th className="px-5 py-3.5">Vendor/MFG</th>
                        <th className="px-5 py-3.5">Model</th>
                        <th className="px-5 py-3.5">IP Address</th>
                        <th className="px-5 py-3.5">Site Location</th>
                        <th className="px-5 py-3.5">Location</th>
                        <th className="px-5 py-3.5">Rack</th>
                        <th className="px-5 py-3.5">Serial</th>
                        <th className="px-5 py-3.5">Asset Tag</th>
                        <th className="px-5 py-3.5">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-600/30">
                      {paginate(filteredList).map(item => (
                        <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                          <td className="px-5 py-4 font-mono font-medium text-ink-100">{item.name}</td>
                          <td className="px-5 py-4 text-ink-400">{item.manufacturer}</td>
                          <td className="px-5 py-4 text-ink-400">{item.model}</td>
                          <td className="px-5 py-4 font-mono text-nds">{item.ip}</td>
                          <td className="px-5 py-4 text-ink-400">{item.siteName || getSiteName(item.siteId)}</td>
                          <td className="px-5 py-4 text-ink-400">{item.location}</td>
                          <td className="px-5 py-4 text-ink-400">{item.rack}</td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.serial}</td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.asset_tag}</td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-600">{item.last_updated}</td>
                        </tr>
                      ))}
                      {filteredList.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลผลลัพธ์ที่ค้นหา</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPagination(filteredList.length)}
              </div>
            )}

            {/* Domains Tab */}
            {activeTab === 'domains' && (
              <div className="overflow-hidden rounded-xl border border-base-600/60 bg-base-800/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
                      <tr>
                        <th className="px-5 py-3.5">Domain Name</th>
                        <th className="px-5 py-3.5">Domain Code</th>
                        <th className="px-5 py-3.5">Network Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-600/30">
                      {paginate(filteredList).map(item => (
                        <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                          <td className="px-5 py-4 font-medium text-ink-100">{item.name}</td>
                          <td className="px-5 py-4 font-mono text-xs text-nds">{item.code}</td>
                          <td className="px-5 py-4 text-ink-400">{item.type}</td>
                        </tr>
                      ))}
                      {filteredList.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลผลลัพธ์ที่ค้นหา</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPagination(filteredList.length)}
              </div>
            )}

            {/* Assign Ring Name Tab */}
            {activeTab === 'rings' && (
              <div className="overflow-hidden rounded-xl border border-base-600/60 bg-base-800/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
                      <tr>
                        <th className="px-5 py-3.5">Ring Name</th>
                        <th className="px-5 py-3.5">Assigned AGG</th>
                        <th className="px-5 py-3.5">Assigned Domain</th>
                        <th className="px-5 py-3.5">Bandwidth</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-600/30">
                      {paginate(filteredList).map(item => (
                        <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                          <td className="px-5 py-4 font-mono font-medium text-ink-100">{item.ringName}</td>
                          <td className="px-5 py-4 text-ink-400">{getAggName(item.aggId)}</td>
                          <td className="px-5 py-4 text-ink-400">{getDomainName(item.domainId)}</td>
                          <td className="px-5 py-4 font-mono text-xs text-nds">{item.bandwidth}</td>
                        </tr>
                      ))}
                      {filteredList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลผลลัพธ์ที่ค้นหา</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPagination(filteredList.length)}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
