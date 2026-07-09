export default function StatusCard({ label, value, accent = 'nds' }) {
  const accentText = accent === 'cds' ? 'text-cds' : 'text-nds';

  return (
    <div className="rounded-xl border border-base-600/60 bg-base-800/60 p-5">
      <p className="text-xs font-mono uppercase tracking-widest text-ink-600">{label}</p>
      <p className={`mt-2 font-display text-3xl font-semibold ${accentText}`}>{value}</p>
    </div>
  );
}
