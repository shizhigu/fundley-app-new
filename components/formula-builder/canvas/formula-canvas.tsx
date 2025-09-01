'use client';

import { useState, useCallback } from 'react';
import { 
  DndContext, 
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  Active,
  Over
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import { FormulaAST } from '@/lib/formula/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Code2, Plus, X, Calculator, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormulaCanvasProps {
  formula: FormulaAST | null;
  onFormulaChange: (formula: FormulaAST | null) => void;
}

interface CanvasNode {
  id: string;
  type: 'field' | 'constant' | 'operator' | 'function';
  value: string | number;
  position: { x: number; y: number };
}

const OPERATORS = ['+', '-', '*', '/'];
const FUNCTIONS = ['MAX', 'MIN', 'AVERAGE', 'SUM', 'ABS', 'ROUND'];

export function FormulaCanvas({ formula, onFormulaChange }: FormulaCanvasProps) {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showFunctionMenu, setShowFunctionMenu] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const generateId = () => `node_${Math.random().toString(36).substr(2, 9)}`;

  const addNode = useCallback((type: CanvasNode['type'], value: string | number) => {
    const newNode: CanvasNode = {
      id: generateId(),
      type,
      value,
      position: { 
        x: Math.random() * 300 + 50, 
        y: Math.random() * 200 + 50 
      },
    };
    setNodes(prev => [...prev, newNode]);
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Update node position
    setNodes(prev => prev.map(node => {
      if (node.id === active.id) {
        return {
          ...node,
          position: {
            x: node.position.x + (event.delta.x || 0),
            y: node.position.y + (event.delta.y || 0)
          }
        };
      }
      return node;
    }));
  };

  const handleDropFromPanel = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const fieldData = e.dataTransfer.getData('application/json');
    if (fieldData) {
      try {
        const field = JSON.parse(fieldData);
        addNode('field', field.id);
      } catch (error) {
        console.error('Failed to parse dropped field data:', error);
      }
    }
  }, [addNode]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const buildFormulaFromNodes = useCallback(() => {
    if (nodes.length === 0) {
      onFormulaChange(null);
      return;
    }

    // Simple formula building - for MVP just create a sum of all field nodes
    const fieldNodes = nodes.filter(node => node.type === 'field');
    if (fieldNodes.length === 0) {
      onFormulaChange(null);
      return;
    }

    if (fieldNodes.length === 1) {
      const formula: FormulaAST = {
        id: generateId(),
        type: 'field',
        value: fieldNodes[0].value,
      };
      onFormulaChange(formula);
      return;
    }

    // Create an addition operation for multiple fields
    const formula: FormulaAST = {
      id: generateId(),
      type: 'operation',
      value: '+',
      children: fieldNodes.map(node => ({
        id: generateId(),
        type: 'field',
        value: node.value,
      })),
    };
    onFormulaChange(formula);
  }, [nodes, onFormulaChange]);

  const getNodeIcon = (type: CanvasNode['type']) => {
    switch (type) {
      case 'field': return Calculator;
      case 'constant': return Hash;
      case 'operator': return Plus;
      case 'function': return Code2;
      default: return Calculator;
    }
  };

  const getNodeColor = (type: CanvasNode['type']) => {
    switch (type) {
      case 'field': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'constant': return 'bg-green-100 border-green-300 text-green-800';
      case 'operator': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'function': return 'bg-purple-100 border-purple-300 text-purple-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className="w-full h-full min-h-[400px] bg-muted/20 rounded-lg relative">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Canvas Area */}
        <div 
          className="w-full h-full relative overflow-hidden"
          onDrop={handleDropFromPanel}
          onDragOver={handleDragOver}
        >
          {nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                  <Code2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Visual Formula Builder</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Drag fields from the left panel to start building your formula visually.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <SortableContext items={nodes.map(node => node.id)}>
              {nodes.map((node) => {
                const Icon = getNodeIcon(node.type);
                return (
                  <Card
                    key={node.id}
                    className={cn(
                      'absolute cursor-move select-none border-2',
                      getNodeColor(node.type)
                    )}
                    style={{
                      left: node.position.x,
                      top: node.position.y,
                      transform: activeId === node.id ? 'scale(1.05)' : 'scale(1)',
                      zIndex: activeId === node.id ? 50 : 1,
                    }}
                  >
                    <CardContent className="p-3 flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{node.value}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-5 h-5 p-0 ml-2 hover:bg-red-100"
                        onClick={() => removeNode(node.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </SortableContext>
          )}
        </div>

        {/* Toolbar */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex gap-2">
            {OPERATORS.map(op => (
              <Button
                key={op}
                variant="outline"
                size="sm"
                onClick={() => addNode('operator', op)}
                className="bg-white/80 backdrop-blur-sm"
              >
                {op}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFunctionMenu(!showFunctionMenu)}
              className="bg-white/80 backdrop-blur-sm"
            >
              f(x)
            </Button>
            
            {showFunctionMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border p-2 flex flex-wrap gap-1 max-w-xs">
                {FUNCTIONS.map(func => (
                  <Button
                    key={func}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      addNode('function', func);
                      setShowFunctionMenu(false);
                    }}
                    className="text-xs"
                  >
                    {func}
                  </Button>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const value = prompt('Enter a number:');
                if (value && !isNaN(Number(value))) {
                  addNode('constant', Number(value));
                }
              }}
              className="bg-white/80 backdrop-blur-sm"
            >
              123
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={buildFormulaFromNodes}
              className="bg-green-100/80 backdrop-blur-sm border-green-300 hover:bg-green-200"
            >
              Build Formula
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNodes([])}
              className="bg-red-100/80 backdrop-blur-sm border-red-300 hover:bg-red-200"
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId ? (
            <Card className="cursor-grabbing opacity-80">
              <CardContent className="p-3">
                <span className="text-sm font-medium">
                  {nodes.find(n => n.id === activeId)?.value}
                </span>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Formula Preview */}
      {formula && (
        <div className="absolute top-4 right-4 max-w-xs">
          <Badge variant="outline" className="bg-white/80 backdrop-blur-sm">
            Formula: {JSON.stringify(formula.value)}
          </Badge>
        </div>
      )}
    </div>
  );
}