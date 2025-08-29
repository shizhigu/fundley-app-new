import type { FieldMetadata } from './field-metadata'

export const incomeStatementFields: FieldMetadata[] = [
  // Revenue & Sales
  {
    field: "revenue",
    name: "Revenue",
    description: "Total sales or gross income for the period",
    category: "Revenue",
    aliases: ["sales", "topline", "total revenue", "营收", "收入"],
    useCases: ["Growth analysis", "Revenue trends", "Market size evaluation"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Cost Structure
  {
    field: "costOfRevenue",
    name: "Cost of Revenue",
    description: "Direct costs attributable to the production of goods sold",
    category: "Cost Structure",
    aliases: ["cost of goods sold", "COGS", "direct costs", "生产成本"],
    useCases: ["Margin analysis", "Cost structure evaluation", "Operational efficiency"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "grossProfit",
    name: "Gross Profit",
    description: "Revenue minus cost of revenue",
    category: "Profitability",
    aliases: ["gross income", "gross margin dollars", "毛利润"],
    useCases: ["Profitability analysis", "Pricing power evaluation", "Competitive analysis"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Operating Expenses
  {
    field: "researchAndDevelopmentExpenses",
    name: "R&D Expenses",
    description: "Research and development expenditures",
    category: "Operating Expenses",
    aliases: ["R&D", "research expenses", "development costs", "研发费用"],
    useCases: ["Innovation investment", "Future growth potential", "Industry comparison"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "sellingGeneralAndAdministrativeExpenses",
    name: "SG&A Expenses",
    description: "Selling, general and administrative expenses",
    category: "Operating Expenses",
    aliases: ["SGA", "sales expenses", "admin expenses", "销售管理费用"],
    useCases: ["Cost control analysis", "Operational efficiency", "Scalability assessment"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "operatingExpenses",
    name: "Operating Expenses",
    description: "Total operating expenses including R&D, SG&A, and other operating costs",
    category: "Operating Expenses",
    aliases: ["opex", "total operating costs", "运营费用"],
    useCases: ["Cost structure analysis", "Operating leverage", "Efficiency metrics"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Operating Performance
  {
    field: "operatingIncome",
    name: "Operating Income",
    description: "Profit from core business operations (EBIT)",
    category: "Operating Performance",
    aliases: ["EBIT", "operating profit", "earnings before interest and taxes", "营业利润"],
    useCases: ["Core business profitability", "Operating efficiency", "Business performance"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "ebitda",
    name: "EBITDA",
    description: "Earnings before interest, taxes, depreciation and amortization",
    category: "Operating Performance",
    aliases: ["earnings before interest taxes depreciation amortization", "息税折旧摊销前利润"],
    useCases: ["Cash generation", "Company valuation", "Peer comparison"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Financial Items
  {
    field: "interestExpense",
    name: "Interest Expense",
    description: "Cost of borrowing money",
    category: "Financial Items",
    aliases: ["interest cost", "borrowing cost", "debt service", "利息支出"],
    useCases: ["Debt burden analysis", "Financial risk assessment", "Capital structure evaluation"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "interestIncome",
    name: "Interest Income",
    description: "Income from investments and cash deposits",
    category: "Financial Items",
    aliases: ["investment income", "interest earned", "利息收入"],
    useCases: ["Cash management", "Investment returns", "Financial income analysis"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Pre-tax and Tax
  {
    field: "incomeBeforeTax",
    name: "Income Before Tax",
    description: "Earnings before income tax expense",
    category: "Pre-tax Performance",
    aliases: ["pre-tax income", "earnings before taxes", "税前利润"],
    useCases: ["Operating performance", "Tax efficiency analysis", "Core profitability"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "incomeTaxExpense",
    name: "Income Tax Expense",
    description: "Total tax expense for the period",
    category: "Tax",
    aliases: ["tax expense", "taxes paid", "所得税费用"],
    useCases: ["Tax rate analysis", "After-tax profitability", "Tax efficiency"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Net Income
  {
    field: "netIncome",
    name: "Net Income",
    description: "Bottom line profit after all expenses and taxes",
    category: "Net Profitability",
    aliases: ["net profit", "bottom line", "earnings", "净利润", "净收益"],
    useCases: ["Overall profitability", "EPS calculation", "Dividend capacity", "ROE calculation"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Per Share Data
  {
    field: "eps",
    name: "Earnings Per Share (Basic)",
    description: "Basic earnings per share",
    category: "Per Share Metrics",
    aliases: ["basic EPS", "earnings per share", "每股收益"],
    useCases: ["Share valuation", "Performance tracking", "Investment analysis"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "USD per share",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "epsDiluted",
    name: "Earnings Per Share (Diluted)",
    description: "Diluted earnings per share",
    category: "Per Share Metrics",
    aliases: ["diluted EPS", "fully diluted earnings", "稀释每股收益"],
    useCases: ["Conservative valuation", "Share-based compensation impact", "Investment analysis"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "USD per share",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Share Count
  {
    field: "weightedAverageShsOut",
    name: "Weighted Average Shares Outstanding",
    description: "Basic weighted average number of shares outstanding",
    category: "Share Data",
    aliases: ["basic shares", "share count", "outstanding shares", "流通股数"],
    useCases: ["EPS calculation", "Market cap calculation", "Share dilution analysis"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "shares",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "weightedAverageShsOutDil",
    name: "Weighted Average Shares Outstanding (Diluted)",
    description: "Diluted weighted average number of shares outstanding",
    category: "Share Data",
    aliases: ["diluted shares", "fully diluted shares", "稀释流通股数"],
    useCases: ["Diluted EPS calculation", "Share dilution impact", "Conservative analysis"],
    dataSource: {
      endpoint: "/income-statement",
      dataType: "getIncomeStatement",
      statement: "Income Statement"
    },
    dataFormat: {
      unit: "shares",
      isPercentage: false,
      isRatio: false
    }
  }
]