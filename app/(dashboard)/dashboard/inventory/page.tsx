'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  quantity: number;
  minStockLevel: number;
  unitPrice: number;
  status: string;
  category: { name: string };
}

interface Category {
  id: string;
  name: string;
}

export default function InventoryPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    categoryId: '',
    quantity: '',
    minStockLevel: '',
    unitPrice: '',
    supplier: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchInventory();
  }, [token]);

  const fetchCategories = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.items || data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchInventory = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/inventory?take=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          minStockLevel: parseInt(formData.minStockLevel),
          unitPrice: parseFloat(formData.unitPrice),
        }),
      });

      if (response.ok) {
        fetchInventory();
        setShowForm(false);
        setFormData({
          code: '',
          name: '',
          categoryId: '',
          quantity: '',
          minStockLevel: '',
          unitPrice: '',
          supplier: '',
        });
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variantMap: Record<string, any> = {
      in_stock: 'success',
      low_stock: 'warning',
      out_of_stock: 'error',
    };
    return <Badge variant={variantMap[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-[#293685] mb-2">📦 Inventario</h1>
          <p className="text-gray-600">Gestión y control de productos</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="primary">
          {showForm ? '✕ Cancelar' : '+ Nuevo Producto'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8">
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Código"
                placeholder="P001"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
              <Input
                label="Nombre"
                placeholder="Nombre del producto"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#293685]"
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Proveedor"
                placeholder="Nombre proveedor"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              />
              <Input
                label="Cantidad"
                type="number"
                placeholder="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
              <Input
                label="Stock Mínimo"
                type="number"
                placeholder="10"
                value={formData.minStockLevel}
                onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                required
              />
              <Input
                label="Precio Unitario"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" variant="primary">
                Guardar Producto
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
          <p className="text-center text-gray-600 py-8">Cargando inventario...</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#293685] bg-blue-50">
                  <th className="text-left py-4 px-4 font-bold text-[#293685]">Código</th>
                  <th className="text-left py-4 px-4 font-bold text-[#293685]">Producto</th>
                  <th className="text-left py-4 px-4 font-bold text-[#293685]">Cantidad</th>
                  <th className="text-left py-4 px-4 font-bold text-[#293685]">Precio</th>
                  <th className="text-left py-4 px-4 font-bold text-[#293685]">Estado</th>
                  <th className="text-left py-4 px-4 font-bold text-[#293685]">Categoría</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((item, idx) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="py-4 px-4 text-sm font-semibold text-[#293685]">{item.code}</td>
                      <td className="py-4 px-4 text-sm text-gray-900">{item.name}</td>
                      <td className="py-4 px-4 text-sm font-medium text-gray-900">
                        {item.quantity}
                        {item.quantity < item.minStockLevel && <span className="text-orange-600 ml-2">⚠️ Bajo</span>}
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-[#293685]">${item.unitPrice.toFixed(2)}</td>
                      <td className="py-4 px-4">{getStatusBadge(item.status)}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{item.category?.name || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      No hay productos en el inventario
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
