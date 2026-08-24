'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface Stats {
  period: { days: number; startDate: string };
  inventory: { totalItems: number; lowStockItems: number; outOfStockItems: number };
  sales: { totalOrders: number; completedOrders: number; totalSales: number; completionRate: number };
  topProducts: any[];
  pendingRestocks: number;
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;
      try {
        const response = await fetch('/api/reports/stats?days=30', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#293685] mb-2">📊 Dashboard</h1>
        <p className="text-gray-600">Bienvenido, <span className="font-semibold text-[#293685]">{user?.name}</span> ({user?.role})</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Cargando estadísticas...</p>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Tarjetas de estadísticas */}
          <Card className="border-l-4 border-l-blue-500">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">{stats.inventory.totalItems}</div>
              <div className="text-sm text-gray-600">Productos en Stock</div>
            </div>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-1">{stats.inventory.lowStockItems}</div>
              <div className="text-sm text-gray-600">Stock Bajo</div>
            </div>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-1">{stats.inventory.outOfStockItems}</div>
              <div className="text-sm text-gray-600">Agotados</div>
            </div>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">Bs. {stats.sales.totalSales.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Ventas Totales</div>
            </div>
          </Card>
        </div>
      ) : null}

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Órdenes */}
          <Card title="Órdenes">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Órdenes</span>
                <span className="text-2xl font-bold text-gray-900">{stats.sales.totalOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Completadas</span>
                <span className="text-2xl font-bold text-green-600">{stats.sales.completedOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tasa Completación</span>
                <Badge variant="info">{stats.sales.completionRate.toFixed(1)}%</Badge>
              </div>
            </div>
          </Card>

          {/* Restock Pendiente */}
          <Card title="Restock">
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">{stats.pendingRestocks}</div>
              <p className="text-gray-600">Solicitudes Pendientes</p>
            </div>
          </Card>

          {/* Productos Más Vendidos */}
          {stats.topProducts.length > 0 && (
            <Card title="Productos Más Vendidos" className="lg:col-span-2">
              <div className="space-y-3">
                {stats.topProducts.map((product, index) => (
                  <div key={product.id} className="flex justify-between items-center pb-3 border-b last:border-b-0">
                    <div>
                      <div className="font-medium text-gray-900">{index + 1}. {product.name}</div>
                      <div className="text-sm text-gray-500">{product.code}</div>
                    </div>
                    <Badge variant="success">{product.quantity} unidades</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
