'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Stats {
  period: { days: number; startDate: string };
  inventory: { totalItems: number; lowStockItems: number; outOfStockItems: number };
  sales: { totalOrders: number; completedOrders: number; totalSales: number; completionRate: number };
  daily: Record<string, { orders: number; sales: number }>;
  topProducts: any[];
  pendingRestocks: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchStats();
  }, [token, days]);

  const fetchStats = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/stats?days=${days}`, {
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

  if (isLoading || !stats) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reportes</h1>
        <Card>
          <p className="text-center text-gray-600 py-8">Cargando datos...</p>
        </Card>
      </div>
    );
  }

  // Preparar datos para gráficas
  const dailyData = Object.entries(stats.daily).map(([date, data]) => ({
    date,
    ordenes: data.orders,
    ventas: data.sales,
  }));

  const stockData = [
    { name: 'En Stock', value: stats.inventory.totalItems - stats.inventory.lowStockItems - stats.inventory.outOfStockItems, color: '#10b981' },
    { name: 'Stock Bajo', value: stats.inventory.lowStockItems, color: '#f59e0b' },
    { name: 'Agotados', value: stats.inventory.outOfStockItems, color: '#ef4444' },
  ];

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reportes</h1>
          <p className="text-gray-600">Estadísticas y análisis de datos</p>
        </div>
        <div>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-l-blue-500">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">${stats.sales.totalSales.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Ventas Totales</div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">{stats.sales.totalOrders}</div>
            <div className="text-sm text-gray-600">Total Órdenes</div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600 mb-1">{stats.inventory.lowStockItems}</div>
            <div className="text-sm text-gray-600">Stock Bajo</div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-1">{stats.pendingRestocks}</div>
            <div className="text-sm text-gray-600">Restock Pendientes</div>
          </div>
        </Card>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Ventas Diarias */}
        <Card title="Ventas Diarias">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ventas" stroke="#3b82f6" name="Ventas ($)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-600 py-8">No hay datos</p>
          )}
        </Card>

        {/* Órdenes por Día */}
        <Card title="Órdenes Completadas">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="ordenes" fill="#10b981" name="Órdenes" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-600 py-8">No hay datos</p>
          )}
        </Card>
      </div>

      {/* Stock Status Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="Estado del Inventario">
          {stockData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stockData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stockData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-600 py-8">No hay datos</p>
          )}
        </Card>

        {/* Top Products */}
        <Card title="Productos Más Vendidos">
          {stats.topProducts.length > 0 ? (
            <div className="space-y-3">
              {stats.topProducts.map((product, index) => (
                <div key={product.id} className="flex justify-between items-center pb-3 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.code}</div>
                    </div>
                  </div>
                  <Badge variant="success">{product.quantity} unidades</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 py-8">No hay datos</p>
          )}
        </Card>
      </div>

      {/* Resumen */}
      <Card title="Resumen del Período">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Órdenes</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total:</span>
                <span className="font-medium text-gray-900">{stats.sales.totalOrders}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Completadas:</span>
                <span className="font-medium text-green-600">{stats.sales.completedOrders}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tasa Completación:</span>
                <span className="font-medium text-gray-900">{stats.sales.completionRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Inventario</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Items:</span>
                <span className="font-medium text-gray-900">{stats.inventory.totalItems}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Stock Bajo:</span>
                <span className="font-medium text-yellow-600">{stats.inventory.lowStockItems}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Agotados:</span>
                <span className="font-medium text-red-600">{stats.inventory.outOfStockItems}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
