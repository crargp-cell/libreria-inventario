import { prisma } from './db';

interface AuditLogParams {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Todo lo que llega de cabeceras lo controla el cliente: se valida y se acota antes de guardarlo
const IP_RE = /^[0-9a-fA-F:.]{3,45}$/;
function safeIp(ip?: string) {
  const first = ip?.split(',').pop()?.trim(); // la última entrada la añade el proxy más cercano
  return first && IP_RE.test(first) ? first : null;
}
// eslint-disable-next-line no-control-regex
const safeText = (v: string | undefined, max: number) => (v ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max) : null);

export async function logAudit({
  action,
  entityType,
  entityId,
  userId,
  changes,
  ipAddress,
  userAgent,
}: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId,
        changes: changes ? JSON.stringify(changes).slice(0, 2000) : null,
        ipAddress: safeIp(ipAddress),
        userAgent: safeText(userAgent, 200),
      },
    });
  } catch (error) {
    console.error('Error logging audit:', error);
    // No lanzar error para no interrumpir la operación principal
  }
}

// Helpers para acciones comunes
export const auditActions = {
  // Usuarios
  userCreated: (userId: string, newUserId: string, changes: any, ipAddress?: string) =>
    logAudit({
      action: 'CREATE',
      entityType: 'USER',
      entityId: newUserId,
      userId,
      changes,
      ipAddress,
    }),

  userDeleted: (userId: string, deletedUserId: string, ipAddress?: string) =>
    logAudit({
      action: 'DELETE',
      entityType: 'USER',
      entityId: deletedUserId,
      userId,
      ipAddress,
    }),

  userUpdated: (userId: string, updatedUserId: string, changes: any, ipAddress?: string) =>
    logAudit({
      action: 'UPDATE',
      entityType: 'USER',
      entityId: updatedUserId,
      userId,
      changes,
      ipAddress,
    }),

  // Inventario
  inventoryCreated: (userId: string, itemId: string, changes: any, ipAddress?: string) =>
    logAudit({
      action: 'CREATE',
      entityType: 'INVENTORY_ITEM',
      entityId: itemId,
      userId,
      changes,
      ipAddress,
    }),

  inventoryUpdated: (userId: string, itemId: string, changes: any, ipAddress?: string) =>
    logAudit({
      action: 'UPDATE',
      entityType: 'INVENTORY_ITEM',
      entityId: itemId,
      userId,
      changes,
      ipAddress,
    }),

  // Órdenes
  orderCreated: (userId: string, orderId: string, changes: any, ipAddress?: string) =>
    logAudit({
      action: 'CREATE',
      entityType: 'ORDER',
      entityId: orderId,
      userId,
      changes,
      ipAddress,
    }),

  orderCompleted: (userId: string, orderId: string, ipAddress?: string) =>
    logAudit({
      action: 'COMPLETE',
      entityType: 'ORDER',
      entityId: orderId,
      userId,
      ipAddress,
    }),

  // Restock
  restockRequested: (userId: string, restockId: string, changes: any, ipAddress?: string) =>
    logAudit({
      action: 'CREATE',
      entityType: 'RESTOCK_REQUEST',
      entityId: restockId,
      userId,
      changes,
      ipAddress,
    }),

  restockApproved: (userId: string, restockId: string, ipAddress?: string) =>
    logAudit({
      action: 'APPROVE',
      entityType: 'RESTOCK_REQUEST',
      entityId: restockId,
      userId,
      ipAddress,
    }),

  restockRejected: (userId: string, restockId: string, ipAddress?: string) =>
    logAudit({
      action: 'REJECT',
      entityType: 'RESTOCK_REQUEST',
      entityId: restockId,
      userId,
      ipAddress,
    }),

  // Transacciones
  transactionCreated: (userId: string, transactionId: string, amount: number, ipAddress?: string) =>
    logAudit({
      action: 'CREATE',
      entityType: 'TRANSACTION',
      entityId: transactionId,
      userId,
      changes: { amount },
      ipAddress,
    }),

  // Login/Logout
  userLogin: (userId: string, ipAddress?: string) =>
    logAudit({
      action: 'LOGIN',
      entityType: 'USER',
      entityId: userId,
      userId,
      ipAddress,
    }),

  userLogout: (userId: string, ipAddress?: string) =>
    logAudit({
      action: 'LOGOUT',
      entityType: 'USER',
      entityId: userId,
      userId,
      ipAddress,
    }),
};
