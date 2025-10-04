# Fundley Landing Page Blueprint

This document outlines the content, layout, and visual direction for Fundley's marketing landing page. It is written for designers, marketers, and copywriters who need a single source of truth to build a high-impact, user-facing site.

## Audience & Promise
- **Primary audience:** Investment professionals and financial analysts who spend hours wrestling with spreadsheets, terminal data, and disconnected tools—seeking a unified workspace for deep financial analysis.
- **Core promise:** "Fundley turns complex financial questions into interactive analysis reports—combining data retrieval, computation, and visualization in a single conversational workspace."
- **Proof themes:** Conversational data analysis, reusable knowledge artifacts, transparent AI workflows, and instant visual insights without leaving the chat.

## Page Goals
1. Communicate how Fundley reshapes financial analysis from question to delivery.
2. Showcase concrete product capabilities, differentiators, and scenarios.
3. Drive demo requests and PoC conversations via clear calls-to-action.

## Page Structure & Copy Guidance
### 1. Hero Section (Above the Fold)
- **Headline:** "Ask complex financial questions. Get interactive analysis reports."
- **Subhead:** "Fundley combines conversational AI with programmatic data analysis—turning your questions into rich, reusable insights with charts, tables, and narratives you can trust."
- **Primary CTA:** `Book a Live Demo` (filled button). Secondary link: `See How It Works`.
- **Visual:** Split-screen showing: (Left) Chat interface with natural language question, (Right) Generated analysis block with interactive chart and data table. Use animated sequence showing data flowing from question → processing → visual report.
- **Trust Badge Row:** "Built for Financial Analysts | Private Equity | Asset Management"

### 2. Pain-to-Promise Section
- **Layout:** Split column with copy on left, supporting imagery on right (before/after workflow comparison).
- **Copy points:**
  - **Before Fundley:** "Hours lost toggling between Bloomberg terminal, Excel pivot tables, Python notebooks, and PowerPoint—just to answer one investment question."
  - **With Fundley:** "Ask your question once. Get a complete analysis report with data, calculations, and visualizations—ready to share or build upon."
- **Key Differentiator:** "Not just a chatbot that answers questions. A workspace that creates reusable analysis artifacts."
- **Micro CTA:** `See Real Analysis Examples` linking to use cases.

### 3. The Analysis Block System (Core Innovation)
- **Format:** Centered content block with visual examples of analysis blocks
- **Headline:** "Every answer becomes a reusable knowledge card"
- **Copy points:**
  - **What is an Analysis Block?** "A self-contained report card combining executive summary, data tables (JSON), and interactive visualizations (HTML)—all generated from your conversation."
  - **Three components, infinite flexibility:**
    - 📝 **Narrative Summary** — Key insights and methodology in markdown
    - 📊 **Data Tables** — Sortable, exportable JSON datasets
    - 📈 **Interactive Charts** — HTML visualizations (Plotly, etc.) you can explore
  - **Why it matters:** "Return to any analysis later. Share with colleagues. Build complex reports by stacking multiple blocks. Your questions become institutional knowledge."
- **Visual:** Show 3 example analysis block cards: (1) Revenue Trend Analysis, (2) Peer Benchmark Comparison, (3) Risk Factor Summary
- **Micro CTA:** `Explore Sample Blocks`

### 4. How Fundley Works (Three-Step Flow)
Visual workflow showing the journey from question to insight:

**Step 1: Ask Naturally**
- **Visual:** Chat input box with example: "Compare NVDA vs AAPL revenue growth over 5 years"
- **Copy:** "Type questions like you're talking to a colleague. No SQL, no formulas, no coding required."

**Step 2: AI Team Works Behind the Scenes**
- **Visual:** Animated flow showing 4 specialist agents collaborating
  - 🔢 **Financial Data Agent** — Retrieves verified market data covering 6,000+ public companies (income statements, balance sheets, cash flows, financial ratios, key performance metrics, company profiles)
  - 🔍 **Research Agent** — Extracts insights from official SEC regulatory filings (10-K/10-Q Management Discussion & Analysis, risk factors, business descriptions)
  - 💻 **Data Coding Agent** — Runs Python analysis in secure sandbox, generates visualizations
  - 🎯 **Orchestrator** — Coordinates the team, ensures coherent delivery
- **Copy:** "Specialist AI agents collaborate automatically—retrieving data, running calculations, creating charts. You see the thinking process in real-time."

**Step 3: Get Interactive Reports**
- **Visual:** Finished analysis block with expandable sections (narrative + table + chart)
- **Copy:** "Receive polished analysis blocks you can explore, export, and revisit. Every block includes methodology, data sources, and actionable insights."

**Technical Note (for credibility, small text):** "Powered by institutional-grade financial data sources, official SEC regulatory filings, and secure cloud-based Python execution environment."

### 5. What Fundley Excels At (Scope Definition)
- **Headline:** "Built for depth, not breadth"
- **Copy:** "Fundley specializes in financial data analysis for public companies. We do one thing exceptionally well: turn structured market data into actionable investment insights."

**Our Sweet Spot:**
- ✅ **Comparative Financial Analysis** — Compare revenue, margins, cash flow across companies and time periods
- ✅ **Custom Metric Calculations** — ROCE, TTM aggregations, growth rates, ratio analysis
- ✅ **Data Visualization** — Trend charts, peer benchmarks, performance dashboards
- ✅ **SEC Filing Intelligence** — Extract MD&A, risk factors, business descriptions from 10-K/10-Q
- ✅ **Reusable Research** — Build libraries of analysis blocks for recurring questions

**What We're NOT:**
- ❌ General-purpose AI chatbot (use ChatGPT for that)
- ❌ Real-time trading platform (we analyze fundamentals, not execute trades)
- ❌ Private company intelligence (focused on public market data)
- ❌ News summarization tool (we integrate research, but analysis comes first)

**The Fundley Advantage:** "When your question involves financial statements, SEC filings, or quantitative company analysis—Fundley delivers reports that would take analysts hours to produce manually."

### 6. Fundley vs. Generic AI Chatbots
- **Headline:** "Why financial analysis needs specialized tools"
- **Comparison table:**

| Feature | Generic AI Chat (ChatGPT, Claude) | Fundley |
|---------|-----------------------------------|---------|
| **Data Access** | No direct market data; makes up numbers or requires manual copy-paste | Direct access to verified financial data covering 6,000+ public companies + official SEC filings |
| **Calculation Accuracy** | Prone to math errors, no verification | Executes Python code in secure sandbox; all calculations auditable |
| **Output Format** | Plain text responses, forget after conversation ends | Structured analysis blocks with data tables + interactive charts + persistent storage |
| **Workflow** | One-shot Q&A, no continuity | Build analysis libraries; reference previous blocks; compound insights |
| **Transparency** | Black-box responses | See which agents retrieved what data, how calculations were made |
| **Depth** | Surface-level answers | Deep dives with methodology, assumptions, caveats, and recommendations |

**Bottom Line:** "ChatGPT explains concepts. Fundley runs the analysis."

### 7. Real-World Use Cases
Present three scenario cards with concrete examples:

**1. Investment Due Diligence**
- **Scenario:** "Your team is evaluating a SaaS company acquisition. You need to compare revenue growth, profitability trends, and cash generation against 5 competitors."
- **Fundley in Action:**
  - Ask: "Compare revenue growth CAGR for [Target] vs [Competitor A-E] over 3 years"
  - Get: Interactive table with calculated CAGRs + trend visualization
  - Follow-up: "Show me operating cash flow conversion rates for these companies"
  - Result: Complete peer benchmark report in 5 minutes vs. half-day manual work
- **CTA:** `See Due Diligence Template`

**2. Portfolio Company Monitoring**
- **Scenario:** "You manage 12 portfolio companies and need quarterly performance snapshots: revenue trends, margin compression alerts, cash runway warnings."
- **Fundley in Action:**
  - Ask: "Create quarterly dashboard for [Portfolio Company List]"
  - Get: Analysis blocks for each company with YoY/QoQ comparisons
  - Reuse: Return each quarter to update blocks with latest data
  - Result: Board-ready materials generated automatically from fresh filings
- **CTA:** `Explore Monitoring Setup`

**3. Thematic Research**
- **Scenario:** "You're researching AI semiconductor companies. Need to understand market positioning through financial lens: R&D intensity, gross margins, revenue concentration."
- **Fundley in Action:**
  - Ask: "Compare NVDA, AMD, INTC: R&D spend as % of revenue + gross profit margins + customer concentration risk"
  - Get: Multi-dimensional analysis with SEC filing excerpts (customer disclosures) + calculated metrics
  - Export: Data tables for your investment memo + charts for presentation deck
  - Result: Comprehensive sector analysis in one conversation
- **CTA:** `View Thematic Templates`

### 8. Future Capabilities Roadmap (Building on Solid Foundation)
- **Headline:** "Today's foundation, tomorrow's possibilities"
- **Copy:** "Fundley's flexible architecture enables rapid evolution while maintaining analytical rigor."

**Already Delivered:**
- ✅ 6-dimensional financial data (income/balance/cash/ratios/metrics/profile)
- ✅ SEC filing extraction (10-K/10-Q MD&A, risks, business)
- ✅ Multi-format output (Markdown + JSON + HTML visualizations)
- ✅ Programmatic analysis via Python sandbox
- ✅ Persistent knowledge artifacts (analysis blocks)

**On the Horizon (Natural Extensions):**
- 🔮 **Custom Data Sources** — Upload your proprietary datasets, merge with public data
- 🔮 **Scheduled Reports** — Automate weekly/monthly analysis block generation
- 🔮 **Natural Language to SQL** — Query your internal data warehouse conversationally
- 🔮 **Multi-Report Assembly** — Combine analysis blocks into comprehensive investment memos
- 🔮 **Alert-Driven Analysis** — Get notified when metrics cross thresholds, auto-generate diagnostic reports
- 🔮 **Collaborative Workspaces** — Team members annotate blocks, assign follow-ups
- 🔮 **Export to Presentation** — One-click PowerPoint generation from analysis blocks

**Why These Are Credible:** "We already have the infrastructure—agent orchestration, flexible output formats, programmatic execution. We're layering workflows on proven technology, not rebuilding from scratch."

### 9. Trust & Security
- **Headline:** "Built for institutional rigor"
- **Security Pillars:**
  - 🔒 **Data Isolation** — Each analysis runs in isolated sandbox environments; no cross-contamination
  - ✅ **Calculation Transparency** — All Python code and SQL queries auditable; reproducible results
  - 📋 **Compliance Ready** — Full audit trails for regulatory review
  - 🔐 **Enterprise Authentication** — SSO integration, role-based access controls
  - 🌐 **Multi-Source Verification** — Financial data cross-validated across institutional-grade providers
- **Copy:** "We treat your analysis with the same rigor you'd expect from a Bloomberg terminal—because investment decisions deserve nothing less."

### 10. Getting Started
- **Headline:** "Experience Fundley with your own questions"
- **Three Paths:**
  1. **Live Demo (30 min)** — Screen share with our team, bring your toughest analysis question
  2. **Pilot Program (2 weeks)** — Limited seats for early adopters; includes custom metric library setup + dedicated onboarding
  3. **Self-Service Trial** — Sandbox access with sample datasets (coming Q2 2025)

### 11. Final CTA & Contact
- **Headline:** "Stop wrestling with spreadsheets. Start asking questions."
- **Primary CTA:** `Book Your Demo` (filled button with calendar icon)
- **Secondary options:**
  - `Download Product Brief` (PDF with technical architecture overview)
  - `Join Pilot Waitlist` (ghost button)
- **Footer:**
  - Contact: hello@fundley.ai | LinkedIn | Twitter
  - Legal: Privacy Policy | Terms of Service | Data Security
  - Tagline: "Fundley – Where financial questions become analysis artifacts."

## Visual Direction
### Color Palette
| Tone | Hex | Usage |
| --- | --- | --- |
| Deep Navy | `#050B1A` | Primary background blocks, header/footer, modal overlays.
| Midnight Slate | `#101B2F` | Gradient anchor, card backgrounds.
| Cobalt Accent | `#3A8BFF` | Primary CTA, key icons, timeline highlights.
| Electric Teal | `#4FE0C1` | Secondary CTA, progress indicators, subtle gradients.
| Warm Light | `#F5F7FB` | Section backgrounds, dividers, table headers.
| Soft Sand | `#F2E9DA` | Highlight strips, testimonial cards.
| Neutral Gray | `#7F8CA5` | Body text, captions, secondary buttons.

- **Gradient suggestion:** Use a Cobalt (`#3A8BFF`) to Electric Teal (`#4FE0C1`) diagonal gradient over Midnight Slate for hero backgrounds.
- **Accent glow:** Apply subtle radial glow behind device mockups using Electric Teal at 40% opacity.

### Typography
- **Headline font:** `Inter Tight` or `Space Grotesk`, bold weights (600–700).
- **Body font:** `Inter` or `IBM Plex Sans`, weight 400.
- **Supporting mono:** `JetBrains Mono` for data callouts or stats.
- **Hierarchy guidance:** H1 56–64px, H2 32px, body 18–20px for readability on large screens.

### Imagery & Iconography
- Blend real UI screenshots with abstract patterns inspired by market graphs or neural network flows.
- Use outlined icons for agent roles; consistent stroke width (1.5px) and Cobalt accent color.
- Incorporate soft shadows and layered cards to reinforce depth without overwhelming.

### Interaction & Motion
- Hero CTA hover: slight scale (1.02) with drop shadow.
- Progress timeline tiles: fade-in + slide-up when scrolled into view (~250ms).
- Carousel transitions: 500ms auto-scroll with manual controls.
- Keep motion purposeful; avoid distracting looping animations.

## Copy Voice & Tone
- **Primary Voice:** Confident specialist, not generalist hype. "We do financial analysis exceptionally well" not "AI will revolutionize everything."
- **Language Style:**
  - Active, concrete verbs: "retrieve," "calculate," "generate," "export" (not vague AI buzzwords)
  - Business outcomes over technical features: "5-minute peer benchmark" not "multi-agent orchestration"
  - Acknowledge scope limits: "We don't do X, we excel at Y"
- **Differentiation Tone:**
  - ChatGPT is a Swiss Army knife; Fundley is a precision scalpel
  - Excel is manual labor; Fundley is automation with oversight
  - Bloomberg terminals have data; Fundley has data + analysis + narratives
- **Transparency Principle:** Show the how, not just the what. Users see which agents worked, what data sources were used, how calculations were made.
- **Educational Undertone:** Help users understand what makes good financial analysis—methodology, assumptions, caveats matter.

## Asset Checklist

**Critical Product Screenshots:**
1. **Hero Animation Sequence:**
   - Frame 1: User types natural language question
   - Frame 2: Agent status indicators (Financial Agent retrieving data...)
   - Frame 3: Analysis block populates with chart + table
   - Frame 4: User explores interactive visualization

2. **Analysis Block Examples (Real Data):**
   - Revenue trend comparison (NVDA vs AMD 5-year chart)
   - Peer benchmark table (Tech sector profitability ratios)
   - SEC filing excerpt (Risk factor extraction with highlights)

3. **Interface Components:**
   - Chat conversation showing multi-turn analysis
   - Side panel with analysis blocks list
   - Expandable data table with sorting
   - Interactive Plotly chart embed

**Illustrations & Icons:**
- 4 Agent avatars (Financial Data, Research, Coding, Orchestrator) with consistent style
- Process flow diagram (Question → Orchestration → Analysis Block)
- Before/After workflow comparison (manual Excel vs Fundley)
- Icon set: data table, chart, markdown, export, security, audit trail

**Marketing Collateral:**
- 2-page Product Brief PDF (architecture overview, use cases, security)
- Demo video script (90 seconds: problem → solution → outcome)
- Sample analysis block templates (downloadable for prospects)

## Tracking & Conversion Recommendations

**Primary Conversion Goal:** Demo bookings
- Hero section CTA (above fold)
- Sticky CTA bar (appears after scrolling past hero)
- Footer CTA (after all content consumption)
- Exit intent popup (offer product brief PDF)

**Engagement Metrics to Track:**
1. **Section scroll depth:** Which sections hold attention (use cases vs technical details)
2. **Comparison table interaction:** Do users understand Fundley vs ChatGPT difference?
3. **Analysis block example engagement:** Do mockups click? Which scenarios resonate?
4. **Video completion rate:** If we add demo video, track 25%/50%/75%/100% milestones
5. **CTA click patterns:** Which headlines/copy drive conversions?

**A/B Test Opportunities:**
- Hero headline variants: "Ask questions. Get reports." vs "Financial analysis without the Excel pain."
- Value prop emphasis: Speed (5-minute analysis) vs Quality (audit-ready reports)
- Use case ordering: Due diligence first vs Portfolio monitoring first

**Lead Nurture Paths:**
1. **Hot Lead (demo booked):** Send pre-demo questionnaire, sample analysis block
2. **Warm Lead (PDF downloaded):** Email sequence with use case deep dives
3. **Cold Lead (visited, no action):** Retargeting ads showing analysis block examples

## Implementation Roadmap

**Phase 1: Content & Copy (Week 1-2)**
- [ ] Finalize all 11 section copy blocks
- [ ] Create comparison table content
- [ ] Write 3 detailed use case scenarios
- [ ] Draft product brief PDF outline

**Phase 2: Visual Assets (Week 3-4)**
- [ ] Design 4 agent avatar illustrations
- [ ] Create hero animation sequence (4 frames)
- [ ] Screenshot actual product for analysis block examples
- [ ] Build before/after workflow comparison graphic

**Phase 3: Development (Week 5-6)**
- [ ] Implement responsive layout in Framer/Webflow
- [ ] Add scroll animations for timeline/progress elements
- [ ] Integrate Calendly for demo bookings
- [ ] Set up analytics tracking (PostHog/Mixpanel)

**Phase 4: Testing & Launch (Week 7-8)**
- [ ] User testing with 5 target personas (analysts, PE associates)
- [ ] Mobile responsiveness check
- [ ] Page speed optimization (<3s load time)
- [ ] Soft launch to pilot customers for feedback

## Key Messaging Pillars (Summary)

**1. The Problem We Solve:**
"Financial analysis currently requires juggling spreadsheets, terminals, and disconnected tools. Hours wasted on manual data wrangling instead of insight generation."

**2. Our Unique Approach:**
"Conversational interface + programmatic analysis + reusable knowledge artifacts. Not just answers, but complete analysis reports you can build upon."

**3. The Fundley Difference:**
"Specialized depth beats generalist breadth. We do financial analysis right: verified data, auditable calculations, transparent methodology, institutional rigor."

**4. What You Get:**
"Analysis blocks combining narrative insights + interactive data tables + visual charts. Persistent, shareable, exportable. Your questions become institutional knowledge."

**5. Future Vision:**
"Today: public company analysis. Tomorrow: custom data integration, automated reporting, collaborative workspaces. Building on a foundation that works."

---

**Fundley – Where financial questions become analysis artifacts.**
