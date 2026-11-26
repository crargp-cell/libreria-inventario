'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { notify } from '@/components/ui/Toast';
import { NewRequest } from '@/components/requests/NewRequest';
import { RequestDetail } from '@/components/requests/RequestDetail';
import { StatusBadge } from '@/components/requests/StatusBadge';
import { api, dateTime, requestCode } from '@/lib/client';
import { label } from '@/lib/labels';

interface Row {
  id: string;
  number: number;
  status: string;
  createdAt: string;
  requester: { name: string };
  itemCount: number;
  preview: string[];
  requestedUnits: number;
  approvedUnits: number;
  dispatchedUnits: number;
}

const STATUSES = ['', 'pending', 'approved', 'partially_dispatched', 'dispatched', 'rejected', 'cancelled'];
const PAGE = 15;

export default function RequestsPage() {
  const { token, user } = useAuth();
  const isVendor = user?.role === 'vendedor';
  const [tab, setTab] = useState<'new' | 'list'>(isVendor ? 'new' : 'list');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const params = new URLSearchParams({ take: String(PAGE), skip: String(page * PAGE) });
    if (status) params.set('status', status);
    try {
      const data = await api(token, `/api/requests?${params}`);
      setRows(data.requests);
      setTotal(data.total);
      setCounts(data.counts);
    } catch (e) {
      setRows([]);
      notify((e as Error).message, 'error');
    }
  }, [token, status, page]);

  useEffect(() => {
    load();
    // Las solicitudes nuevas y los cambios de estado aparecen sin recargar la página
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const closeDetail = useCallback(() => setOpenId(null), []);

  if (!token || !user) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-4xl font-bold text-[#0B1B4D] mb-1">Solicitudes al almacén</h1>
        <p className="text-gray-600">
          {isVendor ? 'Pide productos para abastecer el mostrador y sigue el estado de tus pedidos.' : 'Revisa, aprueba y despacha los pedidos de los vendedores.'}
        </p>
      </div>

      {isVendor && (
        <div className="mb-5 inline-flex rounded-xl bg-white p-1 border border-blue-100" role="tablist">
          {([['new', 'Nueva solicitud'], ['list', 'Mis solicitudes']] as const).map(([key, text]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition-[background-color,color] duration-150 ${tab === key ? 'bg-[#1D4ED8] text-white' : 'text-gray-700 hover:bg-[#E4ECFF]'}`}>
              {text}
            </button>
          ))}
        </div>
      )}

      {isVendor && tab === 'new' ? (
        <NewRequest token={token} onSent={() => { setStatus(''); setPage(0); setTab('list'); load(); }} />
      ) : (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar por estado">
            {STATUSES.map((s) => (
              <button key={s || 'all'} type="button" aria-pressed={status === s} onClick={() => { setStatus(s); setPage(0); }}
                className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-[background-color,color] duration-150 ${status === s ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white' : 'border-blue-100 bg-white text-gray-700 hover:bg-[#E4ECFF]'}`}>
                {s ? label(s) : 'Todas'}
                {s && counts[s] ? <span className="ml-1.5 tabular">({counts[s]})</span> : null}
              </button>
            ))}
          </div>

          {rows === null ? (
            <Card><TableSkeleton label="Cargando solicitudes..." /></Card>
          ) : rows.length === 0 ? (
            <Card><p className="py-10 text-center text-gray-500">No hay solicitudes {status ? `en estado "${label(status)}"` : 'todavía'}.</p></Card>
          ) : (
            <ul className="stagger grid gap-3">
              {rows.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpenId(r.id)}
                    className="w-full rounded-xl border border-blue-100 bg-white p-4 text-left shadow-sm transition-[box-shadow,transform] duration-150 hover:shadow-md active:scale-[0.995]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[#1D4ED8] tabular">{requestCode(r.number)}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <span className="text-sm text-gray-500">{dateTime(r.createdAt)}</span>
                    </div>
                    {!isVendor && <p className="mt-1 text-sm text-gray-700">Vendedor: <strong>{r.requester.name}</strong></p>}
                    <p className="mt-1 truncate text-sm text-gray-600">
                      {r.preview.join(', ')}{r.itemCount > r.preview.length ? ` y ${r.itemCount - r.preview.length} más` : ''}
                    </p>
                    <p className="mt-2 text-xs text-gray-500 tabular">
                      Solicitadas {r.requestedUnits} · Aprobadas {r.approvedUnits} · Despachadas {r.dispatchedUnits}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {total > PAGE && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-gray-600">{total} solicitudes</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                <Button size="sm" variant="secondary" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
              </div>
            </div>
          )}
        </>
      )}

      {openId && <RequestDetail id={openId} token={token} user={user} onClose={closeDetail} onChanged={load} />}
    </div>
  );
}
