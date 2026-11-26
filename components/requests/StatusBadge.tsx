import { Badge } from '@/components/ui/Badge';
import { label } from '@/lib/labels';

const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  pending: 'warning',
  approved: 'info',
  partially_dispatched: 'info',
  dispatched: 'success',
  completed: 'success',
  rejected: 'error',
  cancelled: 'default',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={variants[status] ?? 'default'}>{label(status)}</Badge>;
}

export function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    venta: 'bg-blue-100 text-blue-800',
    reposicion: 'bg-violet-100 text-violet-800',
    entrada: 'bg-emerald-100 text-emerald-800',
    solicitud: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium whitespace-nowrap ${styles[type] ?? styles.solicitud}`}>
      {label(type)}
    </span>
  );
}
