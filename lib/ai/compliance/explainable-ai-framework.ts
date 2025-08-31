import { z } from 'zod';

// Compliance-friendly AI decision tracking and explanation framework
// Designed for small fund managers who need to document AI-assisted investment decisions

// Decision audit trail schema for regulatory compliance
const DecisionAuditSchema = z.object({
  decisionId: z.string().describe('Unique identifier for this decision'),
  timestamp: z.string().describe('ISO timestamp of decision'),
  userId: z.string().describe('User ID who initiated the analysis'),
  
  // Input transparency
  inputData: z.object({
    analysisType: z.string().describe('Type of analysis performed'),
    dataSource: z.array(z.string()).describe('APIs and data sources used'),
    inputParameters: z.record(z.any()).describe('All input parameters provided'),
    marketConditions: z.object({
      date: z.string(),
      marketIndices: z.record(z.number()).optional(),
      volatilityIndex: z.number().optional()
    }).describe('Market context at time of analysis')
  }),
  
  // AI reasoning transparency
  aiReasoning: z.object({
    modelUsed: z.string().describe('AI model identifier'),
    apiEndpointsQueried: z.array(z.string()).describe('FMP API endpoints accessed'),
    dataQualityAssessment: z.object({
      freshnessScore: z.number().min(0).max(100),
      completenessScore: z.number().min(0).max(100),
      confidenceLevel: z.enum(['high', 'medium', 'low'])
    }),
    keyFactorsAnalyzed: z.array(z.string()).describe('Main factors in decision process'),
    alternativesConsidered: z.array(z.string()).describe('Other options evaluated'),
    riskFactorsIdentified: z.array(z.string()).describe('Risks identified during analysis')
  }),
  
  // Human oversight
  humanOversight: z.object({
    reviewRequired: z.boolean().describe('Whether human review is mandatory'),
    reviewStatus: z.enum(['pending', 'approved', 'rejected', 'modified']).optional(),
    reviewerNotes: z.string().optional(),
    overrideReason: z.string().optional().describe('If human overrode AI recommendation')
  }),
  
  // Decision output
  recommendation: z.object({
    primaryAction: z.string().describe('Main recommended action'),
    confidence: z.number().min(0).max(100).describe('AI confidence in recommendation'),
    alternativeActions: z.array(z.string()).describe('Alternative recommendations'),
    timeHorizon: z.enum(['immediate', 'short_term', 'medium_term', 'long_term']),
    expectedOutcome: z.string().describe('Expected result of following recommendation')
  }),
  
  // Compliance metadata
  complianceInfo: z.object({
    regulatoryFramework: z.array(z.string()).describe('Applicable regulations (e.g., SEC, FINRA)'),
    riskDisclosures: z.array(z.string()).describe('Required risk disclosures'),
    conflictsOfInterest: z.array(z.string()).describe('Any conflicts identified'),
    suitabilityAssessment: z.string().describe('Investment suitability analysis'),
    recordRetentionPeriod: z.string().describe('How long to retain this record')
  })
});

// Explainable AI utilities for financial decision making
export class ExplainableAIFramework {
  private auditTrail: Map<string, any> = new Map();

  /**
   * Creates a compliance-friendly audit record for AI-assisted decisions
   */
  createDecisionAudit({
    analysisType,
    userId,
    inputParameters,
    modelResponse,
    apiEndpoints,
    dataQuality
  }: {
    analysisType: string;
    userId: string;
    inputParameters: Record<string, any>;
    modelResponse: any;
    apiEndpoints: string[];
    dataQuality: { freshnessScore: number; completenessScore: number; confidenceLevel: 'high' | 'medium' | 'low' };
  }) {
    const decisionId = `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const auditRecord = {
      decisionId,
      timestamp: new Date().toISOString(),
      userId,
      
      inputData: {
        analysisType,
        dataSource: ['FMP API', ...this.inferDataSources(apiEndpoints)],
        inputParameters,
        marketConditions: {
          date: new Date().toISOString().split('T')[0],
          // Market conditions would be populated from market data if available
        }
      },
      
      aiReasoning: {
        modelUsed: this.extractModelInfo(modelResponse),
        apiEndpointsQueried: apiEndpoints,
        dataQualityAssessment: dataQuality,
        keyFactorsAnalyzed: this.extractKeyFactors(modelResponse),
        alternativesConsidered: this.extractAlternatives(modelResponse),
        riskFactorsIdentified: this.extractRiskFactors(modelResponse)
      },
      
      humanOversight: {
        reviewRequired: this.determineReviewRequirement(analysisType, dataQuality.confidenceLevel),
        reviewStatus: 'pending'
      },
      
      recommendation: {
        primaryAction: this.extractPrimaryRecommendation(modelResponse),
        confidence: this.extractConfidenceScore(modelResponse),
        alternativeActions: this.extractAlternativeActions(modelResponse),
        timeHorizon: this.extractTimeHorizon(modelResponse),
        expectedOutcome: this.extractExpectedOutcome(modelResponse)
      },
      
      complianceInfo: {
        regulatoryFramework: ['SEC Rule 206(4)-7', 'FINRA Rule 3110'], // Standard compliance rules
        riskDisclosures: this.generateRiskDisclosures(analysisType),
        conflictsOfInterest: [], // Would be populated based on firm's conflict policies
        suitabilityAssessment: this.generateSuitabilityAssessment(analysisType, inputParameters),
        recordRetentionPeriod: '7 years' // Standard SEC requirement
      }
    };

    // Store audit record
    this.auditTrail.set(decisionId, auditRecord);
    
    return {
      decisionId,
      auditRecord,
      complianceSummary: this.generateComplianceSummary(auditRecord)
    };
  }

  /**
   * Generates human-readable explanation of AI decision process
   */
  generateExplanation(decisionId: string): string {
    const audit = this.auditTrail.get(decisionId);
    if (!audit) {
      throw new Error(`Decision audit not found for ID: ${decisionId}`);
    }

    return `
**投资决策解释报告**

**决策概览:**
- 分析类型: ${audit.inputData.analysisType}
- 时间: ${new Date(audit.timestamp).toLocaleString('zh-CN')}
- 主要建议: ${audit.recommendation.primaryAction}
- AI信心度: ${audit.recommendation.confidence}%

**数据来源与质量:**
- 数据源: ${audit.inputData.dataSource.join(', ')}
- 数据新鲜度: ${audit.aiReasoning.dataQualityAssessment.freshnessScore}/100
- 数据完整性: ${audit.aiReasoning.dataQualityAssessment.completenessScore}/100
- 分析可信度: ${audit.aiReasoning.dataQualityAssessment.confidenceLevel}

**关键分析因素:**
${audit.aiReasoning.keyFactorsAnalyzed.map((factor: string) => `• ${factor}`).join('\n')}

**风险考虑:**
${audit.aiReasoning.riskFactorsIdentified.map((risk: string) => `• ${risk}`).join('\n')}

**备选方案:**
${audit.aiReasoning.alternativesConsidered.map((alt: string) => `• ${alt}`).join('\n')}

**合规声明:**
- 本分析基于可获得的公开数据进行，遵循相关监管要求
- 投资决策最终需要专业投资顾问的人工审核
- 建议仅供参考，不构成具体投资建议
- 过往表现不代表未来收益，投资有风险

**记录保留:**
本决策记录将按照监管要求保留${audit.complianceInfo.recordRetentionPeriod}，以供审计查询。
`;
  }

  /**
   * Generates compliance-ready documentation
   */
  generateComplianceDocument(decisionId: string): {
    riskDisclosure: string;
    methodologyDisclosure: string;
    dataSourceDisclosure: string;
    limitationsDisclosure: string;
  } {
    const audit = this.auditTrail.get(decisionId);
    if (!audit) {
      throw new Error(`Decision audit not found for ID: ${decisionId}`);
    }

    return {
      riskDisclosure: `
**风险披露声明**

投资涉及风险，包括可能的本金损失。本AI辅助分析基于历史数据和当前市场信息，但不能保证未来表现。

主要风险包括：
${audit.complianceInfo.riskDisclosures.map((risk: string) => `• ${risk}`).join('\n')}

投资者应在做出投资决策前仔细考虑自身的财务状况、投资目标和风险承受能力。
      `,
      
      methodologyDisclosure: `
**分析方法披露**

本分析使用AI模型处理来自Financial Modeling Prep (FMP) API的公开财务数据。分析方法包括：

1. 数据收集：从多个API端点获取实时财务数据
2. AI处理：使用大型语言模型分析数据并生成洞察
3. 质量控制：评估数据新鲜度、完整性和可信度
4. 人工监督：所有重要决策需要专业人士审核

AI信心度: ${audit.recommendation.confidence}%
使用模型: ${audit.aiReasoning.modelUsed}
      `,
      
      dataSourceDisclosure: `
**数据源披露**

本分析使用以下数据源：
${audit.inputData.dataSource.map((source: string) => `• ${source}`).join('\n')}

数据质量评估：
• 新鲜度评分: ${audit.aiReasoning.dataQualityAssessment.freshnessScore}/100
• 完整性评分: ${audit.aiReasoning.dataQualityAssessment.completenessScore}/100
• 整体可信度: ${audit.aiReasoning.dataQualityAssessment.confidenceLevel}

所有数据均来自公开、合规的金融数据提供商。
      `,
      
      limitationsDisclosure: `
**分析局限性披露**

本AI辅助分析存在以下局限性：

1. **数据依赖性**: 分析质量依赖于底层数据的准确性和及时性
2. **历史偏向**: AI模型基于历史数据训练，可能无法预测突发事件
3. **市场变化**: 市场条件快速变化可能使分析结果过时
4. **算法局限**: AI模型无法完全替代人类专业判断
5. **情境特定**: 分析结果可能不适用于所有投资者的具体情况

建议投资者：
• 将AI分析作为决策参考，而非唯一依据
• 定期更新分析以反映最新市场状况
• 寻求专业投资顾问的指导
• 根据个人情况调整投资策略
      `
    };
  }

  /**
   * Validates decision against compliance requirements
   */
  validateCompliance(decisionId: string): {
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const audit = this.auditTrail.get(decisionId);
    if (!audit) {
      return {
        isCompliant: false,
        issues: ['Decision audit record not found'],
        recommendations: ['Regenerate decision with proper audit trail']
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check data quality requirements
    if (audit.aiReasoning.dataQualityAssessment.freshnessScore < 70) {
      issues.push('Data freshness below recommended threshold');
      recommendations.push('Update analysis with more recent data');
    }

    // Check confidence levels
    if (audit.recommendation.confidence < 60) {
      issues.push('AI confidence level below regulatory comfort zone');
      recommendations.push('Require mandatory human review for this decision');
    }

    // Check required disclosures
    if (audit.complianceInfo.riskDisclosures.length === 0) {
      issues.push('Missing risk disclosures');
      recommendations.push('Add appropriate risk disclosure statements');
    }

    // Check review requirements
    if (audit.humanOversight.reviewRequired && audit.humanOversight.reviewStatus === 'pending') {
      issues.push('Human review required but not completed');
      recommendations.push('Complete human review before implementing decision');
    }

    return {
      isCompliant: issues.length === 0,
      issues,
      recommendations
    };
  }

  // Private utility methods
  private inferDataSources(endpoints: string[]): string[] {
    const sources = new Set<string>();
    
    endpoints.forEach(endpoint => {
      if (endpoint.includes('institutional')) sources.add('SEC 13F Filings');
      if (endpoint.includes('earnings') || endpoint.includes('income')) sources.add('Corporate Earnings Reports');
      if (endpoint.includes('balance-sheet')) sources.add('Balance Sheet Data');
      if (endpoint.includes('ratios') || endpoint.includes('metrics')) sources.add('Financial Ratios & Metrics');
      if (endpoint.includes('etf') || endpoint.includes('mutual-fund')) sources.add('Fund Holdings Data');
      if (endpoint.includes('sectors') || endpoint.includes('market')) sources.add('Market Data');
    });

    return Array.from(sources);
  }

  private extractModelInfo(response: any): string {
    // Extract model information from AI response metadata
    return response?.metadata?.analysisModel || 'AI-Native Financial Analysis Model';
  }

  private extractKeyFactors(response: any): string[] {
    if (response?.analysis?.keyFindings) {
      return response.analysis.keyFindings.slice(0, 5); // Limit to top 5
    }
    return ['财务指标分析', '市场趋势分析', '同业对比分析'];
  }

  private extractRiskFactors(response: any): string[] {
    if (response?.analysis?.riskFactors) {
      return response.analysis.riskFactors;
    }
    if (response?.analysis?.riskAssessment?.identifiedRisks) {
      return response.analysis.riskAssessment.identifiedRisks;
    }
    return ['市场波动风险', '流动性风险', '信用风险'];
  }

  private extractAlternatives(response: any): string[] {
    if (response?.analysis?.investmentThesis?.alternativeActions) {
      return response.analysis.investmentThesis.alternativeActions;
    }
    return ['维持当前仓位', '逐步调整配置', '寻求专业咨询'];
  }

  private extractPrimaryRecommendation(response: any): string {
    if (response?.analysis?.investmentThesis?.overallRecommendation) {
      return response.analysis.investmentThesis.overallRecommendation;
    }
    return response?.analysis?.executiveSummary || '需要进一步分析';
  }

  private extractConfidenceScore(response: any): number {
    if (response?.analysis?.dataQuality?.confidence === 'high') return 85;
    if (response?.analysis?.dataQuality?.confidence === 'medium') return 70;
    if (response?.analysis?.dataQuality?.confidence === 'low') return 50;
    return 70; // Default medium confidence
  }

  private extractAlternativeActions(response: any): string[] {
    if (response?.analysis?.investmentThesis?.alternativeActions) {
      return response.analysis.investmentThesis.alternativeActions;
    }
    return ['继续观察', '调整仓位', '寻求第二意见'];
  }

  private extractTimeHorizon(response: any): 'immediate' | 'short_term' | 'medium_term' | 'long_term' {
    if (response?.analysis?.investmentThesis?.timeHorizon) {
      return response.analysis.investmentThesis.timeHorizon;
    }
    return 'medium_term';
  }

  private extractExpectedOutcome(response: any): string {
    if (response?.analysis?.performanceProjection) {
      const projection = response.analysis.performanceProjection;
      return `预期收益率: ${projection.expectedReturn?.base || 'N/A'}%, 预期波动率: ${projection.volatilityEstimate || 'N/A'}%`;
    }
    return '基于当前分析预期正向收益，但需要持续监控市场条件变化';
  }

  private determineReviewRequirement(analysisType: string, confidenceLevel: string): boolean {
    // High-risk analysis types always require review
    const highRiskTypes = ['portfolio optimization', 'major position changes', 'leveraged investments'];
    const requiresReview = highRiskTypes.some(type => analysisType.toLowerCase().includes(type));
    
    // Low confidence always requires review
    return requiresReview || confidenceLevel === 'low';
  }

  private generateRiskDisclosures(analysisType: string): string[] {
    const baseRisks = [
      '市场风险：投资价值可能因市场条件变化而波动',
      '流动性风险：某些投资可能难以及时变现',
      '信用风险：发行人财务状况变化可能影响投资价值'
    ];

    if (analysisType.includes('institutional')) {
      baseRisks.push('机构行为风险：大型机构投资者行为变化可能影响股价');
    }

    if (analysisType.includes('etf')) {
      baseRisks.push('基金风险：ETF表现受底层资产和管理策略影响');
    }

    if (analysisType.includes('peer')) {
      baseRisks.push('行业风险：行业整体表现可能影响个股价值');
    }

    return baseRisks;
  }

  private generateSuitabilityAssessment(analysisType: string, parameters: Record<string, any>): string {
    let assessment = '本分析适用于具有';
    
    if (parameters.riskTolerance === 'aggressive') {
      assessment += '较高风险承受能力的';
    } else if (parameters.riskTolerance === 'conservative') {
      assessment += '保守风险偏好的';
    } else {
      assessment += '中等风险承受能力的';
    }
    
    assessment += '投资者。';
    
    if (parameters.investmentHorizon === 'long_term') {
      assessment += '建议长期持有，适合养老金等长期资金。';
    } else if (parameters.investmentHorizon === 'short_term') {
      assessment += '适合短期交易，但需要密切关注市场变化。';
    }
    
    return assessment;
  }

  private generateComplianceSummary(audit: any): string {
    return `
**合规摘要**
- 决策ID: ${audit.decisionId}
- 数据质量: ${audit.aiReasoning.dataQualityAssessment.confidenceLevel}
- 人工审核: ${audit.humanOversight.reviewRequired ? '需要' : '不需要'}
- 风险等级: ${this.assessOverallRisk(audit)}
- 合规状态: ${this.validateCompliance(audit.decisionId).isCompliant ? '符合' : '需要修正'}
    `;
  }

  private assessOverallRisk(audit: any): 'low' | 'medium' | 'high' {
    const confidence = audit.recommendation.confidence;
    const dataQuality = audit.aiReasoning.dataQualityAssessment.confidenceLevel;
    
    if (confidence < 60 || dataQuality === 'low') return 'high';
    if (confidence < 80 || dataQuality === 'medium') return 'medium';
    return 'low';
  }
}

// Export singleton instance for application use
export const explainableAI = new ExplainableAIFramework();