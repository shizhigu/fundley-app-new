'use client';

// Global Pyodide instance manager to prevent multiple instances and save memory
class PyodideManager {
  private static instance: PyodideManager | null = null;
  private pyodide: any = null;
  private loadingPromise: Promise<any> | null = null;
  private lastUsed: number = Date.now();
  private cleanupTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Memory cleanup after 5 minutes of inactivity
  private readonly CLEANUP_DELAY = 5 * 60 * 1000;
  
  private constructor() {}
  
  static getInstance(): PyodideManager {
    // Only create instance on client side
    if (typeof window === 'undefined') {
      throw new Error('PyodideManager can only be used on client side');
    }
    
    if (!PyodideManager.instance) {
      PyodideManager.instance = new PyodideManager();
    }
    return PyodideManager.instance;
  }
  
  async getPyodide(): Promise<any> {
    this.lastUsed = Date.now();
    this.scheduleCleanup();
    
    // If already loaded, return it
    if (this.pyodide) {
      return this.pyodide;
    }
    
    // If currently loading, wait for it
    if (this.loadingPromise) {
      return this.loadingPromise;
    }
    
    // Start loading
    this.loadingPromise = this.loadPyodide();
    try {
      this.pyodide = await this.loadingPromise;
      return this.pyodide;
    } finally {
      this.loadingPromise = null;
    }
  }
  
  private async loadPyodide() {
    console.log('Loading Pyodide (single global instance)...');
    
    // @ts-expect-error - loadPyodide is global
    const pyodide = await globalThis.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
    });
    
    // Pre-load commonly used packages
    await pyodide.loadPackage('micropip');
    
    console.log('Pyodide loaded successfully');
    return pyodide;
  }
  
  private scheduleCleanup() {
    // Clear existing timeout
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
    }
    
    // Schedule new cleanup
    this.cleanupTimeout = setTimeout(() => {
      const timeSinceLastUse = Date.now() - this.lastUsed;
      if (timeSinceLastUse >= this.CLEANUP_DELAY) {
        this.cleanup();
      } else {
        // Reschedule if still within the window
        this.scheduleCleanup();
      }
    }, this.CLEANUP_DELAY);
  }
  
  cleanup() {
    console.log('Cleaning up Pyodide instance to free memory...');
    
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
    
    // Destroy Pyodide instance
    if (this.pyodide) {
      try {
        // Try to clean up Python resources
        this.pyodide.runPython(`
          import gc
          gc.collect()
        `);
      } catch (e) {
        // Ignore errors during cleanup
      }
      
      this.pyodide = null;
    }
    
    this.loadingPromise = null;
    
    // Force garbage collection if available (Chrome/Edge)
    if (typeof (globalThis as any).gc === 'function') {
      (globalThis as any).gc();
    }
  }
  
  // Check if Pyodide is currently loaded
  isLoaded(): boolean {
    return this.pyodide !== null;
  }
  
  // Get memory usage estimate
  getMemoryEstimate(): string {
    if (!this.pyodide) {
      return '0 MB';
    }
    
    // Rough estimate: base Pyodide is ~100MB + loaded packages
    const baseSize = 100;
    const estimatedTotal = baseSize; // Could be enhanced to track loaded packages
    return `~${estimatedTotal} MB`;
  }
}

// Only export a getter function to avoid server-side instantiation
export const getPyodideManager = () => {
  if (typeof window === 'undefined') {
    // Return a dummy object on server side
    return {
      getPyodide: () => Promise.reject(new Error('Pyodide not available on server')),
      cleanup: () => {},
      isLoaded: () => false,
      getMemoryEstimate: () => '0 MB'
    };
  }
  return PyodideManager.getInstance();
};