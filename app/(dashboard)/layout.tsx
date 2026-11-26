'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/context';
import { useRouter, usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { canVisit } from '@/components/layout/navigation';
import { homeFor } from '@/lib/auth/roles';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const closeMenu = React.useCallback(() => setMenuOpen(false), []);

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Cada rol solo entra a sus pantallas (los datos además están protegidos en el servidor)
  const allowed = !user || canVisit(user.role, pathname);
  React.useEffect(() => {
    if (!isLoading && user && !allowed) {
      router.replace(homeFor(user.role));
    }
  }, [allowed, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center anim-fade-in">
          <svg className="animate-spin h-10 w-10 mx-auto mb-4 text-[#1D4ED8]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !allowed) {
    return null;
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:text-[#1D4ED8] focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        Saltar al contenido
      </a>
      <Sidebar isOpen={menuOpen} onClose={closeMenu} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setMenuOpen(true)} menuOpen={menuOpen} />
        <main id="contenido" className="flex-1 overflow-auto overscroll-contain bg-transparent p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* key por ruta: re-dispara la entrada suave al navegar */}
          <div key={pathname} className="max-w-7xl mx-auto page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
