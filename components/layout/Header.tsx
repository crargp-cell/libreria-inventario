'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/Button';
import { IconLogout } from '@/components/icons';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#0066CC]">Tu Librería Líder</h1>
          <p className="text-xs text-gray-500 font-medium">Sistema de Gestión de Inventario</p>
        </div>
        <div className="flex items-center gap-6">
          {user && (
            <>
              <div className="text-right border-r border-gray-200 pr-6">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-[#0066CC] uppercase font-medium tracking-wider">{user.role}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="flex items-center gap-2 text-gray-600 hover:text-[#0066CC]"
              >
                <IconLogout />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
