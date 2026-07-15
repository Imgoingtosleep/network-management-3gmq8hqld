import { useEffect, useState } from 'react';
import { ndsApi } from '../../api/nds.api.js';
import { cdsApi } from '../../api/cds.api.js';

export default function CDSDomainIPPage() {
  const [regions, setRegions] = useState([]);
  const [devices, setDevices] = useState([]);
  const [sites, setSites] = useState([]);
  const [prefixes, setPrefixes] = useState([]);
  const [ipAddresses, setIpAddresses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);

  // Search queries for each pane
  const [searchRegion, setSearchRegion] = useState('');
  const [searchAgg, setSearchAgg] = useState('');
  const [searchPrefix, setSearchPrefix] = useState('');
  const [searchIp, setSearchIp] = useState('');

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [resRegions, resDevices, resSites, resPrefixes, resIps] = await Promise.all([
        ndsApi.getRegions(),
        ndsApi.getDevices(),
        cdsApi.getSites(),
        cdsApi.getPrefixes(),
        cdsApi.getIpAddresses(),
      ]);

      const regionsList = resRegions.data?.data || resRegions.data || resRegions || [];
      setRegions(regionsList);
      setDevices(resDevices.data?.data || resDevices.data || resDevices || []);
      setSites(resSites.data?.data || resSites.data || resSites || []);
      setPrefixes(resPrefixes.data?.data || resPrefixes.data || resPrefixes || []);
      setIpAddresses(resIps.data?.data || resIps.data || resIps || []);

      // Auto select first region if available
      if (regionsList.length > 0 && !selectedRegion) {
        setSelectedRegion(regionsList[0]);
      }
    } catch (err) {
      console.error('Failed to load CDS Domain & IP data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Helper mappings
  // Site Name -> Region Name
  const siteToRegionMap = {};
  sites.forEach(s => {
    siteToRegionMap[s.name] = s.region;
  });

  // Device Name -> Region Name
  const deviceToRegionMap = {};
  devices.forEach(d => {
    if (d.site) {
      // NetBox site name could be "Bangkok Core (BKK-01)" or "BKK-01"
      // We look up in sites list to find the matching region
      const matchedSite = sites.find(s => s.name === d.site || d.site.includes(s.name));
      deviceToRegionMap[d.name] = matchedSite ? matchedSite.region : 'N/A';
    }
  });

  // 1. Filter Regions (Domain)
  const filteredRegions = regions.filter(r => 
    r.name.toLowerCase().includes(searchRegion.toLowerCase())
  );

  // 2. Filter Aggregations in Selected Region
  const aggDevices = devices.filter(d => {
    const isAggRole = d.role?.toLowerCase() === 'aggregation' || d.role?.toLowerCase() === 'agg';
    if (!isAggRole) return false;
    
    const matchedRegion = deviceToRegionMap[d.name];
    return matchedRegion === selectedRegion?.name;
  }).filter(d => 
    (d.nodeid || '').toLowerCase().includes(searchAgg.toLowerCase()) ||
    (d.name || '').toLowerCase().includes(searchAgg.toLowerCase()) ||
    (d.ip || '').toLowerCase().includes(searchAgg.toLowerCase())
  );

  // 3. Filter IP Networks (Prefixes) in Selected Region
  const filteredPrefixes = prefixes.filter(p => {
    // A prefix is associated with a site
    const matchedSite = sites.find(s => s.id === p.site_id || s.name === p.site?.name);
    const matchedRegion = matchedSite ? matchedSite.region : 'N/A';
    return matchedRegion === selectedRegion?.name;
  }).filter(p => 
    (p.prefix || '').toLowerCase().includes(searchPrefix.toLowerCase()) ||
    (p.vrf || '').toLowerCase().includes(searchPrefix.toLowerCase()) ||
    (p.ringname || '').toLowerCase().includes(searchPrefix.toLowerCase())
  );

  // 4. Filter IP Addresses in Selected Region
  const filteredIps = ipAddresses.filter(ip => {
    // If the IP is assigned to a device, we can resolve its region
    if (ip.device && ip.device !== 'N/A') {
      return deviceToRegionMap[ip.device] === selectedRegion?.name;
    }
    return false;
  }).filter(ip => 
    (ip.address || '').toLowerCase().includes(searchIp.toLowerCase()) ||
    (ip.device || '').toLowerCase().includes(searchIp.toLowerCase()) ||
    (ip.interface || '').toLowerCase().includes(searchIp.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 h-[76vh] text-left">
      {/* Top Controls */}
      <div className="flex justify-between items-center bg-base-900 border border-base-600/30 p-3 rounded-xl shadow-glow">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400 font-mono">Selected Domain:</span>
          <span className="text-xs font-semibold text-cds font-display bg-cds/10 border border-cds/20 px-2.5 py-0.5 rounded-full">
            {selectedRegion ? selectedRegion.name : 'None'}
          </span>
        </div>
        <button
          onClick={loadAllData}
          disabled={loading}
          className="px-4 py-1.5 text-[10px] font-semibold rounded-lg bg-base-950 border border-base-600 text-ink-400 hover:text-ink-100 hover:bg-base-800 transition-all font-mono"
        >
          {loading ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}
        </button>
      </div>

      {/* 4 Windows Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-6 flex-1 min-h-0">
        
        {/* Pane 1 (Top Left): Domain (Region) */}
        <div className="flex flex-col h-full rounded-xl border border-base-600 bg-base-900 overflow-hidden shadow-glow">
          <div className="p-3 border-b border-base-600/50 bg-base-900/50 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-ink-100 uppercase tracking-wider font-mono">
                Domain (Region)
              </h3>
              <span className="text-[9px] font-mono text-ink-600">
                {filteredRegions.length} Regions
              </span>
            </div>
            <input
              type="text"
              placeholder="ค้นหา Domain / Region..."
              value={searchRegion}
              onChange={(e) => setSearchRegion(e.target.value)}
              className="w-full rounded bg-base-950 border border-base-600/60 px-2 py-1 text-[11px] text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-ink-600 font-mono">กำลังโหลด...</div>
            ) : filteredRegions.length > 0 ? (() => {
              const roots = [];
              const childrenMap = {};

              filteredRegions.forEach(r => {
                if (!r.parent) {
                  roots.push(r);
                } else {
                  const pId = r.parent.id;
                  if (!childrenMap[pId]) {
                    childrenMap[pId] = [];
                  }
                  childrenMap[pId].push(r);
                }
              });

              filteredRegions.forEach(r => {
                if (r.parent && !roots.some(parent => parent.id === r.parent.id) && !roots.some(item => item.id === r.id)) {
                  roots.push(r);
                }
              });

              return (
                <div className="divide-y divide-base-600/20">
                  {roots.map(root => {
                    const isRootSelected = selectedRegion?.id === root.id;
                    const children = childrenMap[root.id] || [];
                    return (
                      <div key={root.id} className="py-1">
                        <div
                          onClick={() => setSelectedRegion(root)}
                          className={`px-4 py-2.5 cursor-pointer text-xs font-mono transition-all flex justify-between items-center ${
                            isRootSelected
                              ? 'bg-cds/10 text-cds font-bold'
                              : 'hover:bg-base-750/30 text-ink-100 font-semibold'
                          }`}
                        >
                          <span>📁 {root.name}</span>
                          <span className="text-[9px] text-ink-600">ID: {root.id}</span>
                        </div>

                        {children.length > 0 && (
                          <div className="pl-6 border-l border-base-600/30 ml-4 my-1 space-y-1">
                            {children.map(child => {
                              const isChildSelected = selectedRegion?.id === child.id;
                              return (
                                <div
                                  key={child.id}
                                  onClick={() => setSelectedRegion(child)}
                                  className={`px-3 py-1.5 cursor-pointer text-xs font-mono transition-all flex justify-between items-center rounded ${
                                    isChildSelected
                                      ? 'bg-cds/5 text-cds font-semibold'
                                      : 'hover:bg-base-750/20 text-ink-400'
                                  }`}
                                >
                                  <span>↳ {child.name}</span>
                                  <span className="text-[8px] text-ink-600">ID: {child.id}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })() : (
              <div className="p-8 text-center text-xs text-ink-650 font-mono">ไม่พบข้อมูล</div>
            )}
          </div>
        </div>

        {/* Pane 2 (Top Right): Aggregation */}
        <div className="flex flex-col h-full rounded-xl border border-base-600 bg-base-900 overflow-hidden shadow-glow">
          <div className="p-3 border-b border-base-600/50 bg-base-900/50 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-ink-100 uppercase tracking-wider font-mono">
                Aggregation Devices
              </h3>
              <span className="text-[9px] font-mono text-ink-600">
                {aggDevices.length} Devices
              </span>
            </div>
            <input
              type="text"
              placeholder="ค้นหา Node ID, Name, IP..."
              value={searchAgg}
              onChange={(e) => setSearchAgg(e.target.value)}
              className="w-full rounded bg-base-950 border border-base-600/60 px-2 py-1 text-[11px] text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-ink-600 font-mono">กำลังโหลด...</div>
            ) : aggDevices.length > 0 ? (
              <table className="w-full text-left text-[11px] whitespace-nowrap">
                <thead className="bg-base-950 text-[9px] font-mono uppercase text-ink-400 border-b border-base-600/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5">Node ID</th>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">IP</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-600/20">
                  {aggDevices.map(d => (
                    <tr key={d.id} className="hover:bg-base-750/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-ink-400">{d.nodeid || '-'}</td>
                      <td className="px-4 py-2.5 font-medium text-ink-100">{d.name}</td>
                      <td className="px-4 py-2.5 font-mono text-cds">{d.ip || '-'}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[9px] text-green-400 border border-green-500/20 uppercase font-mono">
                          {d.status || 'active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-ink-650 font-mono">
                ไม่มีอุปกรณ์ Aggregation ใน Domain นี้
              </div>
            )}
          </div>
        </div>

        {/* Pane 3 (Bottom Left): IP Network */}
        <div className="flex flex-col h-full rounded-xl border border-base-600 bg-base-900 overflow-hidden shadow-glow">
          <div className="p-3 border-b border-base-600/50 bg-base-900/50 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-ink-100 uppercase tracking-wider font-mono">
                IP Network (VRF / Prefixes)
              </h3>
              <span className="text-[9px] font-mono text-ink-600">
                {filteredPrefixes.length} Networks
              </span>
            </div>
            <input
              type="text"
              placeholder="ค้นหา IP Network, VRF, Ring..."
              value={searchPrefix}
              onChange={(e) => setSearchPrefix(e.target.value)}
              className="w-full rounded bg-base-950 border border-base-600/60 px-2 py-1 text-[11px] text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-ink-600 font-mono">กำลังโหลด...</div>
            ) : filteredPrefixes.length > 0 ? (
              <table className="w-full text-left text-[11px] whitespace-nowrap">
                <thead className="bg-base-950 text-[9px] font-mono uppercase text-ink-400 border-b border-base-600/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5">IP Network</th>
                    <th className="px-4 py-2.5">VRF</th>
                    <th className="px-4 py-2.5">Vlan</th>
                    <th className="px-4 py-2.5">Ring Name</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-600/20">
                  {filteredPrefixes.map(p => (
                    <tr key={p.id} className="hover:bg-base-750/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-cds font-medium">{p.prefix}</td>
                      <td className="px-4 py-2.5 text-ink-400">{p.vrf}</td>
                      <td className="px-4 py-2.5 font-mono text-ink-300">{p.vlan || '-'}</td>
                      <td className="px-4 py-2.5 text-ink-300 font-mono">{p.ringname || '-'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-mono uppercase ${
                          p.status_value === 'active'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-base-600/30 text-ink-400 border border-base-600/50'
                        }`}>
                          {p.status?.label || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-ink-650 font-mono">
                ไม่มีข้อมูล IP Network ใน Domain นี้
              </div>
            )}
          </div>
        </div>

        {/* Pane 4 (Bottom Right): IP Address */}
        <div className="flex flex-col h-full rounded-xl border border-base-600 bg-base-900 overflow-hidden shadow-glow">
          <div className="p-3 border-b border-base-600/50 bg-base-900/50 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-ink-100 uppercase tracking-wider font-mono">
                IP Address
              </h3>
              <span className="text-[9px] font-mono text-ink-600">
                {filteredIps.length} IPs
              </span>
            </div>
            <input
              type="text"
              placeholder="ค้นหา IP Address, Device, Interface..."
              value={searchIp}
              onChange={(e) => setSearchIp(e.target.value)}
              className="w-full rounded bg-base-950 border border-base-600/60 px-2 py-1 text-[11px] text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-ink-600 font-mono">กำลังโหลด...</div>
            ) : filteredIps.length > 0 ? (
              <table className="w-full text-left text-[11px] whitespace-nowrap">
                <thead className="bg-base-950 text-[9px] font-mono uppercase text-ink-400 border-b border-base-600/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5">IP Address</th>
                    <th className="px-4 py-2.5">Device</th>
                    <th className="px-4 py-2.5">Interface</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-600/20">
                  {filteredIps.map(ip => (
                    <tr key={ip.id} className="hover:bg-base-750/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-cds font-semibold">
                        {ip.full_address}
                      </td>
                      <td className="px-4 py-2.5 text-ink-100 font-medium">{ip.device}</td>
                      <td className="px-4 py-2.5 font-mono text-ink-400">{ip.interface}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[9px] text-green-400 border border-green-500/20 uppercase font-mono">
                          {ip.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-ink-600 max-w-xs truncate" title={ip.description}>
                        {ip.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-ink-650 font-mono">
                ไม่มีข้อมูล IP Address ใน Domain นี้
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
