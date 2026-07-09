import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', JSON.stringify({ name: 'Administrator', role: 'admin' }));
      navigate('/');
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (สำหรับ Demo ใช้ admin / admin)');
    }
  };

  const handleDemoLogin = () => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify({ name: 'Demo User', role: 'guest' }));
    navigate('/');
  };

  return (
    <div className="relative flex min-h-full w-full items-center justify-center bg-base-950 p-6 overflow-hidden">
      {/* Background visual effects */}
      <div className="grid-dots absolute inset-0 opacity-20" />
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-nds/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-cds/5 blur-[120px] pointer-events-none" />

      {/* Login Box */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-base-600/70 bg-base-900/80 p-8 shadow-2xl backdrop-blur-md">
        {/* Glow Line Indicator */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-nds to-cds opacity-80" />

        <div className="mb-8 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-nds to-cds text-lg font-bold text-base-950">
            N
          </span>
          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink-100">
            NETWORK PORTAL
          </h2>
          <p className="mt-1.5 text-xs text-ink-400">
            ลงชื่อเข้าใช้เพื่อเข้าสู่ระบบ NDS & CDS Central Hub
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium tracking-wide text-ink-400 uppercase">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="กรอกชื่อผู้ใช้งาน (admin)"
              className="mt-1.5 w-full rounded-lg border border-base-600/70 bg-base-950 px-4 py-2.5 text-sm text-ink-100 placeholder-ink-600 transition-colors focus:border-nds focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-wide text-ink-400 uppercase">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่าน (admin)"
              className="mt-1.5 w-full rounded-lg border border-base-600/70 bg-base-950 px-4 py-2.5 text-sm text-ink-100 placeholder-ink-600 transition-colors focus:border-nds focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-lg bg-gradient-to-r from-nds to-nds-hover bg-nds px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-nds/20 transition-all hover:bg-opacity-90 active:scale-[0.98]"
          >
            เข้าสู่ระบบ
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-base-600/50"></div>
          </div>
          <span className="relative bg-base-900 px-3 text-xs tracking-wider text-ink-600 uppercase">
            Or
          </span>
        </div>

        {/* Demo Login Button */}
        <button
          onClick={handleDemoLogin}
          type="button"
          className="group w-full rounded-lg border border-cds/40 bg-cds/10 px-4 py-2.5 text-sm font-semibold text-cds shadow-lg transition-all hover:bg-cds/20 active:scale-[0.98]"
        >
          <span className="flex items-center justify-center gap-2">
            🚀 Quick Demo Login
          </span>
        </button>

        <p className="mt-6 text-center text-[10px] text-ink-600 font-mono">
          Demo Credentials: username <b>admin</b> / password <b>admin</b>
        </p>
      </div>
    </div>
  );
}
