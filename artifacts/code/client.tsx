'use client';

import { CopyIcon, MessageCircle, PlayIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Artifact } from '@/components/create-artifact';
import { Console } from '@/components/console';

interface CodeArtifactMetadata {
  outputs?: Array<{
    id: string;
    status: 'in_progress' | 'loading_packages' | 'completed' | 'failed';
    contents: Array<{
      type: 'text' | 'image' | 'html';
      value: string;
    }>;
  }>;
}

// Simplified code artifact client without Python execution
export const codeArtifact = new Artifact<'code', CodeArtifactMetadata>({
  kind: 'code',
  description: 'Code execution environment',
  content: ({ content, metadata }) => {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto border-b">
          <pre className="whitespace-pre-wrap p-4 text-sm leading-relaxed">
            {content}
          </pre>
        </div>
        {metadata.outputs && metadata.outputs.length > 0 && (
          <div className="flex-1 overflow-auto">
            <Console
              consoleOutputs={metadata.outputs.map((output) => ({
                id: output.id,
                status: output.status as 'in_progress' | 'loading_packages' | 'completed' | 'failed',
                contents: output.contents || [],
              }))}
              setConsoleOutputs={() => {}}
            />
          </div>
        )}
      </div>
    );
  },
  actions: [
    {
      icon: <PlayIcon size={18} />,
      label: 'Run',
      description: 'Execute code',
      onClick: async ({ content, metadata, setMetadata }) => {
        const runId = `run-${Date.now()}`;

        setMetadata((metadata: any) => ({
          ...metadata,
          outputs: [
            ...(metadata.outputs || []),
            {
              id: runId,
              contents: [{
                type: 'text',
                value: '⚠️ Code execution has been simplified.\n\nPython execution is no longer supported.\nFor data visualizations, please use the createJSVisualization tool instead.\n\nJavaScript/TypeScript execution may be added in future updates.'
              }],
              status: 'completed',
            },
          ],
        }));
      },
      isDisabled: ({ isCurrentVersion }) => {
        return !isCurrentVersion;
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
      icon: <MessageCircle />,
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
  ],
  onStreamPart: ({ setMetadata, setArtifact, streamPart }) => {
    // Handle streaming updates if needed
  },
});