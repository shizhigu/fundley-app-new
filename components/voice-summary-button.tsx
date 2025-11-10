'use client';

import { Volume2, Pause, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface VoiceSummaryButtonProps {
  directAnswer: string;
}

export function VoiceSummaryButton({ directAnswer }: VoiceSummaryButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null); // Track audio URL for cleanup

  const handlePlay = async () => {
    if (isPlaying && audioRef.current) {
      // Pause current playback
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);

    try {
      // Call Deepgram TTS API
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: directAnswer }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      // Create audio from response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl; // Store URL for cleanup

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };

      audio.onended = () => {
        setIsPlaying(false);
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      await audio.play();
    } catch (error) {
      console.error('Voice playback error:', error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  // Cleanup: stop audio and revoke URL on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ''; // Clear src to release memory
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  return (
    <button
      onClick={handlePlay}
      disabled={isLoading}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg',
        'bg-card border border-border',
        'text-sm font-medium',
        'hover:bg-muted hover:border-brand-primary/30 transition-colors duration-200',
        'focus:outline-none focus:ring-1 focus:ring-brand-primary/20',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isPlaying && 'bg-brand-primary/10 border-brand-primary'
      )}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 text-brand-primary animate-spin" />
      ) : isPlaying ? (
        <Pause className="w-4 h-4 text-brand-primary" />
      ) : (
        <Volume2 className="w-4 h-4 text-brand-primary" />
      )}
      <span>{isPlaying ? 'Pause summary' : 'Listen to summary'}</span>
    </button>
  );
}
