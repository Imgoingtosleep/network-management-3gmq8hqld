import { useEffect, useState } from 'react';
import { ndsApi } from '../../api/nds.api.js';
import { cdsApi } from '../../api/cds.api.js';

// IP to Integer Helper
const ipToInt = (ip) => {
  if (typeof ip !== 'string') return 0;
  const parts = ip.split('.');
  if (parts.length !== 4) return 0;
  return parts.reduce((ipInt, octet) => (ipInt << 8) + parseInt(octet, 10), 0) >>> 0;
};

// Check if IP is in CIDR subnet
const ipInCidr = (ip, cidr) => {
  if (!ip || !cidr || typeof ip !== 'string' || typeof cidr !== 'string') return false;
  try {
    const parts = cidr.split('/');
    const cidrIp = parts[0];
    const maskStr = parts[1];
    const mask = parseInt(maskStr, 10);
    if (isNaN(mask)) return false;

    const ipInt = ipToInt(ip);
    const cidrInt = ipToInt(cidrIp);

    const maskInt = mask === 0 ? 0 : (0xffffffff << (32 - mask)) >>> 0;
    return (ipInt & maskInt) === (cidrInt & maskInt);
  } catch (err) {
    console.error('Error in ipInCidr:', err);
    return false;
  }
};

export default function CDSDomainDemoPage() {
  const [vrfs, setVrfs] = useState([]);
  const [prefixes, setPrefixes] = useState([]);
  const [ipAddresses, setIpAddresses] = useState([]);
  const [loadingVrfs, setLoadingVrfs] = useState(false);
  const [loadingIps, setLoadingIps] = useState(false);
  const [selectedVrf, setSelectedVrf] = useState(null);
  const [error, setError] = useState(null);
  const [renderError, setRenderError] = useState(null);

  // Search queries
  const [searchVrfQuery, setSearchVrfQuery] = useState('');
  const [searchNetworkQuery, setSearchNetworkQuery] = useState('');
  const [searchIpsByPrefix, setSearchIpsByPrefix] = useState({});

  // Global Error Listener for debugging
  useEffect(() => {
    const handleError = (event) => {
      setRenderError(event.error?.stack || event.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const loadVrfs = async () => {
    setLoadingVrfs(true);
    setError(null);
    try {
      const res = await ndsApi.domains.list();
      const list = res.data?.data || res.data || res || [];
      setVrfs(list);
      
      // Auto-select first VRF
      if (list.length > 0 && !selectedVrf) {
        setSelectedVrf(list[0]);
      }
    } catch (err) {
      console.error('Failed to load NDS VRFs:', err);
      setError('ไม่สามารถเชื่อมต่อดึงข้อมูล VRF จากระบบหลังบ้านได้');
    } finally {
      setLoadingVrfs(false);
    }
  };

  const loadIpsAndPrefixes = async () => {
    setLoadingIps(true);
    try {
      const [resIps, resPrefixes] = await Promise.all([
        cdsApi.getIpAddresses(),
        cdsApi.getPrefixes()
      ]);
      
      const ips = resIps.data?.data || resIps.data || resIps || [];
      const prefs = resPrefixes.data?.data || resPrefixes.data || resPrefixes || [];
      
      setIpAddresses(ips);
      setPrefixes(prefs);
    } catch (err) {
      console.error('Failed to load NDS IP Addresses & Prefixes:', err);
      setError('ไม่สามารถเชื่อมต่อดึงข้อมูล IP หรือ Prefix ได้');
    } finally {
      setLoadingIps(false);
    }
  };

  useEffect(() => {
    loadVrfs();
    loadIpsAndPrefixes();
  }, []);

  const handleVrfSelect = (vrf) => {
    setSelectedVrf(vrf);
  };

  if (renderError) {
    return (
      <div className="p-6 bg-red-950/80 border border-red-500 rounded-xl text-left font-mono text-red-400 text-xs shadow-glow">
        <h3 className="text-sm font-bold text-red-200 mb-2">Render Error Detected</h3>
        <pre className="whitespace-pre-wrap">{renderError}</pre>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-3 py-1.5 bg-red-500 text-white rounded text-[10px] font-semibold hover:bg-red-600 transition-colors"
        >
          Reload Page
        </button>
      </div>
    );
  }

  // Filter VRFs
  const filteredVrfs = vrfs.filter(vrf => {
    if (!vrf) return false;
    const query = searchVrfQuery.toLowerCase();
    return (
      (vrf.name || '').toLowerCase().includes(query) ||
      (vrf.rd || '').toLowerCase().includes(query) ||
      (vrf.tenant || '').toLowerCase().includes(query) ||
      (vrf.description || '').toLowerCase().includes(query)
    );
  });

  // Get prefixes in current VRF
  const vrfPrefixes = prefixes.filter(p => {
    if (!selectedVrf || !p) return false;
    return p.vrf_id === selectedVrf.id || p.vrf === selectedVrf.name;
  });

  // Filter Prefixes based on searchNetworkQuery (กล่องค้นหาหลัก)
  const filteredPrefixes = vrfPrefixes.filter(p => {
    if (!p || !p.prefix) return false;
    const query = searchNetworkQuery.toLowerCase();
    return (
      p.prefix.toLowerCase().includes(query) ||
      (p.ringname || '').toLowerCase().includes(query) ||
      (p.vlan && String(typeof p.vlan === 'object' ? (p.vlan.vid || p.vlan.name || p.vlan.display) : p.vlan).toLowerCase().includes(query))
    );
  });

  // Filter IPs in the selected VRF (ดึงมาทั้งหมดเพื่อนำมาจัดกลุ่ม และใช้กล่องค้นหาย่อยในแต่ละวงกรองทีหลัง)
  const allVrfIps = ipAddresses.filter(ip => {
    if (!selectedVrf || !ip) return false;
    return ip.vrf_id === selectedVrf.id || ip.vrf === selectedVrf.name;
  });

  // Group IPs by Prefix
  const ipsByPrefix = {};
  vrfPrefixes.forEach(p => {
    if (p && p.prefix) {
      ipsByPrefix[p.prefix] = [];
    }
  });
  const unassignedIps = [];

  allVrfIps.forEach(ip => {
    if (!ip) return;
    const matchedPrefix = vrfPrefixes.find(p => p && p.prefix && ipInCidr(ip.address, p.prefix));
    if (matchedPrefix && matchedPrefix.prefix && ipsByPrefix[matchedPrefix.prefix]) {
      ipsByPrefix[matchedPrefix.prefix].push(ip);
    } else {
      unassignedIps.push(ip);
    }
  });

  return (
    <div className="space-y-4 text-left">
      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400 font-mono">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[72vh]">
        {/* Left Window: VRF (Domain) List */}
        <div className="lg:col-span-5 flex flex-col h-full rounded-xl border border-base-600 bg-base-900 overflow-hidden shadow-glow">
          {/* Header & Search */}
          <div className="p-4 border-b border-base-600/50 bg-base-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-semibold text-ink-100 font-display">Domains (VRF List)</h2>
              <span className="text-[10px] font-mono text-ink-600 px-2 py-0.5 rounded bg-base-950 border border-base-600/30">
                {filteredVrfs.length} VRFs
              </span>
            </div>
            <input
              type="text"
              placeholder="ค้นหา VRF Name, RD, Tenant..."
              value={searchVrfQuery}
              onChange={(e) => setSearchVrfQuery(e.target.value)}
              className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none transition-colors"
            />
          </div>

          {/* VRF List Content Table */}
          <div className="flex-1 overflow-y-auto">
            {loadingVrfs ? (
              <div className="p-8 text-center text-xs text-ink-600 font-mono">
                <span className="inline-block animate-spin mr-2">⚙️</span> กำลังโหลด VRFs...
              </div>
            ) : filteredVrfs.length > 0 ? (
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-base-950 text-[10px] font-mono uppercase text-ink-400 border-b border-base-600/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5">VRF Name</th>
                    <th className="px-4 py-2.5">RD</th>
                    <th className="px-4 py-2.5">Tenant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-600/20">
                  {filteredVrfs.map((vrf) => {
                    if (!vrf) return null;
                    const isSelected = selectedVrf?.id === vrf.id;
                    return (
                      <tr
                        onClick={() => handleVrfSelect(vrf)}
                        key={vrf.id}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cds/10 hover:bg-cds/15'
                            : 'hover:bg-base-750/30'
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-cds hover:underline">
                          {vrf.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-ink-300">{vrf.rd || '-'}</td>
                        <td className="px-4 py-3 text-ink-400 max-w-[120px] truncate" title={vrf.tenant}>
                          {vrf.tenant}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-ink-650 font-mono">
                ไม่พบข้อมูล VRF
              </div>
            )}
          </div>
        </div>

        {/* Right Window: IP Addresses Grouped by Prefix */}
        <div className="lg:col-span-7 flex flex-col h-full rounded-xl border border-base-600 bg-base-900 overflow-hidden shadow-glow">
          {selectedVrf ? (
            <>
              {/* Header & Search */}
              <div className="p-4 border-b border-base-600/50 bg-base-900/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-cds uppercase tracking-wide">
                      VRF: {selectedVrf.rd || 'No RD'}
                    </span>
                    <h2 className="text-md font-semibold text-ink-100 font-display">
                      {selectedVrf.name} IP Networks & addresses
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-ink-600 px-2 py-0.5 rounded bg-base-950 border border-base-600/30">
                    {allVrfIps.length} Total IPs
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="ค้นหา Network / Prefix"
                  value={searchNetworkQuery}
                  onChange={(e) => setSearchNetworkQuery(e.target.value)}
                  className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none transition-colors"
                />
              </div>

              {/* Grouped IP Address List Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {loadingIps ? (
                  <div className="p-12 text-center text-xs text-ink-600 font-mono">
                    <span className="inline-block animate-spin mr-2">⚙️</span> กำลังโหลดข้อมูล...
                  </div>
                ) : filteredPrefixes.length > 0 || unassignedIps.length > 0 ? (
                  <>
                    {/* Loop over Prefixes */}
                    {filteredPrefixes.map(p => {
                      if (!p || !p.prefix) return null;
                      const ips = ipsByPrefix[p.prefix] || [];
                      const prefixQuery = (searchIpsByPrefix[p.prefix] || '').toLowerCase();
                      const visibleIps = ips.filter(ip => {
                        if (!prefixQuery) return true;
                        return (
                          (ip.address || '').toLowerCase().includes(prefixQuery) ||
                          (ip.full_address || '').toLowerCase().includes(prefixQuery) ||
                          (ip.device || '').toLowerCase().includes(prefixQuery) ||
                          (ip.interface || '').toLowerCase().includes(prefixQuery) ||
                          (ip.description || '').toLowerCase().includes(prefixQuery)
                        );
                      });

                      return (
                        <div key={p.id} className="rounded-lg border border-base-600 bg-base-950/20 overflow-hidden">
                          {/* Prefix Header */}
                          <div className="px-4 py-2 bg-base-950 border-b border-base-600/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-mono font-bold text-cds">{p.prefix}</span>
                              {p.vlan && (
                                <span className="text-[9px] font-mono bg-base-800 text-ink-300 border border-base-600/30 px-1.5 py-0.5 rounded">
                                  VLAN: {typeof p.vlan === 'object' ? (p.vlan.vid || p.vlan.name || p.vlan.display) : p.vlan}
                                </span>
                              )}
                              {p.ringname && p.ringname !== 'N/A' && (
                                <span className="text-[9px] font-mono bg-base-800 text-ink-300 border border-base-600/30 px-1.5 py-0.5 rounded">
                                  {p.ringname}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="ค้นหา IP หรืออุปกรณ์ในวงนี้..."
                                value={searchIpsByPrefix[p.prefix] || ''}
                                onChange={(e) => setSearchIpsByPrefix({
                                  ...searchIpsByPrefix,
                                  [p.prefix]: e.target.value
                                })}
                                className="rounded border border-base-600 bg-base-900 px-2 py-0.5 text-[10px] text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none w-36 transition-colors"
                              />
                              <span className="text-[10px] font-mono text-ink-500">
                                {visibleIps.length} / {ips.length} IPs
                              </span>
                            </div>
                          </div>

                          {/* Prefix IPs Table */}
                          {visibleIps.length > 0 ? (
                            <table className="w-full text-left text-xs whitespace-nowrap">
                              <thead className="bg-base-900/30 text-[9px] font-mono uppercase text-ink-600 border-b border-base-600/30">
                                <tr>
                                  <th className="px-4 py-2">IP Address</th>
                                  <th className="px-4 py-2">Status</th>
                                  <th className="px-4 py-2">Device</th>
                                  <th className="px-4 py-2">Interface</th>
                                  <th className="px-4 py-2">Description</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-base-600/10">
                                {visibleIps.map((ip) => (
                                  <tr key={ip.id} className="hover:bg-base-750/20 transition-colors">
                                    <td className="px-4 py-2.5 font-mono text-cds">{ip.full_address}</td>
                                    <td className="px-4 py-2.5">
                                      <span className="rounded bg-green-500/10 px-1.5 py-0.2 text-[9px] text-green-400 border border-green-500/10 uppercase font-mono">
                                        {ip.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-ink-200">{ip.device}</td>
                                    <td className="px-4 py-2.5 font-mono text-ink-400">{ip.interface}</td>
                                    <td className="px-4 py-2.5 text-ink-600 max-w-[150px] truncate" title={ip.description}>
                                      {ip.description || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="p-4 text-center text-xs text-ink-600 font-mono">
                              ไม่มี IP Address ที่ตรงกับการค้นหาภายใต้เครือข่ายย่อยนี้
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Unassigned/Other IPs */}
                    {unassignedIps.length > 0 && (() => {
                      const unassignedQuery = (searchIpsByPrefix['unassigned'] || '').toLowerCase();
                      const visibleUnassigned = unassignedIps.filter(ip => {
                        if (!unassignedQuery) return true;
                        return (
                          (ip.address || '').toLowerCase().includes(unassignedQuery) ||
                          (ip.full_address || '').toLowerCase().includes(unassignedQuery) ||
                          (ip.device || '').toLowerCase().includes(unassignedQuery) ||
                          (ip.interface || '').toLowerCase().includes(unassignedQuery) ||
                          (ip.description || '').toLowerCase().includes(unassignedQuery)
                        );
                      });

                      return (
                        <div className="rounded-lg border border-base-600 bg-base-950/20 overflow-hidden">
                          <div className="px-4 py-2 bg-base-950 border-b border-base-600/50 flex justify-between items-center">
                            <span className="text-xs font-mono font-bold text-ink-400">📁 Global / Unassigned IPs</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="ค้นหา IP หรืออุปกรณ์..."
                                value={searchIpsByPrefix['unassigned'] || ''}
                                onChange={(e) => setSearchIpsByPrefix({
                                  ...searchIpsByPrefix,
                                  unassigned: e.target.value
                                })}
                                className="rounded border border-base-600 bg-base-900 px-2 py-0.5 text-[10px] text-ink-100 placeholder-ink-600 focus:border-nds focus:outline-none w-36 transition-colors"
                              />
                              <span className="text-[10px] font-mono text-ink-500">
                                {visibleUnassigned.length} / {unassignedIps.length} IPs
                              </span>
                            </div>
                          </div>
                          {visibleUnassigned.length > 0 ? (
                            <table className="w-full text-left text-xs whitespace-nowrap">
                              <thead className="bg-base-900/30 text-[9px] font-mono uppercase text-ink-600 border-b border-base-600/30">
                                <tr>
                                  <th className="px-4 py-2">IP Address</th>
                                  <th className="px-4 py-2">Status</th>
                                  <th className="px-4 py-2">Device</th>
                                  <th className="px-4 py-2">Interface</th>
                                  <th className="px-4 py-2">Description</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-base-600/10">
                                {visibleUnassigned.map((ip) => (
                                  <tr key={ip.id} className="hover:bg-base-750/20 transition-colors">
                                    <td className="px-4 py-2.5 font-mono text-cds">{ip.full_address}</td>
                                    <td className="px-4 py-2.5">
                                      <span className="rounded bg-green-500/10 px-1.5 py-0.2 text-[9px] text-green-400 border border-green-500/10 uppercase font-mono">
                                        {ip.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-ink-200">{ip.device}</td>
                                    <td className="px-4 py-2.5 font-mono text-ink-400">{ip.interface}</td>
                                    <td className="px-4 py-2.5 text-ink-600 max-w-[150px] truncate" title={ip.description}>
                                      {ip.description || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="p-4 text-center text-xs text-ink-600 font-mono">
                              ไม่มี IP Address ที่ตรงกับการค้นหา
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="p-12 text-center text-xs text-ink-650 font-mono">
                    ไม่พบเครือข่ายย่อยหรือไอพีภายใต้ VRF นี้
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-base-950/10">
              <span className="text-4xl filter grayscale opacity-40">🌐</span>
              <h3 className="text-sm font-semibold text-ink-300 mt-4 font-display">
                กรุณาเลือก VRF ด้านซ้าย
              </h3>
              <p className="text-xs text-ink-600 mt-1 max-w-xs font-mono">
                คลิกเลือก VRF Name ด้านซ้ายเพื่อตรวจสอบรายการเครือข่ายย่อยและ IP Address
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
