'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card } from '@/components/ui/Card';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Button } from '@/components/ui/Button';
import { notify } from '@/components/ui/Toast';
import { label } from '@/lib/labels';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface RestockRequest {
  id: string;
  inventoryItemId: string;
  quantityRequested: number;
  status: string;
  createdAt: string;
  createdBy?: { name: string };
  approvedBy?: { name: string };
  inventoryItem?: { name: string; code: string };
}

export default function RestockPage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<RestockRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    inventoryItemId: '',
    quantityRequested: '',
  });

  useEffect(() => {
    fetchRestocks();
  }, [token]);

  const fetchRestocks = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/restock?take=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Error fetching restocks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const response = await fetch('/api/restock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          inventoryItemId: formData.inventoryItemId,
          quantityRequested: parseInt(formData.quantityRequested),
        }),
      });

      if (response.ok) {
        fetchRestocks();
        setShowForm(false);
        setFormData({ inventoryItemId: '', quantityRequested: '' });
        notify('Solicitud de restock creada');
      } else {
        notify('Error al crear solicitud de restock');
      }
    } catch (error) {
      console.error('Error creating restock:', error);
    }
  };

  const handleApprove = async (id: string) => {
    if (!token || !confirm('¿Aprobar esta solicitud de restock?')) return;

    try {
      const response = await fetch(`/api/restock/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchRestocks();
        notify('Restock aprobado');
      } else if (response.status === 409) {
        fetchRestocks();
        notify('Esta solicitud ya fue procesada', 'warning');
      } else {
        notify('Error al aprobar la solicitud');
      }
    } catch (error) {
      console.error('Error approving restock:', error);
    }
  };

  const handleReject = async (id: string) => {
    if (!token || !confirm('¿Rechazar esta solicitud de restock?')) return;

    try {
      const response = await fetch(`/api/restock/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchRestocks();
        notify('Restock rechazado');
      } else if (response.status === 409) {
        fetchRestocks();
        notify('Esta solicitud ya fue procesada', 'warning');
      } else {
        notify('Error al rechazar la solicitud');
      }
    } catch (error) {
      console.error('Error rejecting restock:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variantMap: Record<string, any> = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error',
      completed: 'info',
    };
    return <Badge variant={variantMap[status] || 'default'}>{label(status)}</Badge>;
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-[#0B1B4D] mb-1">Entradas al almacén</h1>
          <p className="text-gray-600">Reabastecimiento del almacén: al aprobar una entrada, el stock aumenta.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="primary">
          {showForm ? 'Cancelar' : '+ Nueva Solicitud'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8">
          <form onSubmit={handleCreateRestock} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="ID Producto"
                placeholder="ID del producto"
                value={formData.inventoryItemId}
                onChange={(e) => setFormData({ ...formData, inventoryItemId: e.target.value })}
                required
              />
              <Input
                label="Cantidad Solicitada"
                min={1}
                type="number"
                placeholder="0"
                value={formData.quantityRequested}
                onChange={(e) => setFormData({ ...formData, quantityRequested: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" variant="primary">
                Crear Solicitud
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <TableSkeleton label="Cargando solicitudes..." />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full stack">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Producto</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Cantidad</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Solicitado Por</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests.length > 0 ? (
                  requests.map((req) => (
                    <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td data-label="Producto" className="py-3 px-4 text-sm text-gray-900">
                        {req.inventoryItem?.name || req.inventoryItemId}
                      </td>
                      <td data-label="Cantidad" className="py-3 px-4 text-sm text-gray-900">{req.quantityRequested} unidades</td>
                      <td data-label="Estado" className="py-3 px-4">{getStatusBadge(req.status)}</td>
                      <td data-label="Solicitado Por" className="py-3 px-4 text-sm text-gray-600">{req.createdBy?.name}</td>
                      <td data-label="Fecha" className="py-3 px-4 text-sm text-gray-600">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td data-label="Acciones" className="py-3 px-4 text-sm space-x-2">
                        {req.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleApprove(req.id)}
                            >
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleReject(req.id)}
                            >
                              Rechazar
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No hay solicitudes de restock
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
