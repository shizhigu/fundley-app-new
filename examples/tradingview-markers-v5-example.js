// TradingView Lightweight Charts v5 - Markers Example
// This example shows how to add text labels without visible circular markers

import { createChart, LineSeries, createSeriesMarkers } from 'lightweight-charts';

// Create chart
const chart = createChart(document.getElementById('container'));

// Add a line series
const series = chart.addSeries(LineSeries, {
  color: '#26a69a',
  lineWidth: 2,
});

// Sample data
const data = [
  { time: '2024-01-01', value: 100 },
  { time: '2024-04-01', value: 120 },
  { time: '2024-07-01', value: 110 },
  { time: '2024-10-01', value: 130 },
];

series.setData(data);

// Create markers for quarterly labels WITHOUT visible dots/circles
const quarterlyMarkers = [
  {
    time: '2024-01-01',
    position: 'aboveBar', // or 'belowBar'
    color: 'transparent', // Make marker invisible
    shape: 'circle', // Shape doesn't matter since it's transparent
    text: '2024Q1', // The text label you want to show
    size: 0, // Size 0 to hide the circular marker
  },
  {
    time: '2024-04-01',
    position: 'aboveBar',
    color: 'transparent',
    shape: 'circle',
    text: '2024Q2',
    size: 0,
  },
  {
    time: '2024-07-01',
    position: 'aboveBar',
    color: 'transparent',
    shape: 'circle',
    text: '2024Q3',
    size: 0,
  },
  {
    time: '2024-10-01',
    position: 'aboveBar',
    color: 'transparent',
    shape: 'circle',
    text: '2024Q4',
    size: 0,
  },
];

// ✅ V5 API: Use createSeriesMarkers instead of series.setMarkers()
const markersInstance = createSeriesMarkers(series, quarterlyMarkers);

// You can later update markers using the returned instance:
// markersInstance.setMarkers([...newMarkers]);

// Or get current markers:
// const currentMarkers = markersInstance.markers();

chart.timeScale().fitContent();