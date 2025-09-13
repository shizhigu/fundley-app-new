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
    field: "cashAndShortTermInvestments",
    name: "Cash and Short Term Investments",
    description: "Combined cash and short-term marketable securities",
    category: "Current Assets",
    aliases: ["cash and securities", "liquid funds", "现金及短期投资"],
    useCases: ["Liquidity analysis", "Available funds", "Cash position"],
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
    field: "netReceivables",
    name: "Net Receivables",
    description: "Accounts receivable net of allowance for doubtful accounts",
    category: "Current Assets",
    aliases: ["net accounts receivable", "receivables net", "应收账款净额"],
    useCases: ["Credit quality", "Collection analysis", "Working capital"],
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
    field: "accountsreceivables_balance", 
    name: "Accounts Receivable Balance",
    description: "Money owed to the company by customers for goods or services delivered (Balance Sheet)",
    category: "Current Assets",
    aliases: ["receivables", "trade receivables", "customer receivables", "应收账款", "accountsReceivables"],
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
    field: "otherReceivables",
    name: "Other Receivables",
    description: "Non-trade receivables including loans to employees, tax refunds, etc.",
    category: "Current Assets",
    aliases: ["miscellaneous receivables", "other AR", "其他应收款"],
    useCases: ["Asset quality", "Receivables analysis", "Working capital"],
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
    field: "inventory_balance",
    name: "Inventory Balance", 
    description: "Value of goods held for sale or raw materials for production (Balance Sheet)",
    category: "Current Assets",
    aliases: ["stock", "goods inventory", "raw materials", "存货", "inventory"],
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
    field: "prepaids",
    name: "Prepaid Expenses",
    description: "Expenses paid in advance that will be consumed in future periods",
    category: "Current Assets",
    aliases: ["prepaid assets", "deferred charges", "预付费用"],
    useCases: ["Working capital analysis", "Expense management", "Asset utilization"],
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
    field: "otherCurrentAssets",
    name: "Other Current Assets",
    description: "Other assets expected to be converted to cash within one year",
    category: "Current Assets",
    aliases: ["miscellaneous current assets", "other CA", "其他流动资产"],
    useCases: ["Asset analysis", "Current asset composition", "Liquidity assessment"],
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
    field: "goodwillAndIntangibleAssets",
    name: "Goodwill and Intangible Assets",
    description: "Combined goodwill and other intangible assets",
    category: "Non-Current Assets",
    aliases: ["total intangibles", "goodwill plus intangibles", "商誉及无形资产"],
    useCases: ["Acquisition analysis", "Intangible value", "Asset composition"],
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
    field: "taxAssets",
    name: "Tax Assets",
    description: "Deferred tax assets and other tax-related assets",
    category: "Non-Current Assets",
    aliases: ["deferred tax assets", "tax receivables", "税务资产"],
    useCases: ["Tax analysis", "Future tax benefits", "Asset quality"],
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
    field: "otherNonCurrentAssets",
    name: "Other Non-Current Assets",
    description: "Other long-term assets not classified elsewhere",
    category: "Non-Current Assets",
    aliases: ["other long-term assets", "miscellaneous NCA", "其他非流动资产"],
    useCases: ["Asset composition", "Long-term asset analysis", "Asset quality"],
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
    field: "totalNonCurrentAssets",
    name: "Total Non-Current Assets",
    description: "Sum of all assets held for more than one year",
    category: "Non-Current Assets",
    aliases: ["total long-term assets", "non-current assets total", "非流动资产总计"],
    useCases: ["Asset structure", "Long-term asset analysis", "Capital intensity"],
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
    field: "otherAssets",
    name: "Other Assets",
    description: "Assets not classified in standard categories",
    category: "Total Assets",
    aliases: ["miscellaneous assets", "other total assets", "其他资产"],
    useCases: ["Asset composition", "Comprehensive asset analysis", "Asset quality"],
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
    field: "totalPayables",
    name: "Total Payables",
    description: "All amounts owed to creditors and suppliers",
    category: "Current Liabilities",
    aliases: ["total accounts payable", "all payables", "应付款项总计"],
    useCases: ["Working capital analysis", "Supplier management", "Cash flow timing"],
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
    field: "otherPayables",
    name: "Other Payables",
    description: "Non-trade payables and other short-term obligations",
    category: "Current Liabilities",
    aliases: ["miscellaneous payables", "other AP", "其他应付款"],
    useCases: ["Working capital analysis", "Liability composition", "Cash management"],
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
    field: "accruedExpenses",
    name: "Accrued Expenses",
    description: "Expenses incurred but not yet paid",
    category: "Current Liabilities",
    aliases: ["accrued liabilities", "accruals", "应计费用"],
    useCases: ["Working capital analysis", "Expense management", "Cash flow timing"],
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
    field: "capitalLeaseObligationsCurrent",
    name: "Capital Lease Obligations (Current)",
    description: "Current portion of capital lease obligations",
    category: "Current Liabilities",
    aliases: ["current lease obligations", "short-term lease debt", "流动资本租赁"],
    useCases: ["Lease analysis", "Debt obligations", "Cash flow commitments"],
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
    field: "taxPayables",
    name: "Tax Payables",
    description: "Taxes owed to government authorities",
    category: "Current Liabilities",
    aliases: ["tax liabilities", "taxes owed", "应交税费"],
    useCases: ["Tax obligation", "Cash flow planning", "Tax management"],
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
    field: "deferredRevenue",
    name: "Deferred Revenue",
    description: "Cash received for goods or services not yet delivered",
    category: "Current Liabilities",
    aliases: ["unearned revenue", "advance payments", "递延收入"],
    useCases: ["Revenue quality", "Customer prepayments", "Business model analysis"],
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
    field: "otherCurrentLiabilities",
    name: "Other Current Liabilities",
    description: "Other short-term obligations not classified elsewhere",
    category: "Current Liabilities",
    aliases: ["miscellaneous current liabilities", "other CL", "其他流动负债"],
    useCases: ["Liability composition", "Working capital analysis", "Risk assessment"],
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
    field: "capitalLeaseObligationsNonCurrent",
    name: "Capital Lease Obligations (Non-Current)",
    description: "Long-term portion of capital lease obligations",
    category: "Long-term Liabilities",
    aliases: ["long-term lease obligations", "non-current lease debt", "长期资本租赁"],
    useCases: ["Lease analysis", "Long-term commitments", "Debt structure"],
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
    field: "deferredRevenueNonCurrent",
    name: "Deferred Revenue (Non-Current)",
    description: "Long-term deferred revenue obligations",
    category: "Long-term Liabilities",
    aliases: ["long-term unearned revenue", "non-current deferred revenue", "长期递延收入"],
    useCases: ["Long-term contracts", "Subscription models", "Revenue analysis"],
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
    field: "deferredTaxLiabilitiesNonCurrent",
    name: "Deferred Tax Liabilities (Non-Current)",
    description: "Long-term deferred tax obligations",
    category: "Long-term Liabilities",
    aliases: ["long-term tax liabilities", "deferred taxes", "长期递延税负债"],
    useCases: ["Tax analysis", "Future tax obligations", "Tax planning"],
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
    field: "otherNonCurrentLiabilities",
    name: "Other Non-Current Liabilities",
    description: "Other long-term obligations not classified elsewhere",
    category: "Long-term Liabilities",
    aliases: ["other long-term liabilities", "miscellaneous NCL", "其他非流动负债"],
    useCases: ["Liability composition", "Long-term obligations", "Risk assessment"],
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
    field: "totalNonCurrentLiabilities",
    name: "Total Non-Current Liabilities",
    description: "Sum of all long-term liabilities",
    category: "Long-term Liabilities",
    aliases: ["total long-term liabilities", "non-current liabilities total", "非流动负债总计"],
    useCases: ["Long-term solvency", "Debt structure", "Financial risk"],
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
    field: "otherLiabilities",
    name: "Other Liabilities",
    description: "Liabilities not classified in standard categories",
    category: "Total Liabilities",
    aliases: ["miscellaneous liabilities", "other total liabilities", "其他负债"],
    useCases: ["Liability composition", "Comprehensive liability analysis", "Risk assessment"],
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
    field: "capitalLeaseObligations",
    name: "Total Capital Lease Obligations",
    description: "Total capital lease obligations (current and non-current)",
    category: "Total Debt",
    aliases: ["total lease obligations", "lease debt total", "资本租赁总计"],
    useCases: ["Lease analysis", "Total debt calculation", "Off-balance sheet analysis"],
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
    field: "preferredStock",
    name: "Preferred Stock",
    description: "Par value of preferred shares outstanding",
    category: "Shareholders' Equity",
    aliases: ["preferred shares", "preference shares", "优先股"],
    useCases: ["Capital structure", "Dividend analysis", "Equity composition"],
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
    field: "additionalPaidInCapital",
    name: "Additional Paid-in Capital",
    description: "Amount paid by investors above par value for shares",
    category: "Shareholders' Equity",
    aliases: ["paid-in capital", "share premium", "资本公积"],
    useCases: ["Equity financing", "Share issuance analysis", "Capital structure"],
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
    field: "accumulatedOtherComprehensiveIncomeLoss",
    name: "Accumulated Other Comprehensive Income/Loss",
    description: "Cumulative other comprehensive income items",
    category: "Shareholders' Equity",
    aliases: ["AOCI", "other comprehensive income", "其他综合收益"],
    useCases: ["Comprehensive income analysis", "Foreign currency impact", "Investment gains/losses"],
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
    field: "otherTotalStockholdersEquity",
    name: "Other Total Stockholders' Equity",
    description: "Other components of stockholders' equity",
    category: "Shareholders' Equity",
    aliases: ["other equity", "miscellaneous equity", "其他股东权益"],
    useCases: ["Equity composition", "Comprehensive equity analysis", "Special equity items"],
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

  {
    field: "totalEquity",
    name: "Total Equity",
    description: "Total equity including all equity components",
    category: "Shareholders' Equity",
    aliases: ["total shareholders equity", "comprehensive equity", "权益总计"],
    useCases: ["Comprehensive equity analysis", "Total financing", "Capital structure"],
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
    field: "minorityInterest",
    name: "Minority Interest",
    description: "Non-controlling interest in subsidiaries",
    category: "Shareholders' Equity",
    aliases: ["non-controlling interest", "minority shareholders", "少数股东权益"],
    useCases: ["Consolidated analysis", "Subsidiary ownership", "Non-controlling interests"],
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
    field: "totalLiabilitiesAndTotalEquity",
    name: "Total Liabilities and Total Equity",
    description: "Sum of total liabilities and total equity (should equal total assets)",
    category: "Balance Sheet Total",
    aliases: ["total liabilities and equity", "balance sheet total", "负债及权益总计"],
    useCases: ["Balance sheet verification", "Accounting equation", "Financial integrity"],
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

  // Additional Investment and Debt Metrics
  {
    field: "totalInvestments",
    name: "Total Investments",
    description: "Sum of short-term and long-term investments",
    category: "Financial Position",
    aliases: ["total securities", "investment portfolio", "投资总计"],
    useCases: ["Investment analysis", "Portfolio management", "Asset allocation"],
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