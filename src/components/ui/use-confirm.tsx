import { useState, useCallback, type ReactNode } from "react";
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
import { AlertTriangle, Info, Trash2 } from "lucide-react";

type Tone = "warning" | "danger" | "info";

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
}

interface State extends ConfirmOptions {
  open: boolean;
  resolve?: (v: boolean) => void;
}

/**
 * Hook para substituir window.confirm() por um AlertDialog amigável.
 *
 *   const { confirm, dialog } = useConfirm();
 *   ...
 *   if (await confirm({ title: "Cancelar pedido?", ... })) { ... }
 *   ...
 *   return (<> ... {dialog} </>);
 */
export function useConfirm() {
  const [state, setState] = useState<State>({ open: false, title: "" });

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, open: true, resolve });
    });
  }, []);

  const close = (v: boolean) => {
    state.resolve?.(v);
    setState((s) => ({ ...s, open: false }));
  };

  const tone: Tone = state.tone ?? "warning";
  const Icon = tone === "danger" ? Trash2 : tone === "info" ? Info : AlertTriangle;
  const iconClass =
    tone === "danger"
      ? "bg-destructive/10 text-destructive"
      : tone === "info"
        ? "bg-primary/10 text-primary"
        : "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  const actionClass =
    tone === "danger"
      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
      : "";

  const dialog = (
    <AlertDialog open={state.open} onOpenChange={(o) => !o && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${iconClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <AlertDialogTitle>{state.title}</AlertDialogTitle>
              {state.description && (
                <AlertDialogDescription asChild>
                  <div className="text-sm text-muted-foreground">{state.description}</div>
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>
            {state.cancelLabel ?? "Voltar"}
          </AlertDialogCancel>
          <AlertDialogAction className={actionClass} onClick={() => close(true)}>
            {state.confirmLabel ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
