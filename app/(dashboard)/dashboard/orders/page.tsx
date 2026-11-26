'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card } from '@/components/ui/Card';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Badge } from '@/components/ui/Badge';
import { label } from '@/lib/labels';
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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
          <IconClipboard className="w-8 h-8 text-[#1D4ED8]" />
          <h1 className="text-2xl sm:text-4xl font-bold text-[#0B1B4D] mb-1">Ventas anteriores</h1>
          <p className="text-gray-600">Historial de solo lectura: el sistema ya no registra ventas.</p>
        </div>
        <p className="text-gray-600">Historial y seguimiento de órdenes</p>
      </div>

      {/* Filtros */}
      <Card className="mb-6 bg-gradient-to-br from-[#E4ECFF] to-white border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="orders-f12" className="block text-sm font-semibold text-black mb-2">Buscar</label>
            <input id="orders-f12"
              type="text"
              placeholder="Orden # o monto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#1D4ED8] text-black"
            />
          </div>
          <div>
            <label htmlFor="orders-f13" className="block text-sm font-semibold text-black mb-2">Estado</label>
            <select id="orders-f13"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#1D4ED8] text-black"
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
              <div className="w-8 h-8 border-4 border-[#E4ECFF] border-t-[#1D4ED8] rounded-full animate-spin"></div>
              <TableSkeleton label="Cargando órdenes..." rows={4} />
            </div>
          </div>
        </Card>
      ) : filteredOrders.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full stack">
              <thead>
                <tr className="border-b border-blue-100 bg-[#F3F7FF]">
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Orden #</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Items</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Total</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Estado</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Creado por</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-100 hover:bg-[#E4ECFF]/30 cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedOrder(order); } }}
                  >
                    <td data-label="Orden #" className="py-4 px-4 text-sm font-semibold text-[#1D4ED8]">
                      {order.orderNumber}
                    </td>
                    <td data-label="Fecha" className="py-4 px-4 text-sm text-black">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td data-label="Items" className="py-4 px-4 text-sm text-black">{order.lineItems.length}</td>
                    <td data-label="Total" className="py-4 px-4 text-sm font-bold text-[#1D4ED8] whitespace-nowrap">
                      Bs. {order.total.toFixed(2)}
                    </td>
                    <td data-label="Estado" className="py-4 px-4">
                      <Badge
                        variant={order.status === 'completed' ? 'success' : 'warning'}
                      >
                        {label(order.status)}
                      </Badge>
                    </td>
                    <td data-label="Creado por" className="py-4 px-4 text-sm text-gray-600">
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

      {/* Modal de detalle */}
      {selectedOrder && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-gray-900/50 backdrop-blur-[2px] flex items-start sm:items-center justify-center p-3 sm:p-4 z-50 overflow-auto overscroll-contain anim-fade-in">
          <Card className="max-w-2xl w-full my-4 sm:my-8 anim-scale-in">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-black">Detalle de Orden</h2>
              <button
                type="button" aria-label="Cerrar" onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
<svg viewBox="0 0 24 24" className="size-5 mx-auto" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
</button>
            </div>

            {/* Info general */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-[#E4ECFF] rounded-lg">
              <div>
                <p className="text-xs text-gray-600">Orden #</p>
                <p className="text-lg font-bold text-[#1D4ED8]">{selectedOrder.orderNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Estado</p>
                <Badge variant={selectedOrder.status === 'completed' ? 'success' : 'warning'}>
                  {selectedOrder.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-600">Fecha</p>
                <p className="text-sm font-medium text-black">
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Creado por</p>
                <p className="text-sm font-medium text-black">
                  {selectedOrder.createdBy?.name || 'Sistema'}
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h3 className="font-bold text-black mb-3">Productos</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedOrder.lineItems.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-black">{item.inventoryItem?.name}</p>
                      <p className="text-xs text-gray-600">{item.quantity} x Bs. {item.unitPrice}</p>
                    </div>
                    <p className="font-bold text-[#1D4ED8]">Bs. {(item.quantity * item.unitPrice).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="p-4 bg-gradient-to-r from-[#E4ECFF] to-white rounded-lg mb-6 border-2 border-[#1D4ED8]">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-[#1D4ED8]">Total:</span>
                <span className="text-2xl font-bold text-[#1D4ED8]">Bs. {selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full px-4 py-2 bg-[#1D4ED8] text-white font-semibold rounded-lg hover:bg-[#1E40AF]"
            >
              Cerrar
            </button>
          </Card>
        </div>
      )}
    </div>
  );
}
