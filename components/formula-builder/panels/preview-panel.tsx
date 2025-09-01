'use client';

import { FormulaAST } from '@/lib/formula/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Eye, Copy, CheckCircle, AlertTriangle, Code2, FileText } from 'lucide-react';
import { FinancialFormulaParser } from '@/lib/formula/parser';
import { FormulaCompiler } from '@/lib/formula/compiler';

interface PreviewPanelProps {
  formula: FormulaAST | null;
  generatedPrompt: string;
  metricName: string;
}

export function PreviewPanel({ formula, generatedPrompt, metricName }: PreviewPanelProps) {
  const parser = new FinancialFormulaParser();
  const compiler = new FormulaCompiler();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  if (!formula) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Eye className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Formula to Preview</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Create a formula using the Visual Builder or Text Formula tab to see the preview and generated LLM instructions.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formulaExpression = parser.astToString(formula);
  const compiledFormula = compiler.compile(formula, metricName || 'Custom Metric');
  const fields = compiler.extractFields(formula);

  return (
    <div className="space-y-6">
      {/* Formula Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Formula Summary
          </CardTitle>
          <CardDescription>
            Overview of your custom financial metric formula
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Expression</div>
              <div className="bg-muted p-3 rounded font-mono text-sm">
                {formulaExpression}
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Required Fields</div>
              <div className="flex flex-wrap gap-1">
                {fields.map((field) => (
                  <Badge key={field} variant="secondary">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">Calculation Steps</div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="space-y-2">
                {compiledFormula.steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <Badge variant="outline" className="w-8 h-6 flex items-center justify-center">
                      {step.stepNumber}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium">{step.description}</div>
                      <div className="text-muted-foreground font-mono text-xs">
                        {step.expression}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated LLM Prompt */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Generated LLM Instructions
              </CardTitle>
              <CardDescription>
                Structured prompt that will be sent to the AI for calculation
              </CardDescription>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(generatedPrompt)}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="bg-muted/50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {generatedPrompt || 'No prompt generated yet'}
              </pre>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* AST Structure (for debugging) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            Formula Structure (AST)
          </CardTitle>
          <CardDescription>
            Technical representation of your formula for debugging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="bg-muted/50 rounded-lg p-4">
              <pre className="text-xs font-mono">
                {JSON.stringify(formula, null, 2)}
              </pre>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Usage Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p>
              <strong>How to use this metric:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Save this custom metric by clicking "Create Metric"</li>
              <li>In chat, reference this metric by name: "{metricName || 'Custom Metric'}"</li>
              <li>The AI will use the generated instructions to calculate the result</li>
              <li>Ensure all required financial data fields are available</li>
            </ol>
          </div>
          
          <Separator />
          
          <div className="text-sm">
            <p className="font-medium mb-2">Required Data Fields:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {fields.map((field) => (
                <div key={field} className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <code className="text-xs bg-muted px-2 py-1 rounded">{field}</code>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}