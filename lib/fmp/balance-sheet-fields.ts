import type { FieldMetadata } from './field-metadata'

export const balanceSheetFields: FieldMetadata[] = [
  // Current Assets
  {
    field: "cashAndCashEquivalents",
    name: "Cash and Cash Equivalents",
    description: "Highly liquid assets including cash and short-term investments",
    category: "Current Assets",
    aliases: ["cash", "liquid assets", "cash equivalents", "现金及现金等价物"],
    useCases: ["Liquidity analysis", "Financial flexibility", "Cash management"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "shortTermInvestments",
    name: "Short Term Investments",
    description: "Marketable securities and investments with maturity less than one year",
    category: "Current Assets",
    aliases: ["short-term securities", "marketable securities", "短期投资"],
    useCases: ["Liquidity analysis", "Investment strategy", "Cash optimization"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "accountsReceivables",
    name: "Accounts Receivable",
    description: "Money owed to the company by customers for goods or services delivered",
    category: "Current Assets",
    aliases: ["receivables", "trade receivables", "customer receivables", "应收账款"],
    useCases: ["Working capital analysis", "Collection efficiency", "Revenue quality"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "inventory",
    name: "Inventory",
    description: "Value of goods held for sale or raw materials for production",
    category: "Current Assets",
    aliases: ["stock", "goods inventory", "raw materials", "存货"],
    useCases: ["Working capital analysis", "Inventory management", "Operational efficiency"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "totalCurrentAssets",
    name: "Total Current Assets",
    description: "Sum of all assets expected to be converted to cash within one year",
    category: "Current Assets",
    aliases: ["current assets", "liquid assets total", "流动资产总计"],
    useCases: ["Liquidity analysis", "Current ratio calculation", "Working capital analysis"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Non-Current Assets
  {
    field: "propertyPlantEquipmentNet",
    name: "Property, Plant & Equipment (Net)",
    description: "Net book value of fixed assets after depreciation",
    category: "Non-Current Assets",
    aliases: ["PPE", "fixed assets", "plant equipment", "固定资产净值"],
    useCases: ["Asset intensity", "Capital investment", "Depreciation analysis"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "goodwill",
    name: "Goodwill",
    description: "Intangible asset representing premium paid for acquisitions",
    category: "Non-Current Assets",
    aliases: ["acquisition premium", "intangible goodwill", "商誉"],
    useCases: ["Acquisition analysis", "Intangible asset value", "Impairment risk"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "intangibleAssets",
    name: "Intangible Assets",
    description: "Non-physical assets like patents, trademarks, and intellectual property",
    category: "Non-Current Assets",
    aliases: ["intellectual property", "patents", "trademarks", "无形资产"],
    useCases: ["Innovation value", "Competitive advantage", "Asset quality"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "longTermInvestments",
    name: "Long Term Investments",
    description: "Investments held for more than one year",
    category: "Non-Current Assets",
    aliases: ["long-term securities", "strategic investments", "长期投资"],
    useCases: ["Investment strategy", "Diversification", "Strategic holdings"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "totalAssets",
    name: "Total Assets",
    description: "Sum of all current and non-current assets",
    category: "Total Assets",
    aliases: ["total assets", "asset base", "资产总计"],
    useCases: ["Company size", "Asset turnover", "ROA calculation", "Balance sheet analysis"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Current Liabilities
  {
    field: "accountPayables",
    name: "Accounts Payable",
    description: "Money owed to suppliers and vendors for goods and services",
    category: "Current Liabilities",
    aliases: ["payables", "trade payables", "supplier payables", "应付账款"],
    useCases: ["Working capital analysis", "Payment terms", "Cash flow timing"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "shortTermDebt",
    name: "Short Term Debt",
    description: "Debt obligations due within one year",
    category: "Current Liabilities",
    aliases: ["short-term borrowings", "current debt", "短期债务"],
    useCases: ["Liquidity risk", "Debt maturity", "Refinancing needs"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "totalCurrentLiabilities",
    name: "Total Current Liabilities",
    description: "Sum of all obligations due within one year",
    category: "Current Liabilities",
    aliases: ["current liabilities", "short-term obligations", "流动负债总计"],
    useCases: ["Current ratio", "Working capital", "Liquidity analysis"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Long-term Liabilities
  {
    field: "longTermDebt",
    name: "Long Term Debt",
    description: "Debt obligations due in more than one year",
    category: "Long-term Liabilities",
    aliases: ["long-term borrowings", "non-current debt", "长期债务"],
    useCases: ["Leverage analysis", "Financial risk", "Capital structure"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "totalDebt",
    name: "Total Debt",
    description: "Sum of short-term and long-term debt",
    category: "Total Debt",
    aliases: ["total borrowings", "total debt obligations", "债务总计"],
    useCases: ["Debt-to-equity ratio", "Leverage analysis", "Financial risk assessment"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "totalLiabilities",
    name: "Total Liabilities",
    description: "Sum of all current and non-current liabilities",
    category: "Total Liabilities",
    aliases: ["total obligations", "total liabilities", "负债总计"],
    useCases: ["Debt-to-asset ratio", "Financial leverage", "Solvency analysis"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Shareholders' Equity
  {
    field: "commonStock",
    name: "Common Stock",
    description: "Par value of common shares outstanding",
    category: "Shareholders' Equity",
    aliases: ["common shares", "ordinary shares", "普通股"],
    useCases: ["Share structure", "Equity composition", "Ownership analysis"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "retainedEarnings",
    name: "Retained Earnings",
    description: "Cumulative earnings retained in the business rather than paid as dividends",
    category: "Shareholders' Equity",
    aliases: ["accumulated earnings", "retained profits", "留存收益"],
    useCases: ["Dividend policy", "Reinvestment capacity", "Financial stability"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "treasuryStock",
    name: "Treasury Stock",
    description: "Company's own shares repurchased from the market",
    category: "Shareholders' Equity",
    aliases: ["share buybacks", "repurchased shares", "库存股"],
    useCases: ["Share repurchase analysis", "Capital allocation", "Shareholder returns"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "totalStockholdersEquity",
    name: "Total Stockholders' Equity",
    description: "Total ownership value belonging to shareholders",
    category: "Shareholders' Equity",
    aliases: ["shareholders equity", "book value", "net worth", "股东权益总计"],
    useCases: ["ROE calculation", "Book value per share", "Equity analysis", "Leverage ratios"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Derived Metrics
  {
    field: "netDebt",
    name: "Net Debt",
    description: "Total debt minus cash and cash equivalents",
    category: "Financial Position",
    aliases: ["net debt position", "adjusted debt", "净债务"],
    useCases: ["Financial leverage", "Debt capacity", "Credit analysis"],
    dataSource: {
      endpoint: "/balance-sheet-statement",
      dataType: "getBalanceSheet",
      statement: "Balance Sheet"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  }
]