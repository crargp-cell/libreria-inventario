import React from 'react';

const TONES = {
  blue: 'from-[#38BDF8] to-[#2F6BFF] shadow-blue-500/30',
  navy: 'from-[#2F6BFF] to-[#0B1B4D] shadow-blue-900/30',
  green: 'from-emerald-300 to-emerald-600 shadow-emerald-500/30',
  amber: 'from-amber-300 to-orange-500 shadow-orange-400/30',
  rose: 'from-rose-400 to-red-600 shadow-red-500/30',
  violet: 'from-violet-300 to-indigo-600 shadow-indigo-500/30',
} as const;

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: keyof typeof TONES;
  /** Variación porcentual contra el período anterior. null = no comparable, undefined = no se muestra */
  delta?: number | null;
  /** Texto auxiliar bajo el valor (p. ej. "de 10.814 productos") */
  hint?: string;
}

function DeltaChip({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Nuevo</span>;
  }
  const up = delta > 0.05;
  const down = delta < -0.05;
  const cls = up ? 'bg-emerald-50 text-emerald-700' : down ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular ${cls}`}>
      {(up || down) && (
        <svg viewBox="0 0 24 24" className={`size-3 ${down ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      )}
      {up ? '+' : ''}{delta.toFixed(delta % 1 === 0 ? 0 : 1)}%
      <span className="sr-only"> frente al período anterior</span>
    </span>
  );
}

export function KpiCard({ label, value, icon, tone = 'blue', delta, hint }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-[0_2px_4px_rgba(11,27,77,0.04),0_8px_24px_-8px_rgba(29,78,216,0.12)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-1 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg ${TONES[tone]}`} aria-hidden="true">
          {icon}
        </div>
      </div>
      <p className="mt-2 break-words text-2xl font-bold text-[#0B1B4D] tabular sm:text-[1.7rem]">{value}</p>
      <div className="mt-1.5 flex min-h-6 flex-wrap items-center gap-2">
        {delta !== undefined && <DeltaChip delta={delta} />}
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </div>
    </div>
  );
}
