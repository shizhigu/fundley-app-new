'use client';

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale
);

interface ChartComponentProps {
  config: any; // Complete Chart.js configuration from backend
}

export default function ChartComponent({ config }: ChartComponentProps) {
  console.log('📊 ChartComponent rendering with config:', config);

  // First-principles approach: Simply pass the complete config to Chart.js
  // No field mapping, no data transformation, no assumptions
  return (
    <Chart
      type={config.type}
      data={config.data}
      options={config.options}
    />
  );
}