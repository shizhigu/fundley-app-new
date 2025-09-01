/**
 * Financial Formula AST Parser
 * 
 * This parser converts mathematical expressions with financial fields into
 * Abstract Syntax Trees that can be compiled into LLM instructions.
 * 
 * Grammar:
 * expression  := addition
 * addition    := multiplication (('+' | '-') multiplication)*
 * multiplication := unary (('*' | '/') unary)*
 * unary       := ('-' | '+') unary | primary
 * primary     := '(' expression ')' | field | number | function
 * function    := IDENTIFIER '(' (expression (',' expression)*)? ')'
 * field       := IDENTIFIER
 * number      := [0-9]+('.'[0-9]+)?
 */

import { FormulaAST, Token, FormulaParserError, ValidationResult } from './types';

export class FinancialFormulaParser {
  private tokens: Token[] = [];
  private current = 0;

  /**
   * Parse a mathematical expression into an AST
   */
  parse(expression: string): FormulaAST {
    this.tokens = this.tokenize(expression);
    this.current = 0;
    
    if (this.tokens.length === 0) {
      throw new FormulaParserError('Empty expression', 0);
    }

    const ast = this.parseExpression();
    
    if (!this.isAtEnd()) {
      const token = this.peek();
      throw new FormulaParserError(
        `Unexpected token: ${token.value}`,
        token.position,
        token
      );
    }

    return ast;
  }

  /**
   * Validate formula syntax and field references
   */
  validate(ast: FormulaAST, availableFields: Set<string>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validateNode = (node: FormulaAST): void => {
      switch (node.type) {
        case 'field':
          if (!availableFields.has(node.value as string)) {
            errors.push(`Unknown field: ${node.value}`);
          }
          break;
        
        case 'operation':
          if (node.value === '/' && node.children?.[1]) {
            // Check for potential division by zero
            const denominator = node.children[1];
            if (denominator.type === 'constant' && denominator.value === 0) {
              errors.push('Division by zero detected');
            }
          }
          break;
        
        case 'function':
          const funcName = node.value as string;
          const supportedFunctions = [
            'ABS', 'MAX', 'MIN', 'AVERAGE', 'SUM', 
            'ROUND', 'CEIL', 'FLOOR',
            'SQRT', 'POW', 'LOG',
            'IF', 'ISNULL', 'COALESCE',
            'PERCENT', 'GROWTH', 'RATIO'
          ];
          if (!supportedFunctions.includes(funcName.toUpperCase())) {
            errors.push(`Unsupported function: ${funcName}`);
          }
          
          // Validate function argument count
          const argCount = node.children?.length || 0;
          const funcRequirements: Record<string, { min: number; max: number }> = {
            'ABS': { min: 1, max: 1 },
            'MAX': { min: 2, max: -1 }, // -1 means unlimited
            'MIN': { min: 2, max: -1 },
            'AVERAGE': { min: 2, max: -1 },
            'SUM': { min: 2, max: -1 },
            'ROUND': { min: 1, max: 2 },
            'CEIL': { min: 1, max: 1 },
            'FLOOR': { min: 1, max: 1 },
            'SQRT': { min: 1, max: 1 },
            'POW': { min: 2, max: 2 },
            'LOG': { min: 1, max: 2 },
            'IF': { min: 3, max: 3 },
            'ISNULL': { min: 1, max: 1 },
            'COALESCE': { min: 2, max: -1 },
            'PERCENT': { min: 2, max: 2 },
            'GROWTH': { min: 2, max: 2 },
            'RATIO': { min: 2, max: 2 }
          };
          
          const req = funcRequirements[funcName.toUpperCase()];
          if (req) {
            if (argCount < req.min) {
              errors.push(`Function ${funcName} requires at least ${req.min} arguments, got ${argCount}`);
            }
            if (req.max > 0 && argCount > req.max) {
              errors.push(`Function ${funcName} accepts at most ${req.max} arguments, got ${argCount}`);
            }
          }
          break;
      }

      // Recursively validate children
      if (node.children) {
        node.children.forEach(validateNode);
      }
    };

    validateNode(ast);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Convert AST back to string expression
   */
  astToString(ast: FormulaAST): string {
    switch (ast.type) {
      case 'constant':
        return ast.value.toString();
      
      case 'field':
        return ast.value as string;
      
      case 'operation':
        if (ast.children && ast.children.length === 2) {
          const left = this.astToString(ast.children[0]);
          const right = this.astToString(ast.children[1]);
          return `(${left} ${ast.value} ${right})`;
        }
        return '';
      
      case 'function':
        if (ast.children) {
          const args = ast.children.map(child => this.astToString(child)).join(', ');
          return `${ast.value}(${args})`;
        }
        return `${ast.value}()`;
      
      default:
        return '';
    }
  }

  // Private methods for parsing

  public tokenize(expression: string): Token[] {
    const tokens: Token[] = [];
    let position = 0;

    const patterns = {
      FIELD: /^[a-zA-Z_][a-zA-Z0-9_]*/,
      NUMBER: /^-?\d+(\.\d+)?/,
      OPERATOR: /^[+\-*/]/,
      LPAREN: /^\(/,
      RPAREN: /^\)/,
      COMMA: /^,/,
      WHITESPACE: /^\s+/,
    };

    while (position < expression.length) {
      let matched = false;

      for (const [tokenType, pattern] of Object.entries(patterns)) {
        const match = expression.slice(position).match(pattern);
        if (match) {
          const value = match[0];
          
          if (tokenType !== 'WHITESPACE') {
            tokens.push({
              type: tokenType as Token['type'],
              value,
              position,
            });
          }
          
          position += value.length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        throw new FormulaParserError(
          `Unexpected character: ${expression[position]}`,
          position
        );
      }
    }

    tokens.push({ type: 'EOF', value: '', position });
    return tokens;
  }

  private parseExpression(): FormulaAST {
    return this.parseAddition();
  }

  private parseAddition(): FormulaAST {
    let left = this.parseMultiplication();

    while (this.check('OPERATOR') && (this.peek().value === '+' || this.peek().value === '-')) {
      const operator = this.advance().value;
      const right = this.parseMultiplication();
      left = {
        id: this.generateId(),
        type: 'operation',
        value: operator,
        children: [left, right],
      };
    }

    return left;
  }

  private parseMultiplication(): FormulaAST {
    let left = this.parseUnary();

    while (this.check('OPERATOR') && (this.peek().value === '*' || this.peek().value === '/')) {
      const operator = this.advance().value;
      const right = this.parseUnary();
      left = {
        id: this.generateId(),
        type: 'operation',
        value: operator,
        children: [left, right],
      };
    }

    return left;
  }

  private parseUnary(): FormulaAST {
    if (this.check('OPERATOR') && (this.peek().value === '+' || this.peek().value === '-')) {
      const operator = this.advance().value;
      const expr = this.parseUnary();
      return {
        id: this.generateId(),
        type: 'operation',
        value: operator,
        children: [expr],
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): FormulaAST {
    if (this.match('NUMBER')) {
      return {
        id: this.generateId(),
        type: 'constant',
        value: parseFloat(this.previous().value),
      };
    }

    if (this.match('FIELD')) {
      const fieldName = this.previous().value;
      
      // Check if it's a function call
      if (this.check('LPAREN')) {
        this.advance(); // consume '('
        const args: FormulaAST[] = [];
        
        if (!this.check('RPAREN')) {
          do {
            args.push(this.parseExpression());
          } while (this.match('COMMA'));
        }
        
        this.consume('RPAREN', "Expected ')' after function arguments");
        
        return {
          id: this.generateId(),
          type: 'function',
          value: fieldName,
          children: args,
        };
      }
      
      return {
        id: this.generateId(),
        type: 'field',
        value: fieldName,
      };
    }

    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      this.consume('RPAREN', "Expected ')' after expression");
      return expr;
    }

    const token = this.peek();
    throw new FormulaParserError(
      `Unexpected token: ${token.value}`,
      token.position,
      token
    );
  }

  // Token navigation helpers
  private match(...types: Token['type'][]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: Token['type']): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: Token['type'], message: string): Token {
    if (this.check(type)) return this.advance();
    
    const token = this.peek();
    throw new FormulaParserError(message, token.position, token);
  }

  private generateId(): string {
    return `node_${Math.random().toString(36).substr(2, 9)}`;
  }
}