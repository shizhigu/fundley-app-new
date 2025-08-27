'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

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
  const pyodideRef = useRef<any>(null);

  // Save cache to server
  const saveCache = async (html: string | null, image: string | null) => {
    if (!messageId) {
      console.log('No messageId provided, skipping cache save');
      return;
    }
    
    console.log('Saving visualization cache for message:', messageId);
    
    try {
      const response = await fetch('/api/visualization/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          title,
          code,
          htmlContent: html,
          imageUrl: image,
        }),
      });
      
      if (!response.ok) {
        console.error('Cache save failed:', await response.text());
      } else {
        console.log('Cache saved successfully');
      }
    } catch (err) {
      console.error('Failed to save cache:', err);
    }
  };

  useEffect(() => {
    // If we have cached content, skip execution
    if (cachedHtml || cachedImage) {
      setIsLoading(false);
      return;
    }

    const executeCode = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load Pyodide if not already loaded
        if (!pyodideRef.current) {
          // @ts-expect-error - loadPyodide is global
          pyodideRef.current = await globalThis.loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
          });
          
          // Load micropip for package installation
          await pyodideRef.current.loadPackage('micropip');
        }
        
        const pyodide = pyodideRef.current;
        
        // Setup output capture
        let plotlyHtmlBuffer = '';
        let collectingPlotly = false;
        let matplotlibImage = null;
        
        pyodide.setStdout({
          batched: (output: string) => {
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
              matplotlibImage = output;
              setOutputImage(output);
              // Save to cache
              saveCache(null, output);
            }
          },
        });
        
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
        
        // Execute the code
        await pyodide.runPythonAsync(code);
        
        setIsLoading(false);
      } catch (err: any) {
        console.error('Visualization execution error:', err);
        setError(err.message || 'Failed to execute visualization');
        setIsLoading(false);
      }
    };
    
    executeCode();
  }, [code, id]);

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
          isExpanded ? 'max-h-[600px]' : 'max-h-0'
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
          <div className="w-full h-[500px] bg-white">
            <iframe
              srcDoc={outputHtml}
              className="w-full h-full border-0"
              title={`Interactive Chart - ${title}`}
              sandbox="allow-scripts"
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