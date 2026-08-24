'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { IconClipboard } from '@/components/icons';

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  createdBy?: { name: string };
  lineItems: any[];
}

export default function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (token) fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/orders?take=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const orders = Array.isArray(data) ? data : (data.items || data.orders || []);
        setOrders(orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.total.toString().includes(searchQuery);
    const matchesStatus = !filterStatus || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <IconClipboard className="w-8 h-8 text-[#0066CC]" />
          <h1 className="text-4xl font-bold text-gray-900">Órdenes</h1>
        </div>
        <p className="text-gray-600">Historial y seguimiento de órdenes</p>
      </div>

      {/* Filtros */}
      <Card className="mb-6 bg-gradient-to-br from-[#E8F0FF] to-white border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-black mb-2">Buscar</label>
            <input
              type="text"
              placeholder="Orden # o monto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#0066CC] text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-2">Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#0066CC] text-black"
            >
              <option value="">Todos los estados</option>
              <option value="completed">Completada</option>
              <option value="pending">Pendiente</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="w-full px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-black font-bold">
              {filteredOrders.length} / {orders.length} órdenes
            </div>
          </div>
        </div>
      </Card>

      {/* Órdenes */}
      {isLoading ? (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#E8F0FF] border-t-[#0066CC] rounded-full animate-spin"></div>
              <p className="text-gray-600">Cargando órdenes...</p>
            </div>
          </div>
        </Card>
      ) : filteredOrders.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#0066CC] bg-[#E8F0FF]">
                  <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Orden #</th>
                  <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Fecha</th>
                  <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Items</th>
                  <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Total</th>
                  <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Estado</th>
                  <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Creado por</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-[#E8F0FF]/30">
                    <td className="py-4 px-4 text-sm font-semibold text-[#0066CC]">
                      {order.orderNumber}
                    </td>
                    <td className="py-4 px-4 text-sm text-black">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-sm text-black">{order.lineItems.length}</td>
                    <td className="py-4 px-4 text-sm font-bold text-[#0066CC]">
                      Bs. {order.total.toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        variant={order.status === 'completed' ? 'success' : 'warning'}
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {order.createdBy?.name || 'Sistema'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-center text-gray-500 py-12">No hay órdenes que coincidan con tu búsqueda</p>
        </Card>
      )}
    </div>
  );
}
