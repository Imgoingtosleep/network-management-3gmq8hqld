import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    const result = await login(username.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      const user = result.user;
      const from = location.state?.from?.pathname;

      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else if (user.role === 'nds' || (user.allowedTeams?.length === 1 && user.allowedTeams[0] === 'nds')) {
        navigate('/nds', { replace: true });
      } else if (user.role === 'cds' || (user.allowedTeams?.length === 1 && user.allowedTeams[0] === 'cds')) {
        navigate('/cds', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } else {
      setErrorMessage(result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleQuickFill = (presetUser, presetPass) => {
    setUsername(presetUser);
    setPassword(presetPass);
    setErrorMessage('');
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-base-950 p-6 overflow-hidden select-none">
      {/* Dynamic Network Glow Background */}
      <div className="grid-dots absolute inset-0 opacity-20" />
      <div className="absolute top-1/4 left-1/5 h-[350px] w-[350px] rounded-full bg-nds/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/5 h-[350px] w-[350px] rounded-full bg-cds/10 blur-[130px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-base-600/70 bg-base-900/90 p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
        {/* Glow Header Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-nds via-purple-500 to-cds opacity-90" />

        {/* Portal Branding */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-nds to-cds text-xl font-black text-base-950 shadow-lg shadow-nds/20">
            N
          </div>
          <h1 className="mt-4 font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-100">
            NETWORK PORTAL
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-ink-400">
            ลงชื่อเข้าใช้เพื่อเข้าสู่ระบบศูนย์กลาง NDS & CDS
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs sm:text-sm text-red-400">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-ink-400 uppercase">
              Username
            </label>
            <div className="relative mt-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้งาน (nds, cds, admin)"
                className="w-full rounded-xl border border-base-600/70 bg-base-950/80 px-4 py-3 text-sm text-ink-100 placeholder-ink-600 transition-all focus:border-nds focus:bg-base-950 focus:outline-none focus:ring-1 focus:ring-nds/50"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold tracking-wider text-ink-400 uppercase">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-ink-500 hover:text-ink-300 transition-colors"
              >
                {showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              </button>
            </div>
            <div className="relative mt-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                className="w-full rounded-xl border border-base-600/70 bg-base-950/80 px-4 py-3 text-sm text-ink-100 placeholder-ink-600 transition-all focus:border-nds focus:bg-base-950 focus:outline-none focus:ring-1 focus:ring-nds/50"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-nds via-blue-500 to-nds-hover px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-nds/25 transition-all hover:opacity-95 hover:shadow-nds/40 active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                กำลังตรวจสอบสิทธิ์...
              </span>
            ) : (
              'เข้าสู่ระบบ (Sign In)'
            )}
          </button>
        </form>

        {/* Quick Demo Credentials / Team Roles Section */}
        <div className="mt-8 border-t border-base-600/40 pt-6">
          <p className="mb-3 text-center text-xs font-mono tracking-wider text-ink-500 uppercase">
            สิทธิ์และบัญชีผู้ใช้งานระบบ (Quick Select)
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {/* NDS Button */}
            <button
              type="button"
              onClick={() => handleQuickFill('nds', 'nds_password')}
              className="group flex flex-col items-start rounded-xl border border-nds/30 bg-nds/5 p-3 text-left transition-all hover:border-nds hover:bg-nds/10 hover:shadow-md hover:shadow-nds/10"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-nds">
                <span className="h-2 w-2 rounded-full bg-nds" />
                ทีม NDS
              </div>
              <span className="mt-1 text-[11px] text-ink-400">เข้าถึงเฉพาะ NDS</span>
              <span className="mt-1 font-mono text-[10px] text-ink-500">nds</span>
            </button>

            {/* CDS Button */}
            <button
              type="button"
              onClick={() => handleQuickFill('cds', 'cds_password')}
              className="group flex flex-col items-start rounded-xl border border-cds/30 bg-cds/5 p-3 text-left transition-all hover:border-cds hover:bg-cds/10 hover:shadow-md hover:shadow-cds/10"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-cds">
                <span className="h-2 w-2 rounded-full bg-cds" />
                ทีม CDS
              </div>
              <span className="mt-1 text-[11px] text-ink-400">เข้าถึงเฉพาะ CDS</span>
              <span className="mt-1 font-mono text-[10px] text-ink-500">cds</span>
            </button>

            {/* Admin Button */}
            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'admin_password')}
              className="group flex flex-col items-start rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-left transition-all hover:border-emerald-500 hover:bg-emerald-500/10 hover:shadow-md hover:shadow-emerald-500/10"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Admin (2 ทีม)
              </div>
              <span className="mt-1 text-[11px] text-ink-400">NDS + CDS</span>
              <span className="mt-1 font-mono text-[10px] text-ink-500">admin</span>
            </button>
          </div>
          <p className="mt-3 text-center text-[10px] text-ink-600">
            * รหัสผ่านและชื่อผู้ใช้ถูกกำหนดค่าไว้ในไฟล์ <code className="text-ink-400">.env</code>
          </p>
        </div>
      </div>
    </div>
  );
}
