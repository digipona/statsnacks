'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SiteConfig {
  name: string;
  displayName: string;
}

interface SiteSelectorProps {
  sites: SiteConfig[];
  value?: string;
  onChange: (site: string) => void;
}

export function SiteSelector({ sites, value, onChange }: SiteSelectorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-[180px] h-10 rounded-md border border-input bg-background" />
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select site" />
      </SelectTrigger>
      <SelectContent>
        {sites.map((site) => (
          <SelectItem key={site.name} value={site.name}>
            {site.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
