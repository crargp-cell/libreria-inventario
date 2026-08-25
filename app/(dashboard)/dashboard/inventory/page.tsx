'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { CategoriesModal, CategoryItem } from '@/components/CategoriesModal';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  image?: string | null;
  quantity: number;
  minStockLevel: number;
  unitPrice: number;
  status: string;
  category: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  _count?: { inventoryItems: number };
}

export default function InventoryPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'price' | 'quantity'>('name');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    categoryId: '',
    quantity: '',
    minStockLevel: '',
    unitPrice: '',
    supplier: '',
    image: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchInventory();
  }, [token]);

  // Filtrar y buscar items
  useEffect(() => {
    if (!items || items.length === 0) {
      setFilteredItems([]);
      return;
    }

    let results = [...items];

    // Búsqueda por texto - mejorada para búsqueda por palabras (orden independiente)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const searchWords = query.split(/\s+/).filter(word => word.length > 0);
      
      results = results.filter(item => {
        const code = item.code?.toLowerCase() || '';
        const name = item.name?.toLowerCase() || '';
        const category = item.category?.name?.toLowerCase() || '';
        const searchableText = `${code} ${name} ${category}`;
        
        // Todas las palabras de búsqueda deben estar presentes en el texto combinado
        return searchWords.every(word => searchableText.includes(word));
      });
    }

    // Filtrar por categoría
    if (selectedCategory) {
      results = results.filter(item => item.category?.name === selectedCategory);
    }

    // Filtrar por estado
    if (selectedStatus) {
      results = results.filter(item => item.status === selectedStatus);
    }

    // Ordenar
    try {
      results.sort((a, b) => {
        switch (sortBy) {
          case 'code':
            return (a.code || '').localeCompare(b.code || '');
          case 'price':
            return (a.unitPrice || 0) - (b.unitPrice || 0);
          case 'quantity':
            return (a.quantity || 0) - (b.quantity || 0);
          case 'name':
          default:
            return (a.name || '').localeCompare(b.name || '');
        }
      });
    } catch (error) {
      console.error('Error sorting:', error);
    }

    setFilteredItems(results);
  }, [items, searchQuery, selectedCategory, selectedStatus, sortBy]);

  const fetchCategories = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const cats = Array.isArray(data) ? data : (data.categories || data.items || []);
        setCategories(cats);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
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
        const items = Array.isArray(data) ? data : (data.items || []);
        setItems(items);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setItems([]);
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
          image: formData.image || undefined,
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
          image: '',
        });
        alert('Producto agregado exitosamente');
      } else {
        alert('Error al agregar producto');
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData({ ...formData, image: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingItem) return;

    try {
      const response = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          categoryId: formData.categoryId,
          image: formData.image,
          quantity: parseInt(formData.quantity),
          minStockLevel: parseInt(formData.minStockLevel),
          unitPrice: parseFloat(formData.unitPrice),
          supplier: formData.supplier,
        }),
      });

      if (response.ok) {
        fetchInventory();
        setEditingItem(null);
        setFormData({
          code: '',
          name: '',
          categoryId: '',
          quantity: '',
          minStockLevel: '',
          unitPrice: '',
          supplier: '',
          image: '',
        });
        alert('Producto actualizado exitosamente');
      } else {
        alert('Error al actualizar producto');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Error al actualizar producto');
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

  const activeCategories = categories.filter(
    (c) => !c.status || c.status === 'active'
  );

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-[#0066CC] mb-2">Gestión de Inventario</h1>
          <p className="text-gray-600">Administra tu catálogo de productos</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="primary">
          {showForm ? '✕ Cancelar' : '+ Agregar Producto'}
        </Button>
        <Button onClick={() => setShowCategoriesModal(true)} variant="secondary">
          Gestionar Categorías
        </Button>
      </div>

      {/* Búsqueda y Filtros */}
      <Card className="mb-6 bg-gradient-to-br from-[#E8F0FF] to-white border border-blue-200">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-black mb-2">Buscar Producto</label>
            <input
              type="text"
              placeholder="Buscar por código, nombre o categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-semibold text-black mb-1">Categoría</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
              >
                <option value="">Todas las categorías</option>
                {activeCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-1">Estado</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
              >
                <option value="">Todos los estados</option>
                <option value="in_stock">En Stock</option>
                <option value="low_stock">Stock Bajo</option>
                <option value="out_of_stock">Agotado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-1">Ordenar por</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
              >
                <option value="name">Nombre</option>
                <option value="code">Código</option>
                <option value="price">Precio</option>
                <option value="quantity">Cantidad</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-1">Resultados</label>
              <div className="flex items-center justify-center h-10 bg-white border border-gray-300 rounded-lg font-bold text-[#0066CC]">
                {filteredItems.length} / {items.length}
              </div>
            </div>
          </div>
        </div>
      </Card>

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
                  className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  {activeCategories.map((cat) => (
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de Referencia</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                />
                {formData.image && (
                  <div className="mt-2">
                    <img
                      src={formData.image}
                      alt="Vista previa"
                      className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: '' })}
                      className="text-xs text-red-600 mt-1 hover:underline"
                    >
                      Quitar imagen
                    </button>
                  </div>
                )}
              </div>
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

      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-auto">
          <Card className="max-w-2xl w-full my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-black">Editar Producto</h2>
              <button
                onClick={() => setEditingItem(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-4">
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
                    className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    {activeCategories.map((cat) => (
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de Referencia</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                  />
                  {formData.image && (
                    <div className="mt-2">
                      <img
                        src={formData.image}
                        alt="Vista previa"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: '' })}
                        className="text-xs text-red-600 mt-1 hover:underline"
                      >
                        Quitar imagen
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" variant="primary">
                  Guardar Cambios
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        </div>
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
                    <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Código</th>
                    <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Imagen</th>
                    <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Producto</th>
                    <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Cantidad</th>
                    <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Precio</th>
                    <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Estado</th>
                    <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Categoría</th>
                    <th className="text-left py-4 px-4 font-bold text-[#0066CC]">Acciones</th>
                  </tr>
              </thead>
              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, idx) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="py-4 px-4 text-sm font-semibold text-[#0066CC]">{item.code}</td>
                      <td className="py-4 px-4">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded-lg border border-gray-300"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                            N/A
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900">{item.name}</td>
                      <td className="py-4 px-4 text-sm font-medium text-gray-900">
                        {item.quantity}
                        {item.quantity < item.minStockLevel && <span className="text-orange-600 ml-2">⚠️ Bajo</span>}
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-[#0066CC]">Bs. {item.unitPrice.toFixed(2)}</td>
                      <td className="py-4 px-4">{getStatusBadge(item.status)}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{item.category?.name || '-'}</td>
                      <td className="py-4 px-4 text-sm">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setEditingItem(item);
                            setFormData({
                              code: item.code,
                              name: item.name,
                              categoryId: item.category?.id || '',
                              quantity: item.quantity.toString(),
                              minStockLevel: item.minStockLevel.toString(),
                              unitPrice: item.unitPrice.toString(),
                              supplier: '',
                              image: item.image || '',
                            });
                          }}
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      {items.length === 0 ? 'No hay productos en el inventario' : 'No hay resultados para tu búsqueda'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CategoriesModal
        isOpen={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
        token={token}
        categories={categories}
        onCategoriesChange={fetchCategories}
      />
    </div>
  );
}
