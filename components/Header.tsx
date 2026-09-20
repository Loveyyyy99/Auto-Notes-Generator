import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 max-w-7xl mx-auto px-gutter flex items-center justify-between">
        <Link href="/" className="flex items-center gap-space-sm">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[18px]">auto_awesome</span>
          </div>
          <span className="font-headline-md text-headline-md tracking-tight text-on-surface">
            AutoNotes<span className="text-primary-container">.ai</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-space-lg">
          <Link href="/" className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors">
            Home
          </Link>
          <Link href="/upload" className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors">
            New Lecture
          </Link>
          <Link href="/results" className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors">
            Viewer
          </Link>
        </nav>

        <div className="flex items-center gap-space-sm">
          <Link
            href="/upload"
            className="inline-flex items-center justify-center px-space-md py-space-xs rounded-xl bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-all shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
          >
            New Lecture
          </Link>
        </div>
      </div>
    </header>
  );
}
