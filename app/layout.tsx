import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { ClerkProvider } from '@clerk/nextjs';
import { TooltipProvider } from '@/components/ui/tooltip';
import ConvexClientProvider from '@/components/convex-client-provider';
import { getBranding } from '@/lib/config/branding';
import { BrandingStyles } from '@/components/branding-styles';
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

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <BrandingStyles />
        <ClerkProvider>
          <ConvexClientProvider>
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
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}