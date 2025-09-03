import type { FieldMetadata } from './field-metadata'

export const cashFlowFields: FieldMetadata[] = [
  // Operating Activities
  {
    field: "netIncome",
    name: "Net Income",
    description: "Starting point for operating cash flow calculation",
    category: "Operating Activities",
    aliases: ["net profit", "bottom line", "净利润"],
    useCases: ["Cash flow analysis", "Quality of earnings", "Profitability assessment"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "depreciationAndAmortization",
    name: "Depreciation and Amortization",
    description: "Non-cash charges for asset deterioration and intangible asset amortization",
    category: "Operating Activities",
    aliases: ["D&A", "depreciation", "amortization", "折旧摊销"],
    useCases: ["Cash flow quality", "Capital intensity", "Non-cash expenses"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "stockBasedCompensation",
    name: "Stock-Based Compensation",
    description: "Non-cash compensation expense for employee stock options and awards",
    category: "Operating Activities",
    aliases: ["share-based compensation", "employee stock options", "股权激励费用"],
    useCases: ["Cash flow quality", "Employee compensation", "Dilution analysis"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "changeInWorkingCapital",
    name: "Change in Working Capital",
    description: "Cash impact from changes in current assets and liabilities",
    category: "Operating Activities",
    aliases: ["working capital changes", "WC change", "营运资金变化"],
    useCases: ["Working capital management", "Cash flow timing", "Operational efficiency"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "accountsReceivables",
    name: "Accounts Receivables Change",
    description: "Cash impact from changes in customer receivables",
    category: "Operating Activities",
    aliases: ["receivables change", "AR change", "应收账款变化"],
    useCases: ["Collection efficiency", "Revenue quality", "Cash conversion"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "inventory",
    name: "Inventory Change",
    description: "Cash impact from changes in inventory levels",
    category: "Operating Activities",
    aliases: ["inventory change", "stock change", "存货变化"],
    useCases: ["Inventory management", "Demand forecasting", "Cash optimization"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "accountsPayables",
    name: "Accounts Payables Change",
    description: "Cash impact from changes in supplier payables",
    category: "Operating Activities",
    aliases: ["payables change", "AP change", "应付账款变化"],
    useCases: ["Payment terms management", "Supplier relationships", "Cash optimization"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "operatingCashFlow",
    name: "Operating Cash Flow",
    description: "Net cash generated from core business operations",
    category: "Operating Activities",
    aliases: ["cash from operations", "CFO", "经营现金流"],
    useCases: ["Cash generation", "Business quality", "Dividend sustainability", "Free cash flow calculation"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Investing Activities
  {
    field: "capitalExpenditure",
    name: "Capital Expenditure",
    description: "Cash spent on property, plant, and equipment",
    category: "Investing Activities",
    aliases: ["capex", "capital spending", "PP&E investments", "资本支出"],
    useCases: ["Growth investment", "Maintenance capex", "Free cash flow calculation", "Capital intensity"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "investmentsInPropertyPlantAndEquipment",
    name: "Investments in PP&E",
    description: "Cash spent on acquiring fixed assets",
    category: "Investing Activities",
    aliases: ["PPE investments", "fixed asset purchases", "设备投资"],
    useCases: ["Growth capex", "Asset expansion", "Business investment"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "acquisitionsNet",
    name: "Acquisitions (Net)",
    description: "Net cash spent on business acquisitions",
    category: "Investing Activities",
    aliases: ["M&A spending", "business acquisitions", "并购支出"],
    useCases: ["Growth strategy", "Acquisition activity", "Strategic investments"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "purchasesOfInvestments",
    name: "Purchases of Investments",
    description: "Cash spent on marketable securities and investments",
    category: "Investing Activities",
    aliases: ["investment purchases", "securities bought", "投资支出"],
    useCases: ["Investment strategy", "Cash deployment", "Liquidity management"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "salesMaturitiesOfInvestments",
    name: "Sales/Maturities of Investments",
    description: "Cash received from selling or maturing investments",
    category: "Investing Activities",
    aliases: ["investment sales", "securities sold", "投资收回"],
    useCases: ["Investment turnover", "Cash generation", "Portfolio management"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "netCashProvidedByInvestingActivities",
    name: "Net Cash from Investing Activities",
    description: "Total cash flow from all investing activities",
    category: "Investing Activities",
    aliases: ["investing cash flow", "CFI", "投资现金流"],
    useCases: ["Investment activity", "Capital allocation", "Growth spending"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Financing Activities
  {
    field: "commonStockIssuance",
    name: "Common Stock Issuance",
    description: "Cash raised from issuing new common shares",
    category: "Financing Activities",
    aliases: ["equity issuance", "share issuance", "股票发行"],
    useCases: ["Equity financing", "Capital raising", "Dilution analysis"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "commonStockRepurchased",
    name: "Common Stock Repurchased",
    description: "Cash spent on buying back company shares",
    category: "Financing Activities",
    aliases: ["share buybacks", "stock repurchases", "股票回购"],
    useCases: ["Shareholder returns", "Capital allocation", "EPS management"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "commonDividendsPaid",
    name: "Common Dividends Paid",
    description: "Cash paid to common shareholders as dividends",
    category: "Financing Activities",
    aliases: ["dividend payments", "shareholder dividends", "股息支付"],
    useCases: ["Dividend policy", "Shareholder returns", "Cash distribution"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "netDebtIssuance",
    name: "Net Debt Issuance",
    description: "Net cash from borrowing minus debt repayments",
    category: "Financing Activities",
    aliases: ["debt financing", "net borrowing", "净债务融资"],
    useCases: ["Debt financing", "Leverage changes", "Capital structure"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "netCashProvidedByFinancingActivities",
    name: "Net Cash from Financing Activities",
    description: "Total cash flow from all financing activities",
    category: "Financing Activities",
    aliases: ["financing cash flow", "CFF", "筹资现金流"],
    useCases: ["Capital structure", "Financing strategy", "Shareholder returns"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Cash Position
  {
    field: "netChangeInCash",
    name: "Net Change in Cash",
    description: "Total change in cash position for the period",
    category: "Cash Position",
    aliases: ["cash change", "change in cash", "现金净变化"],
    useCases: ["Cash flow summary", "Liquidity changes", "Cash management"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "cashAtBeginningOfPeriod",
    name: "Cash at Beginning of Period",
    description: "Cash balance at the start of the reporting period",
    category: "Cash Position",
    aliases: ["beginning cash", "opening cash balance", "期初现金"],
    useCases: ["Cash reconciliation", "Liquidity analysis", "Cash trends"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "cashAtEndOfPeriod",
    name: "Cash at End of Period",
    description: "Cash balance at the end of the reporting period",
    category: "Cash Position",
    aliases: ["ending cash", "closing cash balance", "期末现金"],
    useCases: ["Cash reconciliation", "Liquidity position", "Cash availability"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Key Derived Metrics
  {
    field: "freeCashFlow",
    name: "Free Cash Flow",
    description: "Operating cash flow minus capital expenditures",
    category: "Key Metrics",
    aliases: ["FCF", "available cash flow", "自由现金流"],
    useCases: ["Valuation", "Dividend capacity", "Financial flexibility", "Investment analysis"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  // Supplemental Information
  {
    field: "incomeTaxesPaid",
    name: "Income Taxes Paid",
    description: "Actual cash payments for income taxes",
    category: "Supplemental Information",
    aliases: ["taxes paid", "cash tax payments", "实际税款支付"],
    useCases: ["Tax analysis", "Effective tax rate", "Cash tax rate"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },
  
  {
    field: "interestPaid",
    name: "Interest Paid",
    description: "Actual cash payments for interest expense",
    category: "Supplemental Information",
    aliases: ["interest payments", "cash interest", "利息支付"],
    useCases: ["Debt servicing", "Interest coverage", "Financial cost"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },

  // Additional Operating Activities
  {
    field: "deferredIncomeTax",
    name: "Deferred Income Tax",
    description: "Changes in deferred tax assets and liabilities",
    category: "Operating Activities",
    aliases: ["deferred tax", "税务递延", "deferred tax provision"],
    useCases: ["Tax analysis", "Cash flow quality", "Timing differences"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },

  {
    field: "otherWorkingCapital",
    name: "Other Working Capital",
    description: "Changes in other working capital components",
    category: "Operating Activities",
    aliases: ["other WC", "其他营运资金", "miscellaneous working capital"],
    useCases: ["Working capital analysis", "Cash flow details", "Operational changes"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },

  {
    field: "otherNonCashItems",
    name: "Other Non-Cash Items",
    description: "Other non-cash charges and adjustments",
    category: "Operating Activities",
    aliases: ["non-cash adjustments", "其他非现金项目", "other adjustments"],
    useCases: ["Cash flow quality", "Non-cash analysis", "Operating adjustments"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },

  {
    field: "netCashProvidedByOperatingActivities",
    name: "Net Cash Provided by Operating Activities",
    description: "Total net cash generated from all operating activities",
    category: "Operating Activities",
    aliases: ["operating cash flow total", "经营活动现金流净额", "CFO net"],
    useCases: ["Cash generation", "Operating performance", "Cash flow analysis"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },

  // Additional Investing Activities
  {
    field: "otherInvestingActivities",
    name: "Other Investing Activities",
    description: "Other cash flows from investing activities",
    category: "Investing Activities",
    aliases: ["other investments", "其他投资活动", "miscellaneous investing"],
    useCases: ["Investment analysis", "Capital allocation", "Investment strategy"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },

  // Additional Financing Activities - Debt
  {
    field: "longTermNetDebtIssuance",
    name: "Long-term Net Debt Issuance",
    description: "Net cash from long-term debt issuance minus repayments",
    category: "Financing Activities",
    aliases: ["long-term debt net", "长期债务净发行", "LT debt financing"],
    useCases: ["Long-term financing", "Capital structure", "Debt maturity analysis"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },

  {
    field: "shortTermNetDebtIssuance",
    name: "Short-term Net Debt Issuance",
    description: "Net cash from short-term debt issuance minus repayments",
    category: "Financing Activities",
    aliases: ["short-term debt net", "短期债务净发行", "ST debt financing"],
    useCases: ["Short-term financing", "Working capital funding", "Liquidity management"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },

  // Additional Financing Activities - Equity
  {
    field: "netStockIssuance",
    name: "Net Stock Issuance",
    description: "Net cash from all stock issuance minus repurchases",
    category: "Financing Activities",
    aliases: ["net equity issuance", "股票净发行", "net equity financing"],
    useCases: ["Equity financing", "Share activity", "Capital raising"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },

  {
    field: "netCommonStockIssuance",
    name: "Net Common Stock Issuance",
    description: "Net cash from common stock issuance minus repurchases",
    category: "Financing Activities",
    aliases: ["common stock net", "普通股净发行", "common equity net"],
    useCases: ["Common equity financing", "Dilution analysis", "Capital structure"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },

  {
    field: "netPreferredStockIssuance",
    name: "Net Preferred Stock Issuance",
    description: "Net cash from preferred stock issuance minus redemptions",
    category: "Financing Activities",
    aliases: ["preferred stock net", "优先股净发行", "preferred equity net"],
    useCases: ["Preferred equity financing", "Capital structure", "Hybrid financing"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },

  // Additional Financing Activities - Dividends
  {
    field: "netDividendsPaid",
    name: "Net Dividends Paid",
    description: "Total cash paid for all dividends",
    category: "Financing Activities",
    aliases: ["total dividends", "股息总支付", "dividend payments total"],
    useCases: ["Dividend policy", "Shareholder returns", "Cash distribution"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },

  {
    field: "preferredDividendsPaid",
    name: "Preferred Dividends Paid",
    description: "Cash paid to preferred shareholders as dividends",
    category: "Financing Activities",
    aliases: ["preferred dividend payments", "优先股股息", "preferred distributions"],
    useCases: ["Preferred dividend policy", "Fixed income returns", "Capital structure"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },

  // Additional Financing Activities - Other
  {
    field: "otherFinancingActivities",
    name: "Other Financing Activities",
    description: "Other cash flows from financing activities",
    category: "Financing Activities",
    aliases: ["other financing", "其他筹资活动", "miscellaneous financing"],
    useCases: ["Financing analysis", "Capital structure", "Other financing sources"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  },

  // Foreign Exchange Impact
  {
    field: "effectOfForexChangesOnCash",
    name: "Effect of Foreign Exchange on Cash",
    description: "Impact of foreign currency translation on cash balances",
    category: "Foreign Exchange",
    aliases: ["forex effect", "currency translation", "汇率影响", "FX impact"],
    useCases: ["Currency exposure", "International operations", "FX risk analysis"],
    dataSource: {
      endpoint: "/cash-flow-statement",
      dataType: "getCashFlow",
      statement: "Cash Flow Statement"
    },
    dataFormat: {
      unit: "USD",
      isPercentage: false,
      isRatio: false
    }
  }
]