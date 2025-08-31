import * as React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative inline-flex items-center justify-center overflow-hidden rounded-full border border-medical-200/40 bg-gradient-to-br from-white via-medical-50/40 to-white dark:from-neutral-900 dark:via-medical-900/20 dark:to-neutral-800 text-gray-700 ring-1 ring-medical-500/10 shadow-sm ${className}`}
        {...props}
      />
    );
  }
);
Avatar.displayName = "Avatar";

export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className = "", alt = "", ...props }, ref) => {
    return (
      <img
        ref={ref}
        alt={alt}
        className={`h-full w-full object-cover rounded-full animate-in fade-in-50 duration-300 ${className}`}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = "AvatarImage";

export const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`h-full w-full flex items-center justify-center rounded-full select-none bg-gradient-to-br from-medical-100 to-medical-200 dark:from-medical-900/40 dark:to-medical-700/20 text-medical-700 dark:text-medical-100 uppercase tracking-wide font-semibold ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AvatarFallback.displayName = "AvatarFallback";
