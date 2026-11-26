// Esqueleto de carga para tablas/listas: mantiene la altura aproximada del contenido final
// (evita saltos de diseño) y avisa a lectores de pantalla.
export function TableSkeleton({ rows = 6, label = 'Cargando...' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 py-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-12" style={{ opacity: 1 - i * 0.1 }} />
      ))}
    </div>
  );
}
