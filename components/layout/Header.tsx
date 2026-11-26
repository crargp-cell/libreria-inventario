'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/Button';
import { label } from '@/lib/labels';
import { IconLogout, IconMenu } from '@/components/icons';

interface HeaderProps {
  onMenuClick: () => void;
  menuOpen: boolean;
}

export function Header({ onMenuClick, menuOpen }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-blue-100 pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            aria-controls="main-sidebar"
            className="lg:hidden size-11 -ml-2 shrink-0 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 active:scale-95 transition-[background-color,transform] duration-150 ease-[var(--ease-out)]"
          >
            <IconMenu />
          </button>
          <div className="min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-dark.svg" alt="Tu Librería Líder" width={120} height={45} className="h-9 sm:h-10 w-auto lg:hidden" />
            <p className="hidden lg:block text-xl font-extrabold text-[#0B1B4D] truncate leading-tight">Tu Librería Líder</p>
            <p className="hidden sm:block text-xs text-gray-500 font-medium">Gestión de Almacén</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
          {user && (
            <>
              <div className="hidden sm:block text-right border-r border-gray-200 pr-6 max-w-48">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-[#1D4ED8] uppercase font-medium tracking-wider">{label(user.role)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                aria-label="Cerrar sesión"
                className="gap-2 text-gray-600 hover:text-[#1D4ED8]"
              >
                <IconLogout />
                <span className="hidden md:inline">Cerrar Sesión</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
