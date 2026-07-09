/**
 * Sidebar ใช้ในหน้าของแต่ละทีม (NDS / CDS) สำหรับ sub-navigation ในอนาคต
 * ตอนนี้ยังไม่มี sub-page จริง จึงใส่ label ไว้เป็น placeholder ปิด disabled
 * เมื่อสร้างหน้าจริง (เช่น Devices, Topology) ให้เปลี่ยนเป็น <NavLink>
 */
export default function Sidebar({ accent = 'nds', items = [], activeTab, onSelectTab }) {
  const activeClass = accent === 'cds'
    ? 'border-cds text-cds bg-cds/5 font-semibold'
    : 'border-nds text-nds bg-nds/5 font-semibold';

  return (
    <aside className="hidden w-56 shrink-0 border-r border-base-600/60 pr-6 md:block">
      <p className="mb-3 px-2 text-xs font-mono uppercase tracking-widest text-ink-600">
        เมนู
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = item.value === activeTab;
          return (
            <li key={item.value}>
              <button
                onClick={() => onSelectTab && onSelectTab(item.value)}
                className={`w-full text-left block rounded-md border-l-2 px-3 py-2 text-sm transition-all ${
                  isActive
                    ? `${activeClass}`
                    : 'border-transparent text-ink-400 hover:text-ink-100 hover:bg-base-800/40'
                }`}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
