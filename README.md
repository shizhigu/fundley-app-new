# Fundley - AI Financial Analyst with Live Dashboards

> The first AI financial analyst that creates **interactive, persistent dashboards** - not just static charts.

## 🎯 What Makes Fundley Different?

### ChatGPT/Claude: Static Analysis
```
You: "Analyze TSLA stock"
AI: [Generates static chart]
You: "Can I change the date range?"
AI: [Generates new static chart]
```

### Fundley: Live Interactive Dashboards
```
You: "Create a TSLA monitoring dashboard"
AI: [Creates interactive Streamlit app]
     ✅ Adjust date ranges with sliders
     ✅ Switch between stocks with dropdowns
     ✅ Download data as CSV
     ✅ Auto-refresh with latest data
     ✅ Persistent URL - access anytime
```

## ✨ Key Features

### 1. **My Dashboards** - The Game Changer
- 📊 **Interactive Controls**: Filter, sort, customize - all in the browser
- 🔄 **Real-Time Updates**: Dashboards pull latest market data automatically
- 🔗 **Shareable URLs**: Each dashboard gets its own URL
- 💾 **Persistent**: Come back weeks later, still works
- 🎨 **Fully Customizable**: Ask AI to add charts, tables, or metrics

### 2. **Deep Financial Analysis**
- 📈 Stock fundamentals (P/E, EPS, revenue growth)
- 📊 Options analysis (IV, Greeks, unusual activity)
- 📰 News sentiment & event timelines
- 📅 Earnings calendar tracking
- 💰 DCF valuation models

### 3. **Intelligent Data Access**
- **MotherDuck Integration**: Query 10+ years of financial data via SQL
- **Multi-Source APIs**: FMP, Polygon, SEC Edgar, EODHD
- **Smart Caching**: Fast responses, low API costs

### 4. **Professional Deliverables**
- 📄 Interactive HTML reports
- 📊 Excel spreadsheets with formulas
- 🖼️ High-res charts (PNG, SVG)
- 📑 PDF presentations

## 🚀 Quick Start

### Example Queries

**Create a Live Dashboard:**
```
"Create a real-time NVDA monitoring dashboard with:
- Current price and day change
- P/E ratio and market cap
- 90-day price chart
- Recent news headlines"
```

→ AI creates an interactive Streamlit app
→ Opens in your browser with live data
→ Bookmark the URL, check anytime

**Run Analysis:**
```
"Compare TSLA, NVDA, and AAPL's revenue growth over 3 years"
```

→ AI fetches data, runs analysis
→ Generates interactive charts
→ Exports to Excel with formulas

**Track Events:**
```
"What major events affected TSLA stock in the last 30 days?"
```

→ AI searches news archives
→ Builds timeline with price correlation
→ Highlights significant moves

## 🎨 Use Cases

### For Traders
- **Real-time monitors** for watchlist stocks
- **Options screeners** with live Greeks
- **Earnings trackers** with surprise analysis

### For Investors
- **Valuation dashboards** (DCF, comps)
- **Portfolio analytics** (diversification, risk)
- **Sector comparisons** with benchmarks

### For Analysts
- **Peer analysis** with custom metrics
- **Trend reports** with historical data
- **Event studies** (M&A, earnings, etc.)

## 💎 Technology

### Frontend
- **Next.js 15** with App Router
- **Tailwind CSS** + shadcn/ui
- **Real-time streaming** with AI SDK

### AI Agent (Python)
- **Agno Framework** - Multi-agent orchestration
- **Fly.io Machines** - Isolated Python execution
- **E2B Sandboxes** - Secure code running

### Data Infrastructure
- **MotherDuck** - Cloud DuckDB (10+ years financial data)
- **Neon Postgres** - User data & chat history
- **Qdrant** - Vector search for news & events

### Live Dashboards
- **Streamlit** - Interactive Python apps
- **Fly.io Auto-scale** - Deploy in 30 seconds
- **Aggressive Auto-stop** - Cost optimization (10min idle → stop)

## 📊 Cost Optimization

Fundley uses smart auto-scaling to keep costs low:

- **Streamlit apps**: Stop after 10 min idle → Auto-start on visit
- **Dev machines**: Stop after 15 min idle → Auto-start on use
- **Result**: ~78% cost savings vs always-on infrastructure

## 🔐 Security

- **Clerk Auth** - Enterprise-grade authentication
- **Isolated Sandboxes** - Each user gets isolated execution environment
- **API Key Management** - Secrets never exposed to client
- **Rate Limiting** - Protect against abuse

## 🛣️ Roadmap

- [ ] **Portfolio Tracking** - Import holdings, track performance
- [ ] **Alerts** - Email/SMS when stocks hit price targets
- [ ] **Collaboration** - Share dashboards with teams
- [ ] **API Access** - Programmatic access to analysis
- [ ] **Mobile App** - Native iOS/Android apps

## 📖 Documentation

- [Quick Start Guide](docs/QUICK_START.md)
- [Feature List](docs/FEATURES.md)
- [API Reference](chatbot-service/README.md)

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📜 License

MIT License - See [LICENSE](LICENSE) for details.

---

**Built with ❤️ by the Fundley team**

[Website](https://fundley.ai) · [Discord](https://discord.gg/fundley) · [Twitter](https://twitter.com/fundley_ai)
