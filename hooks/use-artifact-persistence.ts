// DEPRECATED: Artifact system removed
// This file is disabled to prevent build errors

export function useArtifactPersistence(chatId?: string) {
  // No-op implementation since artifacts are removed
  return {};
}

export function useRecentDocuments() {
  // No-op implementation since artifacts are removed
  return {
    addRecentDocument: () => {},
    getRecentDocuments: () => [],
    clearRecentDocuments: () => {}
  };
}