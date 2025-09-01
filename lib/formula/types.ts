/**
 * Formula Builder Type Definitions
 * Core data structures for the financial formula builder system
 */

// Financial field definition
export interface FinancialField {
  id: string;
  name: string;
  category: 'income' | 'balance' | 'cashflow' | 'ratios' | 'metrics';
  aliases: string[];
  description: string;
  unit: 'USD' | 'percentage' | 'ratio' | 'number';
  dataSource: {
    endpoint: string;
    field: string;
  };
}

// Formula Abstract Syntax Tree
export interface FormulaAST {
  id: string;
  type: 'operation' | 'field' | 'constant' | 'function';
  value: string | number;
  children?: FormulaAST[];
  position?: { x: number; y: number };
}

// Token types for lexical analysis
export interface Token {
  type: 'FIELD' | 'NUMBER' | 'OPERATOR' | 'LPAREN' | 'RPAREN' | 'FUNCTION' | 'COMMA' | 'WHITESPACE' | 'EOF';
  value: string;
  position: number;
}

// Custom financial metric definition
export interface CustomMetric {
  id: string;
  name: string;
  description: string;
  category: string;
  formula: FormulaAST;
  prompt: string; // Generated LLM instruction
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
}

// Calculation step for LLM prompt generation
export interface CalculationStep {
  stepNumber: number;
  description: string;
  operation: string;
  inputs: string[];
  output: string;
  expression: string;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Compiled formula result
export interface CompiledFormula {
  expression: string;
  steps: CalculationStep[];
  fields: string[];
  prompt: string;
}

// Parser error
export class FormulaParserError extends Error {
  constructor(
    message: string,
    public position: number,
    public token?: Token
  ) {
    super(message);
    this.name = 'FormulaParserError';
  }
}