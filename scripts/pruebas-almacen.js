// Pruebas del flujo de almacén. Se ejecutan SOLO contra la base aislada libreria_test.
// 1) Crear la base: createdb libreria_test
// 2) Con DATABASE_URL apuntando a libreria_test: npx prisma migrate deploy && npm run db:seed
// 3) Levantar la app con esa misma DATABASE_URL en el puerto 3001: npx next dev -p 3001
// 4) npm run test:almacen   (la base debe estar recién creada: las comprobaciones asumen datos limpios)
const { PrismaClient } = require('@prisma/client');
const DB = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/libreria_test';
if (!/\/libreria_test(_\w+)?(\?|$)/.test(DB)) throw new Error('Estas pruebas solo pueden usar una base libreria_test');
const prisma = new PrismaClient({ datasources: { db: { url: DB } } });
const B = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
const out = [];
let section = '';
const check = (name, ok, detail = '') => out.push({ section, name, ok: !!ok, detail });
const S = (t) => (section = t);

async function req(method, path, token, body) {
  const res = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
const login = async (email, password = 'password123') => (await req('POST', '/api/auth/login', null, { email, password })).json;
const qty = async (id) => (await prisma.inventoryItem.findUnique({ where: { id } })).quantity;
const key = () => 'k-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
// Busca claves monetarias en cualquier nivel de una respuesta
function moneyKeys(value, path = '', found = []) {
  if (Array.isArray(value)) value.forEach((v, i) => moneyKeys(v, `${path}[${i}]`, found));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (/price|precio|cost|total(Sales|Value)|amount|^value$|^total$/i.test(k) && !(k === 'total' && Number.isInteger(v) && path === '')) found.push(`${path}.${k}`);
      moneyKeys(v, `${path}.${k}`, found);
    }
  }
  return found;
}

(async () => {
  try {
    const sa = await login('superadmin@example.com');
    const enc = await login('almacen@example.com');
    const v1 = await login('vendedor1@example.com');
    const v2 = await login('vendedor2@example.com');
    const sup = await login('supervisor@example.com');
    check('Los 5 usuarios de prueba inician sesión', [sa, enc, v1, v2, sup].every((u) => u?.token));
    const T = { sa: sa.token, enc: enc.token, v1: v1.token, v2: v2.token, sup: sup.token };
    const cat = await prisma.category.findFirst();
    const run = Date.now().toString(36);

    // ---------- 1. Inventario detallado y generalizado ----------
    S('1. Inventario detallado y generalizado');
    const generic = 'Bolígrafo ' + run;
    const pens = [];
    for (const brand of ['Stabilo', 'Faber-Castell', 'Bic', 'Pilot']) {
      const r = await req('POST', '/api/inventory', T.sa, { code: `PEN-${run}-${brand}`, name: `${generic} ${brand} Azul`, categoryId: cat.id, quantity: 10, minStockLevel: 2, unitPrice: 3.5, supplier: brand, genericName: generic, color: 'Azul' });
      if (r.status === 201) pens.push(r.json);
    }
    check('Se registran 4 marcas con 10 unidades', pens.length === 4);
    // variante distinta: no debe sumarse
    const red = (await req('POST', '/api/inventory', T.sa, { code: `PEN-${run}-ROJO`, name: `${generic} Bic Rojo`, categoryId: cat.id, quantity: 7, unitPrice: 3, supplier: 'Bic', genericName: generic, color: 'Rojo' })).json;
    const det = await req('GET', `/api/inventory?q=${encodeURIComponent(run)}&take=50`, T.enc);
    check('Detallado muestra 4 registros azules (más 1 rojo)', det.json.items.filter((i) => i.color === 'Azul').length === 4 && det.json.items.length === 5, `azules=${det.json.items.filter((i) => i.color === 'Azul').length}`);
    check('Cada registro conserva marca y código', new Set(det.json.items.map((i) => i.code)).size === 5 && det.json.items.every((i) => i.supplier));
    let grp = await req('GET', `/api/inventory/grouped?q=${encodeURIComponent(run)}`, T.enc);
    const blue = grp.json.groups.find((g) => g.color === 'Azul');
    check('Generalizado: Bolígrafo Azul = 40', blue?.totalQuantity === 40 && blue.itemCount === 4, `total=${blue?.totalQuantity}`);
    check('El color rojo queda separado (7)', grp.json.groups.find((g) => g.color === 'Rojo')?.totalQuantity === 7 && grp.json.total === 2);
    const byBrand = await req('GET', `/api/inventory/grouped?q=${encodeURIComponent(run + ' Pilot')}`, T.enc);
    check('Buscar por una marca no recorta el total del grupo', byBrand.json.groups[0]?.totalQuantity === 40, `total=${byBrand.json.groups[0]?.totalQuantity}`);
    const sumDb = (await prisma.inventoryItem.aggregate({ _sum: { quantity: true } }))._sum.quantity;
    let pageSum = 0, skip = 0, page;
    do { page = (await req('GET', `/api/inventory/grouped?take=100&skip=${skip}`, T.sa)).json; pageSum += page.groups.reduce((s, g) => s + g.totalQuantity, 0); skip += 100; } while (skip < page.total);
    check('Ambas vistas representan el mismo stock (suma general = suma detallada)', pageSum === sumDb, `${pageSum} = ${sumDb}`);

    // ---------- 2. Solicitud no descuenta ----------
    S('2. Crear solicitud');
    const pen = pens[0];
    const created = await req('POST', '/api/requests', T.v1, { note: 'Los clientes piden bolígrafos azules', items: [{ inventoryItemId: pen.id, quantity: 10 }] });
    check('El vendedor crea la solicitud (201, pendiente)', created.status === 201 && created.json.status === 'pending');
    check('El inventario NO disminuye al solicitar', (await qty(pen.id)) === 10);
    const rid = created.json.id, line = created.json.items[0].id;
    check('Despachar sin aprobar => 409', (await req('POST', `/api/requests/${rid}/dispatch`, T.enc, { type: 'venta', idempotencyKey: key(), items: [{ itemId: line, quantity: 1 }] })).status === 409);
    check('El encargado ve la solicitud pendiente', (await req('GET', '/api/requests?status=pending', T.enc)).json.requests.some((r) => r.id === rid));

    // ---------- 3. Aprobar no descuenta ----------
    S('3. Aprobar sin despachar');
    check('Aprobar más de lo pedido => 400', (await req('POST', `/api/requests/${rid}/approve`, T.enc, { items: [{ itemId: line, approvedQty: 11 }] })).status === 400);
    const ap = await req('POST', `/api/requests/${rid}/approve`, T.enc, { note: 'Autorizado' });
    check('Aprobada (10 autorizadas)', ap.status === 200 && ap.json.status === 'approved' && ap.json.items[0].approvedQty === 10);
    check('El inventario NO disminuye al aprobar', (await qty(pen.id)) === 10);
    check('Aprobar dos veces => 409', (await req('POST', `/api/requests/${rid}/approve`, T.enc, {})).status === 409);

    // ---------- 4 y 5. Despacho + salida a venta ----------
    S('4-5. Despacho y salida a venta');
    check('Sin tipo de salida => 400', (await req('POST', `/api/requests/${rid}/dispatch`, T.enc, { idempotencyKey: key(), items: [{ itemId: line, quantity: 10 }] })).status === 400);
    check('Más de lo autorizado => 409', (await req('POST', `/api/requests/${rid}/dispatch`, T.enc, { type: 'venta', idempotencyKey: key(), items: [{ itemId: line, quantity: 11 }] })).status === 409);
    const k1 = key();
    const body = { type: 'venta', idempotencyKey: k1, items: [{ itemId: line, quantity: 10 }], note: 'Entregado en mostrador' };
    const [d1, d2] = await Promise.all([req('POST', `/api/requests/${rid}/dispatch`, T.enc, body), req('POST', `/api/requests/${rid}/dispatch`, T.enc, body)]);
    check('Doble envío simultáneo: un solo despacho', [d1.status, d2.status].sort().join() === '200,201' && (await prisma.dispatch.count({ where: { requestId: rid } })) === 1, `${d1.status}/${d2.status}`);
    check('El inventario baja exactamente 10', (await qty(pen.id)) === 0);
    check('Estado "despachada"', (await req('GET', `/api/requests/${rid}`, T.enc)).json.status === 'dispatched');
    const disp = await prisma.dispatch.findFirst({ where: { requestId: rid }, include: { items: true, dispatchedBy: true, receivedBy: true } });
    check('Queda como SALIDA A VENTA', disp.type === 'venta');
    check('Registra encargado, vendedor receptor, fecha y stock antes/después', disp.dispatchedBy.role === 'encargado' && disp.receivedById === v1.user.id && disp.createdAt && disp.items[0].stockBefore === 10 && disp.items[0].stockAfter === 0);
    check('Reintento con la misma clave no descuenta de nuevo', (await req('POST', `/api/requests/${rid}/dispatch`, T.enc, body)).json.duplicate === true && (await qty(pen.id)) === 0);
    check('Otro despacho sobre una solicitud completa => 409', (await req('POST', `/api/requests/${rid}/dispatch`, T.enc, { ...body, idempotencyKey: key() })).status === 409);
    grp = await req('GET', `/api/inventory/grouped?q=${encodeURIComponent(run)}`, T.enc);
    check('El generalizado se actualiza solo: Azul = 30', grp.json.groups.find((g) => g.color === 'Azul')?.totalQuantity === 30);

    // ---------- 6. Salida a reposición + parcial ----------
    S('6. Salida a reposición y despacho parcial');
    const pen2 = pens[1];
    const c2 = (await req('POST', '/api/requests', T.v1, { items: [{ inventoryItemId: pen2.id, quantity: 8 }] })).json;
    await req('POST', `/api/requests/${c2.id}/approve`, T.enc, { items: [{ itemId: c2.items[0].id, approvedQty: 6 }] });
    const p1 = await req('POST', `/api/requests/${c2.id}/dispatch`, T.enc, { type: 'reposicion', idempotencyKey: key(), items: [{ itemId: c2.items[0].id, quantity: 4 }] });
    check('Despacho parcial de 4 (de 6 autorizadas)', p1.status === 201 && p1.json.request.status === 'partially_dispatched' && (await qty(pen2.id)) === 6);
    check('Queda como SALIDA A REPOSICIÓN', (await prisma.dispatch.findFirst({ where: { requestId: c2.id } })).type === 'reposicion');
    check('Cancelar una parcialmente despachada => 409', (await req('POST', `/api/requests/${c2.id}/cancel`, T.enc)).status === 409);
    check('No se puede superar el saldo autorizado (3 > 2)', (await req('POST', `/api/requests/${c2.id}/dispatch`, T.enc, { type: 'reposicion', idempotencyKey: key(), items: [{ itemId: c2.items[0].id, quantity: 3 }] })).status === 409);
    const p2 = await req('POST', `/api/requests/${c2.id}/dispatch`, T.enc, { type: 'reposicion', idempotencyKey: key(), items: [{ itemId: c2.items[0].id, quantity: 2 }] });
    check('Segundo despacho completa lo autorizado', p2.json.request.status === 'dispatched' && (await qty(pen2.id)) === 4);

    // ---------- 7. Stock insuficiente y concurrencia ----------
    S('7. Stock insuficiente y solicitudes simultáneas');
    const pen3 = pens[2]; // 10 unidades
    const big = (await req('POST', '/api/requests', T.v1, { items: [{ inventoryItemId: pen3.id, quantity: 25 }] })).json;
    await req('POST', `/api/requests/${big.id}/approve`, T.enc, {});
    const over = await req('POST', `/api/requests/${big.id}/dispatch`, T.enc, { type: 'venta', idempotencyKey: key(), items: [{ itemId: big.items[0].id, quantity: 11 }] });
    check('Despachar 11 con 10 en stock => 409', over.status === 409, over.json?.error);
    check('Stock intacto tras el rechazo (10) y sin despacho registrado', (await qty(pen3.id)) === 10 && (await prisma.dispatch.count({ where: { requestId: big.id } })) === 0);
    const mk = async () => { const r = (await req('POST', '/api/requests', T.v2, { items: [{ inventoryItemId: pen3.id, quantity: 7 }] })).json; await req('POST', `/api/requests/${r.id}/approve`, T.enc, {}); return r; };
    const [ra, rb] = [await mk(), await mk()];
    const both = await Promise.all([ra, rb].map((r) => req('POST', `/api/requests/${r.id}/dispatch`, T.enc, { type: 'venta', idempotencyKey: key(), items: [{ itemId: r.items[0].id, quantity: 7 }] })));
    check('Dos despachos simultáneos de 7 con 10: solo uno pasa', both.map((r) => r.status).sort().join() === '201,409', both.map((r) => r.status).join('/'));
    check('Stock = 3, nunca negativo', (await qty(pen3.id)) === 3);
    const two = (await req('POST', '/api/requests', T.v1, { items: [{ inventoryItemId: pens[3].id, quantity: 2 }, { inventoryItemId: pen3.id, quantity: 9 }] })).json;
    await req('POST', `/api/requests/${two.id}/approve`, T.enc, {});
    const mixed = await req('POST', `/api/requests/${two.id}/dispatch`, T.enc, { type: 'venta', idempotencyKey: key(), items: two.items.map((i) => ({ itemId: i.id, quantity: i.requestedQty })) });
    check('Si una línea no alcanza, no se descuenta ninguna (transacción)', mixed.status === 409 && (await qty(pens[3].id)) === 10 && (await qty(pen3.id)) === 3);

    // ---------- Rechazo y cancelación ----------
    S('Rechazo y cancelación');
    const rj = (await req('POST', '/api/requests', T.v1, { items: [{ inventoryItemId: pens[3].id, quantity: 1 }] })).json;
    const rej = await req('POST', `/api/requests/${rj.id}/reject`, T.enc, { note: 'Sin justificación' });
    check('Rechazar guarda observación del encargado', rej.json.status === 'rejected' && rej.json.reviewNote === 'Sin justificación');
    check('Despachar una rechazada => 409', (await req('POST', `/api/requests/${rj.id}/dispatch`, T.enc, { type: 'venta', idempotencyKey: key(), items: [{ itemId: rj.items[0].id, quantity: 1 }] })).status === 409);
    const cn = (await req('POST', '/api/requests', T.v1, { items: [{ inventoryItemId: pens[3].id, quantity: 1 }] })).json;
    check('Otro vendedor no puede cancelarla (404)', (await req('POST', `/api/requests/${cn.id}/cancel`, T.v2)).status === 404);
    check('El dueño cancela su solicitud pendiente', (await req('POST', `/api/requests/${cn.id}/cancel`, T.v1)).json.status === 'cancelled');
    for (const [name, items] of [['cantidad 0', [{ inventoryItemId: pen.id, quantity: 0 }]], ['negativa', [{ inventoryItemId: pen.id, quantity: -2 }]], ['decimal', [{ inventoryItemId: pen.id, quantity: 1.5 }]], ['vacía', []]]) {
      check(`Solicitud con ${name} => 400`, (await req('POST', '/api/requests', T.v1, { items })).status === 400);
    }

    // ---------- 8. Vendedor sin precios ni módulos ----------
    S('8. Vendedor: sin precios ni información financiera');
    const paths = ['/api/catalog?take=50', `/api/catalog?q=${encodeURIComponent(run)}`, '/api/requests', `/api/requests/${rid}`, '/api/categories', '/api/auth/me'];
    for (const p of paths) {
      const r = await req('GET', p, T.v1);
      const leaks = moneyKeys(r.json);
      check(`GET ${p.split('?')[0]} (${r.status}) sin claves monetarias`, r.status === 200 && leaks.length === 0 && !/unitPrice/.test(r.text), leaks.join(', '));
    }
    const detail = await req('GET', `/api/requests/${rid}`, T.v1);
    check('El vendedor no ve el stock del almacén en sus solicitudes', detail.json.items.every((i) => !('stock' in i)));
    const catalog = await req('GET', `/api/catalog?q=${encodeURIComponent(run)}`, T.v1);
    check('El catálogo solo indica disponibilidad, no cantidades', catalog.json.items.length === 5 && catalog.json.items.every((i) => typeof i.available === 'boolean' && !('quantity' in i)));
    check('La creación de solicitud tampoco devuelve precios', !/unitPrice/.test(created.text));
    const forbidden = [
      ['GET', '/api/inventory'], ['GET', '/api/inventory?sort=price'], ['GET', '/api/inventory/grouped'], ['GET', '/api/orders'], ['GET', '/api/reports/stats'], ['GET', '/api/movements'],
      ['GET', '/api/restock'], ['GET', '/api/users'], ['GET', '/api/audit-logs'], ['GET', `/api/users/${sa.user.id}`],
      ['POST', '/api/inventory', {}], ['PATCH', `/api/inventory/${pen.id}`, { quantity: 999 }], ['POST', '/api/categories', { name: 'x' }], ['POST', '/api/restock', { inventoryItemId: pen.id, quantityRequested: 5 }],
      ['POST', `/api/requests/${big.id}/approve`, {}], ['POST', `/api/requests/${big.id}/reject`, {}], ['POST', `/api/requests/${big.id}/dispatch`, { type: 'venta', idempotencyKey: key(), items: [] }], ['POST', '/api/users', {}],
    ];
    for (const [m, p, b] of forbidden) {
      const r = await req(m, p, T.v1, b);
      check(`Vendedor ${m} ${p.replace(/c[a-z0-9]{20,}/g, ':id')} => 403`, r.status === 403 && !/unitPrice/.test(r.text), `status=${r.status}`);
    }
    check('El stock no cambió por los intentos del vendedor', (await qty(pen.id)) === 0);
    check('Ya no existe registro de ventas (POST /api/orders => 410)', (await req('POST', '/api/orders', T.sa, { items: [] })).status === 410);
    const encInv = await req('GET', '/api/inventory?take=5', T.enc);
    check('El encargado tampoco recibe precios', encInv.status === 200 && !/unitPrice/.test(encInv.text));
    check('El encargado no puede editar existencias', (await req('PATCH', `/api/inventory/${pen.id}`, T.enc, { quantity: 50 })).status === 403);
    check('El supervisor consulta el historial pero no edita existencias', (await req('GET', '/api/movements', T.sup)).status === 200 && (await req('PATCH', `/api/inventory/${pen.id}`, T.sup, { quantity: 50 })).status === 403);
    check('El encargado no crea solicitudes (rol del vendedor)', (await req('POST', '/api/requests', T.enc, { items: [{ inventoryItemId: pen.id, quantity: 1 }] })).status === 403);

    // ---------- 9. Solo sus solicitudes ----------
    S('9. Aislamiento entre vendedores');
    const l1 = (await req('GET', '/api/requests?take=50', T.v1)).json;
    const l2 = (await req('GET', '/api/requests?take=50', T.v2)).json;
    check('Cada vendedor lista solo las suyas', l1.requests.length > 0 && l2.requests.length === 2 && l1.requests.every((r) => r.requester.id === v1.user.id) && l2.requests.every((r) => r.requester.id === v2.user.id), `v1=${l1.total} v2=${l2.total}`);
    check('Forzar ?requesterId= de otro no cambia nada', (await req('GET', `/api/requests?requesterId=${v1.user.id}`, T.v2)).json.requests.every((r) => r.requester.id === v2.user.id));
    check('Abrir la solicitud ajena por URL => 404', (await req('GET', `/api/requests/${rid}`, T.v2)).status === 404);
    check('Los contadores por estado tampoco revelan ajenas', Object.values(l2.counts).reduce((a, b) => a + b, 0) === 2);
    check('Sin token => 401', (await req('GET', '/api/requests')).status === 401 && (await req('GET', '/api/catalog')).status === 401);

    // ---------- 10. Historial ----------
    S('10. Historial y filtros');
    const all = (await req('GET', `/api/movements?take=100&q=${encodeURIComponent(run)}`, T.enc)).json;
    const m1 = all.movements.find((m) => m.requestId === rid);
    check('La salida a venta aparece con todos sus datos', m1 && m1.type === 'venta' && m1.requestNumber && m1.productName && m1.brand === 'Stabilo' && m1.details === 'Azul' && m1.requestedQty === 10 && m1.approvedQty === 10 && m1.dispatchedQty === 10 && m1.requester && m1.dispatcher && m1.requestedAt && m1.approvedAt && m1.dispatchedAt && m1.requestNote && m1.reviewNote && m1.dispatchNote);
    check('Cada despacho parcial es un movimiento (4 y 2)', all.movements.filter((m) => m.requestId === c2.id).map((m) => m.dispatchedQty).sort().join() === '2,4');
    check('Totales por tipo correctos (venta 17, reposición 6)', all.units.venta === 17 && all.units.reposicion === 6, JSON.stringify(all.units));
    const f = async (qs) => (await req('GET', `/api/movements?take=100&q=${encodeURIComponent(run)}&${qs}`, T.enc)).json.movements;
    const venta = await f('type=venta'), repo = await f('type=reposicion');
    check('Filtro por tipo: venta', venta.length === 2 && venta.every((m) => m.type === 'venta'), `n=${venta.length}`);
    check('Filtro por tipo: reposición', repo.length === 2 && repo.every((m) => m.type === 'reposicion'));
    check('Filtro por estado: rechazada', (await f('status=rejected')).every((m) => m.status === 'rejected') && (await f('status=rejected')).length === 1);
    check('Filtro por vendedor', (await f(`requesterId=${v2.user.id}`)).length === 2);
    check('Filtro por encargado', (await f(`handlerId=${enc.user.id}`)).length > 0 && (await f(`handlerId=${sa.user.id}`)).length === 0);
    check('Filtro por producto', (await req('GET', `/api/movements?q=${encodeURIComponent(run + ' Stabilo')}`, T.enc)).json.movements.every((m) => m.brand === 'Stabilo'));
    const today = new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10);
    check('Filtro por fecha (hoy incluye, 2000 no)', (await f(`from=${today}&to=${today}`)).length > 0 && (await f('from=2000-01-01&to=2000-01-02')).length === 0);
    check('Entradas al almacén aparecen en el historial', await (async () => {
      const rq = (await req('POST', '/api/restock', T.sa, { inventoryItemId: pen.id, quantityRequested: 5 })).json;
      await req('POST', `/api/restock/${rq.id}/approve`, T.sa);
      return (await qty(pen.id)) === 5 && (await f('type=entrada')).some((m) => m.dispatchedQty === 5);
    })());
    const logs = await prisma.auditLog.findMany({ where: { entityId: rid }, orderBy: { createdAt: 'asc' } });
    check('Auditoría: crear, aprobar y despachar', logs.map((l) => l.action).join() === 'CREATE,APPROVE,DISPATCH', logs.map((l) => l.action).join());

    // ---------- Integridad en la base de datos ----------
    S('Integridad en la base de datos');
    const blocked = async (fn) => { try { await fn(); return false; } catch { return true; } };
    check('Un despacho no se puede modificar', await blocked(() => prisma.dispatch.update({ where: { id: disp.id }, data: { type: 'reposicion' } })));
    check('Un despacho no se puede borrar', await blocked(() => prisma.dispatchItem.deleteMany({ where: { dispatchId: disp.id } })));
    check('La BD impide despachar más de lo aprobado', await blocked(() => prisma.stockRequestItem.update({ where: { id: line }, data: { dispatchedQty: 99 } })));
    check('La BD rechaza roles desconocidos', await blocked(() => prisma.user.update({ where: { id: v2.user.id }, data: { role: 'cajero' } })));

    // ---------- Reportes ----------
    S('Reportes');
    const st = await req('GET', '/api/reports/stats?days=30', T.sa);
    check('Reportes basados en despachos (venta y reposición)', st.status === 200 && st.json.dispatches.venta === 17 && st.json.dispatches.reposicion === 6, JSON.stringify({ v: st.json.dispatches?.venta, r: st.json.dispatches?.reposicion }));
    check('Valor del inventario solo para quien ve precios', 'value' in st.json.inventory && !('value' in (await req('GET', '/api/reports/stats', T.enc)).json.inventory));

    // ---------- Supervisor como responsable de almacén (va al final: altera los totales) ----------
    S('Supervisor: aprobar, rechazar, despachar y cancelar');
    const ask = async () => (await req('POST', '/api/requests', T.v1, { items: [{ inventoryItemId: pens[3].id, quantity: 2 }] })).json;
    const s1 = await ask();
    check('Aprueba', (await req('POST', `/api/requests/${s1.id}/approve`, T.sup, {})).json.status === 'approved');
    const before = await qty(pens[3].id);
    const sd = await req('POST', `/api/requests/${s1.id}/dispatch`, T.sup, { type: 'venta', idempotencyKey: key(), items: [{ itemId: s1.items[0].id, quantity: 2 }] });
    check('Despacha y el stock baja', sd.status === 201 && (await qty(pens[3].id)) === before - 2);
    check('Queda registrado como responsable', (await prisma.dispatch.findFirst({ where: { requestId: s1.id }, include: { dispatchedBy: true } })).dispatchedBy.role === 'supervisor');
    const s2 = await ask();
    check('Rechaza', (await req('POST', `/api/requests/${s2.id}/reject`, T.sup, { note: 'No procede' })).json.status === 'rejected');
    const s3 = await ask();
    check('Cancela una pendiente', (await req('POST', `/api/requests/${s3.id}/cancel`, T.sup)).json.status === 'cancelled');
    check('Sigue sin administrar usuarios, auditoría o entradas',
      (await Promise.all([
        req('GET', '/api/users', T.sup), req('GET', '/api/audit-logs', T.sup), req('GET', '/api/restock', T.sup),
        req('POST', '/api/inventory', T.sup, {}),
      ])).every((r) => r.status === 403));

    // ---------- Salida directa (superadmin, admin y supervisor) ----------
    S('Salida directa a venta o reposición');
    const item = pens[3].id;
    await prisma.inventoryItem.update({ where: { id: item }, data: { quantity: 20 } });
    const out1 = { type: 'venta', idempotencyKey: key(), note: 'Directo a tienda', items: [{ inventoryItemId: item, quantity: 3 }] };
    const [o1, o2] = await Promise.all([req('POST', '/api/requests/direct', T.sup, out1), req('POST', '/api/requests/direct', T.sup, out1)]);
    check('Doble envío simultáneo: una sola salida y stock baja 3', [o1.status, o2.status].sort().join() === '200,201' && (await qty(item)) === 17, `${o1.status}/${o2.status}`);
    const direct = [o1, o2].find((r) => r.status === 201)?.json.request;
    check('Queda despachada y a nombre de quien la registra', direct?.status === 'dispatched' && direct.requesterId === sup.user.id && direct.reviewer.id === sup.user.id && direct.dispatches.length === 1 && direct.dispatches[0].type === 'venta');
    check('La respuesta no incluye precios', !/unitPrice/.test(o1.text + o2.text));
    const o3 = await req('POST', '/api/requests/direct', T.sa, { ...out1, type: 'reposicion', idempotencyKey: key() });
    check('Superadmin registra una salida a reposición', o3.status === 201 && (await qty(item)) === 14);
    check('Reutilizar la clave de otra persona => 409', (await req('POST', '/api/requests/direct', T.sa, out1)).status === 409 && (await qty(item)) === 14);
    const before2 = await prisma.stockRequest.count();
    const tooMuch = await req('POST', '/api/requests/direct', T.sup, { type: 'venta', idempotencyKey: key(), items: [{ inventoryItemId: pen.id, quantity: 1 }, { inventoryItemId: item, quantity: 999 }] });
    check('Sin stock suficiente => 409 y no se descuenta ni registra nada', tooMuch.status === 409 && (await qty(item)) === 14 && (await qty(pen.id)) === 5 && (await prisma.stockRequest.count()) === before2, tooMuch.json?.error);
    const race = await Promise.all([1, 2].map(() => req('POST', '/api/requests/direct', T.sup, { type: 'venta', idempotencyKey: key(), items: [{ inventoryItemId: item, quantity: 10 }] })));
    check('Dos salidas simultáneas de 10 con 14: solo una pasa', race.map((r) => r.status).sort().join() === '201,409' && (await qty(item)) === 4, race.map((r) => r.status).join('/'));
    for (const [name, patch] of [['sin tipo', { type: undefined }], ['sin clave', { idempotencyKey: undefined }], ['cantidad 0', { items: [{ inventoryItemId: item, quantity: 0 }] }], ['negativa', { items: [{ inventoryItemId: item, quantity: -4 }] }], ['decimal', { items: [{ inventoryItemId: item, quantity: 1.5 }] }], ['vacía', { items: [] }]]) {
      check(`Salida directa ${name} => 400`, (await req('POST', '/api/requests/direct', T.sup, { ...out1, idempotencyKey: key(), ...patch })).status === 400);
    }
    for (const [name, token, status] of [['Vendedor', T.v1, 403], ['Encargado', T.enc, 403], ['Sin sesión', null, 401]]) {
      check(`${name} no registra salidas directas (${status})`, (await req('POST', '/api/requests/direct', token, { ...out1, idempotencyKey: key() })).status === status && (await qty(item)) === 4);
    }
    const supCat = (await req('GET', `/api/catalog?q=${encodeURIComponent(run)}`, T.sup)).json.items;
    const venCat = (await req('GET', `/api/catalog?q=${encodeURIComponent(run)}`, T.v1)).json.items;
    check('El catálogo da cantidades al almacén y no al vendedor', supCat.every((i) => Number.isInteger(i.stock)) && venCat.every((i) => !('stock' in i)));
    check('Aparece en el historial', (await f(`requesterId=${sup.user.id}`)).some((m) => m.requestId === direct?.id && m.dispatchedQty === 3 && m.dispatchNote === 'Directo a tienda'));
    const st2 = (await req('GET', '/api/reports/stats?days=30', T.sa)).json;
    check('No cuenta como abastecimiento de un vendedor', st2.dispatches.byRequester.every((r) => ![sup.user.name, sa.user.name].includes(r.name)) && Number.isInteger(st2.requests.created));

    // ---------- Orden propia: se guarda y se completa después ----------
    S('Orden propia (admin y supervisor)');
    await prisma.inventoryItem.update({ where: { id: item }, data: { quantity: 10 } });
    const ord = await req('POST', '/api/requests', T.sup, { note: 'Pedido de cliente', items: [{ inventoryItemId: item, quantity: 4 }] });
    check('El supervisor guarda una orden: nace aprobada', ord.status === 201 && ord.json.status === 'approved' && ord.json.reviewer.id === sup.user.id && ord.json.items[0].approvedQty === 4);
    check('Guardar la orden NO descuenta stock', (await qty(item)) === 10);
    const done = await req('POST', `/api/requests/${ord.json.id}/dispatch`, T.sup, { type: 'venta', idempotencyKey: key(), items: [{ itemId: ord.json.items[0].id, quantity: 4 }] });
    check('Completarla como venta descuenta el stock', done.status === 201 && done.json.request.status === 'dispatched' && (await qty(item)) === 6);
    check('No se puede completar dos veces', (await req('POST', `/api/requests/${ord.json.id}/dispatch`, T.sup, { type: 'venta', idempotencyKey: key(), items: [{ itemId: ord.json.items[0].id, quantity: 1 }] })).status === 409);
    const ord2 = (await req('POST', '/api/requests', T.sa, { items: [{ inventoryItemId: item, quantity: 50 }] })).json;
    check('Una orden mayor que el stock se guarda pero no se completa sin existencias', ord2.status === 'approved' && (await req('POST', `/api/requests/${ord2.id}/dispatch`, T.sa, { type: 'venta', idempotencyKey: key(), items: [{ itemId: ord2.items[0].id, quantity: 50 }] })).status === 409 && (await qty(item)) === 6);
    check('Una orden sin completar se puede cancelar', (await req('POST', `/api/requests/${ord2.id}/cancel`, T.sa)).json.status === 'cancelled');
    check('El vendedor no ve las órdenes internas', (await req('GET', `/api/requests/${ord.json.id}`, T.v1)).status === 404);
    check('La solicitud del vendedor sigue naciendo pendiente', (await req('POST', '/api/requests', T.v1, { items: [{ inventoryItemId: item, quantity: 1 }] })).json.status === 'pending');
    check('El encargado sigue sin crear órdenes', (await req('POST', '/api/requests', T.enc, { items: [{ inventoryItemId: item, quantity: 1 }] })).status === 403);
  } catch (e) {
    console.error('EXCEPCIÓN', e);
    check('excepción: ' + e.message, false);
  } finally {
    await prisma.$disconnect();
    if (out.some((r) => !r.ok)) process.exitCode = 1;
    let last = '';
    for (const r of out) {
      if (r.section !== last) { console.log(`\n## ${r.section}`); last = r.section; }
      console.log(`${r.ok ? 'OK   ' : 'FALLA'} ${r.name}${!r.ok && r.detail ? '  — ' + r.detail : ''}`);
    }
    console.log(`\nRESULTADO: ${out.filter((r) => r.ok).length}/${out.length} comprobaciones correctas`);
  }
})();
