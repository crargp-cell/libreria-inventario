'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { api, dateTime, requestCode } from '@/lib/client';
import { label } from '@/lib/labels';
import { IconPackage, IconBarChart, IconShoppingCart, IconClipboard, IconRefresh } from '@/components/icons';

interface Stats {
  inventory: { totalItems: number; lowStockItems: number; outOfStockItems: number; productsWithStock: number; units: number; value?: number };
  requests: { byStatus: Record<string, number>; created: number };
  dispatches: { venta: number; reposicion: number; topProducts: { id: string; code: string; name: string; quantity: number }[] };
  pendingEntries: number;
}

interface Pending {
  id: string;
  number: number;
  createdAt: string;
  requester: { name: string };
  itemCount: number;
  requestedUnits: number;
}

const num = (n: number) => n.toLocaleString('es-BO');

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([api<Stats>(token, '/api/reports/stats?days=30'), api(token, '/api/requests?status=pending&take=5')])
      .then(([s, r]) => {
        setStats(s);
        setPending(r.requests);
      })
      .catch((error) => console.error('Error fetching stats:', error))
      .finally(() => setIsLoading(false));
  }, [token]);

  const toDispatch = (stats?.requests.byStatus.approved ?? 0) + (stats?.requests.byStatus.partially_dispatched ?? 0);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl mb-6 sm:mb-8 px-5 sm:px-8 py-6 sm:py-8 text-white bg-gradient-to-br from-[#0B1B4D] via-[#12307F] to-[#2F6BFF] shadow-xl shadow-blue-900/20">
        <div aria-hidden="true" className="absolute -top-16 -right-10 size-56 rounded-full bg-sky-400/30 blur-3xl anim-drift" />
        <div className="relative">
          <p className="text-sky-200 text-sm font-medium mb-1">Bienvenido, {user?.name}</p>
          <h1 className="text-2xl sm:text-4xl font-bold">Panel del almacén</h1>
          <p className="text-blue-100/90 mt-1">{user ? label(user.role) : ''}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8" role="status" aria-label="Cargando indicadores">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28" />)}
        </div>
      ) : !stats ? (
        <p className="text-gray-600">No se pudieron cargar los indicadores.</p>
      ) : (
        <>
          <div className="stagger grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <KpiCard label="Solicitudes pendientes" value={num(stats.requests.byStatus.pending ?? 0)} icon={<IconShoppingCart />} tone={stats.requests.byStatus.pending ? 'amber' : 'green'} hint="esperan revisión" />
            <KpiCard label="Por despachar" value={num(toDispatch)} icon={<IconClipboard />} tone="navy" hint="aprobadas o parciales" />
            <KpiCard label="Salidas a venta" value={num(stats.dispatches.venta)} icon={<IconBarChart />} tone="blue" hint="unidades en 30 días" />
            <KpiCard label="Salidas a reposición" value={num(stats.dispatches.reposicion)} icon={<IconRefresh />} tone="violet" hint="unidades en 30 días" />
            <KpiCard label="Unidades en almacén" value={num(stats.inventory.units)} icon={<IconPackage />} tone="green" hint={`${num(stats.inventory.productsWithStock)} productos con stock`} />
            <KpiCard label="Stock bajo" value={num(stats.inventory.lowStockItems)} icon={<IconPackage />} tone="amber" />
            <KpiCard label="Agotados" value={num(stats.inventory.outOfStockItems)} icon={<IconPackage />} tone="rose" hint={`de ${num(stats.inventory.totalItems)} productos`} />
            {stats.inventory.value !== undefined ? (
              <KpiCard label="Valor del inventario" value={`Bs. ${stats.inventory.value.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={<IconBarChart />} tone="navy" />
            ) : (
              <KpiCard label="Entradas pendientes" value={num(stats.pendingEntries)} icon={<IconRefresh />} tone="navy" />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card title="Solicitudes por revisar">
              {pending.length === 0 ? (
                <p className="py-6 text-center text-gray-500">No hay solicitudes pendientes.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {pending.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1D4ED8] tabular">{requestCode(r.number)}</p>
                        <p className="truncate text-sm text-gray-600">{r.requester.name} · {dateTime(r.createdAt)}</p>
                      </div>
                      <Badge variant="warning">{r.requestedUnits} unidades</Badge>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/dashboard/requests" className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-[#1D4ED8] hover:underline">Ir a solicitudes</Link>
            </Card>

            <Card title="Productos más despachados (30 días)">
              {stats.dispatches.topProducts.length === 0 ? (
                <p className="py-6 text-center text-gray-500">Todavía no hay despachos.</p>
              ) : (
                <ol className="space-y-3">
                  {stats.dispatches.topProducts.map((p, i) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900">{i + 1}. {p.name}</div>
                        <div className="text-sm text-gray-500">{p.code}</div>
                      </div>
                      <Badge variant="info">{num(p.quantity)} {p.quantity === 1 ? 'unidad' : 'unidades'}</Badge>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
