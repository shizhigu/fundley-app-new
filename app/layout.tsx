import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { ClerkProvider } from '@clerk/nextjs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getBranding } from '@/lib/config/branding';
import { I18nProvider } from '@/lib/i18n-provider';

import './globals.css';

const branding = getBranding();

export const metadata: Metadata = {
  metadataBase: new URL('https://fundley.ai'),
  title: `${branding.name} - ${branding.tagline}`,
  description: branding.metaDescription,
  icons: {
    icon: branding.favicon,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // 允许用户放大到5倍
  minimumScale: 1,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'hsl(210, 20%, 98%)' },
    { media: '(prefers-color-scheme: dark)', color: 'hsl(210, 40%, 2%)' },
  ],
};

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  weight: ['300', '400', '500', '600', '700', '800'],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Load messages based on environment variable
  const locale = process.env.NEXT_PUBLIC_LOCALE || 'en';
  const messages = (await import(`@/messages/${locale}.json`)).default;

  // Convert hex to HSL for CSS variables (must match BrandingStyles logic)
  const hexToHSL = (hex: string): string => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

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

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
  };

  const primaryHSL = hexToHSL(branding.primaryColor);
  const secondaryHSL = branding.secondaryColor ? hexToHSL(branding.secondaryColor) : null;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      style={
        {
          '--brand-primary': primaryHSL,
          '--primary': primaryHSL,
          '--brand-accent': primaryHSL,
          '--accent': primaryHSL,
          '--brand-secondary': secondaryHSL || undefined,
          '--secondary': secondaryHSL || undefined,
        } as React.CSSProperties
      }
    >
      <body className="antialiased">
        <ClerkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange={false}
          >
            <I18nProvider locale={locale} messages={messages}>
              <TooltipProvider>
                <div className="bg-background min-h-screen">
                  {children}
                </div>
                <Toaster
                  position="top-right"
                  theme="system"
                  richColors
                  closeButton
                  toastOptions={{
                    className: 'glass-card',
                  }}
                />
              </TooltipProvider>
            </I18nProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}