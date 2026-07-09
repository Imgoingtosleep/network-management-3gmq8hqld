/**
 * Sidebar ใช้ในหน้าของแต่ละทีม (NDS / CDS) สำหรับ sub-navigation ในอนาคต
 * ตอนนี้ยังไม่มี sub-page จริง จึงใส่ label ไว้เป็น placeholder ปิด disabled
 * เมื่อสร้างหน้าจริง (เช่น Devices, Topology) ให้เปลี่ยนเป็น <NavLink>
 */
export default function Sidebar({ accent = 'nds', items = [] }) {
  const accentClass = accent === 'cds' ? 'border-cds/40 text-cds' : 'border-nds/40 text-nds';

  return (
    <aside className="hidden w-56 shrink-0 border-r border-base-600/60 pr-6 md:block">
      <p className="mb-3 px-2 text-xs font-mono uppercase tracking-widest text-ink-600">
        เมนู
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.label}>
            <span
              className={`block cursor-not-allowed rounded-md border-l-2 border-transparent px-3 py-2 text-sm text-ink-400 opacity-60 ${item.active ? accentClass : ''}`}
              title="เตรียมพร้อมสำหรับต่อยอด"
            >
              {item.label}
              {!item.active && (
                <span className="ml-2 text-[10px] text-ink-600">เร็วๆ นี้</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
