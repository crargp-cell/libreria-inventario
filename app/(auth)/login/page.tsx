'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorKey, setErrorKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciales inválidas');
      setErrorKey((k) => k + 1); // re-dispara la animación en cada fallo
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-[#081338] via-[#0E2468] to-[#1D4ED8] flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Fondo decorativo con deriva lenta */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-400/25 rounded-full blur-3xl anim-drift"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl anim-drift [animation-delay:-7s]"></div>
      </div>

      <main className="relative w-full max-w-md anim-scale-in">
        <div className="bg-white rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,30,70,0.45)] overflow-hidden">
          <div className="bg-gradient-to-br from-[#0B1B4D] via-[#12307F] to-[#2F6BFF] px-6 sm:px-8 py-10 sm:py-12 text-center">
            <h1 className="sr-only">Tu Librería Líder</h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Tu Librería Líder" width={260} height={98} className="mx-auto w-56 sm:w-64 h-auto anim-fade-up [animation-delay:120ms]" />
            <p className="text-sky-200 text-sm font-medium mt-3 anim-fade-up [animation-delay:240ms]">Gestión de Almacén</p>
          </div>

          <div className="px-6 sm:px-8 py-8 sm:py-10">
            {error && (
              <div
                key={errorKey}
                role="alert"
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg anim-shake"
              >
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
              <Input
                label="Correo Electrónico"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
              />

              <Input
                label="Contraseña"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                maxLength={128}
              />

              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full py-3 text-base font-semibold"
              >
                {isLoading ? 'Ingresando...' : 'Ingresar al Sistema'}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-center text-gray-600 text-sm">
                ¿Primera vez aquí?{' '}
                <span className="text-[#1D4ED8] font-semibold">
                  Contacta al administrador
                </span>
              </p>
            </div>
          </div>

          <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium">
              Tu Librería Líder v1.0 © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
