# Convex 手动配置指南

由于无法在非交互式终端中运行 `npx convex dev --configure=new`，需要手动配置 Convex 项目。

## 步骤 1: 创建 Convex 项目

1. 访问 [https://dashboard.convex.dev](https://dashboard.convex.dev)
2. 使用 GitHub 或 Google 账号登录
3. 点击 "Create a project"
4. 项目名称建议使用: `fundley-app`
5. 选择合适的区域 (建议选择美国西部或东部)

## 步骤 2: 获取环境变量

在 Convex 项目 dashboard 中:

1. 点击 "Settings" → "Environment Variables"
2. 复制 `CONVEX_DEPLOY_KEY` 
3. 在 "Project URL" 中复制 `NEXT_PUBLIC_CONVEX_URL`

## 步骤 3: 更新 .env.local

在项目根目录的 `.env.local` 文件中添加:

```bash
# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=https://your-project-name.convex.cloud
CONVEX_DEPLOY_KEY=your-deploy-key-here
```

## 步骤 4: 配置 Clerk JWT 模板

1. 访问 [Clerk Dashboard](https://dashboard.clerk.com)
2. 进入你的应用设置
3. 导航到 "JWT Templates"
4. 点击 "New template"
5. 模板名称设置为: `convex`
6. 在 Claims 中添加:

```json
{
  "aud": "convex"
}
```

7. 保存模板

## 步骤 5: 配置 Convex 环境变量

回到 Convex Dashboard:

1. 点击 "Settings" → "Environment Variables"
2. 添加新的环境变量:
   - Key: `CLERK_JWT_ISSUER_DOMAIN`
   - Value: `https://your-clerk-domain.clerk.accounts.dev` (从 Clerk dashboard 获取)

## 步骤 6: 部署 Convex 函数

在项目根目录运行:

```bash
npx convex dev
```

第一次运行时会要求登录，按照提示完成登录流程。

## 步骤 7: 验证配置

运行开发服务器:

```bash
pnpm dev
```

如果一切配置正确，应用应该能够:

1. 成功连接到 Convex
2. Clerk 认证正常工作
3. 能够创建和查询数据

## 故障排除

### 如果遇到认证问题:
1. 检查 Clerk JWT 模板是否正确配置
2. 确认 `CLERK_JWT_ISSUER_DOMAIN` 环境变量正确
3. 检查 Convex 项目是否部署成功

### 如果遇到连接问题:
1. 检查 `NEXT_PUBLIC_CONVEX_URL` 是否正确
2. 确认网络连接正常
3. 检查 Convex 项目状态是否为 "Active"

## 完成后

配置完成后，删除此文件，所有设置都将通过环境变量和代码配置自动管理。