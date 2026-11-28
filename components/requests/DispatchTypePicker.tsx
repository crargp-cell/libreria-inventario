'use client';

import React from 'react';

export type DispatchType = 'venta' | 'reposicion';

const OPTIONS = [
  ['venta', 'Salida a venta', 'Para atender clientes en el mostrador'],
  ['reposicion', 'Salida a reposición', 'Para reponer la tienda, el mostrador o la exhibición'],
] as const;

export function DispatchTypePicker({ value, onChange }: { value: DispatchType | ''; onChange: (value: DispatchType) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-gray-900">Tipo de salida (obligatorio)</legend>
      <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]">
        {OPTIONS.map(([key, title, help]) => (
          <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 bg-white p-3 transition-[border-color] duration-150 ${value === key ? 'border-[#1D4ED8]' : 'border-gray-200 hover:border-gray-300'}`}>
            <input type="radio" name="dispatch-type" className="mt-1 size-4 accent-[#1D4ED8]" checked={value === key} onChange={() => onChange(key)} />
            <span>
              <span className="block text-sm font-semibold text-gray-900">{title}</span>
              <span className="block text-xs text-gray-600">{help}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
