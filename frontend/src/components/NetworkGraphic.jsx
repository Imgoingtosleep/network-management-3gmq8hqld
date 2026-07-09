/**
 * Signature visual ของหน้าแรก: กราฟโหนดเครือข่ายที่แตกจากศูนย์กลางไปยังฝั่ง
 * NDS (ซ้าย, สีฟ้า) และ CDS (ขวา, สีส้ม) สื่อถึงการแยกสองทีมจากแกนกลางเดียวกัน
 */
export default function NetworkGraphic() {
  return (
    <svg
      viewBox="0 0 600 260"
      className="mx-auto w-full max-w-2xl"
      role="img"
      aria-label="แผนภาพเครือข่ายแสดงการเชื่อมต่อจากศูนย์กลางไปยังทีม NDS และ CDS"
    >
      <line x1="300" y1="130" x2="120" y2="60" stroke="#4C8DFF" strokeOpacity="0.5" strokeWidth="1.5" className="line-flow" />
      <line x1="300" y1="130" x2="120" y2="200" stroke="#4C8DFF" strokeOpacity="0.5" strokeWidth="1.5" className="line-flow" />
      <line x1="300" y1="130" x2="480" y2="60" stroke="#FF9A3D" strokeOpacity="0.5" strokeWidth="1.5" className="line-flow" />
      <line x1="300" y1="130" x2="480" y2="200" stroke="#FF9A3D" strokeOpacity="0.5" strokeWidth="1.5" className="line-flow" />

      <circle cx="300" cy="130" r="6" fill="#F2F3F5" />
      <circle cx="300" cy="130" r="14" fill="none" stroke="#F2F3F5" strokeOpacity="0.2" />

      <circle cx="120" cy="60" r="4" fill="#4C8DFF" className="node-pulse" />
      <circle cx="120" cy="200" r="4" fill="#4C8DFF" className="node-pulse" style={{ animationDelay: '0.4s' }} />
      <circle cx="480" cy="60" r="4" fill="#FF9A3D" className="node-pulse" style={{ animationDelay: '0.8s' }} />
      <circle cx="480" cy="200" r="4" fill="#FF9A3D" className="node-pulse" style={{ animationDelay: '1.2s' }} />

      <text x="120" y="40" textAnchor="middle" className="fill-nds font-mono text-[11px] tracking-widest">NDS</text>
      <text x="480" y="40" textAnchor="middle" className="fill-cds font-mono text-[11px] tracking-widest">CDS</text>
    </svg>
  );
}
