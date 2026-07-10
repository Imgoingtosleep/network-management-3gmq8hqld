import NDSPageContainer from '../../components/NDSPageContainer.jsx';
import { ndsApi } from '../../api/nds.api.js';

export default function DeviceTypesPage() {
  const renderDeviceTypesTable = (list) => {
    return (
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-base-900/50 text-xs font-mono uppercase text-ink-400 border-b border-base-600/50">
          <tr>
            <th className="px-5 py-3.5">Device Type</th>
            <th className="px-5 py-3.5">Manufacturer</th>
            <th className="px-5 py-3.5">Part number</th>
            <th className="px-5 py-3.5">U Height</th>
            <th className="px-5 py-3.5">Full Depth</th>
            <th className="px-5 py-3.5">Device Count</th>
            <th className="px-5 py-3.5">Interfaces</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-600/30">
          {list.map(item => (
            <tr key={item.id} className="hover:bg-base-700/20 transition-colors">
              <td className="px-5 py-4 font-medium text-nds font-mono">{item.model || 'N/A'}</td>
              <td className="px-5 py-4 font-semibold text-ink-100">{item.manufacturer || 'N/A'}</td>
              <td className="px-5 py-4 text-ink-400 font-mono">{item.part_number || 'N/A'}</td>
              <td className="px-5 py-4 text-ink-400 font-mono">{item.u_height ? `${item.u_height}U` : '0U'}</td>
              <td className="px-5 py-4 text-ink-400">{item.is_full_depth || 'No'}</td>
              <td className="px-5 py-4 text-ink-400 font-mono">{item.device_count || 0}</td>
              <td className="px-5 py-4 text-ink-400 font-mono">{item.interface_count || 0}</td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-10 text-center text-sm text-ink-500 font-mono">
                ไม่พบข้อมูล Device Types ในระบบ
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  return (
    <NDSPageContainer
      fetchData={() => ndsApi.getDeviceTypes()}
      renderTable={renderDeviceTypesTable}
      placeholder="ค้นหาด่วน (เช่น ชื่อรุ่น, ผู้ผลิต)..."
    />
  );
}
