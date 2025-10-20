import { cn } from '@/lib/utils';

/**
 * Subtle Noise Background - Premium Paper Texture
 * Creates a fine-grain noise effect for elegant visual depth
 */
export function NoiseBackground({
  children,
  className,
  containerClassName,
  opacity = 0.15,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  opacity?: number;
}) {
  return (
    <div className={cn('relative w-full h-full bg-background', containerClassName)}>
      {/* More visible noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          opacity: opacity,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '150px 150px',
        }}
      />

      {/* Subtle vignette for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 40%, hsl(var(--background) / 0.3) 100%)',
        }}
      />

      {/* Content */}
      <div className={cn('relative z-10', className)}>{children}</div>
    </div>
  );
}
