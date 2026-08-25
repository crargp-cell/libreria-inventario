'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { usePathname } from 'next/navigation';
import {
  IconDashboard,
  IconShoppingCart,
  IconPackage,
  IconClipboard,
  IconRefresh,
  IconBarChart,
  IconUsers,
  IconBook,
} from '@/components/icons';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <IconDashboard />,
    roles: ['admin', 'superadmin', 'supervisor', 'cajero'],
  },
  {
    label: 'Salidas',
    href: '/dashboard/sales',
    icon: <IconShoppingCart />,
    roles: ['cajero', 'supervisor', 'admin', 'superadmin'],
  },
  {
    label: 'Inventario',
    href: '/dashboard/inventory',
    icon: <IconPackage />,
    roles: ['admin', 'superadmin'],
  },
  {
    label: 'Órdenes',
    href: '/dashboard/orders',
    icon: <IconClipboard />,
    roles: ['admin', 'superadmin', 'supervisor'],
  },
  {
    label: 'Restock',
    href: '/dashboard/restock',
    icon: <IconRefresh />,
    roles: ['admin', 'superadmin'],
  },
  {
    label: 'Reportes',
    href: '/dashboard/reports',
    icon: <IconBarChart />,
    roles: ['admin', 'superadmin', 'supervisor'],
  },
  {
    label: 'Usuarios',
    href: '/dashboard/users',
    icon: <IconUsers />,
    roles: ['admin', 'superadmin'],
  },
  {
    label: 'Auditoría',
    href: '/dashboard/audit',
    icon: <IconClipboard />,
    roles: ['admin', 'superadmin'],
  },
];

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  const filteredItems = navItems.filter((item) => item.roles.includes(user?.role || ''));

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 h-screen flex flex-col">
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0066CC] rounded-lg flex items-center justify-center">
            <IconBook className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0066CC]">LÍDER</h2>
            <p className="text-xs text-gray-500">Gestión</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-[#0066CC] text-white font-semibold shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#0066CC]'}`}>
                {item.icon}
              </div>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-[#E8F0FF] to-white">
        <p className="text-xs text-gray-600 text-center">
          <span className="font-semibold text-[#0066CC]">Tu Librería Líder</span> v1.0
        </p>
      </div>
    </aside>
  );
}
