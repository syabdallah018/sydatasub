import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <Logo href="/" size="md" />
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-500">
            Affordable, always connected. Buy data, airtime and utility services from one clean SY Data
            experience.
          </p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm font-semibold text-slate-600">
          <Link href="/privacy" className="transition hover:text-sky-700">
            Privacy
          </Link>
          <Link href="/app/auth" className="transition hover:text-sky-700">
            Sign in
          </Link>
          <Link href="/app" className="transition hover:text-sky-700">
            Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
}
