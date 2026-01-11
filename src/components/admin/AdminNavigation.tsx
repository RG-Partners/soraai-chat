'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const ADMIN_LINKS = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/analytics', label: 'Analytics' },
];

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Admin navigation">
      {ADMIN_LINKS.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 transition',
              isActive
                ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:border-sky-400/80 dark:text-sky-200'
                : 'border-light-200/70 text-black/70 hover:border-light-200 hover:bg-light-100/60 dark:border-dark-200/70 dark:text-white/70 dark:hover:border-dark-200 dark:hover:bg-dark-200/40',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default AdminNavigation;
