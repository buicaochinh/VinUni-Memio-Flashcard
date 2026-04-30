"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[opacity,transform,background-color,color,border-color] duration-150 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 active:translate-y-px";

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-2 text-[0.9rem]",
  md: "px-4 py-3 text-[0.92rem]",
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] shadow-sm hover:opacity-95 " +
    "relative overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-200 " +
    "hover:before:opacity-100 before:bg-[radial-gradient(520px_circle_at_var(--x,50%)_var(--y,50%),rgba(255,255,255,0.20),transparent_45%)] " +
    "motion-reduce:before:transition-none motion-reduce:transition-none",
  secondary:
    "border border-border/80 bg-[hsl(var(--acrylic))] text-foreground shadow-sm hover:bg-muted/35",
  ghost:
    "bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
  danger:
    "border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/25 text-rose-700 dark:text-rose-300 hover:opacity-90",
};

function setRevealVars(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget as HTMLElement;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--x", `${e.clientX - r.left}px`);
  el.style.setProperty("--y", `${e.clientY - r.top}px`);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", onPointerMove, ...props }, ref) => {
    const isReveal = variant === "primary";
    const revealHandler: React.PointerEventHandler<HTMLButtonElement> = (e) => setRevealVars(e);
    return (
      <button
        ref={ref}
        className={cn(base, sizes[size], variants[variant], className)}
        onPointerMove={
          isReveal ? (onPointerMove ?? revealHandler) : onPointerMove
        }
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

