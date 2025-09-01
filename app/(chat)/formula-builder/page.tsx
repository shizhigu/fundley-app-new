'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MetricsList } from '@/components/formula-builder/metrics-list';
import { FormulaEditor } from '@/components/formula-builder/formula-editor';

export default function FormulaBuilderPage() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setSelectedMetricId(null);
    setIsEditorOpen(true);
  };

  const handleEditMetric = (metricId: string) => {
    setSelectedMetricId(metricId);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedMetricId(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Custom Formula Builder</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage custom financial metrics with drag-and-drop formula building.
            </p>
          </div>
          
          <Button 
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Metric
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg p-4 border">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-muted-foreground">Total Metrics</div>
          </div>
          <div className="bg-card rounded-lg p-4 border">
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-sm text-muted-foreground">Active Metrics</div>
          </div>
          <div className="bg-card rounded-lg p-4 border">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-sm text-muted-foreground">Public Metrics</div>
          </div>
          <div className="bg-card rounded-lg p-4 border">
            <div className="text-2xl font-bold text-orange-600">0</div>
            <div className="text-sm text-muted-foreground">Usage This Month</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        <MetricsList 
          onEditMetric={handleEditMetric}
          onCreateNew={handleCreateNew}
        />
      </div>

      {/* Formula Editor Dialog */}
      <FormulaEditor
        open={isEditorOpen}
        onClose={handleCloseEditor}
        metricId={selectedMetricId}
      />
    </div>
  );
}