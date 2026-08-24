import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, canAccessNDS, canAccessCDS, logout } = useAuth();

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-base-950">
      {/* Background decoration & grids */}
      <div className="grid-dots absolute inset-0 opacity-20 pointer-events-none" />

      {/* Top Navigation / User Header Bar */}
      <header className="relative z-30 flex items-center justify-between border-b border-base-600/40 bg-base-950/70 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-nds to-cds text-xs font-black text-base-950 shadow-md">
            N
          </span>
          <span className="font-display text-sm font-semibold tracking-wider text-ink-100 uppercase">
            NETWORK PORTAL HUB
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-base-600/60 bg-base-900/80 px-3.5 py-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-ink-400">เข้าใช้งานโดย:</span>
            <span className="font-semibold text-ink-100">{user?.name || user?.username}</span>
            <span
              className={`ml-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                user?.role === 'admin'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : canAccessNDS
                  ? 'bg-nds/20 text-nds border border-nds/40'
                  : 'bg-cds/20 text-cds border border-cds/40'
              }`}
            >
              {user?.role === 'admin'
                ? 'ADMIN / ALL TEAMS'
                : canAccessNDS
                ? 'NDS ONLY'
                : 'CDS ONLY'}
            </span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            ออกจากระบบ
          </button>
        </div>
      </header>

      {/* Brand Header overlay */}
      <div className="relative z-20 flex flex-col items-center text-center px-6 pt-8 pb-4">
        <span className="mb-2 rounded-full border border-base-600/50 bg-base-900/80 px-4 py-1 font-mono text-[10px] tracking-widest text-ink-400 backdrop-blur-sm">
          NDS & CDS CENTRAL HUB
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-100 sm:text-3xl">
          NETWORK MANAGEMENT & DESIGN SYSTEM
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-ink-400">
          เลือกพื้นที่ทำงานของทีมที่คุณต้องการเข้าถึงตามสิทธิ์ที่ได้รับ
        </p>
      </div>

      {/* Main Workspaces Layout */}
      <div className="relative z-10 flex flex-1 flex-col md:flex-row pb-6">
        {/* NDS Portal Section */}
        {canAccessNDS ? (
          <Link
            to="/nds"
            className="group relative flex flex-1 flex-col justify-end p-8 md:p-16 border-b border-base-600/30 md:border-b-0 md:border-r transition-all duration-500 bg-gradient-to-t from-base-950 via-base-950/80 to-transparent hover:from-nds/15 hover:via-base-950/90"
          >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-radial-gradient from-nds/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            {/* Giant background text */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 font-display text-[150px] md:text-[220px] font-black text-nds/5 leading-none select-none transition-all duration-500 group-hover:text-nds/10 group-hover:scale-105">
              NDS
            </div>

            <div className="relative z-10 flex flex-col items-start">
              <span className="rounded-full border border-nds/30 bg-nds/10 px-3 py-1 font-mono text-xs tracking-widest text-nds">
                NDS WORKSPACE • สิทธิ์เข้าถึงพร้อมใช้งาน
              </span>
              <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold text-ink-100 transition-colors duration-300 group-hover:text-nds">
                Network Design Services
              </h2>
              <p className="mt-3 max-w-md text-xs sm:text-sm text-ink-400 leading-relaxed">
                ระบบจัดการโครงสร้างเครือข่าย Sites, Devices, Device Types, Module Bays และ NetBox Integration
              </p>
              <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-base-600/70 bg-base-900/80 px-6 py-3 text-sm font-semibold text-ink-100 transition-all duration-300 group-hover:border-nds/60 group-hover:bg-nds group-hover:text-white group-hover:shadow-[0_0_25px_rgba(76,141,255,0.35)]">
                เข้าสู่ระบบ NDS
                <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="relative flex flex-1 flex-col justify-end p-8 md:p-16 border-b border-base-600/30 md:border-b-0 md:border-r bg-base-950/60 opacity-40 select-none">
            {/* Giant background text */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 font-display text-[150px] md:text-[220px] font-black text-base-800/40 leading-none select-none">
              NDS
            </div>

            <div className="relative z-10 flex flex-col items-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-base-600/60 bg-base-900/60 px-3 py-1 font-mono text-xs tracking-widest text-ink-500">
                <svg className="h-3.5 w-3.5 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                ไม่มีสิทธิ์เข้าถึง (NDS Locked)
              </span>
              <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold text-ink-500">
                Network Design Services
              </h2>
              <p className="mt-3 max-w-md text-xs sm:text-sm text-ink-600 leading-relaxed">
                บัญชีของคุณถูกจำกัดสิทธิ์เฉพาะส่วนงานทีม CDS เท่านั้น
              </p>
              <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-base-700 bg-base-900/40 px-5 py-2.5 text-xs text-ink-600 cursor-not-allowed">
                🔒 ล็อกการเข้าถึงสำหรับทีม NDS
              </div>
            </div>
          </div>
        )}

        {/* CDS Portal Section */}
        {canAccessCDS ? (
          <Link
            to="/cds"
            className="group relative flex flex-1 flex-col justify-end p-8 md:p-16 transition-all duration-500 bg-gradient-to-t from-base-950 via-base-950/80 to-transparent hover:from-cds/15 hover:via-base-950/90"
          >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-radial-gradient from-cds/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            {/* Giant background text */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 font-display text-[150px] md:text-[220px] font-black text-cds/5 leading-none select-none transition-all duration-500 group-hover:text-cds/10 group-hover:scale-105">
              CDS
            </div>

            <div className="relative z-10 flex flex-col items-start">
              <span className="rounded-full border border-cds/30 bg-cds/10 px-3 py-1 font-mono text-xs tracking-widest text-cds">
                CDS WORKSPACE • สิทธิ์เข้าถึงพร้อมใช้งาน
              </span>
              <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold text-ink-100 transition-colors duration-300 group-hover:text-cds">
                Customer Design Service
              </h2>
              <p className="mt-3 max-w-md text-xs sm:text-sm text-ink-400 leading-relaxed">
                ระบบจัดการและควบคุม Dashboard, Topology Map, Search & Reserve, Domain และ VLANs
              </p>
              <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-base-600/70 bg-base-900/80 px-6 py-3 text-sm font-semibold text-ink-100 transition-all duration-300 group-hover:border-cds/60 group-hover:bg-cds group-hover:text-white group-hover:shadow-[0_0_25px_rgba(255,154,61,0.35)]">
                เข้าสู่ระบบ CDS
                <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="relative flex flex-1 flex-col justify-end p-8 md:p-16 bg-base-950/60 opacity-40 select-none">
            {/* Giant background text */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 font-display text-[150px] md:text-[220px] font-black text-base-800/40 leading-none select-none">
              CDS
            </div>

            <div className="relative z-10 flex flex-col items-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-base-600/60 bg-base-900/60 px-3 py-1 font-mono text-xs tracking-widest text-ink-500">
                <svg className="h-3.5 w-3.5 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                ไม่มีสิทธิ์เข้าถึง (CDS Locked)
              </span>
              <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold text-ink-500">
                Customer Design Service
              </h2>
              <p className="mt-3 max-w-md text-xs sm:text-sm text-ink-600 leading-relaxed">
                บัญชีของคุณถูกจำกัดสิทธิ์เฉพาะส่วนงานทีม NDS เท่านั้น
              </p>
              <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-base-700 bg-base-900/40 px-5 py-2.5 text-xs text-ink-600 cursor-not-allowed">
                🔒 ล็อกการเข้าถึงสำหรับทีม CDS
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
