'use client';

import React from 'react';

type ToastKind = 'success' | 'error' | 'warning';
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type Listener = (t: ToastItem) => void;
const listeners = new Set<Listener>();
let counter = 0;

// Infiere el tipo a partir del texto, para poder reemplazar alert() sin tocar cada mensaje.
function inferKind(message: string): ToastKind {
  if (/^error|fall[óo]|no se pudo/i.test(message)) return 'error';
  if (/no (debe|disponible|puede)|^cantidad no|^agrega|^solo|^selecciona/i.test(message)) return 'warning';
  return 'success';
}

/** Muestra una notificación. Reemplazo no bloqueante de alert(). */
export function notify(message: string, kind: ToastKind = inferKind(message)) {
  const item = { id: ++counter, kind, message: String(message).slice(0, 300) };
  listeners.forEach((l) => l(item));
}

const styles: Record<ToastKind, { box: string; icon: React.ReactNode }> = {
  success: {
    box: 'border-emerald-200 bg-white text-[#0B1B4D]',
    icon: (
      <span className="size-6 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
      </span>
    ),
  },
  error: {
    box: 'border-red-200 bg-white text-[#0B1B4D]',
    icon: (
      <span className="size-6 shrink-0 rounded-full bg-red-500 text-white flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </span>
    ),
  },
  warning: {
    box: 'border-amber-200 bg-white text-[#0B1B4D]',
    icon: (
      <span className="size-6 shrink-0 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm" aria-hidden="true">!</span>
    ),
  },
};

export function Toaster() {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    const listener: Listener = (t) => {
      setItems((prev) => [...prev.slice(-2), t]);
      window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 4500);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end sm:px-6"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-[0_12px_32px_-8px_rgba(11,27,77,0.35)] anim-toast ${styles[t.kind].box}`}
        >
          {styles[t.kind].icon}
          <span className="min-w-0 break-words">{t.message}</span>
          <button
            type="button"
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="Cerrar notificación"
            className="ml-auto -mr-1 size-8 shrink-0 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="mx-auto size-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}
