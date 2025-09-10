'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { getPyodideManager } from '@/lib/pyodide-manager';

interface VisualizationMessageProps {
  id: string;
  messageId?: string; // The message ID for caching
  title: string;
  code: string;
  description?: string;
  cachedHtml?: string; // Pre-cached HTML content
  cachedImage?: string; // Pre-cached image
}

export function VisualizationMessage({ 
  id,
  messageId,
  title, 
  code,
  description,
  cachedHtml,
  cachedImage
}: VisualizationMessageProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(!cachedHtml && !cachedImage);
  const [error, setError] = useState<string | null>(null);
  const [outputHtml, setOutputHtml] = useState<string | null>(cachedHtml || null);
  const [outputImage, setOutputImage] = useState<string | null>(cachedImage || null);
  
  // Debug logging
  console.log('🎨 VisualizationMessage render:', {
    id,
    title,
    hasCachedHtml: !!cachedHtml,
    hasCachedImage: !!cachedImage,
    hasOutputHtml: !!outputHtml,
    hasOutputImage: !!outputImage,
    isLoading,
    error
  });
  const executionAbortController = useRef<AbortController | null>(null);


  // Save cache to message parts
  const saveCache = async (html: string | null, image: string | null) => {
    if (!messageId) {
      console.log('No messageId provided, skipping cache save');
      return;
    }
    
    
    try {
      // Get current message from useDataStream context or via API
      const response = await fetch('/api/message/update-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          toolCallId: id, // Use the visualization ID as tool call identifier
          cachedHtml: html,
          cachedImage: image,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 404) {
          console.warn('Message not found (likely deleted), skipping cache save:', messageId);
          return; // Gracefully handle deleted messages
        }
        console.error('Cache save failed:', response.status, errorText);
      } else {
      }
    } catch (err) {
      console.error('Failed to save cache:', err);
    }
  };

  useEffect(() => {
    // Skip on server side
    if (typeof window === 'undefined') return;
    
    // If we have cached content, skip execution
    if (cachedHtml || cachedImage) {
      console.log('Using cached visualization content:', { 
        hasCachedHtml: !!cachedHtml, 
        hasCachedImage: !!cachedImage,
        messageId 
      });
      setIsLoading(false);
      return;
    }
    
    // Only execute if visualization is expanded (visible to user)
    if (!isExpanded) {
      console.log('Visualization collapsed, skipping execution until expanded');
      setIsLoading(false);
      return;
    }
    
    console.log('No cached content found, will execute code:', { messageId });

    const executeCode = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Create abort controller for this execution
        executionAbortController.current = new AbortController();
        
        // Get shared Pyodide instance
        const pyodideManager = getPyodideManager();
        
        // Execute in queue to prevent stdout conflicts
        await pyodideManager.executeWithQueue(async () => {
          const pyodide = await pyodideManager.getPyodide();
          
          // Setup output capture
          let plotlyHtmlBuffer = '';
          let collectingPlotly = false;
          let matplotlibImage = null;
          
          
          const outputCapture = {
            batched: (output: string) => {
              // console.log(`📊 Output received:`, output.substring(0, 100));
              
              // Check for Plotly HTML output
              if (output.includes('PLOTLY_HTML_START')) {
                collectingPlotly = true;
                plotlyHtmlBuffer = '';
                return;
              }
              
              if (collectingPlotly) {
                if (output.includes('PLOTLY_HTML_END')) {
                  setOutputHtml(plotlyHtmlBuffer);
                  // Save to cache
                  saveCache(plotlyHtmlBuffer, null);
                  collectingPlotly = false;
                  plotlyHtmlBuffer = '';
                } else {
                  plotlyHtmlBuffer += output;
                }
                return;
              }
              
              // Check for matplotlib image
              if (output.startsWith('data:image/png;base64')) {
                console.log(`✅ Matplotlib image captured`);
                matplotlibImage = output;
                setOutputImage(output);
                // Save to cache
                saveCache(null, output);
              }
            }
          };
          
          // Install and setup visualization libraries
          if (code.includes('plotly') || code.includes('px.') || code.includes('go.')) {
            // Install dependencies for plotly
            await pyodide.runPythonAsync(`
import micropip

# Install numpy (required by pandas and plotly)
try:
    import numpy
except ImportError:
    print("Installing numpy...")
    await micropip.install('numpy')

# Install pandas (required by plotly.express)
try:
    import pandas
except ImportError:
    print("Installing pandas...")
    await micropip.install('pandas')
`);
            
            // Install plotly and setup handler
            await pyodide.runPythonAsync(`
import micropip

# Install plotly
try:
    import plotly
    print("Plotly already installed")
except ImportError:
    print("Installing plotly...")
    await micropip.install('plotly')
    print("Plotly installed successfully")

# Setup plotly output handler
import plotly
import plotly.graph_objects as go

def custom_plotly_show(self, *args, **kwargs):
    html_str = self.to_html(include_plotlyjs='inline', div_id="plotly-div-${id}")
    print("PLOTLY_HTML_START")
    print(html_str)
    print("PLOTLY_HTML_END")

plotly.graph_objects.Figure.show = custom_plotly_show
print("Plotly handler configured")
`);
          }
          
          if (code.includes('matplotlib') || code.includes('plt.')) {
            await pyodide.runPythonAsync(`
import micropip

# Install numpy if needed (matplotlib dependency)
try:
    import numpy
except ImportError:
    await micropip.install('numpy')

# Install matplotlib
try:
    import matplotlib
except ImportError:
    await micropip.install('matplotlib')

import io
import base64
from matplotlib import pyplot as plt

plt.clf()
plt.close('all')
plt.switch_backend('agg')

def setup_matplotlib_output():
    def custom_show():
        if plt.gcf().get_size_inches().prod() * plt.gcf().dpi ** 2 > 25_000_000:
            plt.gcf().set_dpi(100)
        
        png_buf = io.BytesIO()
        plt.savefig(png_buf, format='png')
        png_buf.seek(0)
        png_base64 = base64.b64encode(png_buf.read()).decode('utf-8')
        print(f'data:image/png;base64,{png_base64}')
        png_buf.close()
        
        plt.clf()
        plt.close('all')
    
    plt.show = custom_show

setup_matplotlib_output()
`);
          }
          
          // Load packages from imports (this handles standard library imports)
          try {
            await pyodide.loadPackagesFromImports(code);
          } catch (e) {
            console.log('Some packages may need manual installation:', e);
          }
          
          // Set up stdout capture
          pyodide.setStdout(outputCapture);
          
          try {
            // Execute the code
            await pyodide.runPythonAsync(code);
          } finally {
            // Restore default stdout
            pyodide.setStdout({ batched: () => {} });
          }
        });
        
        setIsLoading(false);
      } catch (err: any) {
        console.error('Visualization execution error:', err);
        setError(err.message || 'Failed to execute visualization');
        setIsLoading(false);
      }
    };
    
    executeCode();
    
    // Cleanup function
    return () => {
      // Abort any ongoing execution
      if (executionAbortController.current) {
        executionAbortController.current.abort();
        executionAbortController.current = null;
      }
    };
  }, [code, id, isExpanded, cachedHtml, cachedImage]);

  // Handle expansion - execute code when visualization is expanded for the first time
  useEffect(() => {
    if (isExpanded && !cachedHtml && !cachedImage && !outputHtml && !outputImage && !isLoading) {
      console.log('Visualization expanded for first time, triggering execution');
      setIsLoading(true); // Trigger re-execution by changing loading state
    }
  }, [isExpanded]);

  return (
    <div className="my-2 border rounded-lg overflow-hidden bg-background">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start p-3 hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDownIcon className="mr-2 h-4 w-4" />
        ) : (
          <ChevronRightIcon className="mr-2 h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          📊 {title}
        </span>
        {description && (
          <span className="ml-2 text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </Button>
      
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-[800px]' : 'max-h-0'
        )}
      >
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
            <div className="mt-2 text-sm">Generating visualization...</div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-500 text-sm">
            <div className="font-semibold">Error:</div>
            <pre className="mt-1 whitespace-pre-wrap">{error}</pre>
          </div>
        ) : outputHtml ? (
          <div className="w-full min-h-[500px] max-h-[700px] bg-white overflow-auto">
            <iframe
              srcDoc={outputHtml}
              className="w-full min-h-[500px] border-0"
              title={`Interactive Chart - ${title}`}
              sandbox="allow-scripts"
              style={{ height: '100%' }}
            />
          </div>
        ) : outputImage ? (
          <div className="p-4 bg-white">
            <img
              src={outputImage}
              alt={title}
              className="max-w-full h-auto mx-auto"
            />
          </div>
        ) : (
          <div className="p-4 text-muted-foreground text-sm text-center">
            No visualization output
          </div>
        )}
      </div>
    </div>
  );
}