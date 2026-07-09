import { NavLink } from 'react-router-dom';

/**
 * Sidebar ใช้ในหน้าของแต่ละทีม (NDS / CDS) สำหรับ sub-navigation
 */
export default function Sidebar({ accent = 'nds', items = [] }) {
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
          return (
            <li key={item.value}>
              {item.path ? (
                <NavLink
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `w-full text-left block rounded-md border-l-2 px-3 py-2 text-sm transition-all ${
                      isActive
                        ? `${activeClass}`
                        : 'border-transparent text-ink-400 hover:text-ink-100 hover:bg-base-800/40'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ) : (
                <button
                  disabled
                  className="w-full text-left block rounded-md border-l-2 border-transparent px-3 py-2 text-sm text-ink-600 cursor-not-allowed"
                >
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

