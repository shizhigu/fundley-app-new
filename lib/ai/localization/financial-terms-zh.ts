// 财务术语和指标的中文本地化
// 为小型基金经理提供专业、准确的中文财务术语翻译

export interface FinancialTermTranslation {
  english: string;
  chinese: string;
  pinyin?: string;
  definition: string;
  usage: string;
  category: string;
  complexity: 'basic' | 'intermediate' | 'advanced';
  aliases?: string[];
}

export const FINANCIAL_TERMS: FinancialTermTranslation[] = [
  // === 基础财务指标 ===
  {
    english: 'Revenue',
    chinese: '营业收入',
    pinyin: 'yíng yè shōu rù',
    definition: '企业在一定期间内通过销售商品或提供服务而获得的收入总额',
    usage: '分析公司业务规模和增长趋势的核心指标',
    category: '收入类指标',
    complexity: 'basic',
    aliases: ['营收', '销售收入', '总收入']
  },
  {
    english: 'Net Income',
    chinese: '净利润',
    pinyin: 'jìng lì rùn',
    definition: '企业在扣除所有成本、费用和税收后的最终盈利',
    usage: '衡量企业盈利能力的最重要指标，影响股价表现',
    category: '盈利能力指标',
    complexity: 'basic',
    aliases: ['净收益', '税后利润', '净盈利']
  },
  {
    english: 'EBITDA',
    chinese: '息税折旧摊销前利润',
    pinyin: 'xī shuì zhé jiù tān xiāo qián lì rùn',
    definition: '未计利息、税项、折旧及摊销前的利润，反映企业核心经营业绩',
    usage: '用于比较不同资本结构公司的经营表现，常用于估值',
    category: '盈利能力指标',
    complexity: 'intermediate',
    aliases: ['EBITDA', '经营利润']
  },
  {
    english: 'Free Cash Flow',
    chinese: '自由现金流',
    pinyin: 'zì yóu xiàn jīn liú',
    definition: '企业经营活动产生的现金流减去维持或扩大资产基础所需的资本支出',
    usage: '衡量企业为股东创造现金的能力，是价值投资的关键指标',
    category: '现金流指标',
    complexity: 'intermediate',
    aliases: ['FCF', '可分配现金流']
  },

  // === 估值指标 ===
  {
    english: 'Price-to-Earnings Ratio',
    chinese: '市盈率',
    pinyin: 'shì yíng lǜ',
    definition: '股价除以每股收益，反映投资者为获得1元收益愿意支付的价格',
    usage: '最常用的估值指标，用于判断股票是否被高估或低估',
    category: '估值指标',
    complexity: 'basic',
    aliases: ['P/E', 'PE比率', '价格收益比']
  },
  {
    english: 'Price-to-Book Ratio',
    chinese: '市净率',
    pinyin: 'shì jìng lǜ',
    definition: '股价除以每股净资产，衡量股价相对于公司净资产的水平',
    usage: '特别适用于资产密集型行业的估值分析',
    category: '估值指标',
    complexity: 'basic',
    aliases: ['P/B', 'PB比率', '价格净值比']
  },
  {
    english: 'Enterprise Value',
    chinese: '企业价值',
    pinyin: 'qǐ yè jià zhí',
    definition: '公司市值加上净债务，反映收购整个公司需要的成本',
    usage: '用于计算EV/EBITDA等企业级估值倍数',
    category: '估值指标',
    complexity: 'intermediate',
    aliases: ['EV', '企业估值']
  },
  {
    english: 'Price/Earnings-to-Growth',
    chinese: 'PEG比率',
    pinyin: 'PEG bǐ lǜ',
    definition: '市盈率除以盈利增长率，综合考虑估值和成长性',
    usage: '筛选具有合理估值的成长股的重要工具',
    category: '估值指标',
    complexity: 'intermediate',
    aliases: ['PEG', '市盈增长比率']
  },

  // === 财务健康指标 ===
  {
    english: 'Current Ratio',
    chinese: '流动比率',
    pinyin: 'liú dòng bǐ lǜ',
    definition: '流动资产除以流动负债，衡量企业短期偿债能力',
    usage: '评估公司流动性风险，一般认为2.0以上较为安全',
    category: '流动性指标',
    complexity: 'basic',
    aliases: ['流动性比率']
  },
  {
    english: 'Debt-to-Equity Ratio',
    chinese: '负债权益比',
    pinyin: 'fù zhài quán yì bǐ',
    definition: '总负债除以股东权益，反映企业财务杠杆水平',
    usage: '衡量企业财务风险，比率越高财务风险越大',
    category: '杠杆指标',
    complexity: 'basic',
    aliases: ['债务股本比', 'D/E比率']
  },
  {
    english: 'Interest Coverage Ratio',
    chinese: '利息保障倍数',
    pinyin: 'lì xī bǎo zhàng bèi shù',
    definition: '息税前利润除以利息支出，衡量企业偿付利息的能力',
    usage: '评估企业债务违约风险，倍数越高越安全',
    category: '偿债能力指标',
    complexity: 'intermediate',
    aliases: ['利息覆盖率', '已获利息倍数']
  },

  // === 运营效率指标 ===
  {
    english: 'Return on Equity',
    chinese: '净资产收益率',
    pinyin: 'jìng zī chǎn shōu yì lǜ',
    definition: '净利润除以股东权益，衡量股东投资回报率',
    usage: '巴菲特最看重的指标之一，反映管理层运用股东资金的效率',
    category: '盈利能力指标',
    complexity: 'basic',
    aliases: ['ROE', '股东权益回报率']
  },
  {
    english: 'Return on Assets',
    chinese: '总资产收益率',
    pinyin: 'zǒng zī chǎn shōu yì lǜ',
    definition: '净利润除以总资产，衡量企业运用全部资产的获利能力',
    usage: '反映企业资产使用效率，不受资本结构影响',
    category: '盈利能力指标',
    complexity: 'basic',
    aliases: ['ROA', '资产回报率']
  },
  {
    english: 'Return on Invested Capital',
    chinese: '投入资本回报率',
    pinyin: 'tóu rù zī běn huí bào lǜ',
    definition: '税后营业利润除以投入资本，衡量企业创造价值的能力',
    usage: '比较不同资本结构公司的经营效率，是价值投资的核心指标',
    category: '盈利能力指标',
    complexity: 'advanced',
    aliases: ['ROIC', '资本回报率']
  },
  {
    english: 'Asset Turnover',
    chinese: '资产周转率',
    pinyin: 'zī chǎn zhōu zhuǎn lǜ',
    definition: '营业收入除以平均总资产，衡量资产使用效率',
    usage: '反映企业利用资产产生收入的能力，越高越好',
    category: '运营效率指标',
    complexity: 'intermediate',
    aliases: ['资产周转次数']
  },
  {
    english: 'Inventory Turnover',
    chinese: '存货周转率',
    pinyin: 'cún huò zhōu zhuǎn lǜ',
    definition: '销售成本除以平均存货，衡量存货管理效率',
    usage: '特别适用于零售和制造业，越高表示存货管理越好',
    category: '运营效率指标',
    complexity: 'intermediate',
    aliases: ['库存周转率']
  },

  // === 市场表现指标 ===
  {
    english: 'Market Capitalization',
    chinese: '市值',
    pinyin: 'shì zhí',
    definition: '股价乘以流通股本，反映公司在股市中的总价值',
    usage: '公司规模的重要衡量标准，影响投资策略选择',
    category: '市场指标',
    complexity: 'basic',
    aliases: ['市场价值', '总市值']
  },
  {
    english: 'Earnings Per Share',
    chinese: '每股收益',
    pinyin: 'měi gǔ shōu yì',
    definition: '净利润除以流通股数，反映每股股票的盈利水平',
    usage: '计算市盈率的基础，是投资决策的重要参考',
    category: '每股指标',
    complexity: 'basic',
    aliases: ['EPS', '每股盈利']
  },
  {
    english: 'Book Value Per Share',
    chinese: '每股净资产',
    pinyin: 'měi gǔ jìng zī chǎn',
    definition: '股东权益除以流通股数，反映每股的净资产价值',
    usage: '用于计算市净率，评估股票的资产支撑',
    category: '每股指标',
    complexity: 'basic',
    aliases: ['每股账面价值', 'BVPS']
  },
  {
    english: 'Dividend Yield',
    chinese: '股息收益率',
    pinyin: 'gǔ xī shōu yì lǜ',
    definition: '年度股息除以当前股价，衡量股息投资回报',
    usage: '收入型投资者关注的核心指标，反映现金分红水平',
    category: '股息指标',
    complexity: 'basic',
    aliases: ['分红收益率', '股息率']
  },

  // === 高级财务指标 ===
  {
    english: 'Economic Value Added',
    chinese: '经济增加值',
    pinyin: 'jīng jì zēng jiā zhí',
    definition: '税后营业利润减去资本成本，衡量真正的经济利润',
    usage: '评估管理层是否为股东创造了真正的价值',
    category: '价值创造指标',
    complexity: 'advanced',
    aliases: ['EVA', '经济利润']
  },
  {
    english: 'Weighted Average Cost of Capital',
    chinese: '加权平均资本成本',
    pinyin: 'jiā quán píng jūn zī běn chéng běn',
    definition: '企业债务和权益成本的加权平均，代表企业的融资成本',
    usage: '用作折现率进行企业估值，是投资决策的重要基准',
    category: '资本成本指标',
    complexity: 'advanced',
    aliases: ['WACC', '资本成本']
  },
  {
    english: 'Beta Coefficient',
    chinese: '贝塔系数',
    pinyin: 'bèi tǎ xì shù',
    definition: '股票收益率相对于市场收益率的敏感度，衡量系统性风险',
    usage: '评估股票风险水平，计算期望收益率的重要参数',
    category: '风险指标',
    complexity: 'advanced',
    aliases: ['β系数', '贝塔值']
  },

  // === 技术分析指标 ===
  {
    english: 'Moving Average',
    chinese: '移动平均线',
    pinyin: 'yí dòng píng jūn xiàn',
    definition: '一定期间内股价的平均值连成的线，反映价格趋势',
    usage: '技术分析的基础工具，用于判断买卖时机',
    category: '技术指标',
    complexity: 'basic',
    aliases: ['均线', 'MA']
  },
  {
    english: 'Relative Strength Index',
    chinese: '相对强弱指标',
    pinyin: 'xiāng duì qiáng ruò zhǐ biāo',
    definition: '基于价格变化的动量震荡指标，范围0-100',
    usage: '判断超买超卖状态，RSI>70超买，RSI<30超卖',
    category: '技术指标',
    complexity: 'intermediate',
    aliases: ['RSI', '强弱指数']
  },
  {
    english: 'Volume',
    chinese: '成交量',
    pinyin: 'chéng jiāo liàng',
    definition: '某一时期内股票交易的股数总和',
    usage: '验证价格趋势的可靠性，量价配合是关键',
    category: '技术指标',
    complexity: 'basic',
    aliases: ['交易量', '成交股数']
  },

  // === 宏观经济指标 ===
  {
    english: 'Gross Domestic Product',
    chinese: '国内生产总值',
    pinyin: 'guó nèi shēng chǎn zǒng zhí',
    definition: '一国在一定期间内生产的所有商品和服务的总价值',
    usage: '衡量国家经济规模和增长的最重要指标',
    category: '宏观经济指标',
    complexity: 'basic',
    aliases: ['GDP', '国民生产总值']
  },
  {
    english: 'Consumer Price Index',
    chinese: '消费者价格指数',
    pinyin: 'xiāo fèi zhě jià gé zhǐ shù',
    definition: '反映居民购买商品和服务价格变动的指标',
    usage: '衡量通胀水平，影响货币政策和投资策略',
    category: '宏观经济指标',
    complexity: 'basic',
    aliases: ['CPI', '通胀指数']
  },
  {
    english: 'Federal Funds Rate',
    chinese: '联邦基金利率',
    pinyin: 'lián bāng jī jīn lì lǜ',
    definition: '美联储设定的银行间隔夜拆借利率',
    usage: '影响全球资本流动和汇率变化的关键利率',
    category: '宏观经济指标',
    complexity: 'intermediate',
    aliases: ['联邦利率', '基准利率']
  }
];

// 按类别组织的术语映射
export const TERMS_BY_CATEGORY = {
  '收入类指标': FINANCIAL_TERMS.filter(term => term.category === '收入类指标'),
  '盈利能力指标': FINANCIAL_TERMS.filter(term => term.category === '盈利能力指标'),
  '估值指标': FINANCIAL_TERMS.filter(term => term.category === '估值指标'),
  '流动性指标': FINANCIAL_TERMS.filter(term => term.category === '流动性指标'),
  '杠杆指标': FINANCIAL_TERMS.filter(term => term.category === '杠杆指标'),
  '偿债能力指标': FINANCIAL_TERMS.filter(term => term.category === '偿债能力指标'),
  '运营效率指标': FINANCIAL_TERMS.filter(term => term.category === '运营效率指标'),
  '市场指标': FINANCIAL_TERMS.filter(term => term.category === '市场指标'),
  '每股指标': FINANCIAL_TERMS.filter(term => term.category === '每股指标'),
  '股息指标': FINANCIAL_TERMS.filter(term => term.category === '股息指标'),
  '价值创造指标': FINANCIAL_TERMS.filter(term => term.category === '价值创造指标'),
  '资本成本指标': FINANCIAL_TERMS.filter(term => term.category === '资本成本指标'),
  '风险指标': FINANCIAL_TERMS.filter(term => term.category === '风险指标'),
  '技术指标': FINANCIAL_TERMS.filter(term => term.category === '技术指标'),
  '宏观经济指标': FINANCIAL_TERMS.filter(term => term.category === '宏观经济指标')
};

// 创建英中文映射
export const EN_TO_ZH_MAP = new Map<string, string>();
export const ZH_TO_EN_MAP = new Map<string, string>();

FINANCIAL_TERMS.forEach(term => {
  EN_TO_ZH_MAP.set(term.english.toLowerCase(), term.chinese);
  ZH_TO_EN_MAP.set(term.chinese, term.english);
  
  // 添加别名映射
  if (term.aliases) {
    term.aliases.forEach(alias => {
      ZH_TO_EN_MAP.set(alias, term.english);
    });
  }
});

// 工具函数
export class FinancialTermsLocalizer {
  /**
   * 将英文术语翻译为中文
   */
  static translateToZh(englishTerm: string): string {
    const normalized = englishTerm.toLowerCase().trim();
    return EN_TO_ZH_MAP.get(normalized) || englishTerm;
  }

  /**
   * 将中文术语翻译为英文
   */
  static translateToEn(chineseTerm: string): string {
    const normalized = chineseTerm.trim();
    return ZH_TO_EN_MAP.get(normalized) || chineseTerm;
  }

  /**
   * 获取术语的详细信息
   */
  static getTermInfo(term: string): FinancialTermTranslation | null {
    const normalized = term.toLowerCase().trim();
    return FINANCIAL_TERMS.find(t => 
      t.english.toLowerCase() === normalized || 
      t.chinese === term ||
      t.aliases?.includes(term)
    ) || null;
  }

  /**
   * 搜索相关术语
   */
  static searchTerms(query: string): FinancialTermTranslation[] {
    const normalizedQuery = query.toLowerCase().trim();
    return FINANCIAL_TERMS.filter(term => 
      term.english.toLowerCase().includes(normalizedQuery) ||
      term.chinese.includes(query) ||
      term.definition.includes(query) ||
      term.aliases?.some(alias => alias.includes(query))
    );
  }

  /**
   * 按复杂程度获取术语
   */
  static getTermsByComplexity(complexity: 'basic' | 'intermediate' | 'advanced'): FinancialTermTranslation[] {
    return FINANCIAL_TERMS.filter(term => term.complexity === complexity);
  }

  /**
   * 按类别获取术语
   */
  static getTermsByCategory(category: string): FinancialTermTranslation[] {
    return FINANCIAL_TERMS.filter(term => term.category === category);
  }

  /**
   * 获取所有类别
   */
  static getAllCategories(): string[] {
    return Array.from(new Set(FINANCIAL_TERMS.map(term => term.category)));
  }

  /**
   * 本地化数值格式
   */
  static formatNumber(value: number, type: 'currency' | 'percentage' | 'ratio' | 'plain' = 'plain'): string {
    const formatter = new Intl.NumberFormat('zh-CN');
    
    switch (type) {
      case 'currency':
        if (value >= 1e9) {
          return `${formatter.format(value / 1e9)}十亿`;
        } else if (value >= 1e8) {
          return `${formatter.format(value / 1e8)}亿`;
        } else if (value >= 1e4) {
          return `${formatter.format(value / 1e4)}万`;
        }
        return `${formatter.format(value)}元`;
      
      case 'percentage':
        return `${(value * 100).toFixed(2)}%`;
      
      case 'ratio':
        return value.toFixed(2);
      
      default:
        return formatter.format(value);
    }
  }

  /**
   * 提供上下文化的术语解释
   */
  static explainTermInContext(term: string, context: 'investment' | 'analysis' | 'risk' | 'valuation'): string {
    const termInfo = this.getTermInfo(term);
    if (!termInfo) return `术语"${term}"未找到详细信息。`;

    let contextualUsage = termInfo.usage;
    
    switch (context) {
      case 'investment':
        contextualUsage = `投资角度：${termInfo.usage} 在投资决策中，这个指标可以帮助评估投资机会的质量。`;
        break;
      case 'analysis':
        contextualUsage = `分析角度：${termInfo.usage} 分析师通常将此指标与同业进行比较来评估公司表现。`;
        break;
      case 'risk':
        contextualUsage = `风险角度：${termInfo.usage} 从风险管理的角度，需要关注这个指标的变化趋势。`;
        break;
      case 'valuation':
        contextualUsage = `估值角度：${termInfo.usage} 在企业估值中，这个指标是重要的价值驱动因素。`;
        break;
    }

    return `**${termInfo.chinese}** (${termInfo.english})\n\n${termInfo.definition}\n\n${contextualUsage}`;
  }
}

// 导出便捷函数
export const translateToZh = FinancialTermsLocalizer.translateToZh;
export const translateToEn = FinancialTermsLocalizer.translateToEn;
export const getTermInfo = FinancialTermsLocalizer.getTermInfo;
export const searchTerms = FinancialTermsLocalizer.searchTerms;
export const formatChineseNumber = FinancialTermsLocalizer.formatNumber;