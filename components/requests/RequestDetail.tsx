'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { notify } from '@/components/ui/Toast';
import { StatusBadge, TypeBadge } from './StatusBadge';
import { api, dateTime, operationKey, requestCode } from '@/lib/client';
import { formatStock } from '@/lib/packs';
import { WAREHOUSE, has } from '@/lib/auth/roles';

interface Item {
  id: string;
  productName: string;
  productCode: string;
  brand?: string | null;
  details?: string | null;
  requestedQty: number;
  approvedQty: number | null;
  dispatchedQty: number;
  unitsPerPack: number;
  packName?: string | null;
  stock?: number;
}

interface Detail {
  id: string;
  number: number;
  status: string;
  note?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  cancelledAt?: string | null;
  requesterId: string;
  requester: { name: string };
  reviewer?: { name: string } | null;
  cancelledBy?: { name: string } | null;
  items: Item[];
  dispatches: {
    id: string;
    number: number;
    type: string;
    note?: string | null;
    createdAt: string;
    dispatchedBy: { name: string };
    receivedBy: { name: string };
    items: { id: string; requestItemId: string; quantity: number }[];
  }[];
}

interface Props {
  id: string;
  token: string;
  user: { id: string; role: string };
  onClose: () => void;
  onChanged: () => void;
}

const input = 'w-24 min-h-11 px-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#1D4ED8]';
const packHint = (item: Item, units: number) =>
  item.unitsPerPack > 1 && units >= item.unitsPerPack
    ? formatStock({ quantity: units, unitsPerPack: item.unitsPerPack, packName: item.packName })
    : '';

export function RequestDetail({ id, token, user, onClose, onChanged }: Props) {
  const [data, setData] = useState<Detail | null>(null);
  const [approved, setApproved] = useState<Record<string, string>>({});
  const [toSend, setToSend] = useState<Record<string, string>>({});
  const [type, setType] = useState<'' | 'venta' | 'reposicion'>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  // La misma clave se reutiliza si se reintenta el mismo despacho; cambia al completarse
  const dispatchKey = useRef(operationKey());

  const apply = useCallback((d: Detail) => {
    setData(d);
    setApproved(Object.fromEntries(d.items.map((i) => [i.id, String(i.requestedQty)])));
    setToSend(
      Object.fromEntries(
        d.items.map((i) => [i.id, String(Math.max(0, Math.min((i.approvedQty ?? 0) - i.dispatchedQty, i.stock ?? 0)))])
      )
    );
    setType('');
    setNote('');
  }, []);

  useEffect(() => {
    api<Detail>(token, `/api/requests/${id}`)
      .then(apply)
      .catch((e) => {
        notify(e.message, 'error');
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const run = async (path: string, body: unknown, ok: string) => {
    setBusy(true);
    try {
      const res = await api(token, `/api/requests/${id}/${path}`, body);
      if (path === 'dispatch') {
        dispatchKey.current = operationKey();
        apply(res.request);
        notify(res.duplicate ? 'Ese despacho ya estaba registrado' : ok, res.duplicate ? 'warning' : 'success');
      } else {
        apply(res);
        notify(ok, 'success');
      }
      onChanged();
    } catch (e) {
      notify((e as Error).message, 'error');
      // El stock o el estado pudieron cambiar: se vuelve a cargar
      api<Detail>(token, `/api/requests/${id}`).then(apply).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const warehouse = has(WAREHOUSE, user.role);
  const canReview = warehouse && data?.status === 'pending';
  const canDispatch = warehouse && (data?.status === 'approved' || data?.status === 'partially_dispatched');
  const canCancel =
    !!data &&
    ['pending', 'approved'].includes(data.status) &&
    data.items.every((i) => i.dispatchedQty === 0) &&
    (warehouse || data.requesterId === user.id);

  const confirmDispatch = () => {
    if (!data) return;
    if (!type) {
      notify('Elige el tipo de salida: venta o reposición', 'warning');
      return;
    }
    const items = data.items.map((i) => ({ itemId: i.id, quantity: parseInt(toSend[i.id]) || 0 })).filter((i) => i.quantity > 0);
    if (items.length === 0) {
      notify('Despacha al menos una unidad', 'warning');
      return;
    }
    const units = items.reduce((s, i) => s + i.quantity, 0);
    const kind = type === 'venta' ? 'SALIDA A VENTA' : 'SALIDA A REPOSICIÓN';
    if (!confirm(`¿Confirmar ${kind} de ${units} unidades? El stock se descontará del almacén.`)) return;
    run('dispatch', { type, items, note: note.trim() || undefined, idempotencyKey: dispatchKey.current }, 'Despacho registrado');
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Detalle de solicitud" className="fixed inset-0 bg-gray-900/50 backdrop-blur-[2px] flex items-start sm:items-center justify-center p-3 sm:p-4 z-50 overflow-auto overscroll-contain anim-fade-in">
      <Card className="max-w-4xl w-full my-4 anim-scale-in max-h-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0B1B4D]">{data ? requestCode(data.number) : 'Solicitud'}</h2>
            {data && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <StatusBadge status={data.status} />
                <span>Solicitada por <strong className="text-gray-900">{data.requester.name}</strong> · {dateTime(data.createdAt)}</span>
              </div>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>
        </div>

        {!data ? (
          <TableSkeleton label="Cargando solicitud..." rows={4} />
        ) : (
          <div className="mt-4 space-y-5">
            <dl className="grid gap-2 text-sm">
              {data.note && (
                <div><dt className="font-semibold text-gray-900">Observación del vendedor</dt><dd className="text-gray-700 break-words">{data.note}</dd></div>
              )}
              {data.reviewer && (
                <div>
                  <dt className="font-semibold text-gray-900">{data.status === 'rejected' ? 'Rechazada' : 'Revisada'} por {data.reviewer.name} · {dateTime(data.reviewedAt)}</dt>
                  {data.reviewNote && <dd className="text-gray-700 break-words">{data.reviewNote}</dd>}
                </div>
              )}
              {data.cancelledBy && (
                <div><dt className="font-semibold text-gray-900">Cancelada por {data.cancelledBy.name} · {dateTime(data.cancelledAt)}</dt></div>
              )}
            </dl>

            <div className="overflow-x-auto">
              <table className="w-full stack">
                <thead>
                  <tr className="border-b border-blue-100 bg-[#F3F7FF]">
                    {['Producto', 'Solicitado', 'Aprobado', 'Despachado', ...(has(WAREHOUSE, user.role) || data.items[0]?.stock !== undefined ? ['En almacén'] : []), ...(canReview ? ['Autorizar'] : []), ...(canDispatch ? ['Entregar ahora'] : [])].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => {
                    const remaining = (item.approvedQty ?? 0) - item.dispatchedQty;
                    const short = item.stock !== undefined && item.stock < (canDispatch ? remaining : item.requestedQty);
                    return (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td data-label="Producto" className="py-3 px-3">
                          <div>
                            <p className="font-medium text-gray-900">{item.productName}</p>
                            <p className="text-xs text-gray-500">{[item.productCode, item.brand, item.details].filter(Boolean).join(' · ')}</p>
                          </div>
                        </td>
                        <td data-label="Solicitado" className="py-3 px-3 tabular text-gray-900">
                          <div>{item.requestedQty}<span className="block text-xs text-gray-500">{packHint(item, item.requestedQty)}</span></div>
                        </td>
                        <td data-label="Aprobado" className="py-3 px-3 tabular text-gray-900">{item.approvedQty ?? '—'}</td>
                        <td data-label="Despachado" className="py-3 px-3 tabular text-gray-900">{item.dispatchedQty}</td>
                        {item.stock !== undefined && (
                          <td data-label="En almacén" className={`py-3 px-3 tabular ${short ? 'font-semibold text-red-600' : 'text-gray-900'}`}>
                            {item.stock}{short ? ' (insuficiente)' : ''}
                          </td>
                        )}
                        {canReview && (
                          <td data-label="Autorizar" className="py-3 px-3">
                            <input type="number" min={0} max={item.requestedQty} aria-label={`Cantidad autorizada de ${item.productName}`} className={input}
                              value={approved[item.id] ?? ''} onChange={(e) => setApproved({ ...approved, [item.id]: e.target.value })} />
                          </td>
                        )}
                        {canDispatch && (
                          <td data-label="Entregar ahora" className="py-3 px-3">
                            <input type="number" min={0} max={Math.max(0, remaining)} disabled={remaining <= 0} aria-label={`Cantidad a entregar de ${item.productName}`} className={`${input} disabled:bg-gray-100`}
                              value={toSend[item.id] ?? '0'} onChange={(e) => setToSend({ ...toSend, [item.id]: e.target.value })} />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(canReview || canDispatch) && (
              <div className="rounded-xl border border-blue-100 bg-[#F3F7FF] p-4 space-y-3">
                {canDispatch && (
                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold text-gray-900">Tipo de salida (obligatorio)</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {([
                        ['venta', 'Salida a venta', 'Para atender clientes en el mostrador'],
                        ['reposicion', 'Salida a reposición', 'Para reponer el mostrador o la exhibición'],
                      ] as const).map(([value, title, help]) => (
                        <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 bg-white p-3 transition-[border-color] duration-150 ${type === value ? 'border-[#1D4ED8]' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input type="radio" name="dispatch-type" className="mt-1 size-4 accent-[#1D4ED8]" checked={type === value} onChange={() => setType(value)} />
                          <span>
                            <span className="block text-sm font-semibold text-gray-900">{title}</span>
                            <span className="block text-xs text-gray-600">{help}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
                <div>
                  <label htmlFor="warehouse-note" className="mb-1.5 block text-sm font-semibold text-gray-900">Observación del encargado (opcional)</label>
                  <textarea id="warehouse-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-[#1D4ED8]" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {canReview && (
                    <>
                      <Button isLoading={busy} onClick={() => run('approve', { note: note.trim() || undefined, items: data.items.map((i) => ({ itemId: i.id, approvedQty: approved[i.id] === '' ? 0 : Number(approved[i.id]) })) }, 'Solicitud aprobada. El stock se descontará al despachar.')}>
                        Aprobar
                      </Button>
                      <Button variant="danger" disabled={busy} onClick={() => confirm('¿Rechazar esta solicitud?') && run('reject', { note: note.trim() || undefined }, 'Solicitud rechazada')}>
                        Rechazar
                      </Button>
                    </>
                  )}
                  {canDispatch && <Button isLoading={busy} onClick={confirmDispatch}>Confirmar despacho</Button>}
                </div>
              </div>
            )}

            {data.dispatches.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold text-[#0B1B4D]">Despachos registrados</h3>
                <ul className="space-y-2">
                  {data.dispatches.map((d) => (
                    <li key={d.id} className="rounded-xl border border-blue-100 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-gray-900">Despacho #{d.number}</strong>
                        <TypeBadge type={d.type} />
                        <span className="text-gray-600">{dateTime(d.createdAt)} · entregó {d.dispatchedBy.name} · recibe {d.receivedBy.name}</span>
                      </div>
                      <ul className="mt-1 text-gray-700">
                        {d.items.map((line) => (
                          <li key={line.id}>{line.quantity} × {data.items.find((i) => i.id === line.requestItemId)?.productName}</li>
                        ))}
                      </ul>
                      {d.note && <p className="mt-1 text-gray-600 break-words">{d.note}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canCancel && (
              <Button variant="ghost" disabled={busy} onClick={() => confirm('¿Cancelar esta solicitud?') && run('cancel', {}, 'Solicitud cancelada')}>
                Cancelar solicitud
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
