import { NextRequest, NextResponse } from 'next/server';
import { FinancialFormulaParser } from '@/lib/formula/parser';
import { FormulaCompiler } from '@/lib/formula/compiler';

export async function POST(request: NextRequest) {
  try {
    const { formula } = await request.json();
    
    if (!formula) {
      return NextResponse.json({ error: 'Formula is required' }, { status: 400 });
    }

    // Test the parser
    const parser = new FinancialFormulaParser();
    const compiler = new FormulaCompiler();
    
    try {
      // Debug: Let's see the tokens first
      const tokens = parser.tokenize(formula);
      
      // Parse the formula
      const ast = parser.parse(formula);
      
      // Validate the AST
      const availableFields = new Set(['revenue', 'netIncome', 'totalAssets', 'totalDebt']);
      const validation = parser.validate(ast, availableFields);
      
      if (!validation.isValid) {
        return NextResponse.json({
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
          tokens, // Include tokens for debugging
        });
      }
      
      // Compile to prompt
      const compiled = compiler.compile(ast, 'Test Metric', 'A test financial metric');
      
      return NextResponse.json({
        success: true,
        ast,
        tokens, // Include tokens for debugging
        compiled: {
          expression: compiled.expression,
          fields: compiled.fields,
          steps: compiled.steps,
          promptLength: compiled.prompt.length,
        },
      });
    } catch (parseError) {
      // Try to get tokens even if parsing fails
      let tokens;
      try {
        tokens = parser.tokenize(formula);
      } catch (tokenError) {
        tokens = null;
      }
      
      return NextResponse.json({
        success: false,
        error: parseError instanceof Error ? parseError.message : 'Parse error',
        tokens, // Include tokens for debugging even on error
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Formula Builder Test API',
    status: 'operational',
    endpoints: [
      'POST /api/formula-builder/test - Test formula parsing and compilation',
    ],
  });
}