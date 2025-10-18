# Stripe 收费系统配置指南

## 1. 环境变量配置

在 `.env.local` 中添加以下环境变量：

```bash
# Stripe Keys (从 Stripe Dashboard 获取)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx  # 或 sk_live_ (生产环境)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx  # 或 pk_live_
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Stripe Price IDs (从你的 Stripe Products 创建后获取)
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_INSTITUTIONAL_PRICE_ID=price_xxxxxxxxxxxxx

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000  # 本地开发
# NEXT_PUBLIC_APP_URL=https://yourdomain.com  # 生产环境
```

## 2. Stripe Dashboard 配置步骤

### Step 1: 获取 API Keys

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com)
2. 左侧菜单：**Developers** → **API keys**
3. 复制：
   - **Secret key** (sk_test_...) → `STRIPE_SECRET_KEY`
   - **Publishable key** (pk_test_...) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Step 2: 创建 Products 和 Prices

**Starter Plan ($99/月)**:
1. 左侧菜单：**Products** → **Add product**
2. 填写：
   - Name: `Starter`
   - Description: `Perfect for occasional analysis`
   - Pricing: `Recurring` → `$99/month`
   - Metadata 添加:
     - `plan_type`: `starter`
     - `monthly_credits`: `50`
3. 保存后复制 **Price ID** → `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID`

**Pro Plan ($249/月)**:
1. 同上，创建产品：
   - Name: `Pro`
   - Description: `For serious analysts and active investors`
   - Pricing: `$249/month`
   - Metadata:
     - `plan_type`: `pro`
     - `monthly_credits`: `200`
2. 复制 **Price ID** → `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`

**Institutional Plan ($1,249/月)**:
1. 同上，创建产品：
   - Name: `Institutional`
   - Description: `For institutions and investment firms`
   - Pricing: `$1,249/month`
   - Metadata:
     - `plan_type`: `institutional`
     - `monthly_credits`: `999999` (无限)
3. 复制 **Price ID** → `NEXT_PUBLIC_STRIPE_INSTITUTIONAL_PRICE_ID`

### Step 3: 配置 Webhook

1. 左侧菜单：**Developers** → **Webhooks**
2. 点击 **Add endpoint**
3. 填写：
   - **Endpoint URL**: `https://yourdomain.com/api/stripe/webhook`
     - 本地开发可以使用 Stripe CLI (见下方)
   - **Events to send**:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. 保存后复制 **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### Step 4: 配置 Customer Portal (可选)

1. 左侧菜单：**Settings** → **Billing** → **Customer portal**
2. 启用：
   - **Update payment method**: ✅
   - **Cancel subscription**: ✅
   - **Update subscription**: ✅
3. 保存配置

## 3. 本地开发 - Stripe CLI (Webhook 测试)

### 安装 Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

### 本地转发 Webhook

```bash
# 1. 登录
stripe login

# 2. 转发 webhook 到本地
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 你会看到类似这样的输出：
# > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)

# 3. 复制 signing secret 到 .env.local
# STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 测试支付流程

```bash
# 在另一个终端触发测试事件
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
```

## 4. 数据库 Migration

运行 migration 创建表：

```bash
psql $DATABASE_URL -f lib/db/migrations/017_create_subscription_and_credits.sql
```

## 5. 设置内部人员（无限 credits）

```bash
# 进入数据库
psql $DATABASE_URL

# 设置内部用户
UPDATE users SET is_internal = true WHERE email = 'your-email@example.com';

# 或者给大量 addon credits
UPDATE users SET addon_credits = 999999999 WHERE email = 'your-email@example.com';
```

## 6. 测试流程

### 测试订阅购买

1. 启动开发服务器：`pnpm dev`
2. 启动 Stripe webhook 转发：`stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. 访问定价页面：`http://localhost:3000/settings/pricing`
4. 点击 **Get Started** 按钮
5. 使用测试卡号：`4242 4242 4242 4242`
   - 日期：任意未来日期
   - CVC：任意 3 位数
   - ZIP：任意 5 位数
6. 完成支付后，检查数据库：

```sql
-- 查看订阅记录
SELECT * FROM subscriptions WHERE user_id = 'your-user-id';

-- 查看 credits
SELECT subscription_credits, addon_credits FROM users WHERE id = 'your-user-id';

-- 查看交易记录
SELECT * FROM credit_transactions WHERE user_id = 'your-user-id' ORDER BY created_at DESC;
```

### 测试 Credit 扣费

1. 发起一次对话
2. 查看控制台日志：
   ```
   💳 User credit balance: 50.00 credits (subscription: 50.00, addon: 0.00, internal: false)
   📊 Run metrics: { input_tokens: 1234, output_tokens: 5678, ... }
   💳 Deducted 0.0456 credits (from subscription). Remaining: subscription 49.95, addon 0.00
   ```
3. 检查数据库：
   ```sql
   SELECT * FROM credit_transactions WHERE user_id = 'your-user-id' ORDER BY created_at DESC LIMIT 10;
   ```

## 7. 生产环境部署

1. **切换到 Live Mode**：
   - Stripe Dashboard 右上角切换到 **Live** mode
   - 重新复制 Live API keys (sk_live_, pk_live_)
   - 重新创建 webhook endpoint (使用生产域名)

2. **更新环境变量**：
   ```bash
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # Live webhook secret
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

3. **测试**：
   - 使用真实信用卡测试完整流程
   - 确认 webhook 正常接收
   - 确认 credits 正确扣除

## 8. Credit 定价计算

**1 Credit = $0.2**

### Token 到 Credit 的转换

```
credit_cost = (input_tokens * 1.25 + (output + reasoning) * 10) / 200_000
```

### 示例

```
输入：10,000 tokens
输出：50,000 tokens
推理：5,000 tokens

成本 = (10,000 * 1.25 + 55,000 * 10) / 200,000
     = (12,500 + 550,000) / 200,000
     = 562,500 / 200,000
     = 2.8125 credits
     = $0.5625
```

### 各方案包含量

- **Starter ($99)**: 50 credits ≈ 约 178 万 tokens (混合使用)
- **Pro ($249)**: 200 credits ≈ 约 711 万 tokens
- **Institutional ($1,249)**: 无限

## 9. 常见问题

### Q: Webhook 没有收到事件？
A: 检查：
1. Stripe CLI 是否在运行：`stripe listen --forward-to localhost:3000/api/stripe/webhook`
2. Webhook endpoint 配置正确
3. 查看 Stripe Dashboard → **Developers** → **Webhooks** → **Events** 日志

### Q: 订阅创建了但 credits 没增加？
A: 检查：
1. webhook 是否触发成功
2. 数据库 subscriptions 表是否有记录
3. users 表的 subscription_credits 是否更新
4. 查看服务器日志

### Q: 如何退款？
A:
1. Stripe Dashboard → **Payments**
2. 找到支付记录 → **Refund**
3. Webhook 会自动触发 `charge.refunded` 事件（需要添加处理逻辑）

### Q: 如何手动调整用户 credits？
A:
```sql
-- 手动添加 addon credits
UPDATE users SET addon_credits = addon_credits + 100 WHERE email = 'user@example.com';

-- 记录交易
INSERT INTO credit_transactions (user_id, amount, transaction_type, source_type, description)
VALUES (
  (SELECT id FROM users WHERE email = 'user@example.com'),
  100,
  'manual_adjustment',
  'addon',
  'Manual credit adjustment by admin'
);
```

## 10. 下一步

- [ ] 创建定价页面 UI
- [ ] 创建订阅管理页面
- [ ] 创建使用量仪表盘
- [ ] 添加 email 通知（余额不足、订阅即将到期）
- [ ] 添加 addon credits 购买功能

完成！🎉
