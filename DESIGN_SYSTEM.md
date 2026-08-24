# Sistema de Diseño - Tu Librería Líder

## Paleta de Colores

### Colores Principales
- **Primario**: `#0066CC` - Azul vibrante profesional
- **Secundario**: `#E8F0FF` - Azul claro para fondos
- **Acento**: `#FF6B35` - Naranja para llamadas a acción destacadas

### Colores Neutrales
- **Blanco**: `#FFFFFF`
- **Gris Oscuro**: `#111827`
- **Gris Medio**: `#6B7280`
- **Gris Claro**: `#F3F4F6`
- **Borde**: `#E5E7EB`

### Colores de Estado
- **Éxito**: `#10b981`
- **Advertencia**: `#f59e0b`
- **Error**: `#ef4444`
- **Información**: `#3b82f6`

## Tipografía

### Fuentes
- **Familia**: System fonts (Inter, Segoe UI, Roboto)
- **Sizes**:
  - XS: 12px
  - SM: 14px
  - Base: 16px
  - LG: 18px
  - XL: 20px
  - 2XL: 24px
  - 3XL: 30px
  - 4XL: 36px

### Pesos
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

## Componentes

### Botones
```tsx
// Primario - Acciones principales
<Button variant="primary">Guardar</Button>

// Secundario - Acciones alternativas
<Button variant="secondary">Cancelar</Button>

// Peligro - Acciones destructivas
<Button variant="danger">Eliminar</Button>

// Ghost - Acciones sutiles
<Button variant="ghost">Ver más</Button>
```

### Inputs
```tsx
// Todos los inputs tienen:
// - Label opcional
// - Placeholders visibles (no transparentes)
// - Focus ring azul (#0066CC)
// - Border 2px en focus
// - Transiciones suaves
```

### Cards
```tsx
// Contenedor estándar para contenido
<Card>
  <h2>Título</h2>
  <p>Contenido</p>
</Card>
```

### Badges
```tsx
// Estados de inventario
<Badge variant="success">En Stock</Badge>
<Badge variant="warning">Stock Bajo</Badge>
<Badge variant="error">Agotado</Badge>
```

## Iconos

### Usar componentes SVG
```tsx
import {
  IconDashboard,
  IconShoppingCart,
  IconPackage,
  IconRefresh,
  IconBarChart,
  IconUsers,
  IconClipboard,
  IconBook,
  IconSearch,
  IconLogout,
  IconMenu,
  IconClose,
} from '@/components/icons';
```

### Nunca usar Emojis
Todos los iconos deben ser SVG profesionales.

## Espaciado

### Sistema de espaciado (basado en Tailwind)
- 2px: xs
- 4px: sm
- 8px: base
- 12px: md
- 16px: lg
- 24px: xl
- 32px: 2xl
- 48px: 3xl
- 64px: 4xl

## Sombras

### Niveles de sombra
- **sm**: `shadow-sm` - Sombra sutil
- **md**: `shadow-md` - Sombra media
- **lg**: `shadow-lg` - Sombra pronunciada
- **xl**: `shadow-xl` - Sombra muy pronunciada

## Bordes

### Radio de borde
- **sm**: 4px
- **md**: 8px
- **lg**: 12px
- **full**: 9999px

## Transiciones

### Velocidades estándar
- **Rápido**: 150ms
- **Normal**: 200ms
- **Lento**: 300ms

### Funciones de timing
- **ease-in**: Inicio lento
- **ease-out**: Final lento
- **ease-in-out**: Ambos lados

## Layout

### Ancho máximo de contenedor
- `max-w-7xl` (80rem / 1280px)

### Breakpoints responsivos
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

## Ejemplos de Uso

### Página Básica
```tsx
import { PageTemplate } from '@/components/templates/PageTemplate';
import { IconPackage } from '@/components/icons';
import { Button } from '@/components/ui/Button';

export default function Page() {
  return (
    <PageTemplate
      title="Inventario"
      subtitle="Gestiona tu catálogo de productos"
      icon={<IconPackage />}
      action={<Button>Agregar Producto</Button>}
    >
      {/* Contenido aquí */}
    </PageTemplate>
  );
}
```

### Tabla de Datos
```tsx
import { DataTableTemplate } from '@/components/templates/PageTemplate';

<DataTableTemplate
  title="Productos"
  columns={[
    { key: 'code', label: 'Código' },
    { key: 'name', label: 'Nombre' },
    { key: 'price', label: 'Precio' },
  ]}
  data={items}
  isLoading={false}
/>
```

### Formulario
```tsx
import { FormTemplate } from '@/components/templates/PageTemplate';

<FormTemplate
  title="Nuevo Producto"
  fields={[
    { name: 'code', label: 'Código', required: true },
    { name: 'name', label: 'Nombre', required: true },
    { name: 'price', label: 'Precio', type: 'number', required: true },
  ]}
  onSubmit={handleSubmit}
/>
```

## Guía de Estilo

### Do's ✅
- Usar la paleta de colores establecida
- Mantener consistencia en espaciado
- Usar SVG para iconos
- Incluir transiciones suaves
- Hacer componentes reutilizables
- Seguir la estructura de templates

### Don'ts ❌
- No usar emojis en interfaces
- No usar colores arbitrarios
- No crear estilos inline
- No duplicar código de componentes
- No usar valores magic numbers
- No ignorar estado de hover/focus

## Versión
Sistema de Diseño v1.0 - Tu Librería Líder
