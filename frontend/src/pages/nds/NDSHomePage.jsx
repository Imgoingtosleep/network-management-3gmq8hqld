import { useEffect, useState } from 'react';
import { ndsApi } from '../../api/nds.api.js';
import Sidebar from '../../components/Sidebar.jsx';
import StatusCard from '../../components/StatusCard.jsx';

const menuItems = [
  { label: 'ภาพรวม', value: 'overview' },
  { label: 'Site Management', value: 'sites' },
  { label: 'PE Devices', value: 'pes' },
  { label: 'LSW / NT Devices', value: 'lsw_nts' },
  { label: 'IP Management (Prefix)', value: 'prefixes' },
  { label: 'AGG Devices', value: 'aggs' },
  { label: 'Domains', value: 'domains' },
  { label: 'Assign Ring Name', value: 'rings' },
];

export default function NDSHomePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Data states
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [pes, setPEs] = useState([]);
  const [lswNts, setLswNts] = useState([]);
  const [prefixes, setPrefixes] = useState([]);
  const [aggs, setAggs] = useState([]);
  const [domains, setDomains] = useState([]);
  const [rings, setRings] = useState([]);

  // Modals state
  const [modalType, setModalType] = useState(null); // 'create' | 'edit' | 'move' | 'delete'
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setCurrentPage(1); // Reset page on tab switch

    const loadData = async () => {
      try {
        if (activeTab === 'overview') {
          const resProj = await ndsApi.getProjects();
          const resSites = await ndsApi.sites.list();
          const resPEs = await ndsApi.pes.list();
          const resLsw = await ndsApi.lswNts.list();
          const resPref = await ndsApi.prefixes.list();
          if (mounted) {
            setProjects(resProj.data?.data || []);
            setSites(resSites.data?.data || []);
            setPEs(resPEs.data?.data || []);
            setLswNts(resLsw.data?.data || []);
            setPrefixes(resPref.data?.data || []);
          }
        } else {
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

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleOpenCreateModal = () => {
    setModalType('create');
    setFormData({});
  };

  const handleOpenEditModal = (item) => {
    setModalType('edit');
    setCurrentItem(item);
    setFormData({ ...item });
  };

  const handleOpenMoveModal = (item) => {
    setModalType('move');
    setCurrentItem(item);
    setFormData({ ...item });
  };

  const handleOpenDeleteModal = (item) => {
    setModalType('delete');
    setCurrentItem(item);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modalType === 'create') {
        await ndsApi[activeTab].create(formData);
        showToast(`สร้างข้อมูลใหม่สำเร็จ`);
      } else if (modalType === 'edit' || modalType === 'move') {
        await ndsApi[activeTab].update(currentItem.id, formData);
        showToast(`บันทึกข้อมูลเรียบร้อยแล้ว`);
      } else if (modalType === 'delete') {
        await ndsApi[activeTab].delete(currentItem.id);
        showToast(`นำข้อมูลออก/ยกเลิกเรียบร้อยแล้ว`);
      }

      // Reload active data
      const resRefresh = await ndsApi[activeTab].list();
      if (activeTab === 'sites') setSites(resRefresh.data?.data || []);
      if (activeTab === 'pes') setPEs(resRefresh.data?.data || []);
      if (activeTab === 'lsw_nts') setLswNts(resRefresh.data?.data || []);
      if (activeTab === 'prefixes') setPrefixes(resRefresh.data?.data || []);
      if (activeTab === 'aggs') setAggs(resRefresh.data?.data || []);
      if (activeTab === 'domains') setDomains(resRefresh.data?.data || []);
      if (activeTab === 'rings') setRings(resRefresh.data?.data || []);

      setModalType(null);
      setCurrentItem(null);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการทำรายการ');
    } finally {
      setLoading(false);
    }
  };

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

  // Pagination Helper functions
  const paginate = (dataList) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return dataList.slice(startIndex, startIndex + itemsPerPage);
  };

  const renderPagination = (totalItems) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5; // Max visible buttons at one time (excluding ellipses)
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // เสมอ หน้า 1
        pages.push(1);
        
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        
        if (currentPage <= 2) {
          end = 3;
        }
        if (currentPage >= totalPages - 1) {
          start = totalPages - 2;
        }
        
        if (start > 2) {
          pages.push('...');
        }
        
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
        
        if (end < totalPages - 1) {
          pages.push('...');
        }
        
        // เสมอ หน้าสุดท้าย
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
            <p className="mt-1 text-xs text-ink-400">
              การบริหารจัดการและสถาปัตยกรรมโครงข่ายทีม Network Design Services (NDS)
            </p>
          </div>
          {activeTab !== 'overview' && (
            <button
              onClick={handleOpenCreateModal}
              className="rounded-lg bg-nds px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-nds/20 hover:opacity-90 active:scale-[0.97] transition-all"
            >
              + Create New
            </button>
          )}
        </div>

        {/* Alerts / Messages */}
        {successMsg && (
          <div className="mt-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-xs text-green-400 font-mono">
            ✅ {successMsg}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 font-mono">
            ⚠️ {error}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && !modalType && (
          <p className="mt-10 text-sm text-ink-400 animate-pulse text-center">กำลังโหลดข้อมูลระบบ...</p>
        )}

        {/* Render Tab Contents */}
        {!loading && (
          <div className="mt-6">
            {/* 1. Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <StatusCard accent="nds" label="Total Sites" value={sites.length} />
                  <StatusCard accent="nds" label="PE Routers" value={pes.length} />
                  <StatusCard accent="nds" label="LSW / NT Nodes" value={lswNts.length} />
                  <StatusCard accent="nds" label="Prefix Blocks" value={prefixes.length} />
                </div>

                <div className="rounded-xl border border-base-600/60 bg-base-800/40 p-6">
                  <h3 className="font-display text-lg font-semibold text-ink-100">โปรเจกต์สถาปัตยกรรมโครงข่าย NDS</h3>
                  <ul className="mt-4 divide-y divide-base-600/50">
                    {projects.map(p => (
                      <li key={p.id} className="flex justify-between py-3 text-sm">
                        <span className="text-ink-100">{p.name}</span>
                        <span className="text-nds font-mono">{p.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 2. Sites Tab */}
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
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-600/30">
                      {paginate(sites).map(item => (
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
                          <td className="px-5 py-4 text-right space-x-3">
                            <button onClick={() => handleOpenEditModal(item)} className="text-xs text-nds hover:underline font-semibold">Edit</button>
                            <button onClick={() => handleOpenDeleteModal(item)} className="text-xs text-red-400 hover:underline font-semibold">Terminate</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPagination(sites.length)}
              </div>
            )}

            {/* 3. PE Devices Tab */}
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
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-600/30">
                      {paginate(pes).map(item => (
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
                          <td className="px-5 py-4 text-right space-x-3">
                            <button onClick={() => handleOpenEditModal(item)} className="text-xs text-nds hover:underline font-semibold">Edit</button>
                            <button onClick={() => handleOpenMoveModal(item)} className="text-xs text-amber-400 hover:underline font-semibold">Move</button>
                            <button onClick={() => handleOpenDeleteModal(item)} className="text-xs text-red-400 hover:underline font-semibold">Terminate</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPagination(pes.length)}
              </div>
            )}

            {/* 4. LSW / NT Devices Tab */}
            {activeTab === 'lsw_nts' && (
              <div className="overflow-hidden rounded-xl border border-base-600/60 bg-base-800/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
                      <tr>
                        <th className="px-5 py-3.5">Device Name</th>
                        <th className="px-5 py-3.5">Type</th>
                        <th className="px-5 py-3.5">Vendor/MFG</th>
                        <th className="px-5 py-3.5">Model</th>
                        <th className="px-5 py-3.5">Management IP</th>
                        <th className="px-5 py-3.5">Site Location</th>
                        <th className="px-5 py-3.5">Location</th>
                        <th className="px-5 py-3.5">Rack</th>
                        <th className="px-5 py-3.5">Serial</th>
                        <th className="px-5 py-3.5">Asset Tag</th>
                        <th className="px-5 py-3.5">Last Updated</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-600/30">
                      {paginate(lswNts).map(item => (
                        <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                          <td className="px-5 py-4 font-mono font-medium text-ink-100">{item.name}</td>
                          <td className="px-5 py-4 text-ink-400 font-semibold text-xs">{item.type}</td>
                          <td className="px-5 py-4 text-ink-400">{item.manufacturer}</td>
                          <td className="px-5 py-4 text-ink-400">{item.model}</td>
                          <td className="px-5 py-4 font-mono text-nds">{item.ip}</td>
                          <td className="px-5 py-4 text-ink-400">{item.siteName || getSiteName(item.siteId)}</td>
                          <td className="px-5 py-4 text-ink-400">{item.location}</td>
                          <td className="px-5 py-4 text-ink-400">{item.rack}</td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.serial}</td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.asset_tag}</td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-600">{item.last_updated}</td>
                          <td className="px-5 py-4 text-right space-x-3">
                            <button onClick={() => handleOpenEditModal(item)} className="text-xs text-nds hover:underline font-semibold">Edit</button>
                            <button onClick={() => handleOpenMoveModal(item)} className="text-xs text-amber-400 hover:underline font-semibold">Move</button>
                            <button onClick={() => handleOpenDeleteModal(item)} className="text-xs text-red-400 hover:underline font-semibold">Terminate</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPagination(lswNts.length)}
              </div>
            )}

            {/* 5. IP Management (Prefix) Tab */}
            {activeTab === 'prefixes' && (
              <div className="overflow-hidden rounded-xl border border-base-600/60 bg-base-800/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
                      <tr>
                        <th className="px-5 py-3.5">IP Prefix Block</th>
                        <th className="px-5 py-3.5">VLAN ID</th>
                        <th className="px-5 py-3.5">VRF</th>
                        <th className="px-5 py-3.5">Tenant</th>
                        <th className="px-5 py-3.5">Role</th>
                        <th className="px-5 py-3.5">Site Assigned</th>
                        <th className="px-5 py-3.5">Description</th>
                        <th className="px-5 py-3.5">Last Updated</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-600/30">
                      {paginate(prefixes).map(item => (
                        <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                          <td className="px-5 py-4 font-mono font-medium text-nds">{item.prefix}</td>
                          <td className="px-5 py-4 font-mono text-ink-400">{item.vlan}</td>
                          <td className="px-5 py-4 text-ink-400 font-mono text-xs">{item.vrf}</td>
                          <td className="px-5 py-4 text-ink-400">{item.tenant}</td>
                          <td className="px-5 py-4 text-ink-400 text-xs">{item.role}</td>
                          <td className="px-5 py-4 text-ink-400">{item.siteName || getSiteName(item.siteId)}</td>
                          <td className="px-5 py-4 text-ink-400 max-w-xs truncate">{item.description}</td>
                          <td className="px-5 py-4 font-mono text-xs text-ink-600">{item.last_updated}</td>
                          <td className="px-5 py-4 text-right space-x-3">
                            <button onClick={() => handleOpenEditModal(item)} className="text-xs text-nds hover:underline font-semibold">Edit</button>
                            <button onClick={() => handleOpenMoveModal(item)} className="text-xs text-amber-400 hover:underline font-semibold">Move</button>
                            <button onClick={() => handleOpenDeleteModal(item)} className="text-xs text-red-400 hover:underline font-semibold">Terminate</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPagination(prefixes.length)}
              </div>
            )}

            {/* 6. AGG Devices Tab */}
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
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-600/30">
                      {paginate(aggs).map(item => (
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
                          <td className="px-5 py-4 text-right space-x-3">
                            <button onClick={() => handleOpenEditModal(item)} className="text-xs text-nds hover:underline font-semibold">Edit</button>
                            <button onClick={() => handleOpenMoveModal(item)} className="text-xs text-amber-400 hover:underline font-semibold">Move</button>
                            <button onClick={() => handleOpenDeleteModal(item)} className="text-xs text-red-400 hover:underline font-semibold">Terminate</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPagination(aggs.length)}
              </div>
            )}

            {/* 7. Domains Tab */}
            {activeTab === 'domains' && (
              <div className="overflow-hidden rounded-xl border border-base-600/60 bg-base-800/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
                      <tr>
                        <th className="px-5 py-3.5">Domain Name</th>
                        <th className="px-5 py-3.5">Domain Code</th>
                        <th className="px-5 py-3.5">Network Type</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-600/30">
                      {paginate(domains).map(item => (
                        <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                          <td className="px-5 py-4 font-medium text-ink-100">{item.name}</td>
                          <td className="px-5 py-4 font-mono text-xs text-nds">{item.code}</td>
                          <td className="px-5 py-4 text-ink-400">{item.type}</td>
                          <td className="px-5 py-4 text-right space-x-3">
                            <button onClick={() => handleOpenEditModal(item)} className="text-xs text-nds hover:underline font-semibold">Edit</button>
                            <button onClick={() => handleOpenDeleteModal(item)} className="text-xs text-red-400 hover:underline font-semibold">Terminate</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPagination(domains.length)}
              </div>
            )}

            {/* 8. Assign Ring Name Tab */}
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
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-600/30">
                      {paginate(rings).map(item => (
                        <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                          <td className="px-5 py-4 font-mono font-medium text-ink-100">{item.ringName}</td>
                          <td className="px-5 py-4 text-ink-400">{getAggName(item.aggId)}</td>
                          <td className="px-5 py-4 text-ink-400">{getDomainName(item.domainId)}</td>
                          <td className="px-5 py-4 font-mono text-xs text-nds">{item.bandwidth}</td>
                          <td className="px-5 py-4 text-right space-x-3">
                            <button onClick={() => handleOpenEditModal(item)} className="text-xs text-nds hover:underline font-semibold">Edit</button>
                            <button onClick={() => handleOpenMoveModal(item)} className="text-xs text-amber-400 hover:underline font-semibold">Move</button>
                            <button onClick={() => handleOpenDeleteModal(item)} className="text-xs text-red-400 hover:underline font-semibold">Terminate</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPagination(rings.length)}
              </div>
            )}
          </div>
        )}
      </section>

      {/* CRUD Action Modals */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-950/80 p-6 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-base-600/80 bg-base-900 p-6 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-ink-100 uppercase tracking-wider mb-4">
              {modalType === 'create' && `Create new ${activeTab.slice(0, -1)}`}
              {modalType === 'edit' && `Edit details`}
              {modalType === 'move' && `Move / Re-assign location`}
              {modalType === 'delete' && `Confirm Termination`}
            </h3>

            {modalType === 'delete' ? (
              <form onSubmit={handleModalSubmit} className="space-y-4">
                <p className="text-sm text-ink-400 leading-relaxed">
                  คุณต้องการที่จะทำการยกเลิก (Terminate) รายการ: <b className="text-red-400 font-mono">{currentItem?.name || currentItem?.ringName || currentItem?.prefix}</b> หรือไม่?
                </p>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setModalType(null)} className="rounded-lg border border-base-600 px-4 py-2 text-xs font-semibold text-ink-400 hover:bg-base-800">Cancel</button>
                  <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500">Terminate</button>
                </div>
              </form>
            ) : modalType === 'move' ? (
              <form onSubmit={handleModalSubmit} className="space-y-4">
                <p className="text-xs text-ink-400 mb-2">ย้ายกลุ่มหรือปลายทางตำแหน่งเครือข่ายของรายการปัจจุบัน</p>
                
                {/* Moving elements dependent selects */}
                {(activeTab === 'pes' || activeTab === 'lsw_nts' || activeTab === 'prefixes' || activeTab === 'aggs') && (
                  <div>
                    <label className="block text-xs text-ink-400 uppercase">Target Site Location</label>
                    <select
                      value={formData.siteId || ''}
                      onChange={(e) => setFormData({ ...formData, siteId: Number(e.target.value) })}
                      className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                      required
                    >
                      <option value="">-- Select Target Site --</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                {activeTab === 'rings' && (
                  <>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase">Target AGG Router</label>
                      <select
                        value={formData.aggId || ''}
                        onChange={(e) => setFormData({ ...formData, aggId: Number(e.target.value) })}
                        className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      >
                        <option value="">-- Select Target AGG --</option>
                        {aggs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div className="mt-4">
                      <label className="block text-xs text-ink-400 uppercase">Target Network Domain</label>
                      <select
                        value={formData.domainId || ''}
                        onChange={(e) => setFormData({ ...formData, domainId: Number(e.target.value) })}
                        className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      >
                        <option value="">-- Select Target Domain --</option>
                        {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setModalType(null)} className="rounded-lg border border-base-600 px-4 py-2 text-xs font-semibold text-ink-400 hover:bg-base-800">Cancel</button>
                  <button type="submit" className="rounded-lg bg-nds px-4 py-2 text-xs font-semibold text-white hover:opacity-90">Confirm Move</button>
                </div>
              </form>
            ) : (
              // Create / Edit modal inputs dynamic fields
              <form onSubmit={handleModalSubmit} className="space-y-4">
                {activeTab === 'sites' && (
                  <>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Site Name</label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Location</label>
                      <input
                        type="text"
                        value={formData.location || ''}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Description</label>
                      <input
                        type="text"
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {(activeTab === 'pes' || activeTab === 'aggs') && (
                  <>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Device Name</label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Hardware Model</label>
                      <input
                        type="text"
                        value={formData.model || ''}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">IP Address</label>
                      <input
                        type="text"
                        value={formData.ip || ''}
                        onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Site Location</label>
                      <select
                        value={formData.siteId || ''}
                        onChange={(e) => setFormData({ ...formData, siteId: Number(e.target.value) })}
                        className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      >
                        <option value="">-- Select Site --</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'lsw_nts' && (
                  <>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Device Name</label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Type</label>
                      <select
                        value={formData.type || ''}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      >
                        <option value="">-- Select Type --</option>
                        <option value="LSW">LSW</option>
                        <option value="NT">NT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Hardware Model</label>
                      <input
                        type="text"
                        value={formData.model || ''}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Management IP</label>
                      <input
                        type="text"
                        value={formData.ip || ''}
                        onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Site Location</label>
                      <select
                        value={formData.siteId || ''}
                        onChange={(e) => setFormData({ ...formData, siteId: Number(e.target.value) })}
                        className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      >
                        <option value="">-- Select Site --</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'prefixes' && (
                  <>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">IP Prefix Block</label>
                      <input
                        type="text"
                        value={formData.prefix || ''}
                        onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                        placeholder="e.g. 10.0.0.0/24"
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">VLAN ID</label>
                      <input
                        type="number"
                        value={formData.vlan || ''}
                        onChange={(e) => setFormData({ ...formData, vlan: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Site Location</label>
                      <select
                        value={formData.siteId || ''}
                        onChange={(e) => setFormData({ ...formData, siteId: Number(e.target.value) })}
                        className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      >
                        <option value="">-- Select Site --</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Description</label>
                      <input
                        type="text"
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'domains' && (
                  <>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Domain Name</label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Domain Code</label>
                      <input
                        type="text"
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Network Type</label>
                      <input
                        type="text"
                        value={formData.type || ''}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        placeholder="e.g. IGP, OSPF, BGP"
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      />
                    </div>
                  </>
                )}

                {activeTab === 'rings' && (
                  <>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Ring Name</label>
                      <input
                        type="text"
                        value={formData.ringName || ''}
                        onChange={(e) => setFormData({ ...formData, ringName: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Assigned AGG</label>
                      <select
                        value={formData.aggId || ''}
                        onChange={(e) => setFormData({ ...formData, aggId: Number(e.target.value) })}
                        className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      >
                        <option value="">-- Select AGG --</option>
                        {aggs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Assigned Domain</label>
                      <select
                        value={formData.domainId || ''}
                        onChange={(e) => setFormData({ ...formData, domainId: Number(e.target.value) })}
                        className="mt-1.5 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      >
                        <option value="">-- Select Domain --</option>
                        {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-ink-400 uppercase font-mono">Ring Bandwidth</label>
                      <input
                        type="text"
                        value={formData.bandwidth || ''}
                        onChange={(e) => setFormData({ ...formData, bandwidth: e.target.value })}
                        placeholder="e.g. 10G, 100G"
                        className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 focus:border-nds focus:outline-none"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setModalType(null)} className="rounded-lg border border-base-600 px-4 py-2 text-xs font-semibold text-ink-400 hover:bg-base-800">Cancel</button>
                  <button type="submit" className="rounded-lg bg-nds px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
                    {modalType === 'create' ? 'Create' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
