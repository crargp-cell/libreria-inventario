'use client';

// Pantalla de error amigable. No muestra el mensaje técnico (podría revelar rutas o datos internos);
// solo el código de referencia que Next asigna, útil para buscar el fallo en los registros del servidor.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6 bg-gradient-to-br from-[#081338] via-[#0E2468] to-[#1D4ED8]">
      <div role="alert" className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl anim-scale-in">
        <h1 className="text-xl font-bold text-[#0B1B4D]">Algo salió mal</h1>
        <p className="mt-2 text-gray-600">No pudimos cargar esta pantalla. Puedes intentarlo de nuevo.</p>
        {error.digest && <p className="mt-2 text-xs text-gray-500">Referencia: {error.digest}</p>}
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#2F6BFF] to-[#1D4ED8] px-5 font-semibold text-white shadow-md shadow-blue-600/25 transition-[transform,box-shadow] duration-150 hover:shadow-lg active:scale-[0.97]"
        >
          Intentar de nuevo
        </button>
      </div>
    </main>
  );
}
