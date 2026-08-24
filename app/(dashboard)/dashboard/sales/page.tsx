'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { IconShoppingCart } from '@/components/icons';

interface OrderLineItem {
  inventoryItemId: string;
  inventoryItemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  lineItems: any[];
}

export default function SalesPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);

  // Carrito de compras
  const [cartItems, setCartItems] = useState<OrderLineItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (token) {
      fetchOrders();
      fetchInventory();
    }
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
        const orders = Array.isArray(data) ? data : (data.items || data.orders || []);
        setOrders(orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventory = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/inventory?take=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : (data.items || []);
        setInventory(items.filter((item: any) => item.quantity > 0));
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const addToCart = () => {
    if (!selectedProductId || !quantity) return;

    const product = inventory.find((p) => p.id === selectedProductId);
    if (!product || parseInt(quantity) > product.quantity) {
      alert('Cantidad no disponible');
      return;
    }

    const subtotal = parseInt(quantity) * product.unitPrice;
    setCartItems([
      ...cartItems,
      {
        inventoryItemId: product.id,
        inventoryItemName: product.name,
        quantity: parseInt(quantity),
        unitPrice: product.unitPrice,
        subtotal,
      },
    ]);

    setSelectedProductId('');
    setQuantity('');
  };

  const removeFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const submitOrder = async () => {
    if (cartItems.length === 0) {
      alert('Agrega productos al carrito');
      return;
    }

    if (!token) return;

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          total: calculateTotal(),
          status: 'completed',
          lineItems: cartItems.map((item) => ({
            inventoryItemId: item.inventoryItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      });

      if (response.ok) {
        alert('Orden registrada correctamente');
        setCartItems([]);
        setShowNewOrder(false);
        setPaymentMethod('efectivo');
        setNotes('');
        fetchOrders();
        fetchInventory();
      } else {
        alert('Error al registrar la orden');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error al crear la orden');
    }
  };

  const total = calculateTotal();

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <IconShoppingCart className="w-8 h-8 text-[#0066CC]" />
            <h1 className="text-4xl font-bold text-gray-900">Punto de Venta</h1>
          </div>
          <p className="text-gray-600">Registra ventas en el local</p>
        </div>
        <Button onClick={() => setShowNewOrder(!showNewOrder)} variant="primary">
          {showNewOrder ? '✕ Cancelar' : '+ Nueva Venta'}
        </Button>
      </div>

      {showNewOrder && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Formulario de agregar productos */}
          <Card className="lg:col-span-2">
            <h2 className="text-lg font-bold text-black mb-6">Agregar Productos</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Producto
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#0066CC] text-black"
                >
                  <option value="">Seleccionar producto...</option>
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - Bs. {item.unitPrice.toFixed(2)} ({item.quantity} disponibles)
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Cantidad"
                type="number"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
              />

              <Button onClick={addToCart} variant="primary" className="w-full">
                Agregar al Carrito
              </Button>
            </div>

            {/* Carrito */}
            {cartItems.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-black mb-4">Carrito ({cartItems.length})</h3>
                <div className="space-y-2 mb-4">
                  {cartItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 bg-[#E8F0FF] rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-black">{item.inventoryItemName}</p>
                        <p className="text-xs text-gray-600">
                          {item.quantity} x Bs. {item.unitPrice.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#0066CC]">Bs. {item.subtotal.toFixed(2)}</span>
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="text-red-600 hover:text-red-700 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Resumen y pago */}
          <Card>
            <h2 className="text-lg font-bold text-black mb-6">Resumen</h2>

            {/* Totales */}
            <div className="space-y-4 mb-6 p-4 bg-gradient-to-br from-[#E8F0FF] to-white rounded-lg border-2 border-[#0066CC]">
              <div className="flex justify-between">
                <span className="text-black font-medium">Subtotal:</span>
                <span className="text-black font-bold">Bs. {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-[#0066CC] pt-4">
                <span className="text-lg font-bold text-[#0066CC]">Total:</span>
                <span className="text-2xl font-bold text-[#0066CC]">Bs. {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Método de pago */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-black mb-2">
                Método de Pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#0066CC] text-black"
              >
                <option value="efectivo">Efectivo</option>
                <option value="deposito">Depósito Bancario</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            {/* Notas */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-black mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones sobre la venta..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#0066CC] text-black"
                rows={3}
              />
            </div>

            {/* Botones de acción */}
            <div className="space-y-2">
              <Button
                onClick={submitOrder}
                variant="primary"
                className="w-full"
                disabled={cartItems.length === 0}
              >
                Completar Venta
              </Button>
              <Button
                onClick={() => {
                  setCartItems([]);
                  setShowNewOrder(false);
                }}
                variant="secondary"
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Órdenes recientes */}
      {isLoading ? (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#E8F0FF] border-t-[#0066CC] rounded-full animate-spin"></div>
              <p className="text-gray-600">Cargando órdenes...</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <h2 className="text-lg font-bold text-black mb-4">Órdenes Recientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#0066CC] bg-[#E8F0FF]">
                  <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Orden #</th>
                  <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Items</th>
                  <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Total</th>
                  <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Estado</th>
                  <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-[#E8F0FF]/30">
                      <td className="py-4 px-4 text-sm font-semibold text-[#0066CC]">
                        {order.orderNumber}
                      </td>
                      <td className="py-4 px-4 text-sm text-black">{order.lineItems.length} items</td>
                      <td className="py-4 px-4 text-sm font-bold text-[#0066CC]">
                        Bs. {order.total.toFixed(2)}
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="success">{order.status}</Badge>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
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
