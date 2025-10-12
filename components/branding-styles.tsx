'use client';

import { useEffect } from 'react';
import { getBranding } from '@/lib/config/branding';

/**
 * Component that injects brand-specific CSS variables dynamically
 * Allows white-label customization without modifying globals.css
 */
export function BrandingStyles() {
  useEffect(() => {
    const branding = getBranding();

    // Convert hex to HSL for Tailwind CSS variables
    const hexToHSL = (hex: string): string => {
      // Remove # if present
      hex = hex.replace('#', '');

      // Convert hex to RGB
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;

      // Find min and max RGB values
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }

      // Convert to HSL format for CSS
      h = Math.round(h * 360);
      s = Math.round(s * 100);
      l = Math.round(l * 100);

      return `${h} ${s}% ${l}%`;
    };

    // Apply brand colors to CSS variables
    const root = document.documentElement;
    const primaryHSL = hexToHSL(branding.primaryColor);

    root.style.setProperty('--brand-primary', primaryHSL);
    root.style.setProperty('--primary', primaryHSL);
    root.style.setProperty('--brand-accent', primaryHSL);
    root.style.setProperty('--accent', primaryHSL);

    // Override gradient to solid color (no gradient effect)
    root.style.setProperty('--gradient-primary', `hsl(${primaryHSL})`);

    if (branding.secondaryColor) {
      const secondaryHSL = hexToHSL(branding.secondaryColor);
      root.style.setProperty('--brand-secondary', secondaryHSL);
      root.style.setProperty('--secondary', secondaryHSL);
      root.style.setProperty('--gradient-secondary', `hsl(${secondaryHSL})`);
    }
  }, []);

  return null;
}
