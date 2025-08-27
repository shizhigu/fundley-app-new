'use client';

import { useEffect } from 'react';
import { useArtifact } from './use-artifact';
import type { UIArtifact } from '@/components/artifact';

const STORAGE_KEY = 'artifact-state';
const STORAGE_VERSION = '1.0';

interface StoredArtifact {
  version: string;
  artifact: UIArtifact;
  timestamp: string;
}

/**
 * Hook to persist artifact state across sessions
 * Saves to localStorage and restores on mount
 */
export function useArtifactPersistence() {
  const { artifact, setArtifact } = useArtifact();

  // Load artifact from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredArtifact = JSON.parse(stored);
        
        // Check version compatibility
        if (parsed.version === STORAGE_VERSION) {
          // Check if artifact is less than 24 hours old
          const age = Date.now() - new Date(parsed.timestamp).getTime();
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (age < maxAge && parsed.artifact.documentId !== 'init') {
            // Restore the artifact state
            setArtifact(parsed.artifact);
          } else {
            // Clear old artifact
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      }
    } catch (error) {
      console.error('Error loading artifact from storage:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save artifact to localStorage whenever it changes
  useEffect(() => {
    if (artifact.documentId && artifact.documentId !== 'init') {
      try {
        const toStore: StoredArtifact = {
          version: STORAGE_VERSION,
          artifact,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch (error) {
        console.error('Error saving artifact to storage:', error);
      }
    }
  }, [artifact]);

  // Function to manually clear persisted artifact
  const clearPersistedArtifact = () => {
    localStorage.removeItem(STORAGE_KEY);
    setArtifact({
      documentId: 'init',
      content: '',
      kind: 'text',
      title: '',
      status: 'idle',
      isVisible: false,
      boundingBox: {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      },
    });
  };

  return {
    clearPersistedArtifact
  };
}

/**
 * Hook to get list of recently accessed documents from localStorage
 */
export function useRecentDocuments() {
  const RECENT_KEY = 'recent-documents';
  const MAX_RECENT = 10;

  const addRecentDocument = (documentId: string, title: string, kind: string) => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      let recent = stored ? JSON.parse(stored) : [];
      
      // Remove if already exists
      recent = recent.filter((doc: any) => doc.id !== documentId);
      
      // Add to beginning
      recent.unshift({
        id: documentId,
        title,
        kind,
        accessedAt: new Date().toISOString()
      });
      
      // Keep only MAX_RECENT items
      recent = recent.slice(0, MAX_RECENT);
      
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch (error) {
      console.error('Error saving recent document:', error);
    }
  };

  const getRecentDocuments = () => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading recent documents:', error);
      return [];
    }
  };

  const clearRecentDocuments = () => {
    localStorage.removeItem(RECENT_KEY);
  };

  return {
    addRecentDocument,
    getRecentDocuments,
    clearRecentDocuments
  };
}