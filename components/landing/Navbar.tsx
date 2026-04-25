import Link from "next/link";
import { Logo } from "@/components/Logo";

const navItems = [
  { href: "#features", label: "Why SY Data" },
  { href: "#plans", label: "Plans" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-sky-100/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
        <Logo href="/" size="md" />
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-sky-600">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/app/auth"
            className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700 sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/app/auth"
            className="inline-flex rounded-full bg-[linear-gradient(135deg,#1C3E88,#198EC0_55%,#79C94E)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(25,142,192,0.22)] transition hover:scale-[1.01]"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
