import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { ClerkProvider } from '@clerk/nextjs';
import { TooltipProvider } from '@/components/ui/tooltip';
import ConvexClientProvider from '@/components/convex-client-provider';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://fundley.ai'),
  title: 'Fundley - Private Equity AI Assistant',
  description: 'Professional AI-powered assistant for private equity, hedge funds, and family offices',
};

export const viewport = {
  maximumScale: 1,
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
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <ClerkProvider>
          <ConvexClientProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange={false}
            >
              <TooltipProvider>
                <div className="mesh-background min-h-screen">
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
            </ThemeProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}