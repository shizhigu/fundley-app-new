'use client';

import { Briefcase, Layout, Brain } from 'lucide-react';

interface ComingSoonProps {
  feature: 'portfolio' | 'spaces' | 'research';
}

export function ComingSoon({ feature }: ComingSoonProps) {
  const config = {
    portfolio: {
      icon: Briefcase,
      title: 'Portfolio Management',
      description: 'Track and analyze your investment portfolio with AI-powered insights, real-time market data, and comprehensive performance analytics.',
      features: [
        'Real-time portfolio tracking',
        'AI-powered investment insights',
        'Risk analysis and optimization',
        'Performance benchmarking',
      ],
    },
    spaces: {
      icon: Layout,
      title: 'Collaborative Spaces',
      description: 'Create collaborative workspaces for team-based financial analysis, research sharing, and collective decision making.',
      features: [
        'Team collaboration tools',
        'Shared research workspace',
        'Real-time document editing',
        'Group decision tracking',
      ],
    },
    research: {
      icon: Brain,
      title: 'AI Research Assistant',
      description: 'Advanced financial research powered by AI with market analysis, company research, and intelligent insights generation.',
      features: [
        'AI-powered market research',
        'Company deep-dive analysis',
        'SEC filing intelligence',
        'Automated research reports',
      ],
    },
  };

  const { icon: Icon, title, description, features } = config[feature];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-2xl mx-auto text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-2xl flex items-center justify-center border border-orange-400/30">
            <Icon className="w-12 h-12 text-orange-500" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {title}
        </h1>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          {description}
        </p>

        {/* Coming Soon Badge */}
        <div className="mb-6">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-xl border border-orange-400/20">
            <span className="text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              Coming Soon
            </span>
          </div>
        </div>

        {/* Features List */}
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
            Upcoming Features:
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />
                <span className="text-xs text-gray-700 dark:text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="mt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Stay tuned for updates on this exciting new feature!
          </p>
        </div>
      </div>
    </div>
  );
}