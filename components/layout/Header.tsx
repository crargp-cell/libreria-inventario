'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/Button';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-[#293685] border-b border-[#1f2860] shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">📚 Librería Inventario</h1>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-blue-100 uppercase tracking-wide">{user.role}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
