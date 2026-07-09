import Navbar from '../components/Navbar.jsx';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-base-950">
      <Navbar />
      <main className="w-full px-8 py-10 flex-1">{children}</main>
      <footer className="border-t border-base-600/50 py-6">
        <p className="px-8 text-xs text-ink-600">
          Network Portal · ทีม NDS &amp; CDS
        </p>
      </footer>
    </div>
  );
}
