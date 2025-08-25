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
        className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gray-200 text-gray-700 ${className}`}
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
        className={`h-full w-full object-cover ${className}`}
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
        className={`h-full w-full flex items-center justify-center bg-gray-300 text-gray-600 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AvatarFallback.displayName = "AvatarFallback";
