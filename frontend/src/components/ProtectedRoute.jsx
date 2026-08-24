import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedTeam }) {
  const { isAuthenticated, user, hasTeamAccess, canAccessNDS, canAccessCDS } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ตรวจสอบสิทธิ์เฉพาะทีมหากมีการกำหนด allowedTeam
  if (allowedTeam && !hasTeamAccess(allowedTeam)) {
    const userTeamLabel = (user?.allowedTeams || []).map(t => t.toUpperCase()).join(' & ') || 'ไม่มีสิทธิ์';
    const fallbackPath = canAccessNDS ? '/nds' : canAccessCDS ? '/cds' : '/';

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 shadow-2xl backdrop-blur">
          <svg
            className="h-10 w-10 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1 font-mono text-xs font-semibold text-red-400">
          ACCESS RESTRICTED
        </span>

        <h2 className="mt-4 font-display text-2xl font-bold text-ink-100 sm:text-3xl">
          จำกัดสิทธิ์การเข้าถึงทีม {allowedTeam.toUpperCase()}
        </h2>

        <p className="mt-3 max-w-md text-sm text-ink-400">
          บัญชี <span className="font-semibold text-ink-200">{user?.name || user?.username}</span> มีสิทธิ์เข้าถึงเฉพาะทีม{' '}
          <span className="font-semibold text-ink-100">[{userTeamLabel}]</span> เท่านั้น จึงไม่สามารถเข้าถึงหน้าของทีม{' '}
          <span className="font-semibold text-red-400">{allowedTeam.toUpperCase()}</span> ได้
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/"
            className="rounded-lg border border-base-600/70 bg-base-900/80 px-5 py-2.5 text-sm font-medium text-ink-200 transition-colors hover:bg-base-800 hover:text-ink-100"
          >
            กลับสู่หน้าหลัก
          </Link>
          <Link
            to={fallbackPath}
            className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-transform active:scale-95 ${
              canAccessNDS
                ? 'bg-nds hover:bg-nds-hover shadow-nds/20'
                : 'bg-cds hover:bg-cds-hover shadow-cds/20'
            }`}
          >
            ไปยังพื้นที่ทำงานของคุณ ({canAccessNDS ? 'NDS' : 'CDS'})
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
