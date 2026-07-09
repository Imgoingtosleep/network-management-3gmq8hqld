import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';

export default function PrefixesPage() {
  const fetchLookups = async () => {
    const res = await ndsApi.sites.list();
    return { sites: res.data?.data || [] };
  };

  const getSiteName = (item, lookups) => {
    if (item.siteName) return item.siteName;
    const site = lookups.sites?.find(s => s.id === Number(item.siteId));
    return site ? site.name : 'Unknown Site';
  };

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

  return (
    <NDSPageContainer
      fetchData={() => ndsApi.prefixes.list()}
      fetchLookups={fetchLookups}
      renderTable={(list, lookups) => (
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
            <tr>
              <th className="px-5 py-3.5">IP Prefix Block</th>
              <th className="px-5 py-3.5">VLAN ID</th>
              <th className="px-5 py-3.5">Utilization</th>
              <th className="px-5 py-3.5">VRF</th>
              <th className="px-5 py-3.5">Tenant</th>
              <th className="px-5 py-3.5">Role</th>
              <th className="px-5 py-3.5">Ring Name</th>
              <th className="px-5 py-3.5">Site Assigned</th>
              <th className="px-5 py-3.5">Description</th>
              <th className="px-5 py-3.5">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-600/30">
            {list.map(item => (
              <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                <td className="px-5 py-4 font-mono font-medium text-nds">{item.prefix}</td>
                <td className="px-5 py-4 font-mono text-ink-400">{item.vlan}</td>
                <td className="px-5 py-4">{renderUtilBar(item.utilization)}</td>
                <td className="px-5 py-4 text-ink-400 font-mono text-xs">{item.vrf}</td>
                <td className="px-5 py-4 text-ink-400">{item.tenant}</td>
                <td className="px-5 py-4 text-ink-400 text-xs">{item.role}</td>
                <td className="px-5 py-4 text-pink-400 font-mono text-xs font-semibold">{item.ringname}</td>
                <td className="px-5 py-4 text-ink-400">{getSiteName(item, lookups)}</td>
                <td className="px-5 py-4 text-ink-400 max-w-xs truncate">{item.description}</td>
                <td className="px-5 py-4 font-mono text-xs text-ink-600">{item.last_updated}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={10} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลผลลัพธ์ที่ค้นหา</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    />
  );
}
