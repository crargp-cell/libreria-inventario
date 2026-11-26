import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6 bg-gradient-to-br from-[#081338] via-[#0E2468] to-[#1D4ED8]">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl anim-scale-in">
        <p className="text-6xl font-extrabold text-[#1D4ED8] tabular">404</p>
        <h1 className="mt-3 text-xl font-bold text-[#0B1B4D]">Página no encontrada</h1>
        <p className="mt-2 text-gray-600">La dirección que buscas no existe o fue movida.</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#2F6BFF] to-[#1D4ED8] px-5 font-semibold text-white shadow-md shadow-blue-600/25 transition-[transform,box-shadow] duration-150 hover:shadow-lg active:scale-[0.97]"
        >
          Volver al panel
        </Link>
      </div>
    </main>
  );
}
