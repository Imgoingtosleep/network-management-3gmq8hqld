import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';

export default function AggsPage() {
  const fetchLookups = async () => {
    const res = await ndsApi.sites.list();
    return { sites: res.data?.data || [] };
  };

  const getSiteName = (item, lookups) => {
    if (item.siteName) return item.siteName;
    const site = lookups.sites?.find(s => s.id === Number(item.siteId));
    return site ? site.name : 'Unknown Site';
  };

  return (
    <NDSPageContainer
      fetchData={() => ndsApi.aggs.list()}
      fetchLookups={fetchLookups}
      renderTable={(list, lookups) => (
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
            {list.map(item => (
              <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                <td className="px-5 py-4 font-mono font-medium text-ink-100">{item.name}</td>
                <td className="px-5 py-4 text-ink-400">{item.manufacturer}</td>
                <td className="px-5 py-4 text-ink-400">{item.model}</td>
                <td className="px-5 py-4 font-mono text-nds">{item.ip}</td>
                <td className="px-5 py-4 text-ink-400">{getSiteName(item, lookups)}</td>
                <td className="px-5 py-4 text-ink-400">{item.location}</td>
                <td className="px-5 py-4 text-ink-400">{item.rack}</td>
                <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.serial}</td>
                <td className="px-5 py-4 font-mono text-xs text-ink-400">{item.asset_tag}</td>
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
