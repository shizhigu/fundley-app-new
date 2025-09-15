// Test example for TradingView Lightweight Charts v5 markers
// This example shows the correct way to add quarterly text labels

import { createChart, LineSeries, createSeriesMarkers } from 'lightweight-charts';

// Sample data with quarterly points
const sampleData = [
  { time: '2024-01-15', value: 100 },
  { time: '2024-04-15', value: 120 },
  { time: '2024-07-15', value: 110 },
  { time: '2024-10-15', value: 130 },
];

// Quarterly markers WITHOUT visible circular dots
const quarterlyMarkers = [
  {
    time: '2024-01-15',
    position: 'aboveBar' as const,
    color: 'transparent', // Makes the circular marker invisible
    shape: 'circle' as const,
    text: '2024Q1',
    size: 0, // Size 0 hides the circular marker completely
  },
  {
    time: '2024-04-15',
    position: 'aboveBar' as const,
    color: 'transparent',
    shape: 'circle' as const,
    text: '2024Q2',
    size: 0,
  },
  {
    time: '2024-07-15',
    position: 'aboveBar' as const,
    color: 'transparent',
    shape: 'circle' as const,
    text: '2024Q3',
    size: 0,
  },
  {
    time: '2024-10-15',
    position: 'aboveBar' as const,
    color: 'transparent',
    shape: 'circle' as const,
    text: '2024Q4',
    size: 0,
  },
];

// Function to create chart with markers
export function createTestChart(container: HTMLDivElement) {
  // Create chart
  const chart = createChart(container, {
    width: 800,
    height: 400,
    layout: {
      background: { color: 'transparent' },
      textColor: '#333',
    },
  });

  // Add step-line series (using LineSeries with thick line)
  const series = chart.addSeries(LineSeries, {
    color: '#FF6D00',
    lineWidth: 3,
    pointMarkersVisible: false, // Don't show data point markers
    lastValueVisible: true,
    priceLineVisible: false,
  });

  // Set data
  series.setData(sampleData);

  // ✅ CORRECT V5 API: Use createSeriesMarkers
  const markersInstance = createSeriesMarkers(series, quarterlyMarkers);

  // You can also update markers later:
  // markersInstance.setMarkers([...newMarkers]);

  // Or get current markers:
  // const currentMarkers = markersInstance.markers();

  chart.timeScale().fitContent();

  return { chart, series, markersInstance };
}

// Alternative marker configurations:

// Markers below the line instead of above
export const belowBarMarkers = quarterlyMarkers.map(marker => ({
  ...marker,
  position: 'belowBar' as const,
}));

// Markers with different text styling (if supported by theme)
export const styledMarkers = quarterlyMarkers.map(marker => ({
  ...marker,
  text: `📊 ${marker.text}`, // Add emoji prefix
}));

// Markers with custom colors for text (note: color affects marker, not text)
export const coloredMarkers = quarterlyMarkers.map((marker, index) => ({
  ...marker,
  color: ['#FF6D00', '#26a69a', '#ef5350', '#42a5f5'][index],
  size: 1, // Small colored dot with text
}));