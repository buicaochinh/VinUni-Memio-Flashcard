"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "w-full rounded-xl border border-border bg-surface text-foreground px-4 py-2.5 text-[0.95rem] outline-none",
        "transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "placeholder:text-muted-foreground/70",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";

