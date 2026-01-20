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
    name: 'Foga π',
    logo: '/logo.svg',
    primaryColor: '#8EBF45', // Fresh Green
    secondaryColor: '#E2F2C9', // Light Green
    tagline: 'AI-Powered Financial Analysis',
    favicon: '/favicon.svg',
    metaDescription: 'Professional AI-driven financial analysis platform powered by Euler\'s identity',
  },

  // Legacy foga config
  foga: {
    name: 'Foga π',
    logo: '/logo.svg',
    primaryColor: '#8EBF45', // Fresh Green
    secondaryColor: '#E2F2C9', // Light Green
    tagline: 'AI-Powered Financial Analysis',
    favicon: '/favicon.svg',
    metaDescription: 'Professional AI-driven financial analysis platform powered by Euler\'s identity',
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
