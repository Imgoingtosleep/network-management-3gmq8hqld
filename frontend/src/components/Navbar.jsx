import { NavLink } from 'react-router-dom';

const navItem =
  'px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-base-600/60 bg-base-950/80 backdrop-blur">
      <div className="flex w-full items-center justify-between px-8 py-4">
        <NavLink to="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-nds to-cds text-xs font-bold text-base-950">
            N
          </span>
          <span className="font-display text-sm font-semibold tracking-wide text-ink-100">
            NETWORK MANAGEMENT
          </span>
        </NavLink>

        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${navItem} ${isActive ? 'text-ink-100 bg-base-800' : 'text-ink-400 hover:text-ink-100 hover:bg-base-800/60'}`
            }
          >
            หน้าแรก
          </NavLink>
          <NavLink
            to="/nds"
            className={({ isActive }) =>
              `${navItem} ${isActive ? 'text-nds bg-nds/10' : 'text-ink-400 hover:text-ink-100 hover:bg-base-800/60'}`
            }
          >
            NDS
          </NavLink>
          <NavLink
            to="/cds"
            className={({ isActive }) =>
              `${navItem} ${isActive ? 'text-cds bg-cds/10' : 'text-ink-400 hover:text-ink-100 hover:bg-base-800/60'}`
            }
          >
            CDS
          </NavLink>
          <button
            onClick={() => {
              localStorage.removeItem('isAuthenticated');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}
            className="px-3 py-2 text-sm font-medium rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors duration-150 ml-2"
          >
            ออกจากระบบ
          </button>
        </nav>
      </div>
    </header>
  );
}
