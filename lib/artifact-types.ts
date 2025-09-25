// Local artifact type definitions for AgentOS migration
// This file replaces deleted artifact components with local types

export type ArtifactKind = 'text' | 'code' | 'sheet';

export const artifactDefinitions = [
  { kind: 'text' as const },
  { kind: 'code' as const },
  { kind: 'sheet' as const }
];

export interface UIArtifact {
  title: string;
  documentId: string;
  kind: ArtifactKind;
  content: string;
  isVisible: boolean;
  status: 'streaming' | 'idle';
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface ArtifactToolbarItem {
  id: string;
  name: string;
  icon: any;
  description: string;
}