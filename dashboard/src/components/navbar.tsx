'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { SiteSelector } from './site-selector';
import { cn } from '@/lib/utils';

interface NavbarProps {
  sites: Array<{ name: string; displayName: string }>;
  selectedSite: string;
  onSiteChange: (site: string) => void;
}

export function Navbar({ sites, selectedSite, onSiteChange }: NavbarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/traffic', label: 'Traffic' },
    { href: '/search', label: 'Search' },
    { href: '/conversions', label: 'Conversions' },
    { href: '/keywords', label: 'Keywords' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">Analytics</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'transition-colors hover:text-foreground/80',
                  pathname === item.href
                    ? 'text-foreground'
                    : 'text-foreground/60'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <SiteSelector
            sites={sites}
            value={selectedSite}
            onChange={onSiteChange}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
