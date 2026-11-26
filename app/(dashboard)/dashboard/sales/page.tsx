import { redirect } from 'next/navigation';

// La antigua pantalla de salidas (carrito de venta) se reemplazó por las solicitudes al almacén:
// el sistema no registra ventas ni cobros.
export default function SalesPage() {
  redirect('/dashboard/requests');
}
