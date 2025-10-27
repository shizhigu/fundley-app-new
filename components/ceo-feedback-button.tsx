'use client';

import { useState, useCallback } from 'react';
import { MessageCircle, X, Send, Camera, Upload, Loader2, Mic } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { VoiceRecorderBar } from './voice-recorder-bar';

type FeedbackType = 'bug' | 'suggestion' | 'complaint' | 'praise' | 'question';

const feedbackTypes: { id: FeedbackType; label: string; emoji: string; color: string }[] = [
  { id: 'bug', label: 'Bug', emoji: '🐛', color: 'bg-red-500/10 text-red-600 hover:bg-red-500/20' },
  { id: 'suggestion', label: 'Idea', emoji: '💡', color: 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20' },
  { id: 'complaint', label: 'Issue', emoji: '😡', color: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20' },
  { id: 'praise', label: 'Love it', emoji: '❤️', color: 'bg-green-500/10 text-green-600 hover:bg-green-500/20' },
  { id: 'question', label: 'Question', emoji: '❓', color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' },
];

export function CEOFeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTakingScreenshot, setIsTakingScreenshot] = useState(false);

  const takeScreenshot = useCallback(async () => {
    setIsTakingScreenshot(true);
    try {
      const canvas = await html2canvas(document.body, {
        allowTaint: true,
        useCORS: true,
        scale: 0.5, // Reduce quality for faster upload
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setScreenshot(dataUrl);
      toast.success('Screenshot captured!');
    } catch (error) {
      console.error('Screenshot failed:', error);
      toast.error('Failed to capture screenshot');
    } finally {
      setIsTakingScreenshot(false);
    }
  }, []);

  const handleSubmit = async () => {
    if (!selectedType || !message.trim()) {
      toast.error('Please select a feedback type and write a message');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/ceo-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          message: message.trim(),
          contact: contact.trim() || undefined,
          screenshot: screenshot || undefined,
          userAgent: navigator.userAgent,
          currentUrl: window.location.href,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      toast.success('Feedback sent to CEO! 🎉');

      // Reset form
      setSelectedType(null);
      setMessage('');
      setContact('');
      setScreenshot(null);
      setIsOpen(false);
    } catch (error) {
      console.error('Feedback submission error:', error);
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 h-11 w-11 rounded-full shadow-lg z-50',
          'bg-gradient-to-br from-brand-primary to-orange-600',
          'hover:scale-105 transition-all duration-300'
        )}
        size="icon"
      >
        <MessageCircle className="h-5 w-5 text-white" />
      </Button>

      {/* Feedback Panel */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 w-[420px] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header with close button */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-brand-primary" />
              <h3 className="font-semibold text-sm">Direct Line to CEO</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-muted rounded-full p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="max-h-[calc(100vh-160px)] overflow-y-auto">
            <div className="p-4 space-y-4">
            {/* CEO Direct Line Notice */}
            <div className="bg-brand-primary/5 border border-brand-primary/20 p-3 rounded-lg">
              <p className="text-xs font-medium text-foreground">
                🎯 <span className="font-semibold">Direct to CEO</span> — Your message goes straight to the founder's inbox. We read every single one.
              </p>
            </div>

            {/* Feedback Type Selection */}
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {feedbackTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                      'border-2',
                      selectedType === type.id
                        ? 'border-brand-primary bg-brand-primary/10'
                        : 'border-transparent',
                      type.color
                    )}
                  >
                    <span className="mr-1">{type.emoji}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Your Message
              </label>

              {/* Voice Input Bar */}
              <div className="mb-3">
                <VoiceRecorderBar
                  onTranscript={(transcript) => {
                    setMessage(prev => prev ? `${prev} ${transcript}` : transcript);
                  }}
                />
              </div>

              {/* Text Input */}
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Or type your message here..."
                className="min-h-24 resize-none text-sm"
                maxLength={1000}
              />
              <div className="text-xs text-muted-foreground mt-1 text-right">
                {message.length}/1000
              </div>
            </div>

            {/* Screenshot Section */}
            <div className="space-y-2">
              <Button
                onClick={takeScreenshot}
                disabled={isTakingScreenshot}
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
              >
                {isTakingScreenshot ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3 mr-1.5" />
                )}
                Screenshot
              </Button>

              {screenshot && (
                <div className="relative">
                  <img
                    src={screenshot}
                    alt="Screenshot"
                    className="w-full rounded-md border border-border"
                  />
                  <button
                    onClick={() => setScreenshot(null)}
                    className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Contact Info (Optional) */}
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Contact (optional)
              </label>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="email or @telegram"
                className="text-sm h-8"
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedType || !message.trim()}
              className="w-full h-9 bg-gradient-to-r from-brand-primary to-orange-600 hover:from-brand-primary/90 hover:to-orange-600/90 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Send
                </>
              )}
            </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
