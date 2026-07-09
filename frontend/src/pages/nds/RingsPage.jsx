import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';

export default function RingsPage() {
  const fetchLookups = async () => {
    const [aggsRes, domainsRes] = await Promise.all([
      ndsApi.aggs.list(),
      ndsApi.domains.list()
    ]);
    return {
      aggs: aggsRes.data?.data || [],
      domains: domainsRes.data?.data || []
    };
  };

  const getAggName = (aggId, lookups) => {
    const agg = lookups.aggs?.find(a => a.id === Number(aggId));
    return agg ? agg.name : 'Unknown AGG';
  };

  const getDomainName = (domId, lookups) => {
    const dom = lookups.domains?.find(d => d.id === Number(domId));
    return dom ? dom.name : 'Unknown Domain';
  };

  return (
    <NDSPageContainer
      fetchData={() => ndsApi.rings.list()}
      fetchLookups={fetchLookups}
      renderTable={(list, lookups) => (
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
            {list.map(item => (
              <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                <td className="px-5 py-4 font-mono font-medium text-ink-100">{item.ringName}</td>
                <td className="px-5 py-4 text-ink-400">{getAggName(item.aggId, lookups)}</td>
                <td className="px-5 py-4 text-ink-400">{getDomainName(item.domainId, lookups)}</td>
                <td className="px-5 py-4 font-mono text-xs text-nds">{item.bandwidth}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลผลลัพธ์ที่ค้นหา</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    />
  );
}
