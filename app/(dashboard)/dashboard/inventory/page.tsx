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
import { CategoriesModal, CategoryItem } from '@/components/CategoriesModal';
import { StockFields } from '@/components/StockFields';
import { formatStock } from '@/lib/packs';
import { GroupedInventory } from '@/components/inventory/GroupedInventory';
import { ADMINS, MONEY, has } from '@/lib/auth/roles';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  image?: string | null;
  quantity: number;
  unitsPerPack?: number;
  packName?: string | null;
  minStockLevel: number;
  unitPrice?: number; // solo llega a quien puede ver precios
  supplier?: string | null;
  genericName?: string | null;
  color?: string | null;
  size?: string | null;
  model?: string | null;
  presentation?: string | null;
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
  const { token, user } = useAuth();
  const canEdit = has(ADMINS, user?.role);
  const showPrices = has(MONEY, user?.role);
  const [view, setView] = useState<'detail' | 'grouped'>('detail');
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
    unitsPerPack: '1',
    packName: 'Caja',
    minStockLevel: '',
    unitPrice: '',
    supplier: '',
    genericName: '',
    color: '',
    size: '',
    model: '',
    presentation: '',
    image: '',
  });

  const PAGE_SIZE = 25;
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCategories();
  }, [token]);

  // Al cambiar filtros se vuelve a la primera página
  useEffect(() => {
    setPage(0);
  }, [searchQuery, selectedCategory, selectedStatus, sortBy]);

  // Búsqueda, filtros y orden se resuelven en el servidor (el catálogo tiene miles de productos)
  useEffect(() => {
    if (!token) return;
    const t = setTimeout(() => fetchInventory(), searchQuery ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, searchQuery, selectedCategory, selectedStatus, sortBy, page, categories]);

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
    const params = new URLSearchParams({
      take: String(PAGE_SIZE),
      skip: String(page * PAGE_SIZE),
      sort: sortBy,
    });
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    const cat = categories.find((c) => c.name === selectedCategory);
    if (selectedCategory && cat) params.set('categoryId', cat.id);
    if (selectedStatus) params.set('status', selectedStatus);
    try {
      const response = await fetch(`/api/inventory?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.items || []);
        setItems(list);
        setFilteredItems(list);
        setTotal(Array.isArray(data) ? list.length : (data.total ?? list.length));
      } else {
        setItems([]);
        setFilteredItems([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setItems([]);
      setFilteredItems([]);
      setTotal(0);
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
          unitsPerPack: Math.max(1, parseInt(formData.unitsPerPack) || 1),
          packName: formData.packName,
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
          unitsPerPack: '1',
          packName: 'Caja',
          minStockLevel: '',
          unitPrice: '',
          supplier: '',
          genericName: '',
          color: '',
          size: '',
          model: '',
          presentation: '',
          image: '',
        });
        notify('Producto agregado exitosamente');
      } else {
        notify('Error al agregar producto');
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  // La imagen se reduce a 480 px y se guarda como JPEG: pasa de ~2 MB a ~30 KB, así las listas
  // (que incluyen la imagen de cada producto) cargan rápido y la base de datos no se infla.
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('El archivo debe ser una imagen', 'warning');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      notify('La imagen no debe superar los 8MB', 'warning');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 480 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); return; }
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      setFormData((prev) => ({ ...prev, image: canvas.toDataURL('image/jpeg', 0.8) }));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      notify('No se pudo leer la imagen', 'error');
    };
    img.src = url;
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
          unitsPerPack: Math.max(1, parseInt(formData.unitsPerPack) || 1),
          packName: formData.packName,
          minStockLevel: parseInt(formData.minStockLevel),
          unitPrice: parseFloat(formData.unitPrice),
          supplier: formData.supplier,
          genericName: formData.genericName,
          color: formData.color,
          size: formData.size,
          model: formData.model,
          presentation: formData.presentation,
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
          unitsPerPack: '1',
          packName: 'Caja',
          minStockLevel: '',
          unitPrice: '',
          supplier: '',
          genericName: '',
          color: '',
          size: '',
          model: '',
          presentation: '',
          image: '',
        });
        notify('Producto actualizado exitosamente');
      } else {
        notify('Error al actualizar producto');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      notify('Error al actualizar producto');
    }
  };

  const getStatusBadge = (status: string) => {
    const variantMap: Record<string, any> = {
      in_stock: 'success',
      low_stock: 'warning',
      out_of_stock: 'error',
    };
    return <Badge variant={variantMap[status] || 'default'}>{label(status)}</Badge>;
  };

  const activeCategories = categories.filter(
    (c) => !c.status || c.status === 'active'
  );

  return (
    <div>
      <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-[#0B1B4D] mb-1">Gestión de Inventario</h1>
          <p className="text-gray-600">Administra tu catálogo de productos</p>
        </div>
        {canEdit && view === 'detail' && (
        <div className="flex flex-wrap gap-2">
<Button onClick={() => setShowForm(!showForm)} variant="primary">
          {showForm ? 'Cancelar' : '+ Agregar Producto'}
        </Button>
<Button onClick={() => setShowCategoriesModal(true)} variant="secondary">
          Gestionar Categorías
        </Button>
        </div>
        )}
      </div>

      <div className="mb-5 inline-flex rounded-xl border border-blue-100 bg-white p-1" role="tablist" aria-label="Modalidad de inventario">
        {([['detail', 'Inventario detallado'], ['grouped', 'Inventario generalizado']] as const).map(([key, text]) => (
          <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)}
            className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition-[background-color,color] duration-150 ${view === key ? 'bg-[#1D4ED8] text-white' : 'text-gray-700 hover:bg-[#E4ECFF]'}`}>
            {text}
          </button>
        ))}
      </div>

      {view === 'grouped' && token && <GroupedInventory token={token} />}
      {view === 'detail' && (<>

      {/* Búsqueda y Filtros */}
      <Card className="mb-6 bg-gradient-to-br from-[#E4ECFF] to-white border border-blue-200">
        <div className="space-y-4">
          <div>
            <label htmlFor="inventory-f1" className="block text-sm font-semibold text-black mb-2">Buscar Producto</label>
            <input id="inventory-f1"
              type="text"
              placeholder="Buscar por código, nombre, marca o color..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label htmlFor="inventory-f2" className="block text-sm font-semibold text-black mb-1">Categoría</label>
              <select id="inventory-f2"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              >
                <option value="">Todas las categorías</option>
                {activeCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="inventory-f3" className="block text-sm font-semibold text-black mb-1">Estado</label>
              <select id="inventory-f3"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              >
                <option value="">Todos los estados</option>
                <option value="in_stock">En Stock</option>
                <option value="low_stock">Stock Bajo</option>
                <option value="out_of_stock">Agotado</option>
              </select>
            </div>
            <div>
              <label htmlFor="inventory-f4" className="block text-sm font-semibold text-black mb-1">Ordenar por</label>
              <select id="inventory-f4"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              >
                <option value="name">Nombre</option>
                <option value="code">Código</option>
                {showPrices && <option value="price">Precio</option>}
                <option value="quantity">Cantidad</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-1">Resultados</label>
              <div className="flex items-center justify-center h-10 bg-white border border-gray-300 rounded-lg font-bold text-[#1D4ED8]">
                {total.toLocaleString('es-BO')}
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
                <label htmlFor="inventory-f5" className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select id="inventory-f5"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  {activeCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Marca"
                placeholder="Ej.: Bic"
                maxLength={80}
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              />
              <Input
                label="Producto genérico (para agrupar)"
                placeholder="Ej.: Bolígrafo"
                maxLength={80}
                value={formData.genericName}
                onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
              />
              <Input
                label="Color"
                placeholder="Ej.: Azul"
                maxLength={80}
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
              <Input
                label="Tamaño"
                placeholder="Ej.: Mediano"
                maxLength={80}
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              />
              <Input
                label="Modelo"
                placeholder="Ej.: Punta fina"
                maxLength={80}
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
              <Input
                label="Presentación"
                placeholder="Ej.: Unidad"
                maxLength={80}
                value={formData.presentation}
                onChange={(e) => setFormData({ ...formData, presentation: e.target.value })}
              />
              <StockFields
                value={{ quantity: formData.quantity, unitsPerPack: formData.unitsPerPack, packName: formData.packName }}
                onChange={(v) => setFormData({ ...formData, ...v })}
              />
              <Input
                label="Stock Mínimo"
                min={0}
                type="number"
                placeholder="10"
                value={formData.minStockLevel}
                onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                required
              />
              <Input
                label="Precio Unitario"
                min={0}
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                required
              />
              <div>
                <label htmlFor="inventory-f6" className="block text-sm font-medium text-gray-700 mb-1">Imagen de Referencia</label>
                <input id="inventory-f6"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
                {formData.image && (
                  <div className="mt-2">
                    <img loading="lazy" decoding="async"
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
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-gray-900/50 backdrop-blur-[2px] flex items-start sm:items-center justify-center p-3 sm:p-4 z-50 overflow-auto overscroll-contain anim-fade-in">
          <Card className="max-w-2xl w-full my-4 sm:my-8 anim-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-black">Editar Producto</h2>
              <button
                type="button" aria-label="Cerrar" onClick={() => setEditingItem(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
<svg viewBox="0 0 24 24" className="size-5 mx-auto" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
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
                  <label htmlFor="inventory-f7" className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select id="inventory-f7"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    {activeCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Marca"
                  placeholder="Ej.: Bic"
                  maxLength={80}
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                />
                <Input
                  label="Producto genérico (para agrupar)"
                  placeholder="Ej.: Bolígrafo"
                  maxLength={80}
                  value={formData.genericName}
                  onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                />
                <Input
                  label="Color"
                  placeholder="Ej.: Azul"
                  maxLength={80}
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
                <Input
                  label="Tamaño"
                  placeholder="Ej.: Mediano"
                  maxLength={80}
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                />
                <Input
                  label="Modelo"
                  placeholder="Ej.: Punta fina"
                  maxLength={80}
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
                <Input
                  label="Presentación"
                  placeholder="Ej.: Unidad"
                  maxLength={80}
                  value={formData.presentation}
                  onChange={(e) => setFormData({ ...formData, presentation: e.target.value })}
                />
                <StockFields
                  value={{ quantity: formData.quantity, unitsPerPack: formData.unitsPerPack, packName: formData.packName }}
                  onChange={(v) => setFormData({ ...formData, ...v })}
                />
                <Input
                  label="Stock Mínimo"
                min={0}
                  type="number"
                  placeholder="10"
                  value={formData.minStockLevel}
                  onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                  required
                />
                <Input
                  label="Precio Unitario"
                min={0}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  required
                />
                <div>
                  <label htmlFor="inventory-f8" className="block text-sm font-medium text-gray-700 mb-1">Imagen de Referencia</label>
                  <input id="inventory-f8"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                  {formData.image && (
                    <div className="mt-2">
                      <img loading="lazy" decoding="async"
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
          <TableSkeleton label="Cargando inventario..." />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full stack">
              <thead>
                  <tr className="border-b border-blue-100 bg-[#F3F7FF]">
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Código</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Imagen</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Producto</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Marca</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Color</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Cantidad</th>
                    {showPrices && <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Precio</th>}
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Estado</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Categoría</th>
                    {canEdit && <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[#0B1B4D] whitespace-nowrap">Acciones</th>}
                  </tr>
              </thead>
              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, idx) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td data-label="Código" className="py-4 px-4 text-sm font-semibold text-[#1D4ED8]">{item.code}</td>
                      <td data-label="Imagen" className={`py-4 px-4 ${item.image ? '' : 'stack-skip'}`}>
                        {item.image ? (
                          <img loading="lazy" decoding="async"
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
                      <td data-label="Producto" className="py-4 px-4 text-sm text-gray-900">
                        <div>
                          {item.name}
                          {(item.genericName || item.size || item.model || item.presentation) && (
                            <span className="block text-xs text-gray-500">{[item.genericName, item.size, item.model, item.presentation].filter(Boolean).join(' · ')}</span>
                          )}
                        </div>
                      </td>
                      <td data-label="Marca" className="py-4 px-4 text-sm text-gray-700">{item.supplier || '—'}</td>
                      <td data-label="Color" className="py-4 px-4 text-sm text-gray-700">{item.color || '—'}</td>
                      <td data-label="Cantidad" className="py-4 px-4 text-sm font-medium text-gray-900">
                        {formatStock({ quantity: item.quantity, unitsPerPack: item.unitsPerPack, packName: item.packName })}
                        {item.quantity < item.minStockLevel && <span className="text-orange-600 ml-2"><svg viewBox="0 0 24 24" className="size-4 inline -mt-0.5 mr-1" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4m0 4h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>Bajo</span>}
                      </td>
                      {showPrices && <td data-label="Precio" className="py-4 px-4 text-sm font-semibold text-[#1D4ED8] whitespace-nowrap">Bs. {(item.unitPrice ?? 0).toFixed(2)}</td>}
                      <td data-label="Estado" className="py-4 px-4">{getStatusBadge(item.status)}</td>
                      <td data-label="Categoría" className="py-4 px-4 text-sm text-gray-600">{item.category?.name || '-'}</td>
                      {canEdit && (
                      <td data-label="Acciones" className="py-4 px-4 text-sm">
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
                              unitsPerPack: String(item.unitsPerPack || 1),
                              packName: item.packName || 'Caja',
                              minStockLevel: item.minStockLevel.toString(),
                              unitPrice: String(item.unitPrice ?? ''),
                              supplier: item.supplier || '',
                              genericName: item.genericName || '',
                              color: item.color || '',
                              size: item.size || '',
                              model: item.model || '',
                              presentation: item.presentation || '',
                              image: item.image || '',
                            });
                          }}
                        >
                          Editar
                        </Button>
                      </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-500">
                      {searchQuery || selectedCategory || selectedStatus ? 'No hay resultados para tu búsqueda' : 'No hay productos en el inventario'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-blue-100">
              <p className="text-sm text-gray-600">
                {(page * PAGE_SIZE + 1).toLocaleString('es-BO')}–{Math.min((page + 1) * PAGE_SIZE, total).toLocaleString('es-BO')} de {total.toLocaleString('es-BO')}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  Anterior
                </Button>
                <Button variant="secondary" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      </>)}

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
