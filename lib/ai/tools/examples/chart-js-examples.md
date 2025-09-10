# Chart.js Configuration Examples for createJSVisualization

## 1. Bar Chart (Most Common for Financial Data)

```json
{
  "title": "Top Companies by ROCE",
  "description": "Ranking of companies by Return on Capital Employed",
  "config": {
    "library": "chart-js",
    "data": [
      {"symbol": "AAPL", "metric_value": 0.95, "marketcap": 3000000000},
      {"symbol": "MSFT", "metric_value": 0.87, "marketcap": 2500000000},
      {"symbol": "GOOGL", "metric_value": 0.82, "marketcap": 1800000000}
    ],
    "spec": {
      "type": "bar",
      "label": "ROCE (%)"
    }
  }
}
```

## 2. Line Chart (Time Series)

```json
{
  "title": "Revenue Trend Over Time",
  "config": {
    "library": "chart-js",
    "data": [
      {"period": "Q1 2024", "value": 89500},
      {"period": "Q2 2024", "value": 95200},
      {"period": "Q3 2024", "value": 102300}
    ],
    "spec": {
      "type": "line",
      "label": "Revenue (M USD)"
    }
  }
}
```

## 3. Scatter Plot (Correlation)

```json
{
  "title": "ROCE vs Market Cap",
  "config": {
    "library": "chart-js",
    "data": [
      {"x": 3000000000, "y": 0.95, "label": "AAPL"},
      {"x": 2500000000, "y": 0.87, "label": "MSFT"}
    ],
    "spec": {
      "type": "scatter",
      "label": "ROCE vs Market Cap"
    }
  }
}
```

## Key Points:
1. **Always use "chart-js" as library** (it's the most reliable)
2. **Data format is flexible**: symbol/value, category/metric_value, x/y, etc.
3. **Simple spec**: Just type and label
4. **No complex marks or configurations needed**