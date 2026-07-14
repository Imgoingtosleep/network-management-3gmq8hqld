import { useEffect, useState } from 'react';
import { ndsApi } from '../../api/nds.api.js';

export default function CDSModelsPage() {
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [searchModelQuery, setSearchModelQuery] = useState('');

  // Selected model & its interfaces
  const [selectedModel, setSelectedModel] = useState(null);
  const [interfaces, setInterfaces] = useState([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);
  const [searchInterfaceQuery, setSearchInterfaceQuery] = useState('');

  const fetchDeviceTypes = async () => {
    setLoadingTypes(true);
    try {
      const res = await ndsApi.getDeviceTypes();
      setDeviceTypes(res.data?.data || res.data || res || []);
    } catch (err) {
      console.error('Failed to fetch device types for CDS Models:', err);
    } finally {
      setLoadingTypes(false);
    }
  };

  const fetchInterfaces = async (modelId) => {
    setLoadingInterfaces(true);
    try {
      const res = await ndsApi.getInterfaceTemplates(modelId);
      setInterfaces(res.data?.data || res.data || res || []);
    } catch (err) {
      console.error('Failed to fetch interfaces for model:', err);
      setInterfaces([]);
    } finally {
      setLoadingInterfaces(false);
    }
  };

  useEffect(() => {
    fetchDeviceTypes();
  }, []);

  const handleModelSelect = (model) => {
    setSelectedModel(model);
    fetchInterfaces(model.id);
  };

  // Filter device types (models)
  const filteredModels = deviceTypes.filter(model => {
    const query = searchModelQuery.toLowerCase();
    return (
      (model.model || '').toLowerCase().includes(query) ||
      (model.manufacturer || '').toLowerCase().includes(query) ||
      (model.part_number || '').toLowerCase().includes(query)
    );
  });

  // Filter interfaces of selected model
  const filteredInterfaces = interfaces.filter(iface => {
    const query = searchInterfaceQuery.toLowerCase();
    return (
      (iface.name || '').toLowerCase().includes(query) ||
      (iface.type?.label || iface.type?.value || iface.type || '').toLowerCase().includes(query) ||
      (iface.description || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[72vh] text-left">
      
      {/* Left Window: Models List */}
      <div className="lg:col-span-5 flex flex-col h-full rounded-xl border border-base-600 bg-base-900 overflow-hidden shadow-glow">
        {/* Header & Search */}
        <div className="p-4 border-b border-base-600/50 bg-base-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-md font-semibold text-ink-100 font-display">Device Models</h2>
            <span className="text-[10px] font-mono text-ink-600 px-2 py-0.5 rounded bg-base-950 border border-base-600/30">
              {filteredModels.length} Models
            </span>
          </div>
          <input
            type="text"
            placeholder="ค้นหาโมเดล, ยี่ห้อ, Part Number..."
            value={searchModelQuery}
            onChange={(e) => setSearchModelQuery(e.target.value)}
            className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none transition-colors"
          />
        </div>

        {/* Models List Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-base-600/30 pr-1">
          {loadingTypes ? (
            <div className="p-8 text-center text-xs text-ink-600 font-mono">
              <span className="inline-block animate-spin mr-2">⚙️</span> กำลังโหลดโมเดลอุปกรณ์...
            </div>
          ) : filteredModels.length > 0 ? (
            filteredModels.map((model) => {
              const isSelected = selectedModel?.id === model.id;
              return (
                <div
                  key={model.id}
                  onClick={() => handleModelSelect(model)}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cds/5 border-l-4 border-cds'
                      : 'hover:bg-base-750/30 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono font-medium text-cds">
                      {model.manufacturer}
                    </span>
                    {model.u_height && (
                      <span className="text-[10px] font-mono text-ink-600">
                        {model.u_height} U
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-ink-100 mt-1 font-display">
                    {model.model}
                  </h3>
                  <div className="flex justify-between items-center mt-2 text-[10px] text-ink-400 font-mono">
                    <span>PN: {model.part_number || '-'}</span>
                    <span>{model.interface_count || 0} Interfaces</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-ink-600 font-mono">
              ไม่พบรุ่นโมเดลอุปกรณ์ที่ค้นหา
            </div>
          )}
        </div>
      </div>

      {/* Right Window: Interfaces List */}
      <div className="lg:col-span-7 flex flex-col h-full rounded-xl border border-base-600 bg-base-900 overflow-hidden shadow-glow">
        {selectedModel ? (
          <>
            {/* Header & Search */}
            <div className="p-4 border-b border-base-600/50 bg-base-900/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-cds uppercase tracking-wide">
                    {selectedModel.manufacturer}
                  </span>
                  <h2 className="text-md font-semibold text-ink-100 font-display">
                    {selectedModel.model} Interfaces
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-ink-600 px-2 py-0.5 rounded bg-base-950 border border-base-600/30">
                    {filteredInterfaces.length} / {interfaces.length} Ports
                  </span>
                </div>
              </div>
              <input
                type="text"
                placeholder="ค้นหาชื่อพอร์ต หรือ ประเภทอินเตอร์เฟส..."
                value={searchInterfaceQuery}
                onChange={(e) => setSearchInterfaceQuery(e.target.value)}
                className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:border-cds focus:outline-none transition-colors"
              />
            </div>

            {/* Interfaces Table List */}
            <div className="flex-1 overflow-y-auto">
              {loadingInterfaces ? (
                <div className="p-16 text-center text-xs text-ink-600 font-mono">
                  <span className="inline-block animate-spin mr-2">⚙️</span> กำลังโหลดข้อมูลพอร์ตทั้งหมด...
                </div>
              ) : filteredInterfaces.length > 0 ? (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-base-950 text-[10px] font-mono uppercase text-ink-400 border-b border-base-600/50 sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-3">Interface Name</th>
                      <th className="px-5 py-3">Label</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-600/20">
                    {filteredInterfaces.map((iface) => (
                      <tr key={iface.id} className="hover:bg-base-750/30 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-semibold text-ink-100">
                          {iface.name}
                        </td>
                        <td className="px-5 py-3.5 text-ink-300 font-mono">
                          {iface.label || '-'}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-cds">
                          {iface.type?.label || iface.type?.value || iface.type || 'N/A'}
                        </td>
                        <td className="px-5 py-3.5 text-ink-400 max-w-xs truncate" title={iface.description}>
                          {iface.description || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-16 text-center text-xs text-ink-600 font-mono">
                  โมเดลนี้ยังไม่มีการสร้าง Interface Templates ในระบบ NetBox
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-base-950/10">
            <span className="text-4xl filter grayscale opacity-40">💻</span>
            <h3 className="text-sm font-semibold text-ink-300 mt-4 font-display">
              กรุณาเลือกโมเดลด้านซ้าย
            </h3>
            <p className="text-xs text-ink-600 mt-1 max-w-xs font-mono">
              เลือกอุปกรณ์ที่อยู่ในรายการด้านซ้ายเพื่อเรียกดูพอร์ตอินเตอร์เฟสทั้งหมดของโมเดลนั้น
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
