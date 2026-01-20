'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamically import Hyperspeed to avoid SSR issues with Three.js
const Hyperspeed = dynamic(() => import('./Hyperspeed'), { ssr: false });

interface WelcomeSplashProps {
  onComplete?: () => void;
}

export function WelcomeSplash({ onComplete }: WelcomeSplashProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Enable click after animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Click to enter
  const handleEnter = () => {
    if (!isReady) return;
    setIsVisible(false);
    setTimeout(() => {
      onComplete?.();
    }, 800);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.8 }}
          onClick={handleEnter}
          className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden ${isReady ? 'cursor-pointer' : 'cursor-default'}`}
          style={{ backgroundColor: '#000000' }}
        >
          {/* Hyperspeed Background */}
          <div className="absolute inset-0 bg-black">
            <Hyperspeed
              effectOptions={{
                distortion: 'turbulentDistortion',
                length: 400,
                roadWidth: 10,
                islandWidth: 2,
                lanesPerRoad: 3,
                fov: 90,
                fovSpeedUp: 150,
                speedUp: 2,
                carLightsFade: 0.4,
                totalSideLightSticks: 20,
                lightPairsPerRoadWay: 40,
                shoulderLinesWidthPercentage: 0.05,
                brokenLinesWidthPercentage: 0.1,
                brokenLinesLengthPercentage: 0.5,
                lightStickWidth: [0.12, 0.5],
                lightStickHeight: [1.3, 1.7],
                movingAwaySpeed: [60, 80],
                movingCloserSpeed: [-120, -160],
                carLightsLength: [12, 80],
                carLightsRadius: [0.05, 0.14],
                carWidthPercentage: [0.3, 0.5],
                carShiftX: [-0.8, 0.8],
                carFloorSeparation: [0, 5],
                colors: {
                  roadColor: 0x080808,
                  islandColor: 0x0a0a0a,
                  background: 0x000000,
                  shoulderLines: 0x131008,
                  brokenLines: 0x131008,
                  leftCars: [0x8EBF45, 0x67A52C, 0xC2E085],
                  rightCars: [0x03B3F9, 0x0E5D85, 0x324349],
                  sticks: 0x8EBF45,
                },
              }}
            />
          </div>

          {/* Dark overlay for better logo visibility */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Main content - Logo */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo container with glow */}
            <motion.div
              initial={{ scale: 0, opacity: 0, rotateY: -180 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{
                type: 'spring',
                stiffness: 100,
                damping: 15,
                delay: 0.3,
              }}
              className="relative"
            >
              {/* Outer glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(142,191,69,0.4) 0%, transparent 70%)',
                  transform: 'scale(2)',
                }}
                animate={{
                  scale: [1.8, 2.2, 1.8],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Rotating ring effect */}
              <motion.div
                className="absolute -inset-8 rounded-full border border-[#8EBF45]/30"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              <motion.div
                className="absolute -inset-12 rounded-full border border-[#8EBF45]/20"
                animate={{ rotate: -360 }}
                transition={{
                  duration: 30,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />

              {/* Logo */}
              <motion.img
                src="/logo.svg"
                alt="Foga π"
                className="h-56 md:h-72 w-auto relative z-10 drop-shadow-[0_0_40px_rgba(142,191,69,0.6)]"
                initial={{ filter: 'brightness(0) blur(10px)' }}
                animate={{ filter: 'brightness(1) blur(0px)' }}
                transition={{ duration: 1.5, delay: 0.5 }}
              />
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.8, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="mt-8 text-white/70 text-sm md:text-base tracking-[0.3em] uppercase font-light"
            >
              AI-Powered Financial Analysis
            </motion.p>

            {/* Click to enter hint */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isReady ? 1 : 0, y: isReady ? 0 : 20 }}
              transition={{ duration: 0.5 }}
              className="mt-12"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(142,191,69,0.3)',
                    '0 0 50px rgba(142,191,69,0.6)',
                    '0 0 20px rgba(142,191,69,0.3)',
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="px-8 py-3 rounded-full border border-[#8EBF45]/50 bg-[#8EBF45]/10 backdrop-blur-md"
              >
                <motion.span
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-[#8EBF45] text-sm font-medium tracking-wider"
                >
                  ✦ Click to Enter ✦
                </motion.span>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
