"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

/** side="center": modal; side="left": slide-in sheet (used for the mobile menu) */
export function DialogContent({
  className, children, side = "center", ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "center" | "left" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 border bg-popover p-5 text-popover-foreground shadow-xl outline-none",
          side === "center" &&
            "left-1/2 top-1/2 max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl",
          side === "left" && "inset-y-0 left-0 w-[85vw] max-w-sm overflow-y-auto border-y-0 border-l-0 safe-bottom",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-lg hover:bg-secondary" aria-label="დახურვა">
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
