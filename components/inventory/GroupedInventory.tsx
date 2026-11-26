'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { notify } from '@/components/ui/Toast';
import { api } from '@/lib/client';

interface Group {
  key: string;
  product: string;
  color: string | null;
  size: string | null;
  model: string | null;
  presentation: string | null;
  totalQuantity: number;
  itemCount: number;
  grouped: boolean;
  members: { id: string; code: string; name: string; brand: string | null; quantity: number }[];
}

const PAGE = 25;

/** Vista agrupada del MISMO inventario: suma las existencias de productos equivalentes sin importar la marca. */
export function GroupedInventory({ token }: { token: string }) {
  const [query, setQuery] = useState('');
  const [onlyGrouped, setOnlyGrouped] = useState(false);
  const [page, setPage] = useState(0);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => setPage(0), [query, onlyGrouped]);

  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams({ take: String(PAGE), skip: String(page * PAGE) });
      if (query.trim()) params.set('q', query.trim());
      if (onlyGrouped) params.set('onlyGrouped', '1');
      try {
        const data = await api(token, `/api/inventory/grouped?${params}`);
        setGroups(data.groups);
        setTotal(data.total);
      } catch (e) {
        setGroups([]);
        notify((e as Error).message, 'error');
      }
    };
    const timer = setTimeout(load, query ? 300 : 0);
    // Las cantidades se refrescan solas tras entradas y despachos
    const refresh = setInterval(() => document.visibilityState === 'visible' && load(), 30_000);
    return () => {
      clearTimeout(timer);
      clearInterval(refresh);
    };
  }, [token, query, onlyGrouped, page]);

  return (
    <>
      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="search" aria-label="Buscar en el inventario generalizado" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={100}
            placeholder="Buscar por producto, color o código..."
            className="flex-1 min-h-11 px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#1D4ED8]" />
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" className="size-5 accent-[#1D4ED8]" checked={onlyGrouped} onChange={(e) => setOnlyGrouped(e.target.checked)} />
            Solo productos con grupo
          </label>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Se agrupan los productos con el mismo <strong>producto genérico</strong>, color, tamaño, modelo y presentación. La marca no separa grupos.
          Los que no tienen producto genérico aparecen solos; edítalos en la vista detallada para agruparlos.
        </p>
      </Card>

      <Card>
        {groups === null ? (
          <TableSkeleton label="Cargando inventario..." />
        ) : groups.length === 0 ? (
          <p className="py-10 text-center text-gray-500">No hay resultados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full stack">
              <thead>
                <tr className="border-b border-blue-100 bg-[#F3F7FF]">
                  {['Producto', 'Color', 'Tamaño / modelo / presentación', 'Cantidad total', 'Registros'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.key} className="border-b border-gray-100 align-top">
                    <td data-label="Producto" className="py-3 px-4 font-medium text-gray-900">{g.product}</td>
                    <td data-label="Color" className="py-3 px-4 text-sm text-gray-700">{g.color ?? '—'}</td>
                    <td data-label="Variante" className="py-3 px-4 text-sm text-gray-700">{[g.size, g.model, g.presentation].filter(Boolean).join(' · ') || '—'}</td>
                    <td data-label="Cantidad total" className="py-3 px-4 text-lg font-bold text-[#0B1B4D] tabular">{g.totalQuantity.toLocaleString('es-BO')}</td>
                    <td data-label="Registros" className="py-3 px-4 text-sm">
                      <div>
                        <button type="button" aria-expanded={open === g.key} onClick={() => setOpen(open === g.key ? null : g.key)}
                          className="min-h-10 font-semibold text-[#1D4ED8] hover:underline">
                          {g.itemCount} {g.itemCount === 1 ? 'registro' : 'registros'}
                        </button>
                        {open === g.key && (
                          <ul className="mt-1 space-y-1 text-xs text-gray-700 anim-fade-in">
                            {g.members.map((m) => (
                              <li key={m.id}><strong>{m.brand || 'Sin marca'}</strong> · {m.code}: <span className="tabular">{m.quantity}</span></li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > PAGE && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600 tabular">{(page * PAGE + 1).toLocaleString('es-BO')}–{Math.min((page + 1) * PAGE, total).toLocaleString('es-BO')} de {total.toLocaleString('es-BO')}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button size="sm" variant="secondary" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
