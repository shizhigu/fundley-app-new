# ZenAsset Demo Script - Complete Walkthrough

> **Goal**: Showcase ZenAsset's unique capabilities in a 5-6 minute demo
> **Focus**: Data discovery, multi-source analysis, narrative insights, template reuse
> **Avoid**: Complex ML models, unpredictable results, niche edge cases

---

## Demo Setup (Before Recording)

### Pre-flight Checklist
- [ ] Clear browser cache
- [ ] Delete all existing chats and analysis blocks (fresh start)
- [ ] Verify API keys are working (FMP, Polygon, MotherDuck)
- [ ] Test queries below in sandbox to ensure stability
- [ ] Prepare backup queries in case of API timeouts

### Environment
- **Browser**: Chrome (latest), full screen, hide bookmarks bar
- **Screen Resolution**: 1920x1080 or higher
- **Audio**: Clear microphone, quiet room
- **Pace**: Speak slowly and clearly, pause between sections

---

## ACT 1: The Hook (0:00 - 0:45)

### Narration Script

> "What if you could analyze any stock like a Wall Street analyst — in under 3 minutes, with full transparency, and without writing a single line of code?"
>
> "Meet ZenAsset. Your AI financial analyst that shows its work."
>
> "Let's see how it works with a real example: analyzing NVIDIA's recent performance."

### Action
- Open ZenAsset landing page
- Click "Try ZenAsset" → Sign in
- **Screen shows**: Clean interface, Chat on left (40%), Analysis panel on right (60%)

### Key Visual
- Emphasize the **split-screen layout**: "Chat on the left, live analysis on the right"

---

## ACT 2: Comprehensive Company Analysis (0:45 - 2:30)

### Query 1: Multi-Dimensional Analysis

**Prompt (Type slowly, let viewers read)**:
```
Analyze NVIDIA's financial performance over the past 4 quarters.
I want to see:
1. Revenue and profit trends
2. Key operating margins (gross, operating, net)
3. How they compare to AMD and Intel
4. An interactive dashboard I can explore

Use the latest available data.
```

### Narration (while Agent works)

> "Notice what's happening here. ZenAsset isn't just searching a database."
>
> "It's intelligently discovering which APIs have the data I need..."
> *(pause as Agent calls `search_docs` and `call_api`)*
>
> "...fetching financial statements from multiple sources..."
> *(pause as data loads)*
>
> "...and building a complete analysis in real-time."

### Expected Output (Analysis Block appears)
- **Block Title**: "NVIDIA Financial Performance Analysis (Q1-Q4 2024)"
- **Sections**:
  - Executive Summary (markdown text)
  - Key Findings (bullet points)
- **Files**:
  - `dashboard.html` (interactive Plotly charts showing revenue, margins, peer comparison)
  - `metrics.json` (data table)

### Narration (when Block appears)

> "And here it is. A complete analysis block."
>
> "On the right, you see an interactive dashboard..." *(scroll through charts)*
>
> "...revenue trends, margin analysis, peer comparisons."
>
> "But here's what makes ZenAsset different: **transparency**."

### Action: Show Transparency

**Click "View in Chat"** (to jump to the conversation)

> "If I scroll up in the chat, I can see exactly what ZenAsset did:"
> *(scroll to show tool calls in chat)*
>
> - "It searched for the right API endpoints"
> - "Fetched data from Financial Modeling Prep"
> - "Calculated the metrics"
> - "Generated the visualizations"
>
> "Every step is visible. No black box."

---

## ACT 3: Narrative Analysis with Temporal RAG (2:30 - 3:45)

### Query 2: Investment Narrative Evolution

**Prompt**:
```
Help me understand how the investment narrative around NVIDIA evolved
from January to October 2024.

What were the key turning points? How did the market's perception shift
from "data center recovery" to "AI infrastructure monopoly"?
```

### Narration (while Agent works)

> "Now let's go deeper. Not just numbers — but the **story** behind the stock."
>
> "ZenAsset has a unique feature called Temporal Narrative Analysis."
>
> "It doesn't just dump 10,000 news articles on you. It identifies the **narrative turning points** — the moments that actually moved the market."

### Expected Output
- **Block Title**: "NVIDIA Investment Narrative Evolution (Jan-Oct 2024)"
- **Sections**:
  - Phase 1: "Data Center Recovery" (Jan-Mar)
  - Phase 2: "AI Arms Race" (Apr-Jun)
  - Phase 3: "Valuation Controversy" (Jul-Oct)
- **Each phase** has:
  - Key events with dates
  - Links to source articles
  - Market reaction (stock price/PE ratio changes)

### Narration (showing results)

> "Look at this. Instead of scrolling through thousands of news articles..."
>
> "...ZenAsset gives me a **timeline** of how the narrative evolved."
> *(point to sections)*
>
> "Phase 1: Early 2024, it was about 'data center recovery.'"
>
> "Phase 2: By spring, the narrative shifted to 'AI arms race' — OpenAI, Microsoft, Google all competing for GPUs."
>
> "Phase 3: Summer brought valuation concerns. Stock at 60x P/E, analysts divided."
>
> "And every event has a **source link**. You can verify it yourself."
> *(click a link to show it opens the original article)*
>
> "This is qualitative analysis at scale. No other tool does this."

---

## ACT 4: Template Reuse (3:45 - 4:45)

### Query 3: Save as Template

**Prompt**:
```
This is exactly the analysis I need. Save it as a template called
"Quarterly Performance Review" so I can reuse it for other stocks.
```

### Narration

> "Now here's where it gets powerful."
>
> "I can save this entire analysis as a **template**."

### Expected Output
- ✅ Template saved notification
- Template appears in templates list

### Query 4: Apply Template to Another Stock

**Prompt**:
```
Use the "Quarterly Performance Review" template to analyze AMD.
```

### Narration (while running)

> "Watch this. I just ask ZenAsset to run the same analysis on AMD..."
>
> "...and in 30 seconds, I get the exact same comprehensive report."
> *(wait for Block to appear)*
>
> "Same structure. Same metrics. Same peer comparisons."
>
> "What took 3 minutes the first time now takes 30 seconds."
>
> "This is how you scale your analysis process."

### Expected Output
- New Analysis Block: "AMD Financial Performance Analysis (Q1-Q4 2024)"
- Same dashboard structure, different data

---

## ACT 5: Data Discovery (4:45 - 5:30)

### Query 5: Intelligent API Discovery

**Prompt**:
```
I want to compare the inventory turnover ratios of semiconductor companies
over the past 8 quarters. Include NVDA, AMD, INTC, TSM, QCOM.

Show me which company is most efficient at managing inventory.
```

### Narration

> "Here's a problem most investors face: you know **what** you want, but not **where** to find it."
>
> "Inventory turnover ratio — that's buried somewhere in financial data APIs."
>
> "Bloomberg? You'd need to know the exact function code."
>
> "Python? You'd spend 30 minutes searching documentation."
>
> "Watch what ZenAsset does."

### Expected Output (narrate as it happens)

> *(Agent calls `search_docs`)*
> "First, it **searches its knowledge base** of 270+ financial APIs..."
>
> *(Agent finds the right endpoint)*
> "...finds that inventory turnover is in the `/ratios` endpoint..."
>
> *(Agent fetches data for all 5 companies)*
> "...fetches 8 quarters of data for all 5 companies..."
>
> *(Analysis Block appears with comparison chart)*
> "...and builds a comparison dashboard."
>
> "From question to answer in under 2 minutes."

### Expected Output
- **Block**: "Semiconductor Inventory Efficiency Comparison"
- **Chart**: Line chart showing inventory turnover trends for all 5 companies
- **Table**: Rankings by average efficiency
- **Insight**: "TSMC has the highest inventory turnover (12.3x), indicating superior supply chain efficiency"

---

## ACT 6: The Close (5:30 - 6:00)

### Narration (back to camera, away from screen)

> "So, what did we just see?"
>
> **[Count on fingers]**
>
> "One: **Comprehensive analysis** in 3 minutes that would take a Bloomberg analyst 3 hours."
>
> "Two: **Narrative intelligence** — understanding the story, not just the numbers."
>
> "Three: **Reusable templates** — do it once, apply it to 50 stocks."
>
> "Four: **Intelligent data discovery** — you focus on the question, ZenAsset finds the answer."
>
> "And everything is **transparent**. You can see the data sources, verify the calculations, download the code."
>
> "This is ZenAsset. Your AI financial analyst that shows its work."
>
> **[Pause, smile]**
>
> "Ready to analyze like a pro? Try it free at zenasset.com."

### Final Screen
- Show ZenAsset logo
- URL: **zenasset.com**
- CTA: "Start Free Trial"

---

## Backup Queries (If Something Fails)

### If Query 1 fails (API timeout):
**Backup**:
```
Show me Apple's revenue and profit margins for the past 4 quarters,
compared to Microsoft and Google.
```

### If Query 2 fails (narrative analysis issues):
**Backup**:
```
What were the major news events affecting Tesla stock in Q3 2024?
Focus on production, deliveries, and competition.
```

### If Query 5 fails (multi-company comparison):
**Backup**:
```
Compare the gross margins of NVDA, AMD, and INTC over the past 4 quarters.
Which company is most profitable?
```

---

## Technical Notes for Smooth Recording

### Camera Angles
- **Wide shot** (0:00-0:30): You + screen in frame, introducing
- **Screen recording** (0:30-5:30): Full screen capture, your voice over
- **Medium shot** (5:30-6:00): You on camera, closing remarks

### Editing Tips
- **Speed up** Agent processing time (2x speed with "working..." overlay)
- **Zoom in** on key UI elements (Analysis Block title, chart tooltips)
- **Highlight** important text with animated circles/arrows
- **Add captions** for non-native English viewers

### B-Roll Ideas (Optional)
- Typing animation (hands on keyboard)
- Close-up of dashboard charts
- Split screen: Bloomberg Terminal (complex) vs ZenAsset (simple)

---

## Post-Production Checklist

- [ ] Add background music (subtle, upbeat)
- [ ] Color grade for consistency
- [ ] Add lower-thirds with feature names ("Temporal Narrative Analysis", "Template Reuse", etc.)
- [ ] End screen with social links + CTA
- [ ] Export in 1080p 60fps
- [ ] Upload to YouTube with SEO-optimized title/description

---

## Video Metadata (for YouTube)

### Title
"ZenAsset: Analyze Stocks Like a Wall Street Pro in 3 Minutes"

### Description
```
What if you could do professional financial analysis without Bloomberg's $32,000/year price tag?

ZenAsset is the first AI financial analyst that shows its work.

In this demo, you'll see:
✅ Comprehensive company analysis in under 3 minutes
✅ AI-powered narrative timeline (understand the story, not just numbers)
✅ Reusable analysis templates (do it once, apply to 50 stocks)
✅ Intelligent data discovery (no more searching through API docs)

Everything is transparent. You can verify sources, see calculations, download code.

Try it free: https://zenasset.com

Timestamps:
0:00 - Introduction
0:45 - Comprehensive Analysis (NVIDIA)
2:30 - Narrative Timeline (Investment Story Evolution)
3:45 - Save & Reuse Templates
4:45 - Intelligent Data Discovery
5:30 - Conclusion

#FinancialAnalysis #AI #InvestingTools #StockMarket #Bloomberg
```

### Tags
financial analysis, AI investing, stock analysis, bloomberg alternative, investment research, financial modeling, NVIDIA analysis, quantitative analysis, fintech, AI tools

---

## Final Tips for Recording Day

1. **Rehearse 3 times** before recording
2. **Test all queries** in production 30 minutes before
3. **Have water** nearby (stay hydrated, clear voice)
4. **Smile** when speaking (viewers can hear it)
5. **Pause after key points** (easier to edit)
6. **If you mess up**: Just pause, restart the sentence (don't stop recording)
7. **Record 2 full takes** (gives you options in editing)

**Most important**: Be enthusiastic but authentic. You're showing off something genuinely cool — let that excitement come through naturally.

Good luck! 🎬
