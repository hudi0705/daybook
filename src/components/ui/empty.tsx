import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const emptyVariants = cva("flex flex-col items-center justify-center py-12 px-4 text-center", {
  variants: {
    size: {
      default: "py-12",
      sm: "py-8",
      lg: "py-16",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export interface EmptyProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyVariants> {}

const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(emptyVariants({ size, className }))}
        {...props}
      />
    );
  }
);
Empty.displayName = "Empty";

const EmptyHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col items-center gap-2", className)}
      {...props}
    />
  );
});
EmptyHeader.displayName = "EmptyHeader";

const EmptyTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  return (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
});
EmptyTitle.displayName = "EmptyTitle";

const EmptyDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground max-w-sm", className)}
      {...props}
    />
  );
});
EmptyDescription.displayName = "EmptyDescription";

const EmptyMedia = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("mb-4 text-muted-foreground", className)}
      {...props}
    />
  );
});
EmptyMedia.displayName = "EmptyMedia";

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia };
