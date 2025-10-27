'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceRecorderBarProps {
  onTranscript: (transcript: string, metadata?: any) => void;
  className?: string;
}

export function VoiceRecorderBar({ onTranscript, className }: VoiceRecorderBarProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to access microphone');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Transcription response:', data);

      if (data.success && data.transcript) {
        toast.success('Transcription complete');
        onTranscript(data.transcript, data.metadata);
      } else {
        console.error('Invalid response data:', data);
        throw new Error(data.error || 'Transcription failed - no transcript returned');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';
      toast.error(errorMessage);
    } finally {
      setIsTranscribing(false);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('w-full', className)}>
      {isTranscribing ? (
        <button
          type="button"
          disabled
          className="w-full h-10 rounded-lg bg-muted flex items-center justify-center gap-2 cursor-not-allowed text-sm"
        >
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Transcribing...</span>
        </button>
      ) : isRecording ? (
        <motion.button
          type="button"
          onClick={stopRecording}
          className="w-full h-10 rounded-lg bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2 text-white transition-colors text-sm font-medium"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Square size={14} fill="currentColor" />
          <span>Stop Recording</span>
          <span className="font-mono tabular-nums">{formatTime(recordingTime)}</span>
        </motion.button>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          className="w-full h-10 rounded-lg bg-background border-2 border-dashed border-border hover:border-brand-primary hover:bg-brand-primary/5 flex items-center justify-center gap-2 text-foreground transition-all text-sm font-medium"
        >
          <Mic size={16} />
          <span>Tap to speak</span>
        </button>
      )}
    </div>
  );
}
