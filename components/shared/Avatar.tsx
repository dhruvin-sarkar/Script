'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarContextValue {
  imageLoaded: boolean;
  setImageLoaded: React.Dispatch<React.SetStateAction<boolean>>;
}

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

function useAvatarContext(): AvatarContextValue {
  const context = React.useContext(AvatarContext);

  if (!context) {
    throw new Error('Avatar components must be used within <Avatar>.');
  }

  return context;
}

const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const [imageLoaded, setImageLoaded] = React.useState(false);

    return (
      <AvatarContext.Provider value={{ imageLoaded, setImageLoaded }}>
        <div
          ref={ref}
          className={cn(
            'relative flex shrink-0 overflow-hidden rounded-full bg-[var(--bg-elevated)]',
            className,
          )}
          {...props}
        />
      </AvatarContext.Provider>
    );
  },
);

Avatar.displayName = 'Avatar';

const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, src, alt = '', onLoad, onError, ...props }, ref) => {
    const { setImageLoaded } = useAvatarContext();

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn('h-full w-full object-cover', className)}
        onLoad={(event) => {
          setImageLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          setImageLoaded(false);
          onError?.(event);
        }}
        {...props}
      />
    );
  },
);

AvatarImage.displayName = 'AvatarImage';

const AvatarFallback = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { imageLoaded } = useAvatarContext();

    return (
      <div
        ref={ref}
        className={cn(
          'absolute inset-0 flex items-center justify-center bg-[var(--bg-elevated)] text-[var(--text-primary)]',
          imageLoaded ? 'hidden' : 'flex',
          className,
        )}
        {...props}
      />
    );
  },
);

AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarFallback, AvatarImage };
