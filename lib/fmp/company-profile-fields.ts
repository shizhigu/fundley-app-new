/**
 * Company Profile Fields Definition
 * 公司基本信息表字段定义 - 完整字段列表
 */

import { FieldMetadata } from './field-metadata';

export const companyProfileFields: FieldMetadata[] = [
  {
    field: 'symbol',
    name: 'Stock Symbol',
    description: 'Stock ticker symbol (e.g., AAPL, MSFT, GOOGL)',
    category: 'identifier',
    aliases: ['ticker', 'code', '股票代码'],
    useCases: ['Stock identification', 'Symbol filtering'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'price',
    name: 'Current Price',
    description: 'Current stock price in USD (e.g., 234.35)',
    category: 'market',
    aliases: ['stock price', 'current price', '当前价格'],
    useCases: ['Price analysis', 'Valuation'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'USD',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'marketcap',
    name: 'Market Capitalization',
    description: 'Total market value in USD (e.g., 3.48T for Apple)',
    category: 'market',
    aliases: ['market cap', 'market capitalization', '市值'],
    useCases: ['Company size analysis', 'Market cap filtering'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'USD',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'beta',
    name: 'Beta',
    description: 'Stock volatility vs market (e.g., 1.109, >1=more volatile)',
    category: 'risk',
    aliases: ['beta coefficient', 'systematic risk', 'β系数'],
    useCases: ['Risk analysis', 'Portfolio management'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'ratio',
      isPercentage: false,
      isRatio: true
    }
  },
  {
    field: 'lastdividend',
    name: 'Last Dividend',
    description: 'Most recent dividend per share in USD (e.g., 1.02)',
    category: 'dividend',
    aliases: ['dividend', 'dividend payment', '分红'],
    useCases: ['Dividend analysis', 'Income investing'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'USD',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'range',
    name: 'Price Range',
    description: '52-week price range (e.g., "169.21-260.1")',
    category: 'market',
    aliases: ['52 week range', 'price range', '价格区间'],
    useCases: ['Price analysis', 'Support/resistance'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'change',
    name: 'Price Change',
    description: 'Daily price change in USD (e.g., -3.53)',
    category: 'market',
    aliases: ['price change', 'daily change', '价格变动'],
    useCases: ['Daily performance', 'Price movement'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'USD',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'changepercentage',
    name: 'Change Percentage',
    description: 'Daily change percentage (e.g., -1.48394)',
    category: 'market',
    aliases: ['percent change', 'daily percentage', '涨跌幅'],
    useCases: ['Performance analysis', 'Relative movement'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'percentage',
      isPercentage: true,
      isRatio: false
    }
  },
  {
    field: 'volume',
    name: 'Trading Volume',
    description: 'Daily shares traded (e.g., 65M shares)',
    category: 'trading',
    aliases: ['trade volume', 'shares traded', '成交量'],
    useCases: ['Liquidity analysis', 'Trading activity'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'shares',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'averagevolume',
    name: 'Average Volume',
    description: 'Average daily volume (e.g., 54M shares)',
    category: 'trading',
    aliases: ['avg volume', 'average trading volume', '平均成交量'],
    useCases: ['Liquidity analysis', 'Trading patterns'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'shares',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'companyname',
    name: 'Company Name',
    description: 'Company full name (e.g., Apple Inc.)',
    category: 'identifier',
    aliases: ['name', 'full name', '公司名称'],
    useCases: ['Company identification', 'Display names'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'currency',
    name: 'Currency',
    description: 'Trading currency (e.g., USD, EUR, JPY)',
    category: 'market',
    aliases: ['trading currency', 'base currency', '货币'],
    useCases: ['Currency analysis', 'International comparison'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'cik',
    name: 'CIK Number',
    description: 'SEC Central Index Key (e.g., 0000320193)',
    category: 'identifier',
    aliases: ['central index key', 'SEC ID', 'CIK'],
    useCases: ['SEC filing identification', 'Regulatory lookup'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'isin',
    name: 'ISIN',
    description: 'International Securities ID (e.g., US0378331005)',
    category: 'identifier',
    aliases: ['international securities id', 'ISIN code'],
    useCases: ['International identification', 'Global trading'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'cusip',
    name: 'CUSIP',
    description: 'CUSIP identifier (e.g., 037833100)',
    category: 'identifier',
    aliases: ['cusip code', 'committee identifier'],
    useCases: ['US security identification', 'Bond/stock lookup'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'exchangefullname',
    name: 'Exchange Full Name',
    description: 'Full exchange name (e.g., NASDAQ Global Select)',
    category: 'market',
    aliases: ['full exchange name', 'exchange description'],
    useCases: ['Exchange analysis', 'Market segmentation'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'exchange',
    name: 'Stock Exchange',
    description: 'Stock exchange (e.g., NASDAQ, NYSE)',
    category: 'market',
    aliases: ['exchange', 'stock exchange', '交易所'],
    useCases: ['Market segmentation', 'Exchange filtering'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'industry',
    name: 'Industry',
    description: 'Specific industry (e.g., Consumer Electronics)',
    category: 'classification',
    aliases: ['industry sector', 'business industry', '行业'],
    useCases: ['Industry analysis', 'Sector comparison'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'website',
    name: 'Website',
    description: 'Company website URL (e.g., https://www.apple.com)',
    category: 'contact',
    aliases: ['company website', 'web url', '网站'],
    useCases: ['Company information', 'Contact details'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'description',
    name: 'Company Description',
    description: 'Business description (long text)',
    category: 'information',
    aliases: ['business description', 'company info', '公司介绍'],
    useCases: ['Company research', 'Business model understanding'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'ceo',
    name: 'CEO',
    description: 'Chief Executive Officer name (e.g., Timothy D. Cook)',
    category: 'management',
    aliases: ['chief executive', 'CEO name', '首席执行官'],
    useCases: ['Management analysis', 'Leadership research'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'sector',
    name: 'Sector',
    description: 'Broad sector (e.g., Technology, Healthcare)',
    category: 'classification',
    aliases: ['economic sector', 'market sector', '板块'],
    useCases: ['Sector analysis', 'Portfolio allocation'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'country',
    name: 'Country',
    description: 'HQ country code (e.g., US, CN, GB)',
    category: 'geographic',
    aliases: ['headquarters country', 'domicile', '国家'],
    useCases: ['Geographic analysis', 'Regional filtering'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'fulltimeemployees',
    name: 'Employee Count',
    description: 'Employee count (e.g., 164000 for Apple)',
    category: 'operational',
    aliases: ['employees', 'workforce', 'headcount', '员工数'],
    useCases: ['Company size analysis', 'Operational scale'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'count',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'phone',
    name: 'Phone Number',
    description: 'Company phone (e.g., (408) 996-1010)',
    category: 'contact',
    aliases: ['telephone', 'contact number', '电话'],
    useCases: ['Contact information', 'Company details'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'address',
    name: 'Address',
    description: 'Street address (e.g., One Apple Park Way)',
    category: 'contact',
    aliases: ['street address', 'location', '地址'],
    useCases: ['Location analysis', 'Geographic distribution'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'city',
    name: 'City',
    description: 'Headquarters city (e.g., Cupertino)',
    category: 'geographic',
    aliases: ['headquarters city', 'HQ city', '城市'],
    useCases: ['Geographic clustering', 'Regional analysis'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'state',
    name: 'State',
    description: 'State/province (e.g., CA, NY, TX)',
    category: 'geographic',
    aliases: ['state province', 'region', '州/省'],
    useCases: ['State-level analysis', 'Regional comparison'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'zip',
    name: 'ZIP Code',
    description: 'Postal code (e.g., 95014)',
    category: 'geographic',
    aliases: ['postal code', 'zip code', '邮编'],
    useCases: ['Location precision', 'Geographic mapping'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'image',
    name: 'Company Logo',
    description: 'Logo image URL (e.g., https://images.financialmodelingprep.com/symbol/AAPL.png)',
    category: 'media',
    aliases: ['logo', 'company image', '公司标志'],
    useCases: ['Visual display', 'UI components'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'text',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'ipodate',
    name: 'IPO Date',
    description: 'IPO date (e.g., 1980-12-12 for Apple)',
    category: 'historical',
    aliases: ['public listing date', 'IPO', 'listing date', '上市日期'],
    useCases: ['Company maturity analysis', 'Historical context'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'date',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'defaultimage',
    name: 'Default Image',
    description: 'Uses default logo (true/false)',
    category: 'media',
    aliases: ['default logo', 'generic image'],
    useCases: ['Image availability', 'UI fallback'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'boolean',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'isetf',
    name: 'Is ETF',
    description: 'ETF flag (true/false)',
    category: 'classification',
    aliases: ['ETF flag', 'exchange traded fund', 'ETF标识'],
    useCases: ['Security type filtering', 'ETF identification'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'boolean',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'isactivelytrading',
    name: 'Is Actively Trading',
    description: 'Active trading status (true/false)',
    category: 'trading',
    aliases: ['active trading', 'trading status', '交易状态'],
    useCases: ['Trading eligibility', 'Active stock filtering'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'boolean',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'isadr',
    name: 'Is ADR',
    description: 'American Depositary Receipt flag (true/false)',
    category: 'classification',
    aliases: ['ADR flag', 'american depositary receipt'],
    useCases: ['Security type identification', 'International stocks'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'boolean',
      isPercentage: false,
      isRatio: false
    }
  },
  {
    field: 'isfund',
    name: 'Is Fund',
    description: 'Fund classification flag (true/false)',
    category: 'classification',
    aliases: ['fund flag', 'investment fund'],
    useCases: ['Security type filtering', 'Fund identification'],
    dataSource: {
      endpoint: '/company-profile',
      dataType: 'getCompanyProfile',
      statement: 'Company Profile'
    },
    dataFormat: {
      unit: 'boolean',
      isPercentage: false,
      isRatio: false
    }
  }
];