import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItem =
  'px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 flex items-center gap-1.5';

export default function Navbar() {
  const { user, canAccessNDS, canAccessCDS, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-base-600/60 bg-base-950/80 backdrop-blur-md">
      <div className="flex w-full items-center justify-between px-6 sm:px-8 py-3.5">
        {/* Left: Brand Logo & Title */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-nds to-cds text-xs font-black text-base-950 shadow-md transition-transform group-hover:scale-105">
            N
          </span>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold tracking-wide text-ink-100 group-hover:text-white transition-colors">
              NETWORK MANAGEMENT
            </span>
            <span className="text-[10px] font-mono text-ink-500 tracking-wider">
              PORTAL HUB
            </span>
          </div>
        </NavLink>

        {/* Center/Right: Team Links and User Control */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${navItem} ${
                  isActive
                    ? 'text-ink-100 bg-base-800'
                    : 'text-ink-400 hover:text-ink-100 hover:bg-base-800/60'
                }`
              }
            >
              หน้าแรก
            </NavLink>

            {/* NDS Menu Link */}
            {canAccessNDS ? (
              <NavLink
                to="/nds"
                className={({ isActive }) =>
                  `${navItem} ${
                    isActive
                      ? 'text-nds bg-nds/15 font-semibold'
                      : 'text-ink-400 hover:text-nds hover:bg-nds/10'
                  }`
                }
              >
                <span className="h-1.5 w-1.5 rounded-full bg-nds" />
                NDS
              </NavLink>
            ) : null}

            {/* CDS Menu Link */}
            {canAccessCDS ? (
              <NavLink
                to="/cds"
                className={({ isActive }) =>
                  `${navItem} ${
                    isActive
                      ? 'text-cds bg-cds/15 font-semibold'
                      : 'text-ink-400 hover:text-cds hover:bg-cds/10'
                  }`
                }
              >
                <span className="h-1.5 w-1.5 rounded-full bg-cds" />
                CDS
              </NavLink>
            ) : null}
          </nav>

          {/* User Profile Pill & Logout */}
          <div className="flex items-center gap-2 border-l border-base-600/50 pl-3">
            <div className="hidden md:flex items-center gap-2 rounded-lg border border-base-600/60 bg-base-900/80 px-2.5 py-1 text-xs">
              <span className="text-ink-300 font-medium">{user?.name || user?.username}</span>
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                  user?.role === 'admin'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : canAccessNDS && !canAccessCDS
                    ? 'bg-nds/20 text-nds'
                    : 'bg-cds/20 text-cds'
                }`}
              >
                {user?.role === 'admin'
                  ? 'ADMIN'
                  : canAccessNDS && !canAccessCDS
                  ? 'NDS ONLY'
                  : 'CDS ONLY'}
              </span>
            </div>

            <button
              onClick={logout}
              title="ออกจากระบบ"
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
