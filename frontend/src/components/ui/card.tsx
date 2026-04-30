"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-border bg-[hsl(var(--surface-raised))] shadow-sm",
        className
      )}
      {...props}
    />
  )
);

Card.displayName = "Card";

