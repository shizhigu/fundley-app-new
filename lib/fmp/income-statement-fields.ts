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
    field: "generalAndAdministrativeExpenses",
    name: "General and Administrative Expenses",
    description: "General and administrative expenses excluding selling costs",
    category: "Operating Expenses",
    aliases: ["G&A", "admin expenses", "general expenses", "一般管理费用"],
    useCases: ["Cost structure analysis", "Administrative efficiency", "Overhead management"],
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
    field: "sellingAndMarketingExpenses",
    name: "Selling and Marketing Expenses",
    description: "Expenses related to sales and marketing activities",
    category: "Operating Expenses",
    aliases: ["sales expenses", "marketing costs", "S&M", "销售营销费用"],
    useCases: ["Sales efficiency", "Marketing ROI", "Customer acquisition cost"],
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
    field: "otherExpenses",
    name: "Other Expenses",
    description: "Other operating and non-operating expenses",
    category: "Operating Expenses",
    aliases: ["miscellaneous expenses", "other costs", "其他费用"],
    useCases: ["Expense analysis", "Cost categorization", "Unusual items"],
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

  {
    field: "costAndExpenses",
    name: "Cost and Expenses",
    description: "Total costs and expenses including cost of revenue and operating expenses",
    category: "Cost Structure",
    aliases: ["total costs", "costs and expenses", "成本费用总计"],
    useCases: ["Total cost analysis", "Expense management", "Profitability analysis"],
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
    field: "depreciationandamortizationaccounting",
    name: "Depreciation and Amortization (Accounting)",
    description: "Non-cash charges for asset depreciation and intangible amortization from accounting perspective",
    category: "Operating Expenses",
    aliases: ["accounting D&A", "income statement depreciation", "accounting depreciation", "会计折旧摊销"],
    useCases: ["Asset utilization", "Non-cash expenses", "EBITDA calculation", "Accounting depreciation"],
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
    field: "ebit",
    name: "EBIT",
    description: "Earnings before interest and taxes",
    category: "Operating Performance",
    aliases: ["earnings before interest and taxes", "operating income", "息税前利润"],
    useCases: ["Operating profitability", "Interest coverage", "Core earnings"],
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
    field: "operatingIncome",
    name: "Operating Income",
    description: "Profit from core business operations",
    category: "Operating Performance",
    aliases: ["operating profit", "operating earnings", "营业利润"],
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
    field: "netInterestIncome",
    name: "Net Interest Income",
    description: "Interest income minus interest expense",
    category: "Financial Items",
    aliases: ["net interest", "interest margin", "净利息收入"],
    useCases: ["Net financing cost", "Interest margin analysis", "Financial efficiency"],
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
    field: "nonOperatingIncomeExcludingInterest",
    name: "Non-Operating Income (Excluding Interest)",
    description: "Non-operating income excluding interest income and expense",
    category: "Financial Items",
    aliases: ["other income", "non-operating income", "非营业收入"],
    useCases: ["Non-core income", "One-time items", "Investment gains"],
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
    field: "totalOtherIncomeExpensesNet",
    name: "Total Other Income/Expenses (Net)",
    description: "Net total of all other income and expenses",
    category: "Financial Items",
    aliases: ["other income net", "other expenses net", "其他收入费用净额"],
    useCases: ["Non-operating items", "Other income analysis", "Unusual items"],
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
    field: "netIncomeFromContinuingOperations",
    name: "Net Income from Continuing Operations",
    description: "Net income from operations expected to continue",
    category: "Net Profitability",
    aliases: ["continuing operations income", "持续经营净收入"],
    useCases: ["Core earnings", "Sustainable profitability", "Operational analysis"],
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
    field: "netIncomeFromDiscontinuedOperations",
    name: "Net Income from Discontinued Operations",
    description: "Net income from operations that have been or will be discontinued",
    category: "Net Profitability",
    aliases: ["discontinued operations income", "终止经营净收入"],
    useCases: ["One-time items", "Business restructuring", "Asset disposal"],
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
    field: "otherAdjustmentsToNetIncome",
    name: "Other Adjustments to Net Income",
    description: "Other adjustments and unusual items affecting net income",
    category: "Net Profitability",
    aliases: ["net income adjustments", "other adjustments", "净收入其他调整"],
    useCases: ["Unusual items", "One-time adjustments", "Income quality"],
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
    field: "netincomeaccounting",
    name: "Net Income (Accounting)",
    description: "Total net income after all items from accounting perspective",
    category: "Net Profitability",
    aliases: ["accounting net profit", "income statement earnings", "accounting earnings", "会计净利润"],
    useCases: ["Overall profitability", "EPS calculation", "Dividend capacity", "ROE calculation", "Accounting profit"],
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
    field: "netIncomeDeductions",
    name: "Net Income Deductions",
    description: "Deductions from net income for preferred dividends or other items",
    category: "Net Profitability",
    aliases: ["income deductions", "preferred dividends", "净收入扣除项"],
    useCases: ["Common shareholder income", "Preferred dividend impact", "Available earnings"],
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
    field: "bottomLineNetIncome",
    name: "Bottom Line Net Income",
    description: "Final net income available to common shareholders",
    category: "Net Profitability",
    aliases: ["bottom line", "final net income", "common shareholders income", "最终净收入"],
    useCases: ["Common shareholder returns", "EPS calculation", "Final profitability"],
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