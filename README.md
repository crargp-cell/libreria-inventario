# 📚 Sistema de Inventario - Librería

Sistema completo de gestión de inventario para librerías con autenticación, roles de usuario, reportes y auditoría.

## 🚀 Características

### 🔐 Autenticación & Seguridad
- ✅ Login/Logout con JWT tokens
- ✅ Tokens almacenados en httpOnly cookies
- ✅ 4 roles de usuario: Superadmin, Admin, Supervisor, Cajero
- ✅ Control de acceso basado en roles (RBAC)
- ✅ Contraseñas hasheadas con bcryptjs
- ✅ Auditoría completa de acciones (quién, qué, cuándo)

### 📦 Gestión de Inventario
- ✅ CRUD de productos con categorías
- ✅ Control de stock con niveles mínimos
- ✅ Indicadores de estado (En stock, Stock bajo, Agotados)
- ✅ Búsqueda y filtrado de productos

### 🛒 Órdenes/Ventas
- ✅ Crear órdenes con múltiples items
- ✅ Actualización automática de inventario

### 🔄 Restock
- ✅ Solicitudes de reabastecimiento
- ✅ Aprobación/Rechazo (Admin)

### 📊 Reportes & Analítica
- ✅ Dashboard con KPIs
- ✅ Gráficas interactivas (Recharts)
- ✅ Top productos más vendidos
- ✅ Período configurable (7, 30, 90 días)

### 📝 Auditoría
- ✅ Registro completo de todas las acciones
- ✅ Filtrado por acción y tipo de entidad

### 👥 Gestión de Usuarios
- ✅ CRUD de usuarios con roles
- ✅ Soft-delete y reactivación

## 🛠️ Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Backend:** Next.js API Routes
- **Base de Datos:** SQLite (Prisma ORM)
- **Autenticación:** JWT
- **Estilos:** Tailwind CSS
- **Gráficas:** Recharts

## 🚀 Instalación Rápida

### 1. Instalar dependencias
```bash
npm install
```

### 2. Crear BD y migraciones
```bash
npm run db:migrate
```

### 3. Cargar datos de prueba (opcional)
```bash
npm run db:seed
```

### 4. Iniciar servidor
```bash
npm run dev
```

Abre http://localhost:3000

## 🔑 Credenciales de Prueba

```
Superadmin: superadmin@example.com / password123
Admin: admin@example.com / password123
Supervisor: supervisor@example.com / password123
Cajero: cajero1@example.com / password123
```

## 📁 Proyecto Completo

✅ **15 API Routes** - Todas las funciones backend
✅ **8 Páginas Dashboard** - Interfaz completa por rol
✅ **9 Modelos BD** - Esquema Prisma completo
✅ **4 Roles Usuarios** - RBAC implementado
✅ **Auditoría Completa** - Quién, qué, cuándo
✅ **Reportes Interactivos** - Gráficas con Recharts

## 🎯 URLs Principales

- **Login:** http://localhost:3000/login
- **Dashboard:** http://localhost:3000/dashboard
- **Usuarios:** http://localhost:3000/dashboard/users
- **Inventario:** http://localhost:3000/dashboard/inventory
- **Ventas:** http://localhost:3000/dashboard/sales
- **Restock:** http://localhost:3000/dashboard/restock
- **Reportes:** http://localhost:3000/dashboard/reports
- **Auditoría:** http://localhost:3000/dashboard/audit

## 🔧 Comandos

```bash
npm run dev              # Desarrollo
npm run db:migrate       # Migraciones
npm run db:seed          # Datos de prueba
npm run db:studio        # Prisma Studio
npm run build            # Build producción
npm start                # Iniciar producción
```

## 📊 Ver datos visualmente

```bash
npm run db:studio
# Abre http://localhost:5555
```

## 🚢 Deployment

### Vercel
```bash
npm i -g vercel
vercel
```

### Railway, Fly.io, Render
- Conectar GitHub
- Agregar PostgreSQL
- Configurar DATABASE_URL
- Deploy automático

## 🔒 Producción

- Cambiar NEXTAUTH_SECRET en .env
- Usar PostgreSQL en lugar de SQLite
- Cambiar contraseñas de prueba
- Habilitar HTTPS
- Configurar backups

---

**¡Sistema listo para usar!** 🎉
