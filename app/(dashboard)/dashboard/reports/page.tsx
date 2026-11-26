'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth/context';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { api } from '@/lib/client';
import { label } from '@/lib/labels';
import { IconBarChart, IconShoppingCart, IconClipboard, IconPackage, IconRefresh, IconUsers } from '@/components/icons';

// recharts pesa ~110 KB (gzip): se descarga solo al abrir Reportes, y sin renderizar en el servidor
const chartLoading = () => <div className="skeleton h-[260px]" aria-hidden="true" />;
const load = (name: string) =>
  dynamic(() => import('@/components/charts/ReportCharts').then((m: any) => m[name]), { ssr: false, loading: chartLoading }) as React.ComponentType<any>;
const DispatchChart = load('DispatchChart');
const CategoryBarChart = load('CategoryBarChart');
const StockPieChart = load('StockPieChart');

interface Stats {
  inventory: { totalItems: number; lowStockItems: number; outOfStockItems: number; productsWithStock: number; units: number; value?: number };
  requests: { byStatus: Record<string, number>; created: number };
  dispatches: {
    count: number;
    venta: number;
    reposicion: number;
    previousUnits: number;
    daily: Record<string, { venta: number; reposicion: number }>;
    topProducts: { id: string; code: string; name: string; quantity: number }[];
    byRequester: { name: string; dispatches: number; units: number }[];
    byCategory: { name: string; units: number }[];
  };
  pendingEntries: number;
}

const num = (n: number) => n.toLocaleString('es-BO');
const pct = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? null : 0) : ((cur - prev) / prev) * 100);
// Fecha en hora de Bolivia (UTC-4)
const localDay = (daysAgo: number) => new Date(Date.now() - 4 * 3600_000 - daysAgo * 86_400_000).toISOString().split('T')[0];

function Ranking({ rows }: { rows: { key: string; title: string; subtitle: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="space-y-4">
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E4ECFF] text-sm font-bold text-[#1D4ED8]">{i + 1}</span>
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{r.title}</p>
                <p className="text-xs text-gray-500">{r.subtitle}</p>
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[#0B1B4D] tabular">{num(r.value)} {r.value === 1 ? 'unidad' : 'unidades'}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E4ECFF]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#38BDF8]" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    api<Stats>(token, `/api/reports/stats?days=${days}`)
      .then(setStats)
      .catch((error) => console.error('Error fetching stats:', error))
      .finally(() => setIsLoading(false));
  }, [token, days]);

  const header = (
    <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl sm:text-4xl font-bold text-[#0B1B4D] mb-1">Reportes</h1>
        <p className="text-gray-600">Existencias, solicitudes y salidas del almacén</p>
      </div>
      <select aria-label="Periodo del reporte" value={days} onChange={(e) => setDays(parseInt(e.target.value))}
        className="min-h-11 px-4 py-2 border-2 border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#1D4ED8]">
        <option value={7}>Últimos 7 días</option>
        <option value={30}>Últimos 30 días</option>
        <option value={90}>Últimos 90 días</option>
      </select>
    </div>
  );

  if (isLoading || !stats) {
    return (
      <div>
        {header}
        <Card><TableSkeleton label="Cargando datos..." rows={5} /></Card>
      </div>
    );
  }

  const d = stats.dispatches;
  const totalUnits = d.venta + d.reposicion;
  const daily = Array.from({ length: days }, (_, i) => {
    const date = localDay(days - 1 - i);
    return { date, venta: d.daily[date]?.venta ?? 0, reposicion: d.daily[date]?.reposicion ?? 0 };
  });
  const inStock = stats.inventory.totalItems - stats.inventory.lowStockItems - stats.inventory.outOfStockItems;
  const stockData = [
    { name: 'En Stock', value: inStock, color: '#10B981' },
    { name: 'Stock Bajo', value: stats.inventory.lowStockItems, color: '#F59E0B' },
    { name: 'Agotados', value: stats.inventory.outOfStockItems, color: '#F43F5E' },
  ];
  const empty = <p className="py-10 text-center text-gray-500">Aún no hay despachos en este período</p>;

  return (
    <div>
      {header}
      <div className="stagger grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KpiCard label="Unidades despachadas" value={num(totalUnits)} icon={<IconBarChart />} tone="blue" delta={pct(totalUnits, d.previousUnits)} />
        <KpiCard label="Salidas a venta" value={num(d.venta)} icon={<IconShoppingCart />} tone="navy" hint="unidades" />
        <KpiCard label="Salidas a reposición" value={num(d.reposicion)} icon={<IconRefresh />} tone="violet" hint="unidades" />
        <KpiCard label="Despachos" value={num(d.count)} icon={<IconClipboard />} tone="green" />
        <KpiCard label="Solicitudes creadas" value={num(stats.requests.created)} icon={<IconUsers />} tone="blue" hint="en el período" />
        <KpiCard label="Solicitudes pendientes" value={num(stats.requests.byStatus.pending ?? 0)} icon={<IconClipboard />} tone={stats.requests.byStatus.pending ? 'amber' : 'green'} />
        <KpiCard label="Unidades en almacén" value={num(stats.inventory.units)} icon={<IconPackage />} tone="navy" hint={`${num(stats.inventory.productsWithStock)} productos con stock`} />
        {stats.inventory.value !== undefined && (
          <KpiCard label="Valor del inventario" value={`Bs. ${stats.inventory.value.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={<IconBarChart />} tone="navy" />
        )}
      </div>

      <Card title="Salidas por día" className="mb-4 sm:mb-6">{totalUnits > 0 ? <DispatchChart data={daily} /> : empty}</Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card title="Productos más despachados">
          {d.topProducts.length ? <Ranking rows={d.topProducts.map((p) => ({ key: p.id, title: p.name, subtitle: p.code, value: p.quantity }))} /> : empty}
        </Card>
        <Card title="Abastecimiento por vendedor">
          {d.byRequester.length ? (
            <Ranking rows={d.byRequester.map((p) => ({ key: p.name, title: p.name, subtitle: `${p.dispatches} ${p.dispatches === 1 ? 'despacho' : 'despachos'}`, value: p.units }))} />
          ) : empty}
        </Card>
        <Card title="Salidas por categoría">{d.byCategory.length ? <CategoryBarChart data={d.byCategory} /> : empty}</Card>
        <Card title="Estado del inventario"><StockPieChart data={stockData} /></Card>
        <Card title="Solicitudes por estado" className="lg:col-span-2">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {['pending', 'approved', 'partially_dispatched', 'dispatched', 'rejected', 'cancelled'].map((s) => (
              <div key={s} className="rounded-xl bg-[#F3F7FF] px-3 py-2">
                <dt className="text-xs text-gray-600">{label(s)}</dt>
                <dd className="text-xl font-bold text-[#0B1B4D] tabular">{num(stats.requests.byStatus[s] ?? 0)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
}
