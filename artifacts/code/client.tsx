import { Artifact } from '@/components/create-artifact';
import { CodeEditor } from '@/components/code-editor';
import {
  CopyIcon,
  LogsIcon,
  MessageIcon,
  PlayIcon,
  RedoIcon,
  UndoIcon,
} from '@/components/icons';
import { toast } from 'sonner';
import { generateUUID } from '@/lib/utils';
import {
  Console,
  type ConsoleOutput,
  type ConsoleOutputContent,
} from '@/components/console';
import { useState } from 'react';

const OUTPUT_HANDLERS = {
  matplotlib: `
    import io
    import base64
    from matplotlib import pyplot as plt

    # Clear any existing plots
    plt.clf()
    plt.close('all')

    # Switch to agg backend
    plt.switch_backend('agg')

    def setup_matplotlib_output():
        def custom_show():
            if plt.gcf().get_size_inches().prod() * plt.gcf().dpi ** 2 > 25_000_000:
                print("Warning: Plot size too large, reducing quality")
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
  `,
  plotly: `
    try:
        import plotly
        import plotly.graph_objects as go
        
        # Monkey patch plotly to output to console
        def custom_plotly_show(self, *args, **kwargs):
            # Convert to HTML string with inline plotly.js
            html_str = self.to_html(include_plotlyjs='inline', div_id="plotly-div")
            # Output as special format for frontend to recognize
            print("PLOTLY_HTML_START")
            print(html_str)
            print("PLOTLY_HTML_END")
        
        # Patch both graph_objects.Figure and express figures
        plotly.graph_objects.Figure.show = custom_plotly_show
    except ImportError as e:
        pass
  `,
  basic: `
    # Basic output capture setup
  `,
};

function detectRequiredHandlers(code: string): string[] {
  const handlers: string[] = ['basic'];

  if (code.includes('matplotlib') || code.includes('plt.')) {
    handlers.push('matplotlib');
  }
  
  if (code.includes('plotly') || code.includes('px.') || code.includes('go.') || code.includes('fig.show()')) {
    handlers.push('plotly');
  }

  return handlers;
}

// Always Python code
function detectCodeType(code: string): 'python' {
  return 'python';
}


interface Metadata {
  outputs: Array<ConsoleOutput>;
}

export const codeArtifact = new Artifact<'code', Metadata>({
  kind: 'code',
  description:
    'Useful for code generation; Supports both Python and React/Recharts visualization code.',
  initialize: async ({ setMetadata }) => {
    setMetadata({
      outputs: [],
    });
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === 'data-codeDelta') {
      setArtifact((draftArtifact) => {
        const newContent = streamPart.data;
        
        return {
          ...draftArtifact,
          content: newContent,
          isVisible:
            draftArtifact.status === 'streaming' &&
            draftArtifact.content.length > 300 &&
            draftArtifact.content.length < 310
              ? true
              : draftArtifact.isVisible,
          status: 'streaming',
        };
      });
    }
  },
  content: ({ content, metadata, setMetadata, ...props }) => {
    const [showConsole, setShowConsole] = useState(false);
    const hasVisualization = metadata?.outputs?.some(output => 
      output.contents?.some(c => c.type === 'html' || c.type === 'image')
    );
    
    return (
      <>
        <div className="px-1">
          <CodeEditor {...props} content={content} />
        </div>

        {/* Inline visualization display */}
        {metadata?.outputs && metadata.outputs.length > 0 && (
          <div className="border-t">
            {/* Toggle between inline view and console */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
              <span className="text-sm font-medium">Output</span>
              <button
                onClick={() => setShowConsole(!showConsole)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showConsole ? 'Show inline' : 'Show console'}
              </button>
            </div>
            
            {!showConsole ? (
              /* Inline visualization */
              <div className="p-3">
                {metadata.outputs.map((output) => (
                  <div key={output.id}>
                    {output.status === 'completed' && output.contents.map((content, idx) => {
                      if (content.type === 'html') {
                        return (
                          <div key={idx} className="my-2">
                            <div className="w-full h-[400px] bg-white rounded border">
                              <iframe
                                srcDoc={content.value}
                                className="w-full h-full border-0"
                                title="Interactive Chart"
                                sandbox="allow-scripts"
                              />
                            </div>
                          </div>
                        );
                      } else if (content.type === 'image') {
                        return (
                          <div key={idx} className="my-2">
                            <img
                              src={content.value}
                              alt="Chart"
                              className="max-w-full h-auto mx-auto rounded border"
                            />
                          </div>
                        );
                      } else if (content.type === 'text' && content.value.trim()) {
                        return (
                          <div key={idx} className="my-1 p-2 bg-muted rounded font-mono text-sm">
                            {content.value}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                ))}
              </div>
            ) : (
              /* Traditional console view */
              <Console
                consoleOutputs={metadata.outputs}
                setConsoleOutputs={() => {
                  setMetadata({
                    ...metadata,
                    outputs: [],
                  });
                }}
              />
            )}
          </div>
        )}
      </>
    );
  },
  actions: [
    {
      icon: <PlayIcon size={18} />,
      label: 'Run',
      description: 'Execute code',
      onClick: async ({ content, metadata, setMetadata }) => {
        // Run Python code with Pyodide
        const runId = generateUUID();
        const outputContent: Array<ConsoleOutputContent> = [];

        setMetadata((metadata) => ({
          ...metadata,
          outputs: [
            ...metadata.outputs,
            {
              id: runId,
              contents: [],
              status: 'in_progress',
            },
          ],
        }));

        try {
          // @ts-expect-error - loadPyodide is not defined
          const currentPyodideInstance = await globalThis.loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
          });

          let plotlyHtmlBuffer = '';
          let collectingPlotly = false;
          
          currentPyodideInstance.setStdout({
            batched: (output: string) => {
              // Check for Plotly HTML output
              if (output.includes('PLOTLY_HTML_START')) {
                collectingPlotly = true;
                plotlyHtmlBuffer = '';
                return;
              }
              
              if (collectingPlotly) {
                if (output.includes('PLOTLY_HTML_END')) {
                  // Push the complete HTML as an iframe
                  outputContent.push({
                    type: 'html',
                    value: plotlyHtmlBuffer,
                  });
                  collectingPlotly = false;
                  plotlyHtmlBuffer = '';
                } else {
                  plotlyHtmlBuffer += output;
                }
                return;
              }
              
              // Regular output handling
              outputContent.push({
                type: output.startsWith('data:image/png;base64')
                  ? 'image'
                  : 'text',
                value: output,
              });
            },
          });

          // Load packages from imports
          await currentPyodideInstance.loadPackagesFromImports(content, {
            messageCallback: (message: string) => {
              setMetadata((metadata) => ({
                ...metadata,
                outputs: [
                  ...metadata.outputs.filter((output) => output.id !== runId),
                  {
                    id: runId,
                    contents: [{ type: 'text', value: message }],
                    status: 'loading_packages',
                  },
                ],
              }));
            },
          });

          // Load micropip first (required for installing packages)
          await currentPyodideInstance.loadPackage('micropip');
          
          // Explicitly load plotly if needed
          if (content.includes('plotly') || content.includes('px.') || content.includes('go.')) {
            try {
              // Install plotly via micropip
              await currentPyodideInstance.runPythonAsync(`
                import micropip
                try:
                    import plotly
                except ImportError:
                    await micropip.install('plotly')
              `);
            } catch (e) {
              console.error('Failed to load plotly:', e);
            }
          }

          const requiredHandlers = detectRequiredHandlers(content);
          
          for (const handler of requiredHandlers) {
            if (OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS]) {
              try {
                await currentPyodideInstance.runPythonAsync(
                  OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS],
                );
                
                if (handler === 'matplotlib') {
                  await currentPyodideInstance.runPythonAsync(
                    'setup_matplotlib_output()',
                  );
                }
              } catch (e) {
                console.error(`Error setting up ${handler} handler:`, e);
              }
            }
          }

          await currentPyodideInstance.runPythonAsync(content);

          setMetadata((metadata) => ({
            ...metadata,
            outputs: [
              ...metadata.outputs.filter((output) => output.id !== runId),
              {
                id: runId,
                contents: outputContent,
                status: 'completed',
              },
            ],
          }));
        } catch (error: any) {
          setMetadata((metadata) => ({
            ...metadata,
            outputs: [
              ...metadata.outputs.filter((output) => output.id !== runId),
              {
                id: runId,
                contents: [{ type: 'text', value: error.message }],
                status: 'failed',
              },
            ],
          }));
        }
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy code to clipboard',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard!');
      },
    },
  ],
  toolbar: [
    {
      icon: <MessageIcon />,
      description: 'Add comments',
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'Add comments to the code snippet for understanding',
            },
          ],
        });
      },
    },
    {
      icon: <LogsIcon />,
      description: 'Add logs',
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'Add logs to the code snippet for debugging',
            },
          ],
        });
      },
    },
  ],
});