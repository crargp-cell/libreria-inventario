# Gestión de almacén: diagnóstico y diseño

Respaldo previo a los cambios: `backups/<fecha-hora>/` (volcado `pg_dump` + copia del código). No se versiona.

## 1. Estructura encontrada

| Área | Estado actual |
|---|---|
| Stack | Next.js 16 (App Router), React 19, Prisma 5 + PostgreSQL, JWT |
| Tablas | User, Category, InventoryItem, Order, OrderLineItem, RestockRequest, AuditLog, Transaction, DailyMetric |
| Roles | superadmin, admin, supervisor, cajero |
| Módulos | Dashboard, Salidas (venta), Inventario, Órdenes, Restock, Reportes, Usuarios, Auditoría |

## 2. Diagnóstico

1. **"Salidas" y "Órdenes" funcionan como punto de venta** (carrito, totales en Bs., ventas). Contradice el objetivo.
2. **No hay solicitudes ni despachos.** `RestockRequest` es una *entrada* de stock al almacén (un solo producto, la aprueba el admin y suma stock); no sirve para solicitudes del vendedor.
3. **No hay atributos para agrupar.** El producto solo tiene nombre libre y `supplier` (marca). Faltan producto genérico, color, tamaño, modelo y presentación.
4. **El cajero recibe precios** por `/api/inventory`, `/api/orders` y `/api/reports/stats`.

## 3. Decisiones

| Tema | Decisión | Motivo |
|---|---|---|
| Rol cajero | Se convierte en `vendedor` (migración de datos) | Pedido explícito |
| Encargado | Rol nuevo `encargado`; `supervisor` también aprueba, rechaza, despacha y cancela | Pedido posterior |
| Admin / superadmin | Pueden hacer todo lo del encargado | Mantener permisos administrativos |
| Venta (POS) | Se desactiva crear órdenes (`POST /api/orders` responde 410) y se retira "Salidas". Las órdenes anteriores se conservan, solo lectura para admin | El sistema no debe registrar ventas; no se borra historial |
| Restock | Se conserva como **Entradas** (reabastecer el almacén) | Es distinto de "salida a reposición" (almacén → mostrador) |
| Marca | Se reutiliza `InventoryItem.supplier` | Ya contiene la marca del Excel |
| Agrupación | Por producto genérico + color + tamaño + modelo + presentación (sin marca). Sin "producto genérico", el artículo no se agrupa con nada | Evita sumar variantes no equivalentes por adivinación |
| Existencias | Única fuente: `InventoryItem.quantity` (piezas). La vista general es una consulta agrupada | Sin segunda fuente de stock |

## 4. Diseño de base de datos

- `InventoryItem` + `genericName`, `color`, `size`, `model`, `presentation`.
- `StockRequest` (cabecera, estado, solicitante, revisor, notas, fechas).
- `StockRequestItem` (producto, cantidades solicitada / aprobada / despachada, copia de nombre, código y marca).
- `Dispatch` (tipo `venta` | `reposicion`, quién despacha, quién recibe, clave de idempotencia).
- `DispatchItem` (cantidad, stock antes y después).
- Claves foráneas con `RESTRICT`, restricciones `CHECK` y despachos de solo añadir (disparadores).

Flujo: `pending` → `approved` → `partially_dispatched` → `dispatched`; o `rejected` / `cancelled`.
El stock baja **solo** al confirmar un despacho, dentro de una transacción que bloquea la solicitud.

## 5. Permisos

| Acción | vendedor | encargado | supervisor | admin / superadmin |
|---|:-:|:-:|:-:|:-:|
| Catálogo sin precios | ✔ | ✔ | ✔ | ✔ |
| Crear solicitud | ✔ | – | – | – |
| Ver solicitudes | propias | todas | todas | todas |
| Cancelar (sin despachos) | propias | ✔ | ✔ | ✔ |
| Aprobar, rechazar, despachar | – | ✔ | ✔ | ✔ |
| Inventario (detallado y general) | – | consulta | consulta | ✔ |
| Historial de movimientos | – | ✔ | ✔ | ✔ |
| Reportes | – | sin valores monetarios | ✔ | ✔ |
| Crear o editar productos, entradas, usuarios, auditoría | – | – | – | ✔ |

## 6. Cómo se usa

**Vendedor** (entra directo a *Solicitudes*): busca en el catálogo, agrega productos con su cantidad (piezas o cajas), escribe una observación y envía. En *Mis solicitudes* ve el estado y lo despachado.

**Encargado**: en *Solicitudes* abre una pendiente, ajusta las cantidades autorizadas y **aprueba** o **rechaza**. En una aprobada indica cuánto entrega, elige **Salida a venta** o **Salida a reposición** y confirma. El stock baja solo en ese momento.

**Inventario generalizado**: para que varias marcas se sumen, edita cada producto (vista detallada, rol admin) y escribe el mismo **Producto genérico** y los mismos color, tamaño, modelo y presentación.

## 7. Verificación

`npm run test:almacen` (contra la base aislada `libreria_test`, ver instrucciones en `scripts/pruebas-almacen.js`):
100 de 100 comprobaciones correctas, incluidos los 10 escenarios obligatorios, concurrencia, doble envío,
permisos por rol y restricciones de la base de datos.

## 8. Limitaciones conocidas

- Los 10.814 productos actuales no tienen *producto genérico* ni color: el generalizado los muestra uno por uno hasta completar esos datos.
- Una solicitud con despacho parcial no se puede "cerrar" dejando saldo sin entregar; queda como parcial.
- La edición manual del stock (admin) queda en auditoría, pero no aparece en el historial de movimientos.
- Las entradas al almacén se registran de un producto por vez.
