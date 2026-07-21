import React, { useState, useEffect, useRef } from 'react';
import { cdsApi } from '../../api/cds.api';

export default function CDSTopologyMapPage() {
  const [activeTab, setActiveTab] = useState('path-trace'); // 'path-trace' | 'site-topology'

  // ==================== TAB 1: Path Trace States ====================
  const [pathQuery, setPathQuery] = useState('85390');
  const [pathTraceData, setPathTraceData] = useState(null);
  const [loadingPathTrace, setLoadingPathTrace] = useState(false);
  const [pathTraceError, setPathTraceError] = useState(null);

  // ==================== TAB 2: Site Topology States ====================
  const [selectedSiteCode, setSelectedSiteCode] = useState('');
  const [siteSearchInput, setSiteSearchInput] = useState('');
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const siteInputRef = useRef(null);

  const [sitesList, setSitesList] = useState([]);
  const [topologyData, setTopologyData] = useState(null);
  const [loadingTopology, setLoadingTopology] = useState(false);
  const [topologyError, setTopologyError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [activeGroupIndex, setActiveGroupIndex] = useState(-1); // -1 = All Groups

  // Canvas Drag & Zoom States
  const [zoomScale, setZoomScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const svgContainerRef = useRef(null);

  const handleMouseDown = (e) => {
    if (!svgContainerRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      scrollLeft: svgContainerRef.current.scrollLeft,
      scrollTop: svgContainerRef.current.scrollTop,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !svgContainerRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    svgContainerRef.current.scrollLeft = dragStart.scrollLeft - dx;
    svgContainerRef.current.scrollTop = dragStart.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Filter sites for autocomplete dropdown
  const filteredSiteOptions = sitesList.filter((site) => {
    if (!siteSearchInput.trim()) return true;
    const q = siteSearchInput.toLowerCase();
    return (
      (site.name || '').toLowerCase().includes(q) ||
      (site.slug || '').toLowerCase().includes(q) ||
      (site.site_name || '').toLowerCase().includes(q)
    );
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (siteInputRef.current && !siteInputRef.current.contains(e.target)) {
        setShowSiteDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load sites list
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await cdsApi.getSites();
        const rawSites = res.data?.data || res.data || res || [];
        if (rawSites.length > 0) {
          setSitesList(rawSites);
        } else {
          setSitesList([
            { id: 1, name: 'BCH Bangkok Center', slug: 'bch', site_name: 'BCH Bangkok Center', region: 'Metropolitan' },
            { id: 2, name: 'Bangkok Head Office', slug: 'bkk', site_name: 'Bangkok Head Office', region: 'Metropolitan' },
            { id: 3, name: 'Chiang Mai Branch', slug: 'cnx', site_name: 'Chiang Mai Branch', region: 'Northern' },
            { id: 4, name: 'Phuket DC', slug: 'hkt', site_name: 'Phuket DC', region: 'Southern' },
          ]);
        }
      } catch (err) {
        console.error('Failed to load sites:', err);
      }
    };
    fetchSites();
  }, []);

  // Run Path Trace
  const handleRunPathTrace = async (queryToRun) => {
    const q = queryToRun || pathQuery;
    if (!q.trim()) return;
    setLoadingPathTrace(true);
    setPathTraceError(null);
    try {
      const res = await cdsApi.getPathTrace(q);
      const data = res.data?.data || res.data || res;
      setPathTraceData(data);
    } catch (err) {
      console.error('Error running path trace:', err);
      setPathTraceError('ไม่สามารถสืบค้น Path Trace ได้');
    } finally {
      setLoadingPathTrace(false);
    }
  };

  // Load Site Topology
  const loadTopology = async (siteCode) => {
    if (!siteCode || !siteCode.trim()) return;
    setLoadingTopology(true);
    setTopologyError(null);
    try {
      const res = await cdsApi.getSiteTopology(siteCode);
      const data = res.data?.data || res.data || res;
      setTopologyData(data);
      setActiveGroupIndex(-1);
    } catch (err) {
      console.error('Error loading topology:', err);
      setTopologyError('ไม่สามารถดึงข้อมูล Site Topology ได้');
    } finally {
      setLoadingTopology(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'path-trace' && !pathTraceData) {
      handleRunPathTrace('85390');
    } else if (activeTab === 'site-topology' && selectedSiteCode) {
      loadTopology(selectedSiteCode);
    }
  }, [activeTab, selectedSiteCode]);

  // ==================== NETOPS UNION-FIND GROUPING LOGIC ====================
  const devices = topologyData?.devices || [];
  const links = topologyData?.links || [];
  const siteInfo = topologyData?.site || {};

  // Filter devices by search term
  const filteredDevices = devices.filter((d) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (d.id || '').toLowerCase().includes(q) ||
      (d.name || '').toLowerCase().includes(q) ||
      (d.role || '').toLowerCase().includes(q) ||
      (d.primary_ip || '').toLowerCase().includes(q) ||
      (d.model || '').toLowerCase().includes(q)
    );
  });

  // Union-Find Algorithm from NetOps Portal
  const backboneNodes = filteredDevices.filter((d) => {
    const role = (d.role || '').toLowerCase();
    const name = (d.name || '').toLowerCase();
    return (
      role.includes('pe') ||
      role.includes('edge') ||
      role.includes('router') ||
      name.includes('pe') ||
      role.includes('agg') ||
      name.includes('agg')
    );
  });

  const parent = {};
  backboneNodes.forEach((d) => {
    parent[String(d.id)] = String(d.id);
  });

  function find(i) {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(i, j) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }

  links.forEach((l) => {
    const srcId = String(l.source);
    const tgtId = String(l.target);
    if (parent[srcId] !== undefined && parent[tgtId] !== undefined) {
      union(srcId, tgtId);
    }
  });

  const groups = {};
  backboneNodes.forEach((d) => {
    const root = find(String(d.id));
    if (!groups[root]) {
      groups[root] = { devicesMap: new Map(), links: [] };
    }
    groups[root].devicesMap.set(String(d.id), d);
  });

  const groupedLinkIds = new Set();
  links.forEach((l, idx) => {
    const srcId = String(l.source);
    const tgtId = String(l.target);
    let root = null;
    if (parent[srcId] !== undefined) root = find(srcId);
    else if (parent[tgtId] !== undefined) root = find(tgtId);

    if (root && groups[root]) {
      groups[root].links.push(l);
      groupedLinkIds.add(idx);
      const srcDev = filteredDevices.find((d) => String(d.id) === srcId);
      const tgtDev = filteredDevices.find((d) => String(d.id) === tgtId);
      if (srcDev && !groups[root].devicesMap.has(srcId)) groups[root].devicesMap.set(srcId, srcDev);
      if (tgtDev && !groups[root].devicesMap.has(tgtId)) groups[root].devicesMap.set(tgtId, tgtDev);
    }
  });

  const diagrams = [];
  Object.keys(groups).forEach((root) => {
    const grp = groups[root];
    if (grp.devicesMap.size > 1 && grp.links.length > 0) {
      const devList = Array.from(grp.devicesMap.values());
      const pesAndAggs = devList.filter((d) => {
        const r = (d.role || '').toLowerCase();
        const n = (d.name || '').toLowerCase();
        return r.includes('pe') || r.includes('edge') || r.includes('router') || n.includes('pe') || r.includes('agg') || n.includes('agg');
      });
      const networks = devList.filter((d) => !pesAndAggs.includes(d));

      let gName = 'Uplink Group';
      const peDevs = pesAndAggs.filter((d) => {
        const r = (d.role || '').toLowerCase();
        return r.includes('pe') || r.includes('edge') || r.includes('router');
      });
      if (peDevs.length > 0) {
        gName = peDevs.map((d) => d.name).join(' / ');
      } else {
        const aggDevs = pesAndAggs.filter((d) => (d.role || '').toLowerCase().includes('agg'));
        if (aggDevs.length > 0) {
          gName = aggDevs.map((d) => d.name).join(' / ');
        }
      }

      diagrams.push({
        name: gName,
        devices: [...pesAndAggs, ...networks],
        links: grp.links,
      });
    }
  });

  // Standalone Devices
  const activeDiagramDeviceIds = new Set();
  diagrams.forEach((diag) => {
    diag.devices.forEach((d) => activeDiagramDeviceIds.add(String(d.id)));
  });

  const standaloneDevices = filteredDevices.filter((d) => !activeDiagramDeviceIds.has(String(d.id)) && !d.is_external);

  const filteredDiagrams = activeGroupIndex === -1 ? diagrams : [diagrams[activeGroupIndex]];
  
  let totalSvgWidth = 0;
  filteredDiagrams.forEach((diag) => {
    const pes = diag.devices.filter(d => {
      const r = (d.role||'').toLowerCase(); const n = (d.name||'').toLowerCase();
      return r.includes('pe')||r.includes('edge')||r.includes('router')||n.includes('pe');
    }).length;
    const aggs = diag.devices.filter(d => {
      const r = (d.role||'').toLowerCase(); const n = (d.name||'').toLowerCase();
      return r.includes('agg')||n.includes('agg');
    }).length;
    const nets = diag.devices.length - pes - aggs;
    const maxTier = Math.max(pes, aggs, nets, 1);
    const diagWidth = Math.max(550, maxTier * 180);
    diag.calculatedWidth = diagWidth;
    totalSvgWidth += diagWidth;
  });

  const svgWidth = Math.max(1000, totalSvgWidth);
  const svgHeight = 520;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left pb-16 font-sans">
      {/* Top Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-base-700/60 pb-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-100">Network Path Trace</h1>
          <p className="text-xs text-ink-400 font-mono mt-1">
            NetOps Portal — Single Source of Truth Discovery Engine via NetBox
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-base-950 p-1 rounded-lg border border-base-700">
          <button
            onClick={() => setActiveTab('path-trace')}
            className={`px-4 py-2 rounded-md text-xs font-mono font-bold transition-all ${
              activeTab === 'path-trace'
                ? 'bg-cds text-base-950 shadow-md'
                : 'text-ink-400 hover:text-ink-100 hover:bg-base-800'
            }`}
          >
            Path Trace (IP/Node ID)
          </button>
          <button
            onClick={() => setActiveTab('site-topology')}
            className={`px-4 py-2 rounded-md text-xs font-mono font-bold transition-all ${
              activeTab === 'site-topology'
                ? 'bg-cds text-base-950 shadow-md'
                : 'text-ink-400 hover:text-ink-100 hover:bg-base-800'
            }`}
          >
            Site Topology (Site Code)
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: PATH TRACE ==================== */}
      {activeTab === 'path-trace' && (
        <div className="space-y-6">
          {/* Search Section */}
          <div className="rounded-2xl border border-base-600 bg-radial-gradient-cds bg-base-900 p-6 shadow-glow">
            <h2 className="text-lg font-bold font-display text-ink-100">PE &lt;--&gt; AGG &lt;--&gt; LSW</h2>
            <p className="text-xs text-ink-400 font-mono mt-1">
              Enter any IP address or Node ID to discover its physical path through the network hierarchy.
            </p>

            <div className="flex items-center gap-3 mt-4 max-w-2xl">
              <input
                type="text"
                placeholder="Enter IP or Node ID (e.g. 10.10.10.1 or 35424)..."
                value={pathQuery}
                onChange={(e) => setPathQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunPathTrace();
                }}
                className="w-full rounded-lg border border-base-600 bg-base-950 px-4 py-2.5 text-sm text-ink-100 placeholder-ink-600 font-mono focus:border-cds focus:outline-none transition-all"
              />
              <button
                onClick={() => handleRunPathTrace()}
                disabled={loadingPathTrace}
                className="inline-flex items-center gap-2 rounded-lg bg-cds px-6 py-2.5 text-sm font-bold text-base-950 hover:bg-cds/90 active:scale-95 transition-all shadow-glow font-mono whitespace-nowrap"
              >
                {loadingPathTrace ? 'Tracing...' : 'Start Trace'}
              </button>
            </div>
          </div>

          {/* Results Flow */}
          {loadingPathTrace ? (
            <div className="rounded-xl border border-base-600 bg-base-900 p-16 text-center text-ink-500 font-mono">
              Retrieving network topology...
            </div>
          ) : pathTraceError ? (
            <div className="rounded-xl border border-amber-500/30 bg-base-900 p-8 text-center text-amber-400 font-mono">
              {pathTraceError}
            </div>
          ) : pathTraceData ? (
            <div className="space-y-6 font-mono text-left">
              {/* Hop 1: Subnet Details */}
              <div className="relative rounded-xl border border-blue-500/40 border-l-4 border-l-blue-500 bg-base-900 p-6 shadow-glow">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-full bg-blue-500 text-base-950 flex items-center justify-center font-bold text-lg shadow-lg flex-shrink-0">
                    NW
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between border-b border-base-700/60 pb-2 mb-3">
                      <h3 className="text-lg font-bold text-ink-100">Target Subnet Details</h3>
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-cds text-base-950 uppercase">
                        TARGET: {pathTraceData.source_device?.role.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">วง IP (Network)</span>
                        <span className="text-sm font-bold text-cds">{pathTraceData.input?.ip || '10.134.100.0'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">วง Subnet (Mask)</span>
                        <span className="text-sm font-semibold text-ink-200">/24</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">Gateway IP (PE)</span>
                        <span className="text-sm font-bold text-blue-400">{pathTraceData.pe?.gateway}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">VLAN</span>
                        <span className="text-sm font-bold text-purple-400">VLAN 100, 115</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hop 2: PE Card */}
              <div className="relative rounded-xl border border-red-500/40 border-l-4 border-l-red-500 bg-base-900 p-6 shadow-glow">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-full bg-red-500 text-base-950 flex items-center justify-center font-bold text-lg shadow-lg flex-shrink-0">
                    PE
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between border-b border-base-700/60 pb-2 mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-ink-100">{pathTraceData.pe?.pe_name}</h3>
                        <p className="text-xs text-ink-400">Site: {pathTraceData.source_device?.site} | Juniper MX480</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 uppercase">
                        Provider Edge Router
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">Gateway IP (NW)</span>
                        <span className="text-sm font-bold text-ink-100">{pathTraceData.pe?.gateway}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">PE Primary IP</span>
                        <span className="text-sm font-semibold text-blue-400">{pathTraceData.pe?.pe_ip}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">Logical Interface</span>
                        <span className="text-sm font-semibold text-purple-400">{pathTraceData.pe?.logical_vlan}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">Physical Interface</span>
                        <span className="text-sm font-bold text-cds">➔ {pathTraceData.pe?.physical_port}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hop 3: AGG Card */}
              <div className="relative rounded-xl border border-blue-500/40 border-l-4 border-l-blue-500 bg-base-900 p-6 shadow-glow">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-full bg-blue-500 text-base-950 flex items-center justify-center font-bold text-lg shadow-lg flex-shrink-0">
                    AGG
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between border-b border-base-700/60 pb-2 mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-ink-100">{pathTraceData.agg?.name}</h3>
                        <p className="text-xs text-ink-400">Aggregation Switch | Cisco C9500</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase">
                        {pathTraceData.agg?.role}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">AGG IP</span>
                        <span className="text-sm font-bold text-ink-100">{pathTraceData.agg?.ip}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">Inbound Port (PE)</span>
                        <span className="text-sm font-bold text-cds">{pathTraceData.agg?.port_out}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">Outbound Port (LSW)</span>
                        <span className="text-sm font-bold text-purple-300">{pathTraceData.agg?.port_in}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">VLAN Trunk</span>
                        <span className="text-sm font-semibold text-ink-300">VLAN 100, 115</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hop 4: Target Switch (Access) */}
              <div className="relative rounded-xl border border-emerald-500/40 border-l-4 border-l-emerald-500 bg-base-900 p-6 shadow-glow">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-full bg-emerald-500 text-base-950 flex items-center justify-center font-bold text-lg shadow-lg flex-shrink-0">
                    SW
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between border-b border-base-700/60 pb-2 mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-ink-100">{pathTraceData.source_device?.name}</h3>
                        <p className="text-xs text-ink-400">
                          Node ID: {pathTraceData.source_device?.nodeid} | Model: {pathTraceData.source_device?.model}
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                        Target Access Switch
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">Switch IP</span>
                        <span className="text-sm font-bold text-emerald-400">{pathTraceData.source_device?.primary_ip}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">Status</span>
                        <span className="text-sm font-bold text-emerald-400">● {pathTraceData.source_device?.status}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">Site</span>
                        <span className="text-sm font-semibold text-ink-200">{pathTraceData.source_device?.site}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-500 uppercase block font-semibold">Tenant</span>
                        <span className="text-sm font-semibold text-ink-200">{pathTraceData.source_device?.tenant}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Port Status Analysis Table */}
              {pathTraceData.port_status && (
                <div className="rounded-xl border border-base-600 bg-base-900 p-6 shadow-glow space-y-4">
                  <div className="flex items-center justify-between border-b border-base-700/60 pb-3">
                    <h3 className="text-sm font-bold text-ink-100 uppercase tracking-wider">
                      📊 PORT STATUS ANALYSIS: {pathTraceData.source_device?.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                        Vacant: {pathTraceData.port_status.summary?.vacant_count}
                      </span>
                      <span className="px-2.5 py-1 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold">
                        Occupied: {pathTraceData.port_status.summary?.occupied_count}
                      </span>
                      <span className="px-2.5 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/30 font-bold">
                        Broken: {pathTraceData.port_status.summary?.broken_count}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Vacant */}
                    <div className="space-y-2">
                      <span className="text-emerald-400 font-bold block border-b border-emerald-500/30 pb-1">VACANT PORTS</span>
                      <div className="max-h-44 overflow-y-auto bg-base-950 rounded-lg p-2 space-y-1">
                        {pathTraceData.port_status.vacant.map((p, i) => (
                          <div key={i} className="flex justify-between border-b border-base-800/60 pb-1 text-[11px]">
                            <span className="text-ink-200 font-semibold">{p.name}</span>
                            <span className="text-ink-500 italic">{p.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Occupied */}
                    <div className="space-y-2">
                      <span className="text-blue-400 font-bold block border-b border-blue-500/30 pb-1">OCCUPIED PORTS</span>
                      <div className="max-h-44 overflow-y-auto bg-base-950 rounded-lg p-2 space-y-1">
                        {pathTraceData.port_status.occupied.map((p, i) => (
                          <div key={i} className="flex justify-between border-b border-base-800/60 pb-1 text-[11px]">
                            <span className="text-ink-200 font-semibold">{p.name}</span>
                            <span className="text-ink-400 italic truncate max-w-[110px]">{p.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Broken */}
                    <div className="space-y-2">
                      <span className="text-red-400 font-bold block border-b border-red-500/30 pb-1">BROKEN PORTS (FAIL)</span>
                      <div className="max-h-44 overflow-y-auto bg-base-950 rounded-lg p-2 space-y-1">
                        {pathTraceData.port_status.broken.map((p, i) => (
                          <div key={i} className="flex justify-between border-b border-base-800/60 pb-1 text-[11px]">
                            <span className="text-ink-200 font-semibold">{p.name}</span>
                            <span className="text-red-400 italic">{p.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ==================== TAB 2: SITE TOPOLOGY ==================== */}
      {activeTab === 'site-topology' && (
        <div className="space-y-6">
          {/* Search Section Header */}
          <div className="rounded-2xl border border-base-600 bg-radial-gradient-cds bg-base-900 p-6 shadow-glow space-y-4">
            <div>
              <h2 className="text-lg font-bold font-display text-ink-100">Site Device Topology</h2>
              <p className="text-xs text-ink-400 font-mono mt-1">
                Enter a site code (slug) to visualize device relationships, connections, and standalone hosts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 max-w-xl">
                <input
                  type="text"
                  placeholder="Enter Site Code or dcode (e.g. bkk01, site-a, bch, EMX-UBCH-XX)..."
                  value={siteSearchInput}
                  onChange={(e) => setSiteSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSelectedSiteCode(siteSearchInput);
                      loadTopology(siteSearchInput);
                    }
                  }}
                  className="w-full rounded-lg border border-base-600 bg-base-950 px-4 py-2.5 text-sm text-ink-100 placeholder-ink-600 font-mono focus:border-cds focus:outline-none transition-all"
                />
              </div>

              <button
                onClick={() => {
                  setSelectedSiteCode(siteSearchInput);
                  loadTopology(siteSearchInput);
                }}
                disabled={loadingTopology || !siteSearchInput.trim()}
                className="px-5 py-2.5 rounded-lg bg-cds text-base-950 font-bold font-mono text-xs hover:bg-cds/90 disabled:opacity-50 transition-all"
              >
                {loadingTopology ? 'Searching...' : 'Visualize Site'}
              </button>

              <div className="w-48 relative ml-auto">
                <input
                  type="text"
                  placeholder="Filter Node / IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-base-600 bg-base-950 pl-8 pr-3 py-2 text-xs text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none transition-all font-mono"
                />
                <svg className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Group Filter Tabs (NetOps Style: Uplink Groups) */}
          {diagrams.length > 1 && (
            <div className="flex items-center gap-2 font-mono text-xs overflow-x-auto pb-1">
              <button
                onClick={() => setActiveGroupIndex(-1)}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  activeGroupIndex === -1
                    ? 'bg-cds text-base-950 border-cds font-bold'
                    : 'bg-base-900 text-ink-400 border-base-700 hover:text-ink-100'
                }`}
              >
                All Uplink Groups ({diagrams.length})
              </button>
              {diagrams.map((diag, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveGroupIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg border transition-all ${
                    activeGroupIndex === idx
                      ? 'bg-cds text-base-950 border-cds font-bold'
                      : 'bg-base-900 text-ink-400 border-base-700 hover:text-ink-100'
                  }`}
                >
                  Group {idx + 1}: {diag.name}
                </button>
              ))}
            </div>
          )}

          {/* NETOPS SVG CANVAS & UNION-FIND DIAGRAM GROUPS */}
          <div className="rounded-xl border border-base-600 bg-base-950 p-6 shadow-glow relative overflow-hidden min-h-[400px] space-y-4">
            {/* Toolbar for Zoom & Canvas Controls */}
            {topologyData && !loadingTopology && (
              <div className="flex items-center justify-between border-b border-base-800 pb-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-ink-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>💡 Drag to pan canvas / Click node for details</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoomScale((z) => Math.max(0.6, z - 0.15))}
                    className="px-2 py-1 bg-base-900 border border-base-700 hover:bg-base-800 text-ink-200 rounded font-bold"
                    title="Zoom Out"
                  >
                    🔍 -
                  </button>
                  <span className="text-ink-400 w-12 text-center">{Math.round(zoomScale * 100)}%</span>
                  <button
                    onClick={() => setZoomScale((z) => Math.min(1.8, z + 0.15))}
                    className="px-2 py-1 bg-base-900 border border-base-700 hover:bg-base-800 text-ink-200 rounded font-bold"
                    title="Zoom In"
                  >
                    🔍 +
                  </button>
                  <button
                    onClick={() => setZoomScale(1)}
                    className="px-2 py-1 bg-base-900 border border-base-700 hover:bg-base-800 text-ink-400 hover:text-ink-100 rounded"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {loadingTopology ? (
              <div className="flex flex-col items-center justify-center py-24 text-ink-500 font-mono gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-cds border-t-transparent" />
                <span>Retrieving site network topology...</span>
              </div>
            ) : topologyError ? (
              <div className="py-20 text-center text-amber-400 font-mono">{topologyError}</div>
            ) : !topologyData ? (
              <div className="flex flex-col items-center justify-center py-24 text-ink-400 font-mono gap-3 text-center">
                <svg className="h-12 w-12 text-ink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm font-semibold text-ink-200">Enter a site code (slug) or dcode to visualize device relationships</p>
                <p className="text-xs text-ink-500">e.g. bkk01, site-a, bch, EMX-UBCH-XX</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* SVG Topology Graph Canvas with Drag-to-Pan */}
                <div
                  ref={svgContainerRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className={`relative w-full overflow-auto max-h-[580px] rounded-xl bg-base-950 select-none ${
                    isDragging ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
                  style={{ touchAction: 'none' }}
                >
                  <div style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top left', transition: isDragging ? 'none' : 'transform 0.15s ease-out' }}>
                    <svg
                      width={svgWidth}
                      height={svgHeight}
                      className="block font-mono text-xs bg-base-950"
                      style={{
                        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                      }}
                    >
                      {/* Render each diagram group calculated by Union-Find */}
                      {(() => {
                        let currentGroupStartX = 0;

                        return filteredDiagrams.map((diag, dIdx) => {
                          const groupWidth = diag.calculatedWidth || 600;
                          const startX = currentGroupStartX;
                          currentGroupStartX += groupWidth;

                          // Classify devices in group
                          const pes = [];
                          const aggs = [];
                          const networks = [];

                          diag.devices.forEach((d) => {
                            const role = (d.role || '').toLowerCase();
                            const name = (d.name || '').toLowerCase();
                            if (role.includes('edge') || role.includes('pe') || role.includes('router') || name.includes('pe')) {
                              pes.push(d);
                            } else if (role.includes('agg') || name.includes('agg')) {
                              aggs.push(d);
                            } else {
                              networks.push(d);
                            }
                          });

                          const coords = {};
                          const assignCoords = (list, y) => {
                            const n = list.length;
                            list.forEach((d, index) => {
                              const localX = n === 1 ? groupWidth / 2 : 80 + index * ((groupWidth - 160) / (n - 1));
                              coords[d.id] = { x: startX + localX, y: y, device: d, indexInTier: index };
                            });
                          };

                          assignCoords(pes, 80);
                          assignCoords(aggs, 250);
                          assignCoords(networks, 420);

                          return (
                            <g key={dIdx}>
                              {/* Group Title Header */}
                              <text x={startX + 30} y={35} fill="#00d4aa" fontSize={11} fontWeight="bold">
                                🌐 {diag.name.toUpperCase()}
                              </text>

                              {/* Link Lines with Hover Highlight */}
                              {diag.links.map((l, lIdx) => {
                                const src = coords[l.source];
                                const tgt = coords[l.target];
                                if (src && tgt) {
                                  const isConnectedToHovered =
                                    hoveredNodeId && (String(l.source) === String(hoveredNodeId) || String(l.target) === String(hoveredNodeId));
                                  const lineOpacity = hoveredNodeId ? (isConnectedToHovered ? 1 : 0.15) : 0.75;
                                  const strokeColor = isConnectedToHovered ? '#00d4aa' : '#334155';
                                  const strokeWidth = isConnectedToHovered ? 3.5 : 2;

                                  return (
                                    <line
                                      key={lIdx}
                                      x1={src.x}
                                      y1={src.y}
                                      x2={tgt.x}
                                      y2={tgt.y}
                                      stroke={strokeColor}
                                      strokeWidth={strokeWidth}
                                      strokeDasharray={isConnectedToHovered ? 'none' : '4, 4'}
                                      opacity={lineOpacity}
                                      className="transition-all duration-200"
                                    />
                                  );
                                }
                                return null;
                              })}

                              {/* Nodes */}
                              {diag.devices.map((d) => {
                                const c = coords[d.id];
                                if (!c) return null;

                                let color = '#3fb950'; // Green for SW/Access
                                let displayRole = 'NET';
                                const roleLower = (d.role || '').toLowerCase();

                                if (roleLower.includes('pe') || roleLower.includes('edge') || roleLower.includes('router')) {
                                  color = '#f85149'; // Red for PE
                                  displayRole = 'PE';
                                } else if (roleLower.includes('agg')) {
                                  color = '#0096ff'; // Blue for AGG
                                  displayRole = 'AGG';
                                }

                                const isSelected = selectedNode?.id === d.id;
                                const isHovered = hoveredNodeId === d.id;

                                // Stagger text labels vertically for odd/even indices to prevent text overlaps
                                const isStaggered = c.indexInTier % 2 === 1;
                                const nameY = isStaggered ? 52 : 36;
                                const ipY = isStaggered ? 64 : 48;

                                // Truncate long display names nicely
                                const fullName = d.is_external ? `${d.name} (@ ${d.site})` : d.name;
                                const displayName = fullName.length > 22 ? `${fullName.substring(0, 20)}...` : fullName;

                                return (
                                  <g
                                    key={d.id}
                                    transform={`translate(${c.x}, ${c.y})`}
                                    onMouseEnter={() => setHoveredNodeId(d.id)}
                                    onMouseLeave={() => setHoveredNodeId(null)}
                                    onClick={() => setSelectedNode(d)}
                                    className="cursor-pointer group"
                                  >
                                    <title>{fullName}</title>
                                    <circle r={isHovered ? 32 : 26} fill={color} opacity={isHovered ? 0.3 : 0.15} className="transition-all duration-200" />
                                    <circle
                                      r={18}
                                      fill="#0b1120"
                                      stroke={color}
                                      strokeWidth={isSelected || isHovered ? 3.5 : 2.5}
                                      strokeDasharray={d.is_external ? '5,5' : 'none'}
                                      className="transition-all duration-200"
                                    />
                                    <text dy={4} textAnchor="middle" fill="#ffffff" fontSize={9} fontWeight="800" fontFamily="monospace">
                                      {displayRole}
                                    </text>
                                    <text y={nameY} textAnchor="middle" fill="#f8fafc" fontSize={10} fontWeight="bold">
                                      {displayName}
                                    </text>
                                    <text y={ipY} textAnchor="middle" fill="#94a3b8" fontSize={9} fontFamily="monospace">
                                      {d.primary_ip}
                                    </text>
                                  </g>
                                );
                              })}

                              {/* Division Line between Uplink Groups */}
                              {dIdx < filteredDiagrams.length - 1 && (
                                <g>
                                  <line
                                    x1={startX + groupWidth}
                                    y1={20}
                                    x2={startX + groupWidth}
                                    y2={svgHeight - 20}
                                    stroke="#334155"
                                    strokeWidth={1.5}
                                    strokeDasharray="6,6"
                                  />
                                  <text x={startX + groupWidth} y={15} fill="#64748b" fontSize={9} fontWeight="700" textAnchor="middle">
                                    UPLINK GROUP DIVISION
                                  </text>
                                </g>
                              )}
                            </g>
                          );
                        });
                      })()}
                    </svg>
                  </div>
                </div>

                {/* Standalone Devices Section (NetOps Style) */}
                {standaloneDevices.length > 0 && (
                  <div className="rounded-xl border border-base-600 bg-base-900 p-6 shadow-glow space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-ink-100">
                        Standalone / Unconnected Devices ({standaloneDevices.length})
                      </h3>
                      <p className="text-xs text-ink-400 font-mono mt-1">
                        These devices are located at site {siteInfo.name || selectedSiteCode} but do not have active physical connections in NetBox.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {standaloneDevices.map((d) => {
                        let roleColor = '#3fb950';
                        const roleLower = (d.role || '').toLowerCase();
                        if (roleLower.includes('pe') || roleLower.includes('edge') || roleLower.includes('router')) {
                          roleColor = '#f85149';
                        } else if (roleLower.includes('agg')) {
                          roleColor = '#0096ff';
                        }

                        return (
                          <div
                            key={d.id}
                            onClick={() => setSelectedNode(d)}
                            className="rounded-xl border border-base-700 bg-base-950 p-4 hover:border-base-500 cursor-pointer transition-all space-y-2 text-left"
                          >
                            <div className="flex items-center justify-between">
                              <strong className="text-xs text-ink-100 font-mono truncate">{d.name}</strong>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                {d.status}
                              </span>
                            </div>
                            <div className="text-xs font-mono text-ink-300">
                              Role: <span style={{ color: roleColor }} className="font-bold">{d.role}</span>
                            </div>
                            <div className="text-xs font-mono text-ink-300">
                              IP: <span className="text-ink-100">{d.primary_ip}</span>
                            </div>
                            <div className="text-[11px] font-mono text-ink-500 border-t border-base-800 pt-2">
                              {d.manufacturer} {d.model}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-over Side Drawer for Selected Node Details */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-base-900 border-l border-base-600 h-full p-6 space-y-6 overflow-y-auto shadow-2xl text-left font-mono">
            <div className="flex items-center justify-between border-b border-base-700/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cds/15 text-cds border border-cds/30">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink-100">{selectedNode.id}</h3>
                  <p className="text-xs text-ink-400">{selectedNode.name}</p>
                </div>
              </div>

              <button onClick={() => setSelectedNode(null)} className="text-ink-500 hover:text-ink-100 transition-colors p-1">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-base-950 p-3 border border-base-700/50">
                  <span className="text-ink-500 block text-[10px] uppercase font-semibold">Device Role</span>
                  <span className="text-cds font-bold mt-1 block">{selectedNode.role_name || selectedNode.role}</span>
                </div>
                <div className="rounded-lg bg-base-950 p-3 border border-base-700/50">
                  <span className="text-ink-500 block text-[10px] uppercase font-semibold">Primary IP</span>
                  <span className="text-emerald-400 font-bold mt-1 block">{selectedNode.primary_ip}</span>
                </div>
              </div>

              <div className="rounded-lg bg-base-950 p-4 border border-base-700/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-ink-500">Model / Hardware:</span>
                  <span className="text-ink-200 font-semibold">{selectedNode.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Manufacturer:</span>
                  <span className="text-ink-200">{selectedNode.manufacturer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Site Name:</span>
                  <span className="text-ink-200">{selectedNode.site_name || siteInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Tenant:</span>
                  <span className="text-ink-200">{selectedNode.tenant}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-base-700/60">
              <button
                onClick={() => setSelectedNode(null)}
                className="w-full rounded-lg bg-base-800 hover:bg-base-700 py-2.5 text-xs font-mono font-bold text-ink-200 transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
