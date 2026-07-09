import { Link } from 'react-router-dom';

/**
 * การ์ดทางเข้าแต่ละทีมบนหน้าแรก
 * accent: 'nds' | 'cds' — คุมสีประจำทีมทั้งหมดจากจุดเดียว
 */
export default function TeamCard({ accent, code, title, description, to }) {
  const isNds = accent === 'nds';
  const ring = isNds ? 'hover:border-nds/50' : 'hover:border-cds/50';
  const glow = isNds ? 'group-hover:shadow-[0_0_40px_-8px_rgba(76,141,255,0.35)]' : 'group-hover:shadow-[0_0_40px_-8px_rgba(255,154,61,0.35)]';
  const chip = isNds ? 'bg-nds/10 text-nds border-nds/30' : 'bg-cds/10 text-cds border-cds/30';
  const bar = isNds ? 'bg-nds' : 'bg-cds';

  return (
    <Link
      to={to}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-base-600/70 bg-base-800/60 p-8 transition-all duration-300 ${ring} ${glow}`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${bar} opacity-80`} />
      <span className={`w-fit rounded-full border px-3 py-1 font-mono text-xs tracking-widest ${chip}`}>
        {code}
      </span>
      <h3 className="mt-6 font-display text-2xl font-semibold text-ink-100">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-ink-400">{description}</p>
      <span className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-ink-100">
        เข้าสู่หน้าทีม
        <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}
