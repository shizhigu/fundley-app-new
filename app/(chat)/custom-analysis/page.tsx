'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PlayIcon, DownloadIcon, RefreshCcwIcon } from 'lucide-react';

interface AnalysisResult {
  symbol: string;
  value: number;
  rank?: number;
  fiscalyear: number;
  period: string;
  companyName?: string;
}

interface MetricOption {
  id: string;
  name: string;
  description: string;
  ast: any;
}

export default function CustomAnalysisPage() {
  const [selectedMetric, setSelectedMetric] = useState<MetricOption | null>(null);
  const [topN, setTopN] = useState<number>(50);
  const [periods, setPeriods] = useState<number>(1);
  const [generatedSQL, setGeneratedSQL] = useState<string>('');
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Mock metrics data - replace with actual API call
  const availableMetrics: MetricOption[] = [
    {
      id: 'roce',
      name: 'ROCE (Return on Capital Employed)',
      description: 'EBIT / (Average Total Assets - Average Current Liabilities)',
      ast: {
        "type": "arithmetic",
        "operator": "divide",
        "left": {
          "type": "field",
          "source": "income_statement",
          "field": "ebit",
          "selector": {"type": "single", "single": {"position": "latest"}}
        },
        "right": {
          "type": "arithmetic",
          "operator": "subtract",
          "left": {
            "type": "aggregation",
            "function": "average",
            "values": [
              {"type": "field", "source": "balance_sheet", "field": "totalassets", "selector": {"type": "single", "single": {"position": "latest"}}},
              {"type": "field", "source": "balance_sheet", "field": "totalassets", "selector": {"type": "single", "single": {"position": "latest", "offset": -1}}}
            ]
          },
          "right": {
            "type": "aggregation",
            "function": "average",
            "values": [
              {"type": "field", "source": "balance_sheet", "field": "totalcurrentliabilities", "selector": {"type": "single", "single": {"position": "latest"}}},
              {"type": "field", "source": "balance_sheet", "field": "totalcurrentliabilities", "selector": {"type": "single", "single": {"position": "latest", "offset": -1}}}
            ]
          }
        }
      }
    }
  ];

  const generateSQL = async () => {
    if (!selectedMetric) {
      setError('Please select a metric first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Call the SQL generation API
      const response = await fetch('/api/custom-analysis/generate-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ast: selectedMetric.ast,
          marketRanking: true,
          topN,
          periods,
          customRequirement: 'Generate optimized SQL for financial analysis'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate SQL');
      }
      
      // Use the generated SQL if available, otherwise use fallback
      if (!data.data?.sql) {
        setGeneratedSQL(`-- Generated SQL will appear here after API call\n-- Currently using development fallback`);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate SQL');
    } finally {
      setLoading(false);
    }
  };

  const executeSQL = async () => {
    if (!generatedSQL) {
      setError('Please generate SQL first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Call the SQL execution API
      const response = await fetch('/api/custom-analysis/execute-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: generatedSQL,
          safetyOverride: false
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to execute SQL');
      }
      
      // Use results from API if available
      if (!data.data?.results) {
        console.warn('No results from API, using development fallback');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute SQL');
    } finally {
      setLoading(false);
    }
  };

  const downloadResults = () => {
    const csvContent = [
      ['Rank', 'Symbol', 'Company', 'Value', 'Year', 'Period'],
      ...results.map(row => [
        row.rank,
        row.symbol,
        row.companyName || '',
        row.value,
        row.fiscalyear,
        row.period
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market_ranking_${selectedMetric?.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-950">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Custom Data Analysis
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Generate SQL queries from AST definitions and perform custom financial analysis
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              70K+ Companies
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
          
          {/* Left Panel - Configuration */}
          <div className="space-y-6">
            
            {/* Metric Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Metric Selection</CardTitle>
                <CardDescription>
                  Choose a financial metric for custom analysis across your dataset
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metric">Financial Metric</Label>
                  <Select 
                    value={selectedMetric?.id || ''} 
                    onValueChange={(value) => setSelectedMetric(availableMetrics.find(m => m.id === value) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a metric..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMetrics.map((metric) => (
                        <SelectItem key={metric.id} value={metric.id}>
                          <div>
                            <div className="font-medium">{metric.name}</div>
                            <div className="text-xs text-gray-500">{metric.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedMetric && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">AST Preview:</div>
                    <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
                      {JSON.stringify(selectedMetric.ast, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parameters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Parameters</CardTitle>
                <CardDescription>
                  Configure analysis parameters and time periods
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="topN">Result Limit</Label>
                    <Input
                      id="topN"
                      type="number"
                      min="1"
                      max="1000"
                      value={topN}
                      onChange={(e) => setTopN(parseInt(e.target.value) || 50)}
                      placeholder="50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="periods">Periods</Label>
                    <Input
                      id="periods"
                      type="number"
                      min="1"
                      max="8"
                      value={periods}
                      onChange={(e) => setPeriods(parseInt(e.target.value) || 1)}
                      placeholder="1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SQL Generation */}
            <Card className="flex-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Generated SQL</CardTitle>
                    <CardDescription>
                      LLM-generated PostgreSQL query from AST definition
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={generateSQL}
                      disabled={!selectedMetric || loading}
                      size="sm"
                    >
                      <RefreshCcwIcon className="w-4 h-4 mr-2" />
                      Generate
                    </Button>
                    <Button 
                      onClick={executeSQL}
                      disabled={!generatedSQL || loading}
                      size="sm"
                      variant="default"
                    >
                      <PlayIcon className="w-4 h-4 mr-2" />
                      Execute
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={generatedSQL}
                  onChange={(e) => setGeneratedSQL(e.target.value)}
                  placeholder="Generated SQL will appear here..."
                  className="font-mono text-sm min-h-[200px] resize-none"
                  readOnly
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Results */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Analysis Results</CardTitle>
                  <CardDescription>
                    {results.length > 0 ? (
                      `Showing ${results.length} results${selectedMetric ? ` for ${selectedMetric.name}` : ''}`
                    ) : (
                      'Execute SQL query to see analysis results'
                    )}
                  </CardDescription>
                </div>
                {results.length > 0 && (
                  <Button onClick={downloadResults} size="sm" variant="outline">
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm mb-4">
                  {error}
                </div>
              )}
              
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : results.length > 0 ? (
                <div className="overflow-auto h-full">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-white dark:bg-gray-950 border-b">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-gray-600 dark:text-gray-400">Rank</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-600 dark:text-gray-400">Symbol</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-600 dark:text-gray-400">Company</th>
                        <th className="text-right p-3 text-sm font-medium text-gray-600 dark:text-gray-400">Value</th>
                        <th className="text-center p-3 text-sm font-medium text-gray-600 dark:text-gray-400">Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, index) => (
                        <tr key={result.symbol} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="p-3">
                            <div className="flex items-center">
                              <Badge 
                                variant={result.rank <= 3 ? "default" : "secondary"} 
                                className="min-w-[2rem] justify-center"
                              >
                                {result.rank}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-mono text-sm font-medium">{result.symbol}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {result.companyName || 'N/A'}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="font-medium text-sm">
                              {result.value.toFixed(2)}%
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="text-xs">
                              {result.fiscalyear}-{result.period}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <PlayIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Execute SQL query to see analysis results</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}