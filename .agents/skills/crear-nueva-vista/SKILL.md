---
name: crear-nueva-vista
description: >-
  Estándar de arquitectura, diseño y layout para la creación de nuevas páginas/vistas en el frontend de MiFR.
  Utilizar siempre que se deba crear, rediseñar o refactorizar una página bajo OwnerLayout (como Actividades, Horarios, Planes, Alumnos, Cobros).
  Garantiza consistencia visual: alineación con el layout general, tipografía de títulos h1/h2 con tracking-tight, badge de píldora de conteo, panel de KPIs, barra de filtros/búsqueda, diseño responsive dual (tarjetas mobile y tabla desktop) y estados de carga/vacío.
---

# Estándar de Creación de Vistas y Páginas en MiFR

Esta skill define la guía obligatoria, arquitectura y plantilla de código para cualquier vista o pantalla nueva que se incorpore a la aplicación web autenticada (bajo `OwnerLayout`).

---

## 1. Reglas Fundamentales de Contenedor y Alineación

1. **No anidar `<main>` dentro de `OwnerLayout`:**
   - `OwnerLayout` ya envuelve a `{children}` en un `<main className="flex w-full min-w-0 flex-1 animate-page-enter flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">`.
   - El contenedor raíz de la página debe ser:
     ```tsx
     <div className="space-y-6 min-w-0">
     ```
2. **Nunca aplicar anchos fijos centrados a la página:**
   - **PROHIBIDO:** `mx-auto max-w-[1240px]` o similares a nivel de página.
   - El contenido debe ocupar el 100% del ancho provisto por `OwnerLayout` para que el título y las tarjetas comiencen exactamente alineados a la izquierda con el resto del sistema (como en Horarios y Actividades).

---

## 2. Estructura del Encabezado Principal (Header)

Todas las vistas deben mantener la misma jerarquía de encabezado con título, badge de conteo y subtítulo descriptivo:

```tsx
{/* ENCABEZADO PRINCIPAL */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div className="min-w-0">
    <div className="flex items-center gap-3 flex-wrap">
      <h1 className="text-2xl xl:text-3xl font-black text-dark dark:text-white tracking-tight">
        {tituloPagina}
      </h1>
      {conteo !== undefined && (
        <Badge
          variant="outline"
          className="rounded-full border-pink-200 bg-pink-100 px-3 py-1 text-sm font-extrabold text-primary-dark dark:border-primary/40 dark:bg-primary/20 dark:text-pink-300 shadow-2xs"
        >
          {conteo} {conteo === 1 ? etiquetaSingular : etiquetaPlural}
        </Badge>
      )}
    </div>
    <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
      {descripcionPagina}
    </p>
  </div>

  {/* Botón de acción principal (si corresponde) */}
  {accionPrincipal && (
    <Button
      type="button"
      onClick={abrirModalCreacion}
      className="min-h-[44px] rounded-xl bg-primary px-4 md:px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95 shrink-0"
    >
      + {textoAccion}
    </Button>
  )}
</div>
```

---

## 3. Tarjetas de Resumen / KPIs (Opcional según la vista)

Si la vista presenta totales o estadísticas clave:

```tsx
<section aria-label="Resumen" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  <Card className="rounded-xl border-border bg-white p-4 shadow-sm dark:bg-surface-low">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {etiquetaKpi}
      </span>
      <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
        <Icono className="size-4" />
      </span>
    </div>
    <p className="mt-2 text-2xl font-black text-dark dark:text-white">
      {valorKpi}
    </p>
    <p className="mt-1 text-xs text-muted-foreground">
      {detalleKpi}
    </p>
  </Card>
</section>
```

---

## 4. Barra de Búsqueda y Filtros

Utilizar el componente `Card` unificado con bordes sutiles:

```tsx
<Card className="rounded-xl border-border bg-white p-4 shadow-sm dark:bg-surface-low">
  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    {/* Campo de búsqueda */}
    <div className="relative flex-1">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        placeholder="Buscar..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="h-10 w-full rounded-lg border-border bg-slate-50/50 pl-9 text-sm transition-colors focus:bg-white dark:bg-canvas dark:focus:bg-surface-low"
      />
    </div>

    {/* Chips de filtro */}
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtros">
      {OPCIONES_FILTRO.map((opcion) => {
        const activo = filtroSeleccionado === opcion.id;
        return (
          <Button
            key={opcion.id}
            type="button"
            variant="outline"
            onClick={() => setFiltroSeleccionado(opcion.id)}
            className={cn(
              "h-9 rounded-lg px-3 text-xs font-bold transition-all",
              activo
                ? "border-primary bg-primary text-white hover:bg-primary-dark hover:text-white dark:border-primary dark:bg-primary dark:text-white"
                : "border-border bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            )}
          >
            {opcion.etiqueta}
          </Button>
        );
      })}

      {hayFiltros && (
        <Button
          type="button"
          variant="ghost"
          onClick={limpiarFiltros}
          className="h-9 px-2.5 text-xs font-bold text-muted-foreground hover:text-dark dark:hover:text-white"
        >
          <X className="mr-1 size-3.5" />
          Limpiar
        </Button>
      )}
    </div>
  </div>
</Card>
```

---

## 5. Diseño Responsive Dual (Mobile + Desktop)

En MiFR se aplica el patrón de diseño responsive dual para listados:

### A. Vista Mobile (`xl:hidden`) - Tarjetas
- Cada elemento es una `<Card className="rounded-xl border-border bg-white p-4 shadow-sm dark:bg-surface-low">`.
- Avatar de iniciales con gradiente de marca: `bg-linear-to-tr from-primary-dark to-primary text-white font-bold rounded-xl`.
- Botones de acción táctiles con `min-h-[44px]` para accesibilidad móvil.

### B. Vista Desktop (`hidden xl:block`) - Tabla
- Envuelto en `<Card className="hidden overflow-hidden rounded-2xl border-border bg-white shadow-sm xl:block dark:bg-surface-low">`.
- Cabecera de tabla:
  `<thead className="border-b border-border bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:bg-white/5 dark:text-slate-200">`
- Filas con hover sutil:
  `<tr className="transition-colors hover:bg-slate-50/70 dark:hover:bg-white/5">`
- Acciones alineadas a la derecha (`text-right`).

---

## 6. Secciones Secundarias (Títulos h2)

Para bloques o secciones adicionales dentro de la misma página (ej. tablas históricas, configuraciones, detalles):

```tsx
<div className="space-y-1">
  <h2 className="text-lg xl:text-xl font-black text-dark dark:text-white tracking-tight">
    {tituloSeccion}
  </h2>
  <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
    {descripcionSeccion}
  </p>
</div>
```

---

## 7. Estados de Feedback (Carga, Error, Vacío)

- **Carga:**
  ```tsx
  <div role="status" className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
    <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
    Cargando {entidad}...
  </div>
  ```
- **Vacío:**
  ```tsx
  <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-600">
    <span className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
      <Icono aria-hidden="true" className="size-7" />
    </span>
    <h2 className="text-lg font-extrabold text-dark dark:text-white">
      {tituloVacio}
    </h2>
    <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
      {descripcionVacio}
    </p>
  </Card>
  ```

---

## 8. Buenas Prácticas de Testing (Vitest + React Testing Library)

Cuando la vista utilice componentes `<Link>` de `react-router-dom`:
- **Siempre** envolver el render de pruebas dentro de `<MemoryRouter>`:
  ```tsx
  const renderVista = () =>
    render(
      <MemoryRouter>
        <MiNuevaPage />
      </MemoryRouter>
    );
  ```
- Mockear `OwnerLayout` para aislar el test:
  ```tsx
  vi.mock("@/components/layout/owner-layout", () => ({
    OwnerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
  }));
  ```
