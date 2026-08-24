'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊', roles: ['admin', 'superadmin', 'supervisor', 'cajero'] },
  { label: 'Ventas', href: '/dashboard/sales', icon: '🛒', roles: ['cajero', 'supervisor', 'admin', 'superadmin'] },
  { label: 'Inventario', href: '/dashboard/inventory', icon: '📦', roles: ['admin', 'superadmin'] },
  { label: 'Órdenes', href: '/dashboard/orders', icon: '📋', roles: ['admin', 'superadmin', 'supervisor'] },
  { label: 'Restock', href: '/dashboard/restock', icon: '🔄', roles: ['admin', 'superadmin'] },
  { label: 'Reportes', href: '/dashboard/reports', icon: '📈', roles: ['admin', 'superadmin', 'supervisor'] },
  { label: 'Usuarios', href: '/dashboard/users', icon: '👥', roles: ['admin', 'superadmin'] },
  { label: 'Auditoría', href: '/dashboard/audit', icon: '📝', roles: ['admin', 'superadmin'] },
];

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  const filteredItems = navItems.filter((item) => item.roles.includes(user?.role || ''));

  return (
    <aside className="w-64 bg-[#293685] text-white h-screen flex flex-col">
      <div className="px-6 py-6 border-b border-[#1f2860]">
        <h2 className="text-xl font-bold">🏢 Sistema</h2>
      </div>
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-white text-[#293685] font-semibold'
                  : 'text-blue-100 hover:bg-[#1f2860]'
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
