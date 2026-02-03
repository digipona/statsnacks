'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Navbar } from './navbar';

interface SiteConfig {
  name: string;
  displayName: string;
}

interface DashboardShellProps {
  children: (props: { selectedSite: string; sites: SiteConfig[] }) => ReactNode;
  sites: SiteConfig[];
}

export function DashboardShell({ children, sites }: DashboardShellProps) {
  const { data: session, status } = useSession();
  const [selectedSite, setSelectedSite] = useState<string>('');

  useEffect(() => {
    // Set default site on mount
    if (sites.length > 0 && !selectedSite) {
      setSelectedSite(sites[0].name);
    }
  }, [sites, selectedSite]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  if (!selectedSite) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading sites...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        sites={sites}
        selectedSite={selectedSite}
        onSiteChange={setSelectedSite}
      />
      <main className="container py-6">
        {children({ selectedSite, sites })}
      </main>
    </div>
  );
}
