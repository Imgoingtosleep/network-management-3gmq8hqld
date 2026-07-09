import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';

export default function DomainsPage() {
  return (
    <NDSPageContainer
      fetchData={() => ndsApi.domains.list()}
      renderTable={(list) => (
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
            <tr>
              <th className="px-5 py-3.5">VRF Name</th>
              <th className="px-5 py-3.5">Route Distinguisher (RD)</th>
              <th className="px-5 py-3.5">Tenant</th>
              <th className="px-5 py-3.5">Description</th>
              <th className="px-5 py-3.5">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-600/30">
            {list.map(item => (
              <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
                <td className="px-5 py-4 font-medium text-ink-100">{item.name}</td>
                <td className="px-5 py-4 font-mono text-xs text-nds">{item.rd}</td>
                <td className="px-5 py-4 text-ink-400">{item.tenant}</td>
                <td className="px-5 py-4 text-ink-400 max-w-xs truncate">{item.description}</td>
                <td className="px-5 py-4 font-mono text-xs text-ink-600">{item.last_updated}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">ไม่พบข้อมูลผลลัพธ์ที่ค้นหา</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    />
  );
}
