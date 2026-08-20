"use client";

import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2Icon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. Use for deletes. */
  destructive?: boolean;
}

/**
 * Controlled confirmation dialog.
 *
 * Built on Radix `AlertDialog`, so focus trapping, `Escape`, the initial focus
 * target and `aria-describedby` are handled once here rather than per feature.
 */
export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** Keeps the dialog open and disables its buttons while the action runs. */
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            className={cn(
              destructive &&
                "bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/30 text-white",
            )}
            onClick={(event) => {
              // Keep the dialog mounted so the caller controls when it closes,
              // which is what allows the pending state to be visible.
              event.preventDefault();
              onConfirm();
            }}
          >
            {loading ? <Loader2Icon className="animate-spin" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- Promise-based API -----------------------------------------------------

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

const CLOSED: ConfirmState = { open: false, title: "" };

/**
 * Provides one dialog instance for the whole app.
 *
 * Without this, every list row would mount its own `AlertDialog`; a 50-row
 * table would carry 50 dialogs. One shared instance also guarantees only one
 * confirmation can ever be on screen.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>(CLOSED);
  const [loading, setLoading] = useState(false);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setLoading(false);
    setState(CLOSED);
  }, []);

  const confirm = useCallback<ConfirmFn>((options) => {
    // A second call while one is pending resolves the first as cancelled, so no
    // caller is left awaiting a promise that never settles.
    resolverRef.current?.(false);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext value={value}>
      {children}

      <ConfirmDialog
        {...state}
        loading={loading}
        onOpenChange={(open) => {
          if (!open) settle(false);
        }}
        onConfirm={() => {
          // Show pending state immediately; the caller's await resumes now and
          // unmounts the dialog when its work finishes.
          setLoading(true);
          settle(true);
        }}
      />
    </ConfirmContext>
  );
}

/**
 * `const ok = await confirm({ title: "Delete user?", destructive: true })`
 *
 * Reads top-to-bottom at the call site, which is why the resource framework
 * uses it for delete and for custom actions that declare `confirm`.
 */
export function useConfirm(): ConfirmFn {
  const context = use(ConfirmContext);

  if (!context) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>.");
  }

  return context;
}
