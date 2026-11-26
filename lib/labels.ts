// Etiquetas en español para los valores internos (en inglés) que guarda la BD.
const labels: Record<string, string> = {
  in_stock: 'En stock',
  low_stock: 'Stock bajo',
  out_of_stock: 'Agotado',
  active: 'Activo',
  inactive: 'Inactivo',
  deleted: 'Eliminado',
  pending: 'Pendiente',
  processing: 'En proceso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  superadmin: 'Superadmin',
  admin: 'Admin',
  supervisor: 'Supervisor',
  cajero: 'Cajero',
  vendedor: 'Vendedor',
  encargado: 'Encargado de almacén',
  partially_dispatched: 'Despacho parcial',
  dispatched: 'Despachada',
  venta: 'Salida a venta',
  reposicion: 'Salida a reposición',
  solicitud: 'Solicitud',
  entrada: 'Entrada',
};

export function label(value: string): string {
  return labels[value] ?? value;
}
