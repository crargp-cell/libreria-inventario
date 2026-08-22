# 🗄️ Configuración de Base de Datos PostgreSQL

## Opción 1: Supabase (Recomendado - Gratuito, En la Nube)

### Pasos:
1. Ir a https://supabase.com
2. Crear cuenta gratuita
3. Crear nuevo proyecto
4. En el panel, ir a "Settings" → "Database"
5. Copiar la connection string (URL de PostgreSQL)
6. Reemplazar en `.env.local`:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@db.XXX.supabase.co:5432/postgres"
```

### Características:
- ✅ Gratuito hasta 500MB
- ✅ Hosting en la nube (no necesita servidor local)
- ✅ Backups automáticos
- ✅ Interfaz web para administración

---

## Opción 2: PostgreSQL Local (Desarrollo Local)

### En Windows:
1. Descargar PostgreSQL desde https://www.postgresql.org/download/windows/
2. Instalar con usuario "postgres" y contraseña
3. Abrir pgAdmin (incluido)
4. Crear nueva BD: `libreria_db`
5. Actualizar `.env.local`:

```env
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/libreria_db"
```

### En macOS (con Homebrew):
```bash
brew install postgresql@15
brew services start postgresql@15
createdb libreria_db
```

---

## Opción 3: Railway (Alternativa Simple)

1. Ir a https://railway.app
2. Conectar GitHub
3. Crear nuevo proyecto → PostgreSQL
4. Copiar connection string a `.env.local`

---

## Próximos Pasos (Una vez tengas la URL):

### 1. Actualizar `.env.local` con tu DATABASE_URL

### 2. Generar migraciones iniciales:
```bash
npx prisma migrate dev --name init
```

### 3. Generar Prisma Client:
```bash
npx prisma generate
```

### 4. Ver datos en Prisma Studio (opcional):
```bash
npx prisma studio
```

---

## Notas Importantes:

- 🔐 **NUNCA commitear `.env.local`** (está en .gitignore)
- 🔒 En producción, usar variables de entorno seguras
- 📝 Cada migración se versionea en `prisma/migrations/`
- 🔄 Todos comparten la misma BD (dev), usar replicas para ambientes

---

## Conexión String Format:

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Donde:
- `USER`: Usuario de BD (ej: postgres)
- `PASSWORD`: Contraseña de BD
- `HOST`: Dirección del servidor (ej: localhost o supabase)
- `PORT`: Puerto (ej: 5432)
- `DATABASE`: Nombre de BD (ej: libreria_db)
