import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-base-950 md:flex-row">
      {/* Background decoration & grids */}
      <div className="grid-dots absolute inset-0 opacity-20" />
      
      {/* Brand Header overlay */}
      <div className="pointer-events-none absolute left-0 right-0 top-12 z-20 flex flex-col items-center text-center px-6">
        <span className="mb-2 rounded-full border border-base-600/50 bg-base-900/80 px-4 py-1.5 font-mono text-[10px] tracking-widest text-ink-400 backdrop-blur-sm">
          NDS & CDS CENTRAL HUB
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-100 sm:text-3xl">
          NETWORK Management & DESIGN SYSTEM
        </h1>
        <p className="mt-2 text-xs text-ink-400">
          โปรดเลือกพื้นที่ทำงานของทีมที่คุณต้องการเข้าถึง
        </p>
      </div>

      {/* NDS Portal Section (Left Side) */}
      <Link
        to="/nds"
        className="group relative flex flex-1 flex-col justify-end p-8 md:p-16 border-b border-base-600/30 md:border-b-0 md:border-r transition-all duration-500 bg-gradient-to-t from-base-950 via-base-950 to-transparent hover:from-nds/10 hover:via-base-950/90"
      >
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-radial-gradient from-nds/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        
        {/* Giant background text */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 font-display text-[150px] md:text-[220px] font-black text-nds/5 leading-none select-none transition-all duration-500 group-hover:text-nds/10 group-hover:scale-105">
          NDS
        </div>

        <div className="relative z-10 flex flex-col items-start">
          <span className="rounded-full border border-nds/30 bg-nds/10 px-3 py-1 font-mono text-xs tracking-widest text-nds">
            NDS WORKSPACE
          </span>
          <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-ink-100 transition-colors duration-300 group-hover:text-nds">
            Network Design Services
          </h2>
          {/* <p className="mt-3 max-w-md text-sm text-ink-400 leading-relaxed">
            ระบบจัดเก็บ ออกแบบ และวางแผนโครงสร้างเครือข่าย ทั้งภาพรวมและ capacity planning ของทีม NDS
          </p> */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-base-600/70 bg-base-900/60 px-5 py-2.5 text-sm font-medium text-ink-100 transition-all duration-300 group-hover:border-nds/50 group-hover:bg-nds/20 group-hover:shadow-[0_0_20px_rgba(76,141,255,0.25)]">
            เข้าสู่ระบบ NDS
            <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </div>
        </div>
      </Link>

      {/* CDS Portal Section (Right Side) */}
      <Link
        to="/cds"
        className="group relative flex flex-1 flex-col justify-end p-8 md:p-16 transition-all duration-500 bg-gradient-to-t from-base-950 via-base-950 to-transparent hover:from-cds/10 hover:via-base-950/90"
      >
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-radial-gradient from-cds/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        
        {/* Giant background text */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 font-display text-[150px] md:text-[220px] font-black text-cds/5 leading-none select-none transition-all duration-500 group-hover:text-cds/10 group-hover:scale-105">
          CDS
        </div>

        <div className="relative z-10 flex flex-col items-start">
          <span className="rounded-full border border-cds/30 bg-cds/10 px-3 py-1 font-mono text-xs tracking-widest text-cds">
            CDS WORKSPACE
          </span>
          <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold text-ink-100 transition-colors duration-300 group-hover:text-cds">
            Customer Design Service
          </h2>
          {/* <p className="mt-3 max-w-md text-sm text-ink-400 leading-relaxed">
            ระบบควบคุมและจัดการ Core Network, Data Center Interconnect และมาตรฐานโครงสร้างพื้นฐานของทีม CDS
          </p> */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-base-600/70 bg-base-900/60 px-5 py-2.5 text-sm font-medium text-ink-100 transition-all duration-300 group-hover:border-cds/50 group-hover:bg-cds/20 group-hover:shadow-[0_0_20px_rgba(255,154,61,0.25)]">
            เข้าสู่ระบบ CDS
            <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
