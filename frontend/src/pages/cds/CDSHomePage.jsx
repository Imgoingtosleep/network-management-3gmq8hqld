import { useEffect, useState } from 'react';
import { cdsApi } from '../../api/cds.api.js';
import Sidebar from '../../components/Sidebar.jsx';
import StatusCard from '../../components/StatusCard.jsx';

const menuItems = [
  { label: 'ภาพรวม', active: true },
  { label: 'โปรเจกต์', active: true },
  { label: 'อุปกรณ์ (Devices)', active: false },
  { label: 'แผนผังเครือข่าย (Topology)', active: false },
];

export default function CDSHomePage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    cdsApi
      .getProjects()
      .then((res) => {
        if (mounted) setProjects(res.data.data || []);
      })
      .catch(() => {
        if (mounted) setError('ไม่สามารถเชื่อมต่อ backend ได้ ตรวจสอบว่า backend รันอยู่ที่ .env ถูกต้อง');
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex gap-10">
      <Sidebar accent="cds" items={menuItems} />

      <section className="flex-1">
        <span className="rounded-full border border-cds/30 bg-cds/10 px-3 py-1 font-mono text-xs tracking-widest text-cds">
          CDS
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink-100">
          Core Design Services
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-400">
          พื้นที่ทำงานของทีม CDS — ข้อมูลโปรเจกต์ด้านการออกแบบ core network ทั้งหมด
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatusCard accent="cds" label="โปรเจกต์ทั้งหมด" value={projects.length} />
          <StatusCard
            accent="cds"
            label="กำลังดำเนินการ"
            value={projects.filter((p) => p.status === 'in_progress').length}
          />
          <StatusCard
            accent="cds"
            label="วางแผนไว้"
            value={projects.filter((p) => p.status === 'planned').length}
          />
        </div>

        <h2 className="mt-10 font-display text-lg font-semibold text-ink-100">โปรเจกต์</h2>

        {loading && <p className="mt-4 text-sm text-ink-400">กำลังโหลดข้อมูล...</p>}
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        {!loading && !error && (
          <ul className="mt-4 divide-y divide-base-600/50 overflow-hidden rounded-xl border border-base-600/60 bg-base-800/40">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-ink-100">{p.name}</p>
                  <p className="text-xs text-ink-600">ผู้รับผิดชอบ: {p.owner}</p>
                </div>
                <span className="rounded-full border border-cds/30 bg-cds/10 px-3 py-1 text-xs text-cds">
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
