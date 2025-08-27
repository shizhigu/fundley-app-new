import { ALL_FINANCIAL_FIELDS, FieldMetadata } from './field-metadata'
import { searchFields as qdrantSearchFields, indexFieldMetadata, initializeFieldCollection } from './qdrant-client'

export class FieldSearch {
  private fields: FieldMetadata[] = []
  private initialized = false
  
  constructor(fields: FieldMetadata[] = ALL_FINANCIAL_FIELDS) {
    this.fields = fields
  }
  
  /**
   * Initialize Qdrant collection and index all field metadata
   * This should be called once during application startup
   */
  async initialize() {
    if (this.initialized) {
      console.log('Field search already initialized')
      return
    }
    
    try {
      // Initialize Qdrant collection
      await initializeFieldCollection()
      
      // Index all field metadata
      await indexFieldMetadata(this.fields)
      
      this.initialized = true
      console.log('Field search initialized successfully')
    } catch (error) {
      console.error('Error initializing field search:', error)
      // Fall back to in-memory search if Qdrant fails
      console.warn('Falling back to in-memory search')
    }
  }
  
  /**
   * Search for fields matching a query using Qdrant vector search
   */
  async searchFields(query: string, topK: number = 5): Promise<FieldMetadata[]> {
    try {
      // Use Qdrant for semantic search
      const searchResults = await qdrantSearchFields(query, topK)
      
      // Return the results directly with all metadata from Qdrant
      return searchResults.map(result => ({
        field: result.field,
        tool: result.tool,
        name: result.name,
        description: result.description,
        category: result.category,
        useCases: result.useCases || [],
        aliases: result.aliases || [],
        unit: result.statement // if needed
      } as FieldMetadata))
    } catch (error) {
      console.error('Qdrant search failed, falling back to simple search:', error)
      // Fallback to simple keyword matching
      return this.simpleSearch(query, topK)
    }
  }
  
  /**
   * Simple keyword-based fallback search
   */
  private simpleSearch(query: string, topK: number): FieldMetadata[] {
    const queryLower = query.toLowerCase()
    
    // Score each field based on keyword matches
    const scored = this.fields.map(field => {
      let score = 0
      
      // Check field name
      if (field.field.toLowerCase().includes(queryLower)) score += 3
      if (field.name.toLowerCase().includes(queryLower)) score += 2
      
      // Check description
      if (field.description.toLowerCase().includes(queryLower)) score += 1
      
      // Check aliases
      if (field.aliases) {
        field.aliases.forEach(alias => {
          if (alias.toLowerCase().includes(queryLower)) score += 2
        })
      }
      
      return { field, score }
    })
    
    // Sort by score and return top K
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(s => s.field)
  }
  
  /**
   * Get field by exact name
   * Simply look up in local array - no need for Qdrant filter
   */
  async getField(fieldName: string): Promise<FieldMetadata | undefined> {
    // Direct local lookup is sufficient
    // The field name came from searchFields which already has all metadata
    return this.fields.find(f => f.field === fieldName)
  }
  
  /**
   * Get multiple fields
   */
  async getFields(fieldNames: string[]): Promise<FieldMetadata[]> {
    const results = await Promise.all(
      fieldNames.map(name => this.getField(name))
    )
    return results.filter((f): f is FieldMetadata => f !== undefined)
  }
}

// Export singleton instance
export const fieldSearch = new FieldSearch()

// Initialize on module load (optional - can be done in app startup)
if (process.env.QDRANT_URL && process.env.QDRANT_API_KEY && process.env.JINA_API_KEY) {
  fieldSearch.initialize().catch(error => {
    console.error('Failed to initialize field search:', error)
  })
}