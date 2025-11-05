'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface PlotlyChartProps {
  chartUrl: string;
  className?: string;
}

export function PlotlyChart({ chartUrl, className = '' }: PlotlyChartProps) {
  const [figData, setFigData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isValidPlotly, setIsValidPlotly] = useState(true);
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(chartUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load chart data');
        return res.json();
      })
      .then((data) => {
        // Plotly JSON might be a string or object
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;

        // Check if this is a valid Plotly figure (must have 'data' array)
        if (!parsed.data || !Array.isArray(parsed.data)) {
          setIsValidPlotly(false);
          setLoading(false);
          return;
        }

        setFigData(parsed);
        setIsValidPlotly(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading Plotly chart:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [chartUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[400px] bg-muted/20 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          <span className="text-sm text-muted-foreground">Loading chart...</span>
        </div>
      </div>
    );
  }

  // If error, show error state
  if (error) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[400px] bg-destructive/10 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-destructive font-medium mb-2">Failed to load chart</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // If not a valid Plotly JSON, return null (don't show anything)
  if (!isValidPlotly || !figData) {
    return null;
  }

  // Theme-aware colors
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const textColor = isDark ? '#F0F4F8' : '#171717';
  const hoverBgColor = isDark ? '#1A2332' : '#FFFFFF';
  const hoverBorderColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';

  return (
    <div className={className}>
      <Plot
        data={figData.data}
        layout={{
          ...figData.layout,
          // Override theme for consistency with app
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: {
            family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            size: 12,
            color: textColor,
          },
          // Theme-aware hover labels
          hoverlabel: {
            bgcolor: hoverBgColor,
            bordercolor: hoverBorderColor,
            font: {
              family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              size: 13,
              color: textColor,
            },
          },
          // Theme-aware grid
          xaxis: {
            ...figData.layout?.xaxis,
            gridcolor: gridColor,
            linecolor: gridColor,
            tickfont: { color: textColor },
            titlefont: { color: textColor },
          },
          yaxis: {
            ...figData.layout?.yaxis,
            gridcolor: gridColor,
            linecolor: gridColor,
            tickfont: { color: textColor },
            titlefont: { color: textColor },
          },
          // Legend
          legend: {
            ...figData.layout?.legend,
            font: { color: textColor },
          },
          // Title
          title: {
            ...figData.layout?.title,
            font: {
              ...figData.layout?.title?.font,
              color: textColor,
            },
          },
          // Responsive
          autosize: true,
          margin: figData.layout?.margin || { l: 50, r: 50, t: 50, b: 50 },
        }}
        config={{
          displayModeBar: true,
          displaylogo: false,
          responsive: true,
          modeBarButtonsToRemove: ['lasso2d', 'select2d'],
          toImageButtonOptions: {
            format: 'png',
            filename: 'chart',
            scale: 2,
          },
        }}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
        className="plotly-chart"
      />
    </div>
  );
}
