/**
 * Multi-tenant branding configuration
 * Supports white-label deployment for different clients
 */

export interface BrandingConfig {
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  tagline: string;
  favicon: string;
  metaDescription: string;
}

export const brandings: Record<string, BrandingConfig> = {
  fundley: {
    name: 'ZenAsset',
    logo: '/logo.svg',
    primaryColor: '#FF6B1A', // Vibrant Orange (default Fundley brand)
    secondaryColor: '#F59E0B', // Amber
    tagline: 'AI agent for equity research',
    favicon: '/favicon.ico',
    metaDescription:
      'Professional AI-driven financial analysis and investment research platform',
  },

  // Foga - Current client brand (your relative/friend)
  foga: {
    name: 'FogaAI',
    logo: '/logo.svg', // Use same logo for now, or create /logo-foga.svg
    primaryColor: '#8EBF45', // Fresh Green (Foga brand color)
    secondaryColor: '#E2F2C9', // Light Green (accent color)
    tagline: 'Private Equity AI Assistant',
    favicon: '/favicon.ico',
    metaDescription:
      'Professional AI-powered assistant for private equity, hedge funds, and family offices',
  },
};

/**
 * Get branding configuration based on environment variable
 * Defaults to 'fundley' if not specified
 */
export function getBranding(): BrandingConfig {
  const brandKey = process.env.NEXT_PUBLIC_BRAND || 'fundley';
  return brandings[brandKey] || brandings.fundley;
}

/**
 * Get brand name for display
 */
export function getBrandName(): string {
  return getBranding().name;
}

/**
 * Get brand logo path
 */
export function getBrandLogo(): string {
  return getBranding().logo;
}

/**
 * Get brand primary color (for Tailwind CSS)
 */
export function getBrandPrimaryColor(): string {
  return getBranding().primaryColor;
}

/**
 * Get brand secondary color (for Tailwind CSS)
 */
export function getBrandSecondaryColor(): string {
  return getBranding().secondaryColor;
}
