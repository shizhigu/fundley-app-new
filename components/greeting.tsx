import { motion } from 'framer-motion';

export const Greeting = () => {
  return (
    <div
      key="overview"
      className="professional-greeting max-w-3xl mx-auto md:mt-20 px-8 size-full flex flex-col justify-center"
    >
      <div className="glass-welcome-card p-8 rounded-2xl mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="brand-logo-large mb-6"
        >
          <div className="text-4xl font-bold text-brand-primary mb-2">
            Fundley
          </div>
          <div className="text-lg text-brand-secondary font-medium">
            Professional AI Financial Assistant
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="welcome-message"
        >
          <div className="text-xl text-foreground mb-3">
            Welcome to the future of financial intelligence
          </div>
          <div className="text-base text-muted-foreground leading-relaxed">
            Get instant insights on private equity, market analysis, and investment opportunities
            powered by advanced AI technology.
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="quick-actions mt-8 flex gap-3 flex-wrap"
        >
          <div className="glass-pill px-4 py-2 text-sm text-muted-foreground">
            💼 Portfolio Analysis
          </div>
          <div className="glass-pill px-4 py-2 text-sm text-muted-foreground">
            📊 Market Insights
          </div>
          <div className="glass-pill px-4 py-2 text-sm text-muted-foreground">
            🎯 Investment Research
          </div>
        </motion.div>
      </div>
    </div>
  );
};
