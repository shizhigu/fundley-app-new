/**
 * Formula Compiler - Converts AST to LLM Instructions
 * 
 * This compiler transforms a Formula AST into structured, step-by-step
 * instructions that an LLM can follow to calculate financial metrics
 * without relying on its mathematical reasoning capabilities.
 */

import { FormulaAST, CalculationStep, CompiledFormula } from './types';
import { FinancialFormulaParser } from './parser';

export class FormulaCompiler {
  private parser = new FinancialFormulaParser();

  /**
   * Compile AST into complete LLM instruction set
   */
  compile(ast: FormulaAST, metricName: string, description?: string): CompiledFormula {
    const steps = this.generateSteps(ast);
    const fields = this.extractFields(ast);
    const expression = this.parser.astToString(ast);
    const prompt = this.generatePrompt({
      metricName,
      description: description || `Calculate ${metricName} using the formula`,
      fields,
      steps,
      expression,
    });

    return {
      expression,
      steps,
      fields,
      prompt,
    };
  }

  /**
   * Extract all field references from AST
   */
  extractFields(ast: FormulaAST): string[] {
    const fields = new Set<string>();

    const traverse = (node: FormulaAST): void => {
      if (node.type === 'field') {
        fields.add(node.value as string);
      }
      
      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    traverse(ast);
    return Array.from(fields);
  }

  /**
   * Generate step-by-step calculation instructions
   */
  private generateSteps(ast: FormulaAST): CalculationStep[] {
    const steps: CalculationStep[] = [];
    let stepCounter = 1;

    const traverse = (node: FormulaAST, level = 0): string => {
      switch (node.type) {
        case 'field':
          return `${node.value}_value`;
        
        case 'constant':
          return node.value.toString();
        
        case 'operation':
          if (node.children && node.children.length >= 1) {
            if (node.children.length === 1) {
              // Unary operation
              const operandResult = traverse(node.children[0], level + 1);
              const resultVar = `step_${stepCounter}_result`;
              
              steps.push({
                stepNumber: stepCounter++,
                description: `Apply ${node.value === '-' ? 'negative' : 'positive'} sign`,
                operation: node.value as string,
                inputs: [operandResult],
                output: resultVar,
                expression: `${node.value}${operandResult}`,
              });

              return resultVar;
            } else if (node.children.length === 2) {
              // Binary operation
              const leftResult = traverse(node.children[0], level + 1);
              const rightResult = traverse(node.children[1], level + 1);
              const resultVar = `step_${stepCounter}_result`;

              const operationNames: Record<string, string> = {
                '+': 'addition',
                '-': 'subtraction',
                '*': 'multiplication',
                '/': 'division',
              };

              steps.push({
                stepNumber: stepCounter++,
                description: `Execute ${operationNames[node.value as string] || node.value} operation`,
                operation: node.value as string,
                inputs: [leftResult, rightResult],
                output: resultVar,
                expression: `${leftResult} ${node.value} ${rightResult}`,
              });

              return resultVar;
            }
          }
          return 'unknown';
        
        case 'function':
          if (node.children) {
            const argResults = node.children.map(child => traverse(child, level + 1));
            const resultVar = `step_${stepCounter}_result`;
            const funcName = (node.value as string).toUpperCase();

            // Generate function-specific descriptions
            const functionDescriptions: Record<string, string> = {
              'MAX': 'Find the maximum value',
              'MIN': 'Find the minimum value', 
              'AVERAGE': 'Calculate the average (mean)',
              'SUM': 'Calculate the sum',
              'ABS': 'Calculate absolute value',
              'ROUND': 'Round to specified decimal places',
              'CEIL': 'Round up to nearest integer',
              'FLOOR': 'Round down to nearest integer',
              'SQRT': 'Calculate square root',
              'POW': 'Calculate power (base^exponent)',
              'LOG': 'Calculate logarithm',
              'IF': 'Conditional logic evaluation',
              'ISNULL': 'Check if value is null',
              'COALESCE': 'Return first non-null value',
              'PERCENT': 'Calculate percentage (value/total * 100)',
              'GROWTH': 'Calculate growth rate ((new-old)/old * 100)',
              'RATIO': 'Calculate ratio (numerator/denominator)'
            };

            const description = functionDescriptions[funcName] || `Execute ${node.value} function`;

            steps.push({
              stepNumber: stepCounter++,
              description,
              operation: node.value as string,
              inputs: argResults,
              output: resultVar,
              expression: `${node.value}(${argResults.join(', ')})`,
            });

            return resultVar;
          }
          return 'unknown';
        
        default:
          return 'unknown';
      }
    };

    traverse(ast);
    return steps;
  }

  /**
   * Generate comprehensive LLM prompt
   */
  private generatePrompt(data: {
    metricName: string;
    description: string;
    fields: string[];
    steps: CalculationStep[];
    expression: string;
  }): string {
    const fieldInstructions = data.fields.map(field => 
      `- ${field}: Extract the numeric value from the financial data for "${field}"`
    ).join('\n');

    const stepInstructions = data.steps.map(step => `
### Step ${step.stepNumber}: ${step.description}
- **Operation**: ${step.expression}
- **Calculate**: ${step.output} = ${step.expression}
- **Store result as**: ${step.output}
- **Inputs**: ${step.inputs.join(', ')}
`).join('\n');

    return `# Calculate ${data.metricName}

## Description
${data.description}

## Formula Expression
\`${data.expression}\`

## Required Financial Data Fields
${fieldInstructions}

## Step-by-Step Calculation Instructions

Follow these exact steps in order. Do not skip any steps or use alternative calculation methods.

${stepInstructions}

## Final Result Instructions

1. **Return the final calculated value** from the last step
2. **Include appropriate units** (USD, percentage, ratio, etc.)
3. **Round to appropriate precision** (typically 2-4 decimal places for financial metrics)
4. **Format for readability** (use commas for large numbers)

## Error Handling Requirements

Before starting calculations, verify:

- ✅ All required fields have valid numeric values
- ✅ No division by zero scenarios exist
- ✅ All intermediate calculations produce valid numbers

If any error occurs:

1. **Stop the calculation immediately**
2. **Identify the specific step where the error occurred**
3. **Return a clear error message** explaining what went wrong
4. **Suggest what data might be missing or invalid**

## Important Notes

- **CRITICAL**: Follow each step exactly as described above
- **NO SHORTCUTS**: Do not attempt to simplify or optimize the calculation
- **SHOW YOUR WORK**: Include intermediate step results in your response
- **PRECISION MATTERS**: Maintain precision throughout all calculations

This formula was created by the user and should be executed exactly as specified.`.trim();
  }

  /**
   * Create a simplified prompt for testing
   */
  generateTestPrompt(ast: FormulaAST, testData: Record<string, number>): string {
    const steps = this.generateSteps(ast);
    const expression = this.parser.astToString(ast);
    
    return `Test calculation for formula: ${expression}

Test data: ${JSON.stringify(testData, null, 2)}

Execute these steps:
${steps.map(step => `${step.stepNumber}. ${step.expression}`).join('\n')}

Provide the final result.`;
  }
}