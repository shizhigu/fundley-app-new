import { useRef, useEffect, useCallback, useState } from 'react';

export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(false); // Start as false so button shows initially

  useEffect(() => {
    const containerElement = containerRef.current;


    if (!containerElement) return;

    const checkScrollPosition = () => {
      const { scrollTop, scrollHeight, clientHeight } = containerElement;
      // Hide button when scrolled to 90% or more
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
      const isNearBottom = scrollPercentage >= 0.9;

      setIsAtBottom(isNearBottom);
    };

    // Use scroll listener as primary detection method
    containerElement.addEventListener('scroll', checkScrollPosition, { passive: true });

    // Initial check after a short delay to ensure content is loaded
    const timer = setTimeout(checkScrollPosition, 100);

    return () => {
      clearTimeout(timer);
      containerElement.removeEventListener('scroll', checkScrollPosition);
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    const containerElement = containerRef.current;
    if (containerElement) {
      // Scroll to the very bottom using scrollTop
      containerElement.scrollTo({
        top: containerElement.scrollHeight,
        behavior: 'smooth'
      });

      // Force update isAtBottom state after scroll completes
      setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = containerElement;
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
        const isNearBottom = scrollPercentage >= 0.9;
        setIsAtBottom(isNearBottom);
      }, 500);
    }
  }, []);

  return {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
  };
}
