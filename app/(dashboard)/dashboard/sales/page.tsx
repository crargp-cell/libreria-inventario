'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  createdBy?: { name: string };
  lineItems: any[];
}

export default function SalesPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/orders?take=20', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variantMap: Record<string, any> = {
      completed: 'success',
      pending: 'warning',
      processing: 'info',
      cancelled: 'error',
    };
    return <Badge variant={variantMap[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ventas</h1>
          <p className="text-gray-600">Órdenes y transacciones</p>
        </div>
        <Button onClick={() => setShowNewOrder(!showNewOrder)} variant="primary">
          {showNewOrder ? '✕ Cancelar' : '+ Nueva Orden'}
        </Button>
      </div>

      {showNewOrder && (
        <Card className="mb-8">
          <p className="text-gray-600 text-center py-8">
            Formulario de nueva orden (en desarrollo)
          </p>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <p className="text-center text-gray-600 py-8">Cargando órdenes...</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Orden #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Items</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900 font-medium">{order.orderNumber}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{order.lineItems.length} items</td>
                      <td className="py-3 px-4 text-sm text-gray-900 font-semibold">${order.total.toFixed(2)}</td>
                      <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No hay órdenes registradas
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
