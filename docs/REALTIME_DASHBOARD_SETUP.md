# Real-Time Dashboard Setup Guide

This guide walks you through setting up the Real-Time Dashboard feature that allows users to create persistent Next.js web applications deployed to Vercel.

## Prerequisites

- Python 3.10+ (for chatbot-service)
- Node.js 20+ (for Next.js frontend)
- PostgreSQL database (Neon)
- Redis (for E2B sandbox pool management)
- GitHub account
- Vercel account (optional, for automatic deployment)

## Step 1: Configure Environment Variables

### 1.1 GitHub Personal Access Token

Create a GitHub Personal Access Token for deploying dashboards:

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Set token name: `Fundley Dashboard Deployer`
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click "Generate token"
6. Copy the token (it won't be shown again)

Add to `/chatbot-service/.env`:
```bash
GITHUB_BOT_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 1.2 GitHub Organization (Optional)

If you want dashboards deployed to an organization instead of your personal account:

1. Create or use existing GitHub organization (e.g., `fundley-io`)
2. Make sure your bot token has access to the organization
3. Add to `/chatbot-service/.env`:
```bash
GITHUB_ORG=fundley-io
```

If not set, dashboards will be deployed to the token owner's personal account.

### 1.3 Vercel Token (Optional)

For automatic Vercel project creation and deployment:

1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Set token name: `Fundley Dashboard Deployer`
4. Select scope: `Full Account`
5. Click "Create"
6. Copy the token

Add to `/chatbot-service/.env`:
```bash
VERCEL_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**If you skip this**: Users will need to manually connect their GitHub repo to Vercel on first deployment.

## Step 2: Run Database Migration

The data_apps table needs to be created:

```bash
psql "$DATABASE_URL" -f lib/db/migrations/0028_create_data_apps.sql
```

Verify the table was created:
```bash
psql "$DATABASE_URL" -c "\d data_apps"
```

Expected output:
```
                Table "public.data_apps"
     Column       |            Type             | Nullable |
------------------+-----------------------------+----------+
 id               | uuid                        | not null |
 user_id          | uuid                        | not null |
 title            | text                        | not null |
 slug             | text                        | not null |
 description      | text                        |          |
 url              | text                        | not null |
 github_repo      | text                        |          |
 deployment_status| text                        |          |
 code             | jsonb                       | not null |
 created_at       | timestamp without time zone |          |
 updated_at       | timestamp without time zone |          |
```

## Step 3: Rebuild E2B Sandbox Template

The E2B Dockerfile has been updated to include Node.js and pnpm for Next.js development.

### 3.1 Install E2B CLI

```bash
npm install -g @e2b/cli
```

### 3.2 Login to E2B

```bash
e2b login
```

### 3.3 Build and Push Template

From the root of your project:

```bash
e2b template build --path /Users/gushizhi/e2b.Dockerfile --name fundley-analyst
```

This will:
1. Build the Docker image with Node.js 20 + pnpm
2. Push to E2B registry
3. Return a template ID (e.g., `fundley-analyst-v2`)

### 3.4 Update E2B Template ID

Update the template ID in your E2B configuration:

```python
# chatbot-service/tools/e2b.py
# Find the line that specifies the template and update it:
template = "fundley-analyst-v2"  # Use the ID returned from step 3.3
```

## Step 4: Verify Installation

### 4.1 Check Python Dependencies

```bash
cd chatbot-service
pip install PyGithub  # Required for GitHub API
```

### 4.2 Test E2B Sandbox

Start the chatbot service:
```bash
cd chatbot-service
python main.py
```

In another terminal, test Node.js availability:
```bash
# This should return Node.js version
e2b sandbox create --template fundley-analyst-v2 --cmd "node --version"
```

## Step 5: Test Complete Workflow

### 5.1 Start Services

Terminal 1 - Next.js frontend:
```bash
pnpm dev
```

Terminal 2 - Python agent service:
```bash
cd chatbot-service
python main.py
```

### 5.2 Create a Test Dashboard

In the Fundley chat interface, ask:
```
Create a real-time NVDA price monitor dashboard
```

The Agent should:
1. Call `create_data_app(title="NVDA Monitor", slug="nvda-monitor")`
2. Initialize Next.js project in E2B sandbox
3. Write pages/index.tsx and pages/api/data.ts
4. Run `pnpm build` to verify
5. Call `deploy_data_app(slug="nvda-monitor")`
6. Push to GitHub
7. Return deployment URL

### 5.3 Verify Deployment

1. Check GitHub: Repository should exist at `https://github.com/{org}/dashboards-{user_id}`
2. Check Vercel: Project should auto-deploy (60-90 seconds)
3. Visit URL: `https://dashboards-{user_id}.vercel.app`

## Troubleshooting

### Error: "No active user session"
- Make sure user is authenticated via Clerk
- Verify `clerk_user_id` is synced to database

### Error: "Git push failed"
- Verify `GITHUB_BOT_TOKEN` has `repo` permissions
- Check token hasn't expired
- Verify git user is configured locally (should be done by deploy_data_app)

### Error: "Project directory not found"
- E2B auto-sync may have failed
- Check E2B logs for sync errors
- Verify sandbox has write permissions to `/home/user/`

### Error: "Vercel project creation failed"
- Check `VERCEL_TOKEN` is valid
- Manually connect repo to Vercel as fallback
- Agent will still deploy to GitHub successfully

### Error: "node: command not found" in E2B
- E2B template wasn't rebuilt with new Dockerfile
- Run Step 3 to rebuild template
- Verify template ID is updated in e2b.py

## Security Notes

1. **API Keys**: Never commit `.env` files to git
2. **Token Rotation**: Rotate GitHub and Vercel tokens regularly
3. **Minimal Permissions**: GitHub token only needs `repo` scope
4. **Sandbox Isolation**: E2B sandbox does NOT receive GitHub tokens
5. **Local Deployment**: Git operations happen locally where tokens are secure

## Cost Estimates

| Service | Free Tier | Expected Usage |
|---------|-----------|----------------|
| GitHub | Unlimited public repos | Free |
| Vercel | 100GB bandwidth/month | Free for MVP |
| E2B | Pay-per-use | ~$0.10 per dashboard creation |

**Estimated monthly cost for 100 dashboards**: < $50

## Next Steps

1. ✅ Configure environment variables
2. ✅ Run database migration
3. ✅ Rebuild E2B template
4. ✅ Test end-to-end workflow
5. ⬜ Build frontend Dashboard Management UI
6. ⬜ Add deployment status tracking
7. ⬜ Implement dashboard editing feature
