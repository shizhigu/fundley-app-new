'use client';

import { useEffect } from 'react';

/**
 * Client component that detects user's timezone and updates it on the server
 * Runs once per session on page load
 */
export function TimezoneUpdater() {
  useEffect(() => {
    const updateTimezone = async () => {
      try {
        // Get user's timezone using Intl API
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Send to server
        const response = await fetch('/api/user/timezone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ timezone }),
        });

        if (response.ok) {
          console.log('✅ Timezone updated:', timezone);
        } else {
          console.warn('⚠️ Failed to update timezone');
        }
      } catch (error) {
        console.error('❌ Error updating timezone:', error);
      }
    };

    updateTimezone();
  }, []); // Run once on mount

  return null; // This component renders nothing
}
