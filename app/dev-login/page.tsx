import { notFound } from 'next/navigation';
import DevLogin from './DevLogin';

// Esta ruta no existe fuera de `next dev`: en producción responde 404.
export default function DevLoginPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <DevLogin />;
}
