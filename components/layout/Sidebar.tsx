'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { usePathname } from 'next/navigation';
import { IconBook, IconClose } from '@/components/icons';
import { navItems } from './navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  const filteredItems = navItems.filter((item) => item.roles.includes(user?.role || ''));

  // Cerrar con Escape y bloquear el scroll del fondo mientras el menú móvil está abierto
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Fondo oscuro del menú móvil/tablet */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-gray-900/40 backdrop-blur-[2px] lg:hidden transition-opacity duration-300 ease-[var(--ease-out)] ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        id="main-sidebar"
        aria-label="Navegación principal"
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] lg:static lg:w-64 lg:max-w-none lg:z-auto
          bg-gradient-to-b from-[#0B1B4D] via-[#0E2468] to-[#081338] border-r border-white/10 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
          transition-[transform,visibility] duration-300 ease-[var(--ease-drawer)]
          ${isOpen ? 'translate-x-0 visible' : 'max-lg:-translate-x-full max-lg:invisible'}`}
      >
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Tu Librería Líder" width={150} height={57} className="h-11 w-auto" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="lg:hidden size-10 -mr-2 flex items-center justify-center rounded-lg text-blue-200 hover:bg-white/10 active:scale-95 transition-[background-color,transform] duration-150"
          >
            <IconClose />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overscroll-contain">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex items-center gap-3 px-4 min-h-11 rounded-lg font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.98] ${
                  isActive
                    ? 'bg-gradient-to-r from-[#2F6BFF] to-[#38BDF8] text-white shadow-lg shadow-sky-400/25'
                    : 'text-blue-100/90 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-sky-300'}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-xs text-blue-200/70 text-center">
            <span className="font-semibold text-sky-300">Tu Librería Líder</span> v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
