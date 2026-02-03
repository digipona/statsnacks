/**
 * Application settings loaded from environment variables.
 * Same pattern as Python statsnacks.
 */

export interface SiteConfig {
  name: string;
  displayName: string;
  ga4PropertyId: string;
  gscSiteUrl: string;
}

class Settings {
  sites: Map<string, SiteConfig> = new Map();
  ga4PropertyId: string = '';
  gscSiteUrl: string = '';

  constructor() {
    this.loadSites();
    // Legacy single-site fallback
    this.ga4PropertyId = process.env.GA4_PROPERTY_ID || '';
    this.gscSiteUrl = process.env.GSC_SITE_URL || '';
  }

  private loadSites() {
    const sitesStr = process.env.SITES || '';
    if (!sitesStr) return;

    const siteNames = sitesStr.split(',').map(s => s.trim()).filter(Boolean);

    for (const name of siteNames) {
      const ga4Id = (process.env[`SITE_${name}_GA4`] || '').trim().replace(/^=/, '');
      const gscUrl = (process.env[`SITE_${name}_GSC`] || '').trim();

      if (ga4Id || gscUrl) {
        this.sites.set(name, {
          name,
          displayName: `${name}.com`,
          ga4PropertyId: ga4Id,
          gscSiteUrl: gscUrl,
        });
      }
    }
  }

  getSite(name: string): SiteConfig | undefined {
    return this.sites.get(name);
  }

  getSiteNames(): string[] {
    return Array.from(this.sites.keys());
  }

  getSiteConfigs(): SiteConfig[] {
    return Array.from(this.sites.values());
  }

  isMultiSite(): boolean {
    return this.sites.size > 1;
  }
}

// Singleton instance
let settingsInstance: Settings | null = null;

export function getSettings(): Settings {
  if (!settingsInstance) {
    settingsInstance = new Settings();
  }
  return settingsInstance;
}

export const settings = getSettings();
