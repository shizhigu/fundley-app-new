'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Save, X, Play, Code2, Eye } from 'lucide-react';
import { toast } from '@/components/toast';
import { FinancialFormulaParser } from '@/lib/formula/parser';
import { FormulaCompiler } from '@/lib/formula/compiler';
import { FormulaAST } from '@/lib/formula/types';
import { FormulaCanvas } from './canvas/formula-canvas';
import { FieldsPanel } from './panels/fields-panel';
import { PreviewPanel } from './panels/preview-panel';

interface FormulaEditorProps {
  open: boolean;
  onClose: () => void;
  metricId?: string | null;
}

const CATEGORIES = [
  'profitability',
  'liquidity', 
  'leverage',
  'efficiency',
  'growth',
  'valuation',
  'custom'
];

export function FormulaEditor({ open, onClose, metricId }: FormulaEditorProps) {
  const [activeTab, setActiveTab] = useState('builder');
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('profitability');
  const [isPublic, setIsPublic] = useState(false);
  const [formula, setFormula] = useState<FormulaAST | null>(null);
  const [textFormula, setTextFormula] = useState('');
  
  // Validation and preview state
  const [errors, setErrors] = useState<string[]>([]);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Convex mutations
  const createMetric = useMutation(api.metrics.create);
  const updateMetric = useMutation(api.metrics.update);
  
  // Load existing metric if editing
  const existingMetric = useQuery(
    api.metrics.getById,
    metricId ? { metricId: metricId as any } : 'skip'
  );

  // Parsers
  const parser = new FinancialFormulaParser();
  const compiler = new FormulaCompiler();

  // Load existing metric data
  useEffect(() => {
    if (existingMetric) {
      setName(existingMetric.name);
      setDescription(existingMetric.description);
      setCategory(existingMetric.category);
      setIsPublic(existingMetric.isPublic);
      setFormula(existingMetric.astDefinition);
      setGeneratedPrompt(existingMetric.formula); // Use formula string for display
      
      // Convert AST back to text formula for editing
      if (existingMetric.astDefinition) {
        try {
          const textFormula = parser.astToString(existingMetric.astDefinition);
          setTextFormula(textFormula);
        } catch (error) {
          console.error('Error converting AST to text:', error);
        }
      }
    } else if (!metricId) {
      // Reset for new metric
      resetForm();
    }
  }, [existingMetric, metricId]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('profitability');
    setIsPublic(false);
    setFormula(null);
    setTextFormula('');
    setGeneratedPrompt('');
    setErrors([]);
  };

  const validateFormula = async () => {
    if (!textFormula.trim()) {
      setErrors(['Formula is required']);
      setFormula(null);
      return;
    }

    setIsValidating(true);
    try {
      // Parse text formula to AST
      const ast = parser.parse(textFormula);
      
      // Validate AST (for now, we'll use a simple validation)
      const availableFields = new Set(['revenue', 'netIncome', 'totalAssets', 'totalDebt']);
      const validation = parser.validate(ast, availableFields);
      
      if (validation.isValid) {
        setFormula(ast);
        setErrors([]);
        
        // Generate LLM prompt
        const compiled = compiler.compile(ast, name || 'Custom Metric', description);
        setGeneratedPrompt(compiled.prompt);
        
        toast({
          type: 'success',
          description: 'Formula validated successfully!',
        });
      } else {
        setErrors(validation.errors);
        setFormula(null);
        setGeneratedPrompt('');
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrors([error.message]);
      } else {
        setErrors(['Invalid formula syntax']);
      }
      setFormula(null);
      setGeneratedPrompt('');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        type: 'error',
        description: 'Metric name is required',
      });
      return;
    }

    if (!formula) {
      toast({
        type: 'error',
        description: 'Please create and validate a formula first',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (metricId) {
        await updateMetric({
          id: metricId as any,
          name,
          description,
          category,
          formula: generatedPrompt,
          astDefinition: formula,
          isPublic,
        });
        
        toast({
          type: 'success',
          description: 'Metric updated successfully!',
        });
      } else {
        await createMetric({
          name,
          description,
          category,
          formula: generatedPrompt,
          calculationType: 'ttm', // Default to trailing twelve months
          astDefinition: formula,
          isPublic,
        });
        
        toast({
          type: 'success',
          description: 'Metric created successfully!',
        });
      }
      
      onClose();
    } catch (error) {
      toast({
        type: 'error',
        description: 'Failed to save metric. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {metricId ? 'Edit Custom Metric' : 'Create Custom Metric'}
          </DialogTitle>
          <DialogDescription>
            Build custom financial metrics using drag-and-drop formula creation or text input.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Metric Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Custom ROE Calculation"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this metric measures and how it should be interpreted..."
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="public">Make this metric public</Label>
            </div>
          </div>

          {/* Formula Builder Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="builder" className="flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                Visual Builder
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Text Formula
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Drag & Drop Formula Builder</CardTitle>
                  <CardDescription>
                    Drag financial fields from the panel and connect them with operators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[400px]">
                    {/* Fields Panel */}
                    <div className="lg:col-span-1">
                      <FieldsPanel />
                    </div>
                    
                    {/* Canvas */}
                    <div className="lg:col-span-3 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                      <FormulaCanvas
                        formula={formula}
                        onFormulaChange={setFormula}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Text Formula Editor</CardTitle>
                  <CardDescription>
                    Write your formula using standard mathematical notation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="formula">Formula Expression</Label>
                    <Textarea
                      id="formula"
                      value={textFormula}
                      onChange={(e) => setTextFormula(e.target.value)}
                      placeholder="e.g., (netIncome / totalAssets) * 100"
                      className="font-mono"
                      rows={4}
                    />
                    <div className="text-sm text-muted-foreground">
                      Use field names like: revenue, netIncome, totalAssets, totalDebt
                    </div>
                  </div>
                  
                  <Button 
                    onClick={validateFormula}
                    disabled={isValidating}
                    className="w-full"
                  >
                    {isValidating ? 'Validating...' : 'Validate Formula'}
                  </Button>
                  
                  {errors.length > 0 && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-destructive mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Formula Errors:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1">
                        {errors.map((error, index) => (
                          <li key={index} className="text-sm text-destructive">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {formula && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-950 dark:border-green-800">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                        <Badge variant="outline" className="border-green-300 text-green-700">
                          ✓ Valid
                        </Badge>
                        <span className="font-medium">Formula validated successfully!</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <PreviewPanel
                formula={formula}
                generatedPrompt={generatedPrompt}
                metricName={name}
              />
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            
            <Button 
              onClick={handleSave}
              disabled={!formula || !name.trim() || isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : metricId ? 'Update Metric' : 'Create Metric'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}