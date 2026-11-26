'use client';

import { useEffect, useState } from 'react';

// Solo desarrollo: guarda el token recibido en el hash (#token=...) y entra al panel.
export default function DevLogin() {
  const [message, setMessage] = useState('Iniciando sesión de desarrollo...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('token');
    const next = params.get('next') || '/dashboard';

    if (!token) {
      setMessage('Falta el token. Usa: npm run cambios');
      return;
    }

    localStorage.setItem('auth_token', token);
    // Quita el token de la URL y del historial antes de navegar
    window.history.replaceState(null, '', '/dev-login');
    // Solo rutas internas
    window.location.replace(next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
  }, []);

  return (
    <main className="min-h-dvh flex items-center justify-center">
      <p className="text-gray-600" role="status">{message}</p>
    </main>
  );
}
