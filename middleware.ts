import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';

// i18n configuration - get locale from environment variable
const getLocale = () => {
  return process.env.NEXT_PUBLIC_LOCALE || 'en';
};

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  '/(.*)',  // Protect all routes by default
]);

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',  // For Clerk webhooks
  '/api/stripe/webhook',  // For Stripe webhooks
  '/api/metadata',  // For metadata extraction
  '/api/stock/chart-data',  // For TradingView chart data
  '/api/motherduck-proxy',  // For DuckDB queries (internal use)
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Playwright test endpoint
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  // Check if the route is protected and user is not authenticated
  if (isProtectedRoute(req) && !isPublicRoute(req)) {
    const { userId } = await auth();

    if (!userId) {
      // Redirect to sign-in page
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};