'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { notify } from '@/components/ui/Toast';
import { api, requestCode } from '@/lib/client';
import { detailsText } from '@/lib/products';
import { packSingular } from '@/lib/packs';

interface CatalogItem {
  id: string;
  code: string;
  name: string;
  supplier?: string | null;
  genericName?: string | null;
  color?: string | null;
  size?: string | null;
  model?: string | null;
  presentation?: string | null;
  description?: string | null;
  unitsPerPack: number;
  packName?: string | null;
  available: boolean;
  category: { name: string };
}

interface Line {
  item: CatalogItem;
  quantity: string;
  byPack: boolean;
}

const PAGE = 12;
const unitsOf = (l: Line) => (parseInt(l.quantity) || 0) * (l.byPack ? l.item.unitsPerPack : 1);
const subtitle = (i: CatalogItem) => [i.supplier, detailsText(i), i.description].filter(Boolean).join(' · ');

export function NewRequest({ token, onSent }: { token: string; onSent: () => void }) {
  const [query, setQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => setPage(0), [query, onlyAvailable]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ take: String(PAGE), skip: String(page * PAGE) });
      if (query.trim()) params.set('q', query.trim());
      if (onlyAvailable) params.set('available', '1');
      try {
        const data = await api(token, `/api/catalog?${params}`);
        setItems(data.items);
        setTotal(data.total);
      } catch (e) {
        setItems([]);
        notify((e as Error).message, 'error');
      }
    }, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [token, query, onlyAvailable, page]);

  const add = (item: CatalogItem) =>
    setLines((prev) => (prev.some((l) => l.item.id === item.id) ? prev : [...prev, { item, quantity: '1', byPack: false }]));
  const update = (id: string, patch: Partial<Line>) => setLines((prev) => prev.map((l) => (l.item.id === id ? { ...l, ...patch } : l)));
  const remove = (id: string) => setLines((prev) => prev.filter((l) => l.item.id !== id));

  const send = async () => {
    if (lines.some((l) => unitsOf(l) < 1)) {
      notify('Cada producto necesita una cantidad de al menos 1', 'warning');
      return;
    }
    setSending(true);
    try {
      const created = await api(token, '/api/requests', {
        note: note.trim() || undefined,
        items: lines.map((l) => ({ inventoryItemId: l.item.id, quantity: unitsOf(l) })),
      });
      notify(`Solicitud ${requestCode(created.number)} enviada al almacén`, 'success');
      setLines([]);
      setNote('');
      onSent();
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
      <Card title="Catálogo de productos" className="lg:col-span-3">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="search"
            aria-label="Buscar productos"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, marca, color o código..."
            maxLength={100}
            className="flex-1 min-h-11 px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#1D4ED8] focus:ring-4 focus:ring-[#1D4ED8]/15"
          />
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" className="size-5 accent-[#1D4ED8]" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
            Solo disponibles
          </label>
        </div>

        {items === null ? (
          <TableSkeleton label="Cargando catálogo..." />
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-gray-500">No hay productos que coincidan.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((item) => {
              const added = lines.some((l) => l.item.id === item.id);
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500 break-words">
                      {item.code}
                      {subtitle(item) ? ` · ${subtitle(item)}` : ''}
                    </p>
                    <div className="mt-1">
                      <Badge variant={item.available ? 'success' : 'default'}>{item.available ? 'Disponible' : 'Sin stock'}</Badge>
                    </div>
                  </div>
                  <Button size="sm" variant={added ? 'ghost' : 'secondary'} disabled={added} onClick={() => add(item)} aria-label={`Agregar ${item.name}`}>
                    {added ? 'Agregado' : 'Agregar'}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {total > PAGE && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600">{total.toLocaleString('es-BO')} productos</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button size="sm" variant="secondary" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </Card>

      {/* En móvil la solicitud queda bajo el catálogo: acceso directo mientras se agregan productos */}
      {lines.length > 0 && (
        <Button
          className="lg:hidden !fixed bottom-[max(1rem,env(safe-area-inset-bottom))] inset-x-4 z-20 anim-fade-up"
          onClick={() => document.getElementById('tu-solicitud')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          Ver tu solicitud ({lines.length})
        </Button>
      )}

      <Card id="tu-solicitud" title={`Tu solicitud (${lines.length})`} className="lg:col-span-2 h-fit lg:sticky lg:top-0 max-lg:mb-16">
        {lines.length === 0 ? (
          <p className="py-6 text-center text-gray-500">Agrega productos desde el catálogo.</p>
        ) : (
          <ul className="space-y-3">
            {lines.map((l) => (
              <li key={l.item.id} className="rounded-xl border border-blue-100 p-3 anim-fade-up">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{l.item.name}</p>
                    <p className="text-xs text-gray-500">{[l.item.supplier, detailsText(l.item)].filter(Boolean).join(' · ')}</p>
                  </div>
                  <button type="button" onClick={() => remove(l.item.id)} className="min-h-10 px-2 text-sm font-medium text-red-600 hover:underline">
                    Quitar
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    aria-label={`Cantidad de ${l.item.name}`}
                    value={l.quantity}
                    onChange={(e) => update(l.item.id, { quantity: e.target.value })}
                    className="w-24 min-h-11 px-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#1D4ED8]"
                  />
                  {l.item.unitsPerPack > 1 ? (
                    <select
                      aria-label={`Unidad de ${l.item.name}`}
                      value={l.byPack ? 'pack' : 'unit'}
                      onChange={(e) => update(l.item.id, { byPack: e.target.value === 'pack' })}
                      className="min-h-11 px-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900"
                    >
                      <option value="unit">piezas</option>
                      <option value="pack">{packSingular(l.item.packName)} de {l.item.unitsPerPack}</option>
                    </select>
                  ) : (
                    <span className="text-sm text-gray-600">piezas</span>
                  )}
                  {l.byPack && <span className="text-sm text-gray-600">= {unitsOf(l)} piezas</span>}
                </div>
              </li>
            ))}
          </ul>
        )}

        <label htmlFor="request-note" className="mt-4 mb-1.5 block text-sm font-semibold text-gray-900">
          Observación o justificación (opcional)
        </label>
        <textarea
          id="request-note"
          rows={3}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej.: los clientes están pidiendo bolígrafos azules"
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#1D4ED8]"
        />
        <Button className="mt-3 w-full" isLoading={sending} disabled={lines.length === 0} onClick={send}>
          Enviar solicitud al almacén
        </Button>
      </Card>
    </div>
  );
}
