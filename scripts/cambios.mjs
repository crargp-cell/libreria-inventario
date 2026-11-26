// Abre el navegador con la app ya autenticada (solo desarrollo local).
// Uso: npm run cambios [-- <rol> [<ruta>]]
//   rol:  superadmin (por defecto) | admin | supervisor | almacen | vendedor1 | vendedor2
//   ruta: /dashboard (por defecto), p. ej. /dashboard/inventory
// Credenciales: variables DEV_EMAIL / DEV_PASSWORD, o el usuario de prueba del seed.
import { spawn } from 'node:child_process';

const PORT = process.env.PORT || '3000';
const BASE = `http://localhost:${PORT}`;
const role = process.argv[2] || 'superadmin';
const next = process.argv[3] || '/dashboard';

const email = process.env.DEV_EMAIL || `${role}@example.com`;
const password = process.env.DEV_PASSWORD || 'password123'; // contraseña de prueba del seed

const isUp = async () => {
  try {
    await fetch(`${BASE}/login`, { signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
};

const openBrowser = (url) => {
  const [cmd, args] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url.replace(/&/g, '^&')]]
    : process.platform === 'darwin' ? ['open', [url]]
    : ['xdg-open', [url]];
  spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
};

async function main() {
  if (!(await isUp())) {
    console.log('Iniciando servidor de desarrollo...');
    const dev = spawn('npm', ['run', 'dev'], { stdio: 'inherit', shell: true });
    process.on('SIGINT', () => dev.kill());
    for (let i = 0; i < 60 && !(await isUp()); i++) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!(await isUp())) throw new Error('El servidor no arrancó a tiempo.');
  }

  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const hint =
      res.status >= 500
        ? 'Revisa que la base de datos esté activa (docker compose up -d) y con datos (npm run db:seed).'
        : 'Revisa DEV_EMAIL / DEV_PASSWORD o que el usuario exista (npm run db:seed).';
    throw new Error(`Login falló (${res.status}). ${hint}`);
  }

  const { token } = await res.json();
  const params = new URLSearchParams({ token, next });
  openBrowser(`${BASE}/dev-login#${params.toString()}`);
  console.log(`Abriendo ${BASE}${next} como ${email}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
