// Jina Embeddings API client
const JINA_API_URL = 'https://api.jina.ai/v1/embeddings'

export interface EmbeddingOptions {
  task?: 'retrieval.query' | 'retrieval.passage' | 'text-matching' | 'classification' | 'separation'
  dimensions?: number // Optional dimension reduction
}

export class JinaEmbeddings {
  private apiKey: string | undefined

  constructor(apiKey?: string) {
    this.apiKey = apiKey
  }
  
  private getApiKey(): string {
    // Try constructor-provided key first, then environment variable
    const key = this.apiKey || process.env.JINA_API_KEY
    if (!key) {
      throw new Error('JINA_API_KEY is not set. Please set it in environment variables or pass it to the constructor.')
    }
    return key
  }

  /**
   * Generate embeddings for text inputs
   * 
   * Task selection guide:
   * - retrieval.query: When embedding user search queries
   * - retrieval.passage: When embedding documents to be searched
   * - text-matching: For similarity comparison between texts
   * - classification: For text categorization
   * - separation: For clustering and visualization
   */
  async embed(
    input: string | string[], 
    options: EmbeddingOptions = {}
  ): Promise<number[][]> {
    const { 
      task = 'retrieval.passage', // Default for documents
      dimensions 
    } = options

    const data = {
      model: 'jina-embeddings-v3',
      task,
      input: Array.isArray(input) ? input : [input],
      ...(dimensions && { dimensions })
    }

    const response = await fetch(JINA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getApiKey()}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`Jina API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    return result.data.map((item: any) => item.embedding)
  }

  /**
   * Embed a search query (optimized for search)
   */
  async embedQuery(query: string, dimensions = 256): Promise<number[]> {
    const embeddings = await this.embed(query, { 
      task: 'retrieval.query', // Optimized for queries
      dimensions // Reduce dimensions for faster search
    })
    return embeddings[0]
  }

  /**
   * Embed documents (optimized for being searched)
   */
  async embedDocuments(documents: string[], dimensions = 256): Promise<number[][]> {
    return this.embed(documents, { 
      task: 'retrieval.passage', // Optimized for documents
      dimensions // Reduce dimensions for faster indexing
    })
  }
}

// Export singleton instance
export const jinaEmbeddings = new JinaEmbeddings()