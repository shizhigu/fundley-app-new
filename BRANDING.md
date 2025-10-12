# 🎨 White-Label Branding Guide

This project supports **multi-tenant white-label** deployment - one codebase, unlimited brands.

## Quick Start

### 1. Local Development

```bash
# Add to .env.local
NEXT_PUBLIC_BRAND=fundley  # or 'client-a'

# Run dev server
pnpm dev
```

### 2. Production Deployment

**Vercel (Recommended):**

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add variable:
   - Key: `NEXT_PUBLIC_BRAND`
   - Value: `fundley` or `client-a`
4. Deploy

## Architecture

### Configuration File

All branding is defined in [`lib/config/branding.ts`](lib/config/branding.ts):

```typescript
export const brandings = {
  fundley: {
    name: 'Fundley',
    logo: '/logo.svg',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    tagline: 'AI-Powered Financial Analysis',
    favicon: '/favicon.ico',
    metaDescription: 'Professional AI-driven financial analysis...',
  },
  'client-a': {
    name: 'Client A Finance',
    logo: '/logo-client-a.svg',
    primaryColor: '#10B981',
    // ...
  },
};
```

### How It Works

1. **Environment Variable** (`NEXT_PUBLIC_BRAND`) selects active brand
2. **Metadata** ([app/layout.tsx:16](app/layout.tsx:16)) uses brand name/description
3. **CSS Variables** ([components/branding-styles.tsx](components/branding-styles.tsx)) dynamically inject theme colors
4. **Tailwind** automatically applies brand colors via CSS variables

## Adding a New Brand

### Step 1: Define Brand Configuration

Edit [`lib/config/branding.ts`](lib/config/branding.ts):

```typescript
export const brandings = {
  // ... existing brands
  'new-client': {
    name: 'New Client Brand',
    logo: '/logo-new-client.svg',
    primaryColor: '#8B5CF6',  // purple
    secondaryColor: '#F59E0B', // amber
    tagline: 'Your Custom Tagline',
    favicon: '/favicon-new-client.ico',
    metaDescription: 'Your custom description...',
  },
};
```

### Step 2: Add Logo Assets

```bash
# Add logo files to /public
public/
  ├── logo-new-client.svg
  └── favicon-new-client.ico
```

### Step 3: Deploy with Brand

```bash
# Set environment variable
NEXT_PUBLIC_BRAND=new-client

# Deploy
vercel --prod
```

**Done!** No code changes needed beyond configuration.

## Multi-Deployment Strategies

### Strategy 1: Multiple Vercel Projects

**Best for:** Complete client isolation

```
Project 1: fundley-saas (main repo)
  ├── Domain: app.fundley.com
  └── Env: NEXT_PUBLIC_BRAND=fundley

Project 2: client-a-app (same repo)
  ├── Domain: app.clienta.com
  └── Env: NEXT_PUBLIC_BRAND=client-a
```

**Pros:**
- ✅ Separate domains
- ✅ Independent deployments
- ✅ Client-specific analytics

**Cons:**
- ⚠️ Need to deploy both when updating shared code

### Strategy 2: Branch-Based Deployment

**Best for:** Rapid iteration

```
main branch → app.fundley.com (NEXT_PUBLIC_BRAND=fundley)
client-a branch → app.clienta.com (NEXT_PUBLIC_BRAND=client-a)
```

**Pros:**
- ✅ Easy to customize per client (branch-specific changes)
- ✅ Vercel Git integration handles auto-deploy

**Cons:**
- ⚠️ Need to merge shared updates to all branches

### Strategy 3: Subdomain Routing (Advanced)

**Best for:** SaaS with many clients

Use middleware to detect subdomain and set brand dynamically:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const host = request.headers.get('host');
  const subdomain = host?.split('.')[0];

  // Map subdomain to brand
  const brandMap = {
    'app': 'fundley',
    'clienta': 'client-a',
  };

  // Inject brand into request
  // ...
}
```

**Pros:**
- ✅ Single deployment
- ✅ Unlimited clients
- ✅ Dynamic brand switching

**Cons:**
- ⚠️ Requires more setup (middleware, database)

## Customization Options

### Basic (CSS Only)
- Logo
- Primary/secondary colors
- Favicon

**Time:** 5 minutes per client

### Advanced (Component Level)
- Custom layouts
- Feature toggles
- Client-specific workflows

**Time:** 1-2 hours per client

## Best Practices

### 1. Color Scheme

Choose accessible color combinations:
```typescript
primaryColor: '#3B82F6',    // Main brand color (buttons, links)
secondaryColor: '#10B981',  // Accent color (highlights, badges)
```

Use tools like [Adobe Color](https://color.adobe.com) to verify contrast ratios.

### 2. Logo Requirements

- **Format:** SVG (scalable) or PNG (2x resolution)
- **Size:** Recommended 200x50px
- **Background:** Transparent for dark/light theme support

### 3. Metadata

Keep descriptions concise:
```typescript
metaDescription: '150 characters max for SEO optimization'
```

### 4. Testing

Test each brand before deployment:
```bash
# Test Fundley brand
NEXT_PUBLIC_BRAND=fundley pnpm dev

# Test Client A brand
NEXT_PUBLIC_BRAND=client-a pnpm dev
```

## Troubleshooting

### Brand not updating?

1. **Clear `.next/` cache:**
   ```bash
   rm -rf .next && pnpm dev
   ```

2. **Verify environment variable:**
   ```bash
   echo $NEXT_PUBLIC_BRAND
   ```

3. **Check Vercel deployment logs:**
   - Ensure env var is set correctly
   - Verify build completed successfully

### Colors not applying?

1. **Check CSS variable injection:**
   - Open DevTools → Elements → `<html>`
   - Verify `--brand-primary` is set correctly

2. **Clear browser cache:**
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

## Future Enhancements

Possible next steps for full SaaS:

1. **Database-driven branding** (Phase 2)
   - Store brand configs in Convex `organizations` table
   - Dynamic loading based on domain/subdomain

2. **Admin dashboard**
   - Let clients customize their own branding
   - Real-time preview

3. **Feature flags**
   - Enable/disable features per client
   - Usage limits and billing tiers

## Questions?

Contact: [your-email@fundley.com](mailto:your-email@fundley.com)
