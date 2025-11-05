'use client';

import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { Sparkles } from 'lucide-react';

interface OnboardingTourProps {
  onComplete?: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompleted = localStorage.getItem('onboarding_completed');

    if (hasCompleted) {
      return;
    }

    // Small delay to ensure DOM elements are rendered
    const timer = setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        showButtons: ['next', 'previous', 'close'],
        nextBtnText: 'Next',
        prevBtnText: 'Back',
        doneBtnText: 'Get Started!',
        progressText: '{{current}} of {{total}}',
        popoverClass: 'driverjs-theme',
        onDestroyed: () => {
          localStorage.setItem('onboarding_completed', 'true');
          onComplete?.();
        },
        steps: [
          {
            element: 'body',
            popover: {
              title: 'Welcome to ZenAsset!',
              description: `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                  <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #14b8a6); display: flex; align-items: center; justify-content: center;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div>
                    <div style="font-weight: 600; font-size: 16px; color: #1f2937;">Meet Zeno</div>
                    <div style="font-size: 14px; color: #6b7280;">Your AI financial analyst</div>
                  </div>
                </div>
                <p style="color: #4b5563; line-height: 1.6;">
                  Zeno helps you analyze markets, track investments, and automate research tasks. Let me show you around!
                </p>
              `,
            },
          },
          {
            element: '[data-tour="chat-input"]',
            popover: {
              title: 'Ask Zeno Anything',
              description: `
                <p style="color: #4b5563; margin-bottom: 12px;">Type your questions in natural language. Try:</p>
                <ul style="color: #6b7280; line-height: 1.8; margin-left: 20px; list-style: disc;">
                  <li>"Analyze NVDA's latest earnings"</li>
                  <li>"Track insider trades for MAG7"</li>
                  <li>"Send me weekly market updates"</li>
                </ul>
              `,
              side: 'top',
              align: 'center',
            },
          },
          {
            element: '[data-tour="deliverables-panel"]',
            popover: {
              title: 'Your Analysis Results',
              description: `
                <p style="color: #4b5563; line-height: 1.6;">
                  All reports, charts, and data tables from Zeno appear here. Click any deliverable to view details.
                </p>
              `,
              side: 'left',
              align: 'start',
            },
          },
          {
            element: '[data-tour="schedule-tab"]',
            popover: {
              title: "Zeno's Work Schedule",
              description: `
                <p style="color: #4b5563; line-height: 1.6;">
                  View and manage Zeno's automated tasks. He works 24/7 to keep you updated on markets, earnings, and portfolio changes.
                </p>
              `,
              side: 'left',
              align: 'start',
            },
          },
          {
            element: '[data-tour="chat-input"]',
            popover: {
              title: 'Ready to Get Started!',
              description: `
                <p style="color: #4b5563; line-height: 1.6;">
                  Try asking Zeno your first question. He's ready to help analyze any stock, track market trends, or set up automated reports.
                </p>
              `,
              side: 'top',
              align: 'center',
            },
          },
        ],
      });

      driverObj.drive();
    }, 1000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return null;
}
