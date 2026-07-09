import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <p className="font-mono text-sm tracking-widest text-ink-600">404</p>
      <h1 className="mt-3 font-display text-2xl font-semibold text-ink-100">ไม่พบหน้านี้</h1>
      <p className="mt-2 text-sm text-ink-400">ลิงก์ที่ต้องการอาจถูกย้ายหรือไม่มีอยู่จริง</p>
      <Link to="/" className="mt-6 rounded-md border border-base-600/70 px-4 py-2 text-sm text-ink-100 hover:bg-base-800">
        กลับหน้าแรก
      </Link>
    </div>
  );
}
