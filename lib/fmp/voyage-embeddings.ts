// Voyage AI Embeddings client
const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'

export interface VoyageEmbeddingOptions {
  inputType?: 'query' | 'document' | null
  truncation?: boolean
  model?: string
}

export class VoyageEmbeddings {
  private apiKey: string | undefined
  private model = 'voyage-finance-2' // Financial domain-specific model

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey
    if (model) this.model = model
  }
  
  private getApiKey(): string {
    const key = this.apiKey || process.env.VOYAGE_API_KEY
    if (!key) {
      throw new Error('VOYAGE_API_KEY is not set. Please set it in environment variables or pass it to the constructor.')
    }
    return key
  }

  /**
   * Generate embeddings for text inputs using Voyage AI
   */
  async embed(
    input: string | string[], 
    options: VoyageEmbeddingOptions = {}
  ): Promise<number[][]> {
    const { 
      inputType = null,
      truncation = true
    } = options

    const requestBody: any = {
      model: this.model,
      input: Array.isArray(input) ? input : [input],
      truncation
    }

    // Only add input_type if it's specified
    if (inputType) {
      requestBody.input_type = inputType
    }

    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getApiKey()}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Voyage API error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    return result.data.map((item: any) => item.embedding)
  }

  /**
   * Embed a search query (optimized for search)
   */
  async embedQuery(query: string): Promise<number[]> {
    const embeddings = await this.embed(query, { 
      inputType: 'query' // Optimized for queries
    })
    return embeddings[0]
  }

  /**
   * Embed documents (optimized for being searched)
   */
  async embedDocuments(documents: string[]): Promise<number[][]> {
    return this.embed(documents, { 
      inputType: 'document' // Optimized for documents
    })
  }
}

// Export singleton instance with voyage-finance-2 model
export const voyageEmbeddings = new VoyageEmbeddings()