import React from 'react';
import { Card } from '@/components/ui/Card';

interface PageTemplateProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Template base para todas las páginas del dashboard
 * Proporciona estructura consistente y profesional
 */
export function PageTemplate({
  title,
  subtitle,
  icon,
  action,
  children,
}: PageTemplateProps) {
  return (
    <div>
      {/* Header de la página */}
      <div className="mb-8 flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {icon && <div className="w-8 h-8 text-[#0066CC]">{icon}</div>}
            <h1 className="text-4xl font-bold text-gray-900">{title}</h1>
          </div>
          {subtitle && <p className="text-gray-600">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      {/* Contenido */}
      {children}
    </div>
  );
}

interface DataTableTemplateProps {
  title: string;
  columns: Array<{
    key: string;
    label: string;
    width?: string;
  }>;
  data: any[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
}

/**
 * Template para tablas de datos con estructura consistente
 */
export function DataTableTemplate({
  title,
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No hay datos disponibles',
  onRowClick,
}: DataTableTemplateProps) {
  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-[#E8F0FF] border-t-[#0066CC] rounded-full animate-spin"></div>
            <p className="text-gray-600">Cargando datos...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {title && <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[#0066CC] bg-[#E8F0FF]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left py-4 px-4 font-bold text-[#0066CC] ${col.width || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-100 hover:bg-[#E8F0FF]/30 transition-colors cursor-pointer"
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="py-4 px-4 text-sm text-gray-900">
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface FormTemplateProps {
  title: string;
  fields: Array<{
    name: string;
    label: string;
    type?: 'text' | 'email' | 'number' | 'select' | 'textarea';
    placeholder?: string;
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
  onSubmit: (data: Record<string, any>) => void;
  isLoading?: boolean;
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
}

/**
 * Template para formularios con estructura consistente
 */
export function FormTemplate({
  title,
  fields,
  onSubmit,
  isLoading = false,
  submitText = 'Guardar',
  cancelText = 'Cancelar',
  onCancel,
}: FormTemplateProps) {
  const [formData, setFormData] = React.useState<Record<string, any>>(
    fields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {})
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card>
      <h2 className="text-lg font-bold text-gray-900 mb-6">{title}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-semibold text-black mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.type === 'select' ? (
                <select
                  value={formData[field.name]}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.name]: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 text-black"
                  required={field.required}
                >
                  <option value="">Seleccionar...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={formData[field.name]}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.name]: e.target.value })
                  }
                  placeholder={field.placeholder}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 text-black"
                  required={field.required}
                  rows={4}
                />
              ) : (
                <input
                  type={field.type || 'text'}
                  value={formData[field.name]}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.name]: e.target.value })
                  }
                  placeholder={field.placeholder}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 text-black"
                  required={field.required}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-[#0066CC] text-white font-semibold rounded-lg hover:bg-[#0052A3] disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? 'Guardando...' : submitText}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              {cancelText}
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
