// Examples for createJSVisualization tool
// These show how AI should format chart configurations

export const VISUALIZATION_EXAMPLES = {
  
  // Time series revenue chart
  timeSeries: {
    title: "Apple Revenue Growth (2020-2024)",
    description: "Quarterly revenue trends showing consistent growth",
    config: {
      library: "observable-plot" as const,
      data: [
        { date: "2020-01-01", revenue: 91819, quarter: "Q1 2020" },
        { date: "2020-04-01", revenue: 59685, quarter: "Q2 2020" },
        { date: "2020-07-01", revenue: 64698, quarter: "Q3 2020" },
        { date: "2020-10-01", revenue: 111439, quarter: "Q4 2020" },
        { date: "2021-01-01", revenue: 89584, quarter: "Q1 2021" },
        { date: "2021-04-01", revenue: 81434, quarter: "Q2 2021" },
        { date: "2021-07-01", revenue: 83360, quarter: "Q3 2021" },
        { date: "2021-10-01", revenue: 123945, quarter: "Q4 2021" }
      ],
      spec: {
        marks: [
          {
            type: "line",
            data: "data",
            x: "date",
            y: "revenue",
            stroke: "#1f77b4",
            strokeWidth: 3
          },
          {
            type: "dot",
            data: "data", 
            x: "date",
            y: "revenue",
            fill: "#1f77b4",
            r: 4
          }
        ],
        x: { 
          type: "utc", 
          label: "Quarter" 
        },
        y: { 
          grid: true, 
          label: "Revenue (Millions USD)" 
        },
        width: 640,
        height: 400
      }
    }
  },

  // Comparison bar chart  
  comparison: {
    title: "Tech Giants Revenue Comparison Q4 2024",
    description: "Quarterly revenue comparison of major technology companies",
    config: {
      library: "observable-plot" as const,
      data: [
        { company: "Apple", revenue: 123945, sector: "Technology" },
        { company: "Microsoft", revenue: 62048, sector: "Technology" },
        { company: "Alphabet", revenue: 84310, sector: "Technology" },
        { company: "Amazon", revenue: 149204, sector: "Technology" },
        { company: "Meta", revenue: 40343, sector: "Technology" }
      ],
      spec: {
        marks: [
          {
            type: "barY",
            data: "data",
            x: "company", 
            y: "revenue",
            fill: "#2563eb"
          }
        ],
        x: { 
          label: "Company" 
        },
        y: { 
          grid: true, 
          label: "Revenue (Millions USD)" 
        },
        width: 640,
        height: 400
      }
    }
  },

  // Multi-series chart
  multiSeries: {
    title: "AAPL vs MSFT Stock Performance",
    description: "Stock price comparison showing relative performance over time",
    config: {
      library: "observable-plot" as const,
      data: [
        { date: "2024-01-01", price: 185.64, symbol: "AAPL" },
        { date: "2024-02-01", price: 188.85, symbol: "AAPL" },
        { date: "2024-03-01", price: 175.10, symbol: "AAPL" },
        { date: "2024-01-01", price: 376.04, symbol: "MSFT" },
        { date: "2024-02-01", price: 411.95, symbol: "MSFT" },
        { date: "2024-03-01", price: 420.55, symbol: "MSFT" }
      ],
      spec: {
        marks: [
          {
            type: "line",
            data: "data",
            x: "date",
            y: "price", 
            stroke: "symbol",
            strokeWidth: 2
          }
        ],
        x: { 
          type: "utc", 
          label: "Date" 
        },
        y: { 
          grid: true, 
          label: "Stock Price (USD)" 
        },
        color: { 
          legend: true 
        },
        width: 640,
        height: 400
      }
    }
  },

  // Chart.js example
  chartJS: {
    title: "Market Share Distribution",
    description: "Pie chart showing market share by company",
    config: {
      library: "chart-js" as const,
      data: [
        { label: "Apple", value: 28.4 },
        { label: "Samsung", value: 22.3 },
        { label: "Xiaomi", value: 12.7 },
        { label: "Oppo", value: 10.5 },
        { label: "Vivo", value: 9.1 },
        { label: "Others", value: 17.0 }
      ],
      spec: {
        type: "pie",
        dataset: {
          backgroundColor: [
            "#FF6384", "#36A2EB", "#FFCE56", 
            "#4BC0C0", "#9966FF", "#FF9F40"
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "top"
            },
            title: {
              display: true,
              text: "Smartphone Market Share"
            }
          }
        }
      }
    }
  },

  // Plotly.js example
  plotlyJS: {
    title: "3D Revenue Surface",
    description: "3D visualization of revenue by product and quarter",
    config: {
      library: "plotly-js" as const,
      data: [
        {
          type: "surface",
          z: [
            [100, 120, 130, 140],
            [110, 125, 135, 145],
            [105, 115, 125, 135],
            [95, 105, 115, 125]
          ]
        }
      ],
      spec: {
        layout: {
          title: "Revenue Surface Plot",
          scene: {
            xaxis: { title: "Quarter" },
            yaxis: { title: "Product Line" },
            zaxis: { title: "Revenue (M)" }
          }
        },
        config: {
          responsive: true
        }
      }
    }
  }
};

// Usage guidelines for AI
export const USAGE_GUIDELINES = `
## How to Use createJSVisualization

1. **Choose the right library:**
   - Observable Plot: Most financial charts, time series, comparisons
   - Chart.js: Simple charts, pie charts, traditional business charts  
   - Plotly.js: 3D charts, specialized visualizations

2. **Data format:**
   - Always use array of objects
   - Consistent field names across all objects
   - Handle dates as ISO strings (YYYY-MM-DD)

3. **Chart specifications:**
   - Use "data" as the data reference in marks
   - Include proper labels for x and y axes
   - Set appropriate width/height (default: 640x400)
   - Add grid lines for better readability

4. **Color schemes:**
   - Professional blues: #1f77b4, #2563eb, #3b82f6
   - Use stroke for lines, fill for areas/bars
   - For multi-series, use "series" field for automatic coloring

5. **Examples of mark types:**
   - "line": Time series, trends
   - "barY": Vertical bars, comparisons
   - "dot": Scatter plots, data points
   - "area": Filled areas, cumulative data
`;