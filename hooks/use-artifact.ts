// DEPRECATED: Artifact system removed
// This file is disabled to prevent build errors

export const initialArtifactData = {
  documentId: 'init',
  kind: 'text' as const,
  title: '',
  content: '',
  modality: 'text' as const,
  language: 'plaintext',
  isStreaming: false,
  bounds: {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  },
};

export function useArtifact() {
  return {
    artifact: initialArtifactData,
    setArtifact: () => {},
    resetArtifact: () => {},
    updateArtifact: () => {},
    isLoading: false,
    error: null,
    mutate: () => {},
  };
}

export function useArtifactSelector(selector?: any) {
  // Return default values for any selector
  return false; // Most common use case seems to be checking visibility
}