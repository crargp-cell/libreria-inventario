'use client';

// Gráficas de reportes. Se cargan con import dinámico: recharts pesa ~110 KB (gzip) y solo
// hace falta en la página de reportes.
import { useId } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const NAVY = '#0B1B4D';
const BLUE = '#1D4ED8';
const SKY = '#38BDF8';
const VIOLET = '#8B5CF6';
const GRID = '#E4ECFF';
const TICK = { fontSize: 12, fill: '#4b5563' };

// "2026-11-07" -> "07/11"
const shortDate = (d: string) => {
  const [, m, day] = String(d).split('-');
  return m && day ? `${day}/${m}` : d;
};
const unitsText = (n: number) => `${Number(n).toLocaleString('es-BO')} ${n === 1 ? 'unidad' : 'unidades'}`;

interface TipProps {
  active?: boolean;
  payload?: { value: number; name: string; color?: string }[];
  label?: string;
  title?: (l: string) => string;
}
function ChartTooltip({ active, payload, label, title }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#0B1B4D] px-3.5 py-2.5 text-white shadow-[0_12px_32px_-8px_rgba(11,27,77,0.55)]">
      {label !== undefined && <p className="text-xs text-sky-200">{title ? title(String(label)) : label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 text-sm font-bold tabular">
          {payload.length > 1 ? `${p.name}: ` : ''}{unitsText(p.value)}
        </p>
      ))}
    </div>
  );
}

/** Unidades despachadas por día, apiladas por tipo de salida. */
export function DispatchChart({ data }: { data: { date: string; venta: number; reposicion: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 12, right: 12, left: -8, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={TICK} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={TICK} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
        <Tooltip cursor={{ fill: GRID, fillOpacity: 0.6 }} content={<ChartTooltip title={shortDate} />} />
        <Legend />
        <Bar dataKey="venta" name="Salida a venta" stackId="u" fill={BLUE} maxBarSize={36} animationDuration={700} />
        <Bar dataKey="reposicion" name="Salida a reposición" stackId="u" fill={VIOLET} radius={[6, 6, 0, 0]} maxBarSize={36} animationDuration={700} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Unidades despachadas por categoría. */
export function CategoryBarChart({ data }: { data: { name: string; units: number }[] }) {
  const gid = useId().replace(/:/g, '');
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 48 + 24)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barCategoryGap="28%">
        <defs>
          <linearGradient id={`cat-${gid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={BLUE} />
            <stop offset="100%" stopColor={SKY} />
          </linearGradient>
        </defs>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ ...TICK, fill: NAVY }} tickLine={false} axisLine={false} width={96} />
        <Tooltip cursor={{ fill: GRID, fillOpacity: 0.6 }} content={<ChartTooltip />} />
        <Bar dataKey="units" name="Unidades" fill={`url(#cat-${gid})`} radius={[2, 8, 8, 2]} maxBarSize={26} animationDuration={800} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StockPieChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={68} outerRadius={100}
              paddingAngle={data.filter((d) => d.value > 0).length > 1 ? 3 : 0} cornerRadius={8} stroke="none"
              startAngle={90} endAngle={-270} animationDuration={900}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Total en el centro del anillo */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-[#0B1B4D] tabular">{total.toLocaleString('es-BO')}</span>
          <span className="text-xs font-medium text-gray-500">productos</span>
        </div>
      </div>
      <ul className="mt-2 grid grid-cols-3 gap-2 text-center">
        {data.map((d) => (
          <li key={d.name} className="rounded-xl bg-[#F3F7FF] px-2 py-2">
            <span className="mx-auto mb-1 block size-2.5 rounded-full" style={{ background: d.color }} aria-hidden="true" />
            <span className="block text-sm font-bold text-[#0B1B4D] tabular">{d.value.toLocaleString('es-BO')}</span>
            <span className="block text-xs text-gray-600">{d.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
