// Grupos de permisos (compartidos por servidor y cliente). El servidor es quien los hace cumplir.
export const ALL_ROLES = ['superadmin', 'admin', 'supervisor', 'encargado', 'vendedor'] as const;
export type Role = (typeof ALL_ROLES)[number];

/** Administración: productos, entradas, usuarios, auditoría. */
export const ADMINS: readonly string[] = ['superadmin', 'admin'];
/** Aprueban, rechazan y despachan solicitudes. */
export const WAREHOUSE: readonly string[] = ['superadmin', 'admin', 'supervisor', 'encargado'];
/** Consultan inventario, historial y reportes. */
export const STAFF: readonly string[] = ['superadmin', 'admin', 'supervisor', 'encargado'];
/** Pueden ver precios y valores monetarios. */
export const MONEY: readonly string[] = ['superadmin', 'admin', 'supervisor'];
/** Pueden crear solicitudes al almacén. */
export const REQUESTERS: readonly string[] = ['vendedor'];

export const has = (group: readonly string[], role?: string | null) => !!role && group.includes(role);

/** Página inicial de cada rol. */
export const homeFor = (role?: string | null) => (role === 'vendedor' ? '/dashboard/requests' : '/dashboard');
