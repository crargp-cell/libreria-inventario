'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export interface CategoryItem {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  _count?: { inventoryItems: number };
}

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  categories: CategoryItem[];
  onCategoriesChange: () => void;
}

export function CategoriesModal({
  isOpen,
  onClose,
  token,
  categories,
  onCategoriesChange,
}: CategoriesModalProps) {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingId(null);
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !formData.name.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        }),
      });
      if (response.ok) {
        resetForm();
        onCategoriesChange();
      } else {
        const data = await response.json();
        setError(data.error || 'Error al crear la categoría');
      }
    } catch (err) {
      console.error(err);
      setError('Error al crear la categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingId || !formData.name.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/categories/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        }),
      });
      if (response.ok) {
        resetForm();
        onCategoriesChange();
      } else {
        const data = await response.json();
        setError(data.error || 'Error al actualizar la categoría');
      }
    } catch (err) {
      console.error(err);
      setError('Error al actualizar la categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string | undefined) => {
    if (!token) return;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        onCategoriesChange();
      } else {
        alert('Error al cambiar el estado de la categoría');
      }
    } catch (err) {
      console.error(err);
      alert('Error al cambiar el estado de la categoría');
    }
  };

  const startEdit = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, description: cat.description || '' });
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-auto">
      <Card className="max-w-2xl w-full my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-black">Gestión de Categorías</h2>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Formulario crear / editar */}
        <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={editingId ? 'Editar Nombre' : 'Nombre'}
              placeholder="Nombre de la categoría"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                type="text"
                placeholder="Descripción (opcional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {editingId ? 'Guardar Cambios' : 'Crear Categoría'}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
        </form>

        {/* Lista de categorías */}
        <div className="border-t border-gray-200 pt-4">
          {categories.length === 0 ? (
            <p className="text-center text-gray-500 py-6">No hay categorías registradas</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-black truncate">{cat.name}</p>
                      <Badge variant={cat.status === 'active' ? 'success' : 'error'}>
                        {cat.status === 'active' ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    {cat.description && (
                      <p className="text-xs text-gray-600 truncate">{cat.description}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {cat._count?.inventoryItems || 0} productos
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Button size="sm" variant="secondary" onClick={() => startEdit(cat)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant={cat.status === 'active' ? 'danger' : 'primary'}
                      onClick={() => handleToggleStatus(cat.id, cat.status)}
                    >
                      {cat.status === 'active' ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
