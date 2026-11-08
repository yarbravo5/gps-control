import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { PropsWithChildren } from "react";

interface ToastMessage {
  id: number;
  message: string;
}

type Notify = (message: string) => void;

const ToastContext = createContext<Notify | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);
  const notify = useCallback<Notify>((message) => {
    const id = ++nextId.current;
    setToasts((current) => [...current, { id, message }].slice(-4));
  }, []);
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div aria-label="Notificaciones" className="fixed right-4 top-4 z-[10000] grid w-[min(24rem,calc(100vw-2rem))] gap-2" role="region">
        {toasts.map((toast) => <ToastNotice key={toast.id} toast={toast} onDismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Notify {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast debe usarse dentro de ToastProvider.");
  return notify;
}

function ToastNotice({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(toast.id), 5000);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast.id]);

  return (
    <div aria-atomic="true" aria-live="polite" className="flex items-start justify-between gap-3 rounded-control border border-teal-700/30 bg-white p-4 text-sm text-teal-950 shadow-lg" role="status">
      <span>{toast.message}</span>
      <button aria-label="Cerrar notificación" className="shrink-0 rounded px-2 font-semibold focus-visible:outline-2 focus-visible:outline-brand-teal" onClick={() => onDismiss(toast.id)} type="button">×</button>
    </div>
  );
}
