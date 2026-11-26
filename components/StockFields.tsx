'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { formatStock, splitStock, toPieces } from '@/lib/packs';

export interface StockValue {
  quantity: string;     // total en piezas
  unitsPerPack: string; // piezas por caja/paquete
  packName: string;
}

const PACK_NAMES = ['Caja', 'Paquete', 'Docena', 'Bolsa', 'Set', 'Estuche', 'Block', 'Cajita', 'Tubo', 'Envase'];

interface Props {
  value: StockValue;
  onChange: (next: StockValue) => void;
}

/** Stock unificado: define cuántas piezas trae cada caja y permite cargar "cajas + sueltas". */
export function StockFields({ value, onChange }: Props) {
  const size = Math.max(1, parseInt(value.unitsPerPack) || 1);
  const total = Math.max(0, parseInt(value.quantity) || 0);
  const { packs, loose } = splitStock({ quantity: total, unitsPerPack: size });
  const name = value.packName || 'Caja';

  const set = (patch: Partial<StockValue>) => onChange({ ...value, ...patch });

  return (
    <>
      <Input
        label="Piezas por caja o paquete"
        type="number"
        min={1}
        max={100000}
        placeholder="1 = se vende solo suelto"
        value={value.unitsPerPack}
        onChange={(e) => set({ unitsPerPack: e.target.value })}
      />
      {size > 1 ? (
        <>
          <div className="w-full">
            <label className="block text-sm font-semibold text-gray-900 mb-1.5">Tipo de empaque</label>
            <select
              value={name}
              onChange={(e) => set({ packName: e.target.value })}
              className="w-full px-4 py-2.5 min-h-11 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-[#1D4ED8] focus:ring-4 focus:ring-[#1D4ED8]/15"
            >
              {PACK_NAMES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <Input
            label={`${name}s completas`}
            type="number"
            min={0}
            placeholder="0"
            value={String(packs)}
            onChange={(e) =>
              set({ quantity: String(toPieces(parseInt(e.target.value) || 0, loose, size)) })
            }
          />
          <Input
            label="Piezas sueltas"
            type="number"
            min={0}
            placeholder="0"
            value={String(loose)}
            onChange={(e) =>
              set({ quantity: String(toPieces(packs, parseInt(e.target.value) || 0, size)) })
            }
          />
          <p className="md:col-span-2 text-sm text-gray-600" aria-live="polite">
            Stock total: <span className="font-semibold text-[#0B1B4D]">{formatStock({ quantity: total, unitsPerPack: size, packName: name })}</span>{' '}
            ({total.toLocaleString('es-BO')} piezas)
          </p>
        </>
      ) : (
        <Input
          label="Cantidad (piezas)"
          type="number"
          min={0}
          placeholder="0"
          value={value.quantity}
          onChange={(e) => set({ quantity: e.target.value })}
          required
        />
      )}
    </>
  );
}
