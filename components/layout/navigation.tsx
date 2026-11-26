import React from 'react';
import { ADMINS, STAFF, ALL_ROLES } from '@/lib/auth/roles';
import {
  IconDashboard,
  IconShoppingCart,
  IconPackage,
  IconClipboard,
  IconRefresh,
  IconBarChart,
  IconUsers,
} from '@/components/icons';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: readonly string[];
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <IconDashboard />, roles: STAFF },
  { label: 'Solicitudes', href: '/dashboard/requests', icon: <IconShoppingCart />, roles: ALL_ROLES },
  { label: 'Inventario', href: '/dashboard/inventory', icon: <IconPackage />, roles: STAFF },
  { label: 'Historial', href: '/dashboard/history', icon: <IconClipboard />, roles: STAFF },
  { label: 'Entradas', href: '/dashboard/restock', icon: <IconRefresh />, roles: ADMINS },
  { label: 'Reportes', href: '/dashboard/reports', icon: <IconBarChart />, roles: STAFF },
  { label: 'Ventas anteriores', href: '/dashboard/orders', icon: <IconClipboard />, roles: ADMINS },
  { label: 'Usuarios', href: '/dashboard/users', icon: <IconUsers />, roles: ADMINS },
  { label: 'Auditoría', href: '/dashboard/audit', icon: <IconClipboard />, roles: ADMINS },
];

/** ¿El rol puede abrir esa ruta del panel? */
export function canVisit(role: string, pathname: string): boolean {
  // La antigua pantalla de salidas solo redirige a Solicitudes
  if (pathname === '/dashboard/sales') return true;
  const item = navItems.find((i) => i.href === pathname);
  return item ? item.roles.includes(role) : role !== 'vendedor';
}
