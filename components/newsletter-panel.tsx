'use client'

import { useState, useEffect } from 'react'
import { Newspaper, Loader2, ExternalLink, Calendar, TrendingUp, TrendingDown, Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDistanceToNow } from 'date-fns'

interface NewsArticle {
  title: string
  text: string
  symbol: string
  publishedDate: string
  site: string
  url: string
  image?: string
  sentiment?: 'positive' | 'negative' | 'neutral'
}

interface NewsResponse {
  news: NewsArticle[]
  total: number
}

export function NewsletterPanel() {
  const t = useTranslations('newsletter')
  const [news, setNews] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [displayCount, setDisplayCount] = useState(30) // Show 30 items initially
  const [searchQuery, setSearchQuery] = useState('')

  const ITEMS_PER_PAGE = 30

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/news')

      if (!response.ok) {
        throw new Error('Failed to fetch news')
      }

      const data: NewsResponse = await response.json()
      setNews(data.news || [])
    } catch (err) {
      console.error('Error fetching news:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch news')
    } finally {
      setLoading(false)
    }
  }

  const getSentimentIcon = (sentiment?: string) => {
    if (sentiment === 'positive') return <TrendingUp className="w-3 h-3 text-green-500" />
    if (sentiment === 'negative') return <TrendingDown className="w-3 h-3 text-red-500" />
    return null
  }

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_PAGE)
  }

  // Filter news based on search query
  const filteredNews = news.filter(article => {
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase()
    return (
      article.symbol.toLowerCase().includes(query) ||
      article.title.toLowerCase().includes(query) ||
      article.text.toLowerCase().includes(query) ||
      article.site.toLowerCase().includes(query)
    )
  })

  // Get displayed news (limit by displayCount)
  const displayedNews = filteredNews.slice(0, displayCount)
  const hasMore = displayCount < filteredNews.length

  // Format publish time - API returns UTC ISO string, browser automatically converts to local
  const formatPublishTime = (publishedDate: string) => {
    try {
      const date = new Date(publishedDate)

      if (isNaN(date.getTime())) {
        return 'Unknown time'
      }

      // Use relative time (e.g., "2 hours ago")
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Unknown time'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-4 text-center">
        <Newspaper className="w-12 h-12 text-muted-foreground opacity-20" />
        <div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNews}
            className="mt-4"
          >
            {t('retry')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-brand-primary" />
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <Badge variant="secondary" className="ml-auto">
            {displayedNews.length}/{filteredNews.length}
            {searchQuery && ` (of ${news.length})`}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('description')}
        </p>

        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by symbol, title, or content..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setDisplayCount(ITEMS_PER_PAGE) // Reset display count when searching
            }}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setDisplayCount(ITEMS_PER_PAGE)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* News List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {news.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Newspaper className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">{t('noNews')}</p>
            <p className="text-xs mt-1">{t('addSymbolsHint')}</p>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Search className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">No results found for "{searchQuery}"</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-2"
            >
              Clear search
            </Button>
          </div>
        ) : (
          <>
            {displayedNews.map((article, index) => (
            <Card
              key={index}
              className="overflow-hidden hover:bg-accent transition-colors cursor-pointer group"
              onClick={() => window.open(article.url, '_blank')}
            >
              <div className="flex gap-3 p-3">
                {/* Left: Thumbnail */}
                {article.image && (
                  <div className="relative w-24 h-24 flex-shrink-0 bg-muted rounded overflow-hidden">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        // Hide parent div if image fails
                        const parent = e.currentTarget.parentElement
                        if (parent) parent.style.display = 'none'
                      }}
                    />
                  </div>
                )}

                {/* Right: Content */}
                <div className="flex-1 min-w-0 flex flex-col">
                  {/* Header: Symbol + Time */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className="text-xs font-mono">
                      {article.symbol}
                    </Badge>
                    {getSentimentIcon(article.sentiment)}
                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatPublishTime(article.publishedDate)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-base mb-1.5 line-clamp-2 group-hover:text-brand-primary transition-colors">
                    {article.title}
                  </h3>

                  {/* Text Preview */}
                  <p className="text-sm text-foreground/70 line-clamp-2 mb-2 flex-1">
                    {article.text}
                  </p>

                  {/* Footer: Source + Link */}
                  <div className="flex items-center justify-between text-xs mt-auto">
                    <span className="text-muted-foreground">
                      {article.site}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand-primary transition-colors" />
                  </div>
                </div>
              </div>
            </Card>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-2 pb-2">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  className="w-full"
                >
                  {t('loadMore')} ({filteredNews.length - displayCount} {t('remaining')})
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
