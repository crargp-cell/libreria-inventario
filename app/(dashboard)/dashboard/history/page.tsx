'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { notify } from '@/components/ui/Toast';
import { StatusBadge, TypeBadge } from '@/components/requests/StatusBadge';
import { RequestDetail } from '@/components/requests/RequestDetail';
import { api, dateTime, requestCode } from '@/lib/client';
import { label } from '@/lib/labels';

interface Movement {
  id: string;
  type: string;
  requestId: string | null;
  requestNumber: number | null;
  dispatchNumber: number | null;
  productName: string;
  productCode: string;
  brand?: string | null;
  details?: string | null;
  requestedQty: number;
  approvedQty: number | null;
  dispatchedQty: number | null;
  status: string;
  requester: string | null;
  reviewer: string | null;
  dispatcher: string | null;
  requestedAt: string;
  approvedAt: string | null;
  dispatchedAt: string | null;
  requestNote: string | null;
  reviewNote: string | null;
  dispatchNote: string | null;
}

type Person = { id: string; name: string };
const EMPTY = { from: '', to: '', requesterId: '', handlerId: '', q: '', type: '', status: '' };
const PAGE = 25;
const field = 'w-full min-h-11 px-3 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-[#1D4ED8]';

export default function HistoryPage() {
  const { token, user } = useAuth();
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Movement[] | null>(null);
  const [total, setTotal] = useState(0);
  const [units, setUnits] = useState({ venta: 0, reposicion: 0, entrada: 0 });
  const [people, setPeople] = useState<{ requesters: Person[]; handlers: Person[] }>({ requesters: [], handlers: [] });
  const [openId, setOpenId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const set = (key: keyof typeof EMPTY, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(0);
  };

  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ take: String(PAGE), skip: String(page * PAGE) });
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      try {
        const data = await api(token, `/api/movements?${params}`);
        setRows(data.movements);
        setTotal(data.total);
        setUnits(data.units);
        setPeople(data.people);
      } catch (e) {
        setRows([]);
        notify((e as Error).message, 'error');
      }
    }, filters.q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [token, filters, page, version]);

  if (!token || !user) return null;

  const select = (id: keyof typeof EMPTY, text: string, options: [string, string][]) => (
    <div>
      <label htmlFor={`h-${id}`} className="mb-1 block text-sm font-semibold text-gray-900">{text}</label>
      <select id={`h-${id}`} className={field} value={filters[id]} onChange={(e) => set(id, e.target.value)}>
        <option value="">Todos</option>
        {options.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-4xl font-bold text-[#0B1B4D] mb-1">Historial de movimientos</h1>
        <p className="text-gray-600">Solicitudes, salidas a venta, salidas a reposición y entradas al almacén.</p>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="col-span-2">
            <label htmlFor="h-q" className="mb-1 block text-sm font-semibold text-gray-900">Producto</label>
            <input id="h-q" type="search" className={field} maxLength={100} placeholder="Nombre, marca o código" value={filters.q} onChange={(e) => set('q', e.target.value)} />
          </div>
          <div>
            <label htmlFor="h-from" className="mb-1 block text-sm font-semibold text-gray-900">Desde</label>
            <input id="h-from" type="date" className={field} value={filters.from} onChange={(e) => set('from', e.target.value)} />
          </div>
          <div>
            <label htmlFor="h-to" className="mb-1 block text-sm font-semibold text-gray-900">Hasta</label>
            <input id="h-to" type="date" className={field} value={filters.to} onChange={(e) => set('to', e.target.value)} />
          </div>
          {select('type', 'Tipo de salida', [['venta', label('venta')], ['reposicion', label('reposicion')], ['solicitud', 'Sin despacho'], ['entrada', 'Entrada al almacén']])}
          {select('status', 'Estado de solicitud', ['pending', 'approved', 'partially_dispatched', 'dispatched', 'rejected', 'cancelled'].map((s) => [s, label(s)] as [string, string]))}
          {select('requesterId', 'Vendedor', people.requesters.map((p) => [p.id, p.name] as [string, string]))}
          {select('handlerId', 'Encargado', people.handlers.map((p) => [p.id, p.name] as [string, string]))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-gray-700 tabular">
            {total} registros · A venta: <strong>{units.venta}</strong> · A reposición: <strong>{units.reposicion}</strong> · Entradas: <strong>{units.entrada}</strong> unidades
          </p>
          <Button size="sm" variant="ghost" onClick={() => { setFilters(EMPTY); setPage(0); }}>Limpiar filtros</Button>
        </div>
      </Card>

      <Card>
        {rows === null ? (
          <TableSkeleton label="Cargando historial..." />
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-gray-500">No hay movimientos con esos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full stack">
              <thead>
                <tr className="border-b border-blue-100 bg-[#F3F7FF]">
                  {['Movimiento', 'Producto', 'Cantidades', 'Personas', 'Fechas', 'Observaciones'].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 align-top">
                    <td data-label="Movimiento" className="py-3 px-3">
                      <div className="flex flex-col items-end md:items-start gap-1">
                        <TypeBadge type={m.type} />
                        {m.requestId && m.requestNumber !== null && (
                          <button type="button" onClick={() => setOpenId(m.requestId)} className="min-h-10 text-sm font-semibold text-[#1D4ED8] hover:underline tabular">
                            {requestCode(m.requestNumber)}{m.dispatchNumber ? ` · D#${m.dispatchNumber}` : ''}
                          </button>
                        )}
                        {m.type !== 'entrada' && <StatusBadge status={m.status} />}
                      </div>
                    </td>
                    <td data-label="Producto" className="py-3 px-3">
                      <div>
                        <p className="font-medium text-gray-900">{m.productName}</p>
                        <p className="text-xs text-gray-500">{[m.productCode, m.brand, m.details].filter(Boolean).join(' · ')}</p>
                      </div>
                    </td>
                    <td data-label="Cantidades" className="py-3 px-3 text-sm text-gray-700 tabular whitespace-nowrap">
                      <div>
                        <div>Solicitada: {m.requestedQty}</div>
                        <div>Aprobada: {m.approvedQty ?? '—'}</div>
                        <div className="font-semibold text-gray-900">{m.type === 'entrada' ? 'Ingresada' : 'Despachada'}: {m.dispatchedQty ?? '—'}</div>
                      </div>
                    </td>
                    <td data-label="Personas" className="py-3 px-3 text-sm text-gray-700">
                      <div>
                        {m.requester && <div>Vendedor: {m.requester}</div>}
                        {(m.dispatcher || m.reviewer) && <div>Encargado: {m.dispatcher || m.reviewer}</div>}
                        {m.dispatcher && m.reviewer && m.reviewer !== m.dispatcher && <div className="text-xs text-gray-500">Aprobó: {m.reviewer}</div>}
                      </div>
                    </td>
                    <td data-label="Fechas" className="py-3 px-3 text-xs text-gray-600 whitespace-nowrap">
                      <div>
                        <div>Solicitud: {dateTime(m.requestedAt)}</div>
                        <div>Aprobación: {dateTime(m.approvedAt)}</div>
                        <div>{m.type === 'entrada' ? 'Ingreso' : 'Despacho'}: {dateTime(m.dispatchedAt)}</div>
                      </div>
                    </td>
                    <td data-label="Observaciones" className="py-3 px-3 text-xs text-gray-600 max-w-56 break-words">
                      <div>
                        {m.requestNote && <div>Vendedor: {m.requestNote}</div>}
                        {m.reviewNote && <div>Revisión: {m.reviewNote}</div>}
                        {m.dispatchNote && <div>Despacho: {m.dispatchNote}</div>}
                        {!m.requestNote && !m.reviewNote && !m.dispatchNote && '—'}
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
            <p className="text-sm text-gray-600 tabular">{page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} de {total}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button size="sm" variant="secondary" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </Card>

      {openId && <RequestDetail id={openId} token={token} user={user} onClose={() => setOpenId(null)} onChanged={() => setVersion((v) => v + 1)} />}
    </div>
  );
}
