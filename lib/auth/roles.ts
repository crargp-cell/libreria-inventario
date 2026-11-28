// Grupos de permisos (compartidos por servidor y cliente). El servidor es quien los hace cumplir.
export const ALL_ROLES = ['superadmin', 'admin', 'supervisor', 'encargado', 'vendedor'] as const;
export type Role = (typeof ALL_ROLES)[number];

/** Administración: productos, entradas, usuarios, auditoría. */
export const ADMINS: readonly string[] = ['superadmin', 'admin'];
/** Aprueban, rechazan y despachan solicitudes. */
export const WAREHOUSE: readonly string[] = ['superadmin', 'admin', 'supervisor', 'encargado'];
/** Crean órdenes propias (se completan después) o registran la salida en el acto, sin aprobación. */
export const DIRECT_OUTPUT: readonly string[] = ['superadmin', 'admin', 'supervisor'];
/** Una orden propia es la única solicitud que aprueba la misma persona que la crea. */
export const isOwnOrder = (requesterId?: string | null, reviewerId?: string | null) => !!requesterId && requesterId === reviewerId;
/** Consultan inventario, historial y reportes. */
export const STAFF: readonly string[] = ['superadmin', 'admin', 'supervisor', 'encargado'];
/** Pueden ver precios y valores monetarios. */
export const MONEY: readonly string[] = ['superadmin', 'admin', 'supervisor'];
/** Pueden crear solicitudes al almacén. */
export const REQUESTERS: readonly string[] = ['vendedor'];

export const has = (group: readonly string[], role?: string | null) => !!role && group.includes(role);

/** Página inicial de cada rol. */
export const homeFor = (role?: string | null) => (role === 'vendedor' ? '/dashboard/requests' : '/dashboard');
