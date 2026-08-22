'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  user: { name: string; email: string };
  changes?: string;
  createdAt: string;
}

export default function AuditPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
  });

  useEffect(() => {
    fetchLogs();
  }, [token, filters]);

  const fetchLogs = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      params.append('take', '50');

      const response = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    const colorMap: Record<string, string> = {
      CREATE: 'success',
      UPDATE: 'info',
      DELETE: 'error',
      LOGIN: 'warning',
      LOGOUT: 'default',
      APPROVE: 'success',
      REJECT: 'error',
    };
    return colorMap[action] || 'default';
  };

  const getEntityColor = (type: string) => {
    const colorMap: Record<string, string> = {
      USER: 'error',
      INVENTORY_ITEM: 'info',
      ORDER: 'success',
      RESTOCK_REQUEST: 'warning',
      TRANSACTION: 'default',
    };
    return colorMap[type] || 'default';
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Auditoría</h1>
        <p className="text-gray-600">Registro de todas las acciones del sistema</p>
      </div>

      {/* Filtros */}
      <Card className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acción</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las acciones</option>
              <option value="CREATE">Crear</option>
              <option value="UPDATE">Actualizar</option>
              <option value="DELETE">Eliminar</option>
              <option value="LOGIN">Login</option>
              <option value="APPROVE">Aprobar</option>
              <option value="REJECT">Rechazar</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Entidad</label>
            <select
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="USER">Usuario</option>
              <option value="INVENTORY_ITEM">Producto</option>
              <option value="ORDER">Orden</option>
              <option value="RESTOCK_REQUEST">Restock</option>
              <option value="TRANSACTION">Transacción</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ action: '', entityType: '' })}
              className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card>
          <p className="text-center text-gray-600 py-8">Cargando registros...</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Acción</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Entidad</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Usuario</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Cambios</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <Badge variant={getActionColor(log.action) as any}>{log.action}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <Badge variant={getEntityColor(log.entityType) as any}>{log.entityType}</Badge>
                          <div className="text-xs text-gray-500 mt-1">{log.entityId.slice(0, 8)}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="font-medium text-gray-900">{log.user.name}</div>
                        <div className="text-xs text-gray-500">{log.user.email}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                        {log.changes ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600">Ver cambios</summary>
                            <pre className="text-xs bg-gray-50 p-2 mt-2 rounded overflow-auto max-h-20">
                              {JSON.stringify(JSON.parse(log.changes), null, 2)}
                            </pre>
                          </details>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs">{new Date(log.createdAt).toLocaleTimeString()}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No hay registros de auditoría
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
