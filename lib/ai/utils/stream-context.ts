import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      // The resumable-stream library uses Redis pub/sub which requires persistent connections
      if (!process.env.REDIS_URL && !process.env.KV_URL) {
        // If no Redis URL is set, disable resumable streams gracefully
        console.log(' > Resumable streams disabled - no Redis URL configured');
        console.log(' > To enable, set REDIS_URL with standard Redis connection string');
        console.log(' > Format: redis://[username]:PASSWORD@HOST:PORT');
        return null;
      }
      
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled. Set REDIS_URL with Redis connection string',
        );
      } else {
        console.error('Error creating stream context:', error);
      }
    }
  }

  return globalStreamContext;
}