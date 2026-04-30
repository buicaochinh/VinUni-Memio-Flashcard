"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[0.9rem] font-semibold",
      "ring-1 ring-border/80 bg-[hsl(var(--acrylic))] hover:bg-muted/35 transition-colors",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon className="text-muted-foreground">▾</SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));

SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", sideOffset = 8, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={sideOffset}
      className={cn(
        // Dropdown is at least trigger width, but can grow for long text.
        "min-w-[var(--radix-select-trigger-width)]",
        "z-[250] overflow-hidden rounded-xl border border-border bg-background shadow-xl",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="w-full p-1">
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));

SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex items-center gap-2 rounded-lg px-3 py-2 text-[0.9rem] font-semibold",
      "text-foreground outline-none cursor-pointer select-none",
      "data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemIndicator className="w-4 text-primary">
      <Check className="w-4 h-4" aria-hidden />
    </SelectPrimitive.ItemIndicator>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));

SelectItem.displayName = "SelectItem";

