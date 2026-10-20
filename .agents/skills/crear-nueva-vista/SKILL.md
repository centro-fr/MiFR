---
name: crear-nueva-vista
description: >-
  Estándar de arquitectura, diseño y layout para la creación de nuevas páginas/vistas en el frontend de MiFR.
  Utilizar siempre que se deba crear, rediseñar o refactorizar una página bajo OwnerLayout (como Actividades, Horarios, Planes, Alumnos, Cobros).
  Garantiza consistencia visual: navegación breadcrumbs, alineación con el layout general, tipografía de títulos h1/h2 con tracking-tight, badge de píldora de conteo, pestañas con estados, formularios modales flotantes centrados ("al medio"), barras de filtros en píldoras, tarjetas modernas rounded-3xl y estados de carga/vacío.
---

# Estándar de Creación de Vistas y Páginas en MiFR

Esta skill define la guía obligatoria, arquitectura, estándares visuales y plantillas de código para cualquier vista, pantalla o formulario que se incorpore a la aplicación web autenticada (bajo `OwnerLayout`).

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
   - El contenido debe ocupar el 100% del ancho provisto por `OwnerLayout` para que el título y los componentes comiencen exactamente alineados a la izquierda en todo el sistema.
3. **Breadcrumbs en la parte superior:**
   - Toda página principal debe iniciar con una barra de navegación breadcrumb:
     ```tsx
     function Breadcrumbs() {
       return (
         <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
           <Link to="/app" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
             Inicio
           </Link>
           <span>/</span>
           <span>Sección</span>
           <span>/</span>
           <span className="font-bold text-slate-800 dark:text-slate-200">{paginaActual}</span>
         </nav>
       );
     }
     ```

---

## 2. Estructura del Encabezado Principal (Header)

Todas las vistas deben mantener la misma jerarquía de encabezado con título `h1`, badge de píldora de conteo, subtítulo descriptivo y botón de acción principal:

```tsx
{/* ENCABEZADO PRINCIPAL */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div className="min-w-0">
    <div className="flex items-center gap-2.5 flex-wrap">
      <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
        {tituloPagina}
      </h1>
      {conteo !== undefined && (
        <span className="rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 text-xs font-bold px-2.5 py-0.5 shadow-2xs">
          {conteo} {conteo === 1 ? etiquetaSingular : etiquetaPlural}
        </span>
      )}
    </div>
    <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
      {descripcionPagina}
    </p>
  </div>

  {/* Botón de acción principal con sombra fucsia y elevación */}
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

## 3. Pestañas Superiores de Navegación (Tabs)

Para páginas que alternan entre diferentes sub-vistas o estados (como Planes vs Promociones, o Alumnos Activos / Pendientes / Bajas):

```tsx
<div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 pt-1">
  <button
    type="button"
    onClick={() => setPestana("PRINCIPAL")}
    className={cn(
      "flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition-colors",
      pestana === "PRINCIPAL"
        ? "border-primary text-slate-900 dark:text-white"
        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
    )}
  >
    <Icono className="size-4" />
    Pestaña Principal ({conteo})
  </button>
  <button
    type="button"
    onClick={() => setPestana("SECUNDARIA")}
    className={cn(
      "flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition-colors",
      pestana === "SECUNDARIA"
        ? "border-primary text-slate-900 dark:text-white"
        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
    )}
  >
    <IconoSecundario className="size-4" />
    Secundaria
    {enConstruccion && (
      <span className="rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5">
        En construcción
      </span>
    )}
  </button>
</div>
```

---

## 4. Regla Crucial: Formularios Flotantes y Centrados ("Al Medio")

> [!IMPORTANT]
> **REGLA DE NEGOCIO:** Todos los formularios de alta, edición y detalle (Pre-inscripción, Editar plan, Nuevo horario, Cobro en efectivo, etc.) deben ser **modales flotantes y centrados en pantalla**, utilizando `Dialog` y `DialogContent` de Radix UI. **NUNCA** deben generarse como páginas completas que rompan el contexto o desalineen la experiencia.

### Plantilla de Modal Centrado:

```tsx
<Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
  <DialogContent
    hideClose
    className="w-[96vw] sm:w-full max-w-lg md:max-w-xl rounded-3xl p-6 sm:p-7 shadow-2xl overflow-y-auto max-h-[92vh]"
  >
    {/* Encabezado con título y botón X a la derecha */}
    <DialogHeader className="flex flex-row items-center justify-between pb-3 text-left">
      <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
        {tituloModal}
      </DialogTitle>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Cerrar formulario"
        className="size-8 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <X className="size-4" />
      </Button>
    </DialogHeader>

    {/* Formulario */}
    <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
      {/* Campo con etiqueta en negrita */}
      <div className="space-y-1.5">
        <Label htmlFor="campo-id" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
          Nombre <span className="text-destructive">*</span>
        </Label>
        <Input
          id="campo-id"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
        />
        {error && <p className="text-xs font-semibold text-destructive mt-1">{error}</p>}
      </div>

      {/* Acción destructiva opcional (ej. Dar de baja) */}
      {onDarDeBaja && (
        <div className="pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onDarDeBaja}
            className="rounded-xl border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold text-xs sm:text-sm h-10 px-4"
          >
            Dar de baja el elemento
          </Button>
        </div>
      )}

      {/* Footer con botones Cancelar y Guardar */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={guardando}
          className="h-11 px-6 rounded-xl font-bold text-xs sm:text-sm border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={guardando || sinCambios}
          className="h-11 flex-1 rounded-xl font-bold text-xs sm:text-sm bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs"
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>
```

---

## 5. Barra de Búsqueda y Filtros Compactos en Píldoras

Para pantallas con filtrado (Horarios, Alumnos, Actividades), utilizar píldoras compactas con selector integrado:

```tsx
<div className="flex flex-wrap items-center gap-3 pt-1">
  {/* Selector en píldora */}
  <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 shadow-2xs">
    <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
      {etiquetaFiltro}
    </span>
    <Select value={filtro} onValueChange={setFiltro}>
      <SelectTrigger
        aria-label={`Filtrar por ${etiquetaFiltro}`}
        className="border-0 bg-transparent p-0 h-auto font-bold text-slate-900 dark:text-slate-100 shadow-none focus:ring-0 gap-1.5 text-xs sm:text-sm min-w-[70px]"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="TODAS">Todas</SelectItem>
        {opciones.map((op) => (
          <SelectItem key={op.id} value={op.id}>
            {op.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Botón limpiar filtros */}
  {hayFiltrosActivos && (
    <Button
      type="button"
      variant="ghost"
      onClick={limpiarFiltros}
      className="min-h-[36px] text-xs font-bold text-primary hover:text-primary-dark"
    >
      Limpiar filtros
    </Button>
  )}
</div>
```

---

## 6. Tarjetas Modernas para Catálogos y Listados (`rounded-3xl`)

Para vistas basadas en tarjetas (como la nueva pantalla de Planes):

```tsx
<li className={cn(
  "flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-xs hover:shadow-md transition-all gap-4",
  !vigente && "bg-muted/40 opacity-80"
)}>
  <div>
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
        {nombreElemento}
      </h2>
      {badgeEstado}
    </div>

    {/* Precio o dato principal */}
    <div className="flex items-baseline justify-between gap-1.5 my-2.5">
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
          {formatearPrecio(precio)}
        </span>
        <span className="text-sm font-semibold text-muted-foreground">
          {frecuenciaTexto}
        </span>
      </div>
    </div>

    {/* Características o detalles */}
    <ul className="flex flex-col gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 my-3">
      <li>{caracteristica1}</li>
      <li>{caracteristica2}</li>
    </ul>
  </div>

  {/* Botones de acción inferiores */}
  <div className="mt-auto flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
    <Button
      type="button"
      variant="outline"
      onClick={onAccionSecundaria}
      className="flex-1 h-11 rounded-xl font-bold text-sm border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
    >
      Cambiar precio
    </Button>
    <Button
      type="button"
      variant="outline"
      onClick={onEditar}
      className="px-6 h-11 rounded-xl font-bold text-sm border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
    >
      Editar
    </Button>
  </div>
</li>
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
- **Error con botón de reintento:**
  ```tsx
  <Card className="flex flex-col items-center gap-3 border-slate-200 dark:border-slate-800 px-5 py-12 text-center rounded-3xl">
    <AlertCircle aria-hidden="true" className="size-8 text-rose-600 dark:text-rose-300" />
    <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
      {mensajeDeErrorApi(error, "No se pudieron cargar los datos.")}
    </p>
    <Button type="button" onClick={reintentar} className="min-h-[44px] rounded-xl bg-primary text-white hover:bg-primary-dark font-bold">
      Reintentar
    </Button>
  </Card>
  ```
- **Vacío:**
  ```tsx
  <Card className="flex flex-col items-center gap-3 border-slate-200 dark:border-slate-800 px-5 py-14 text-center rounded-3xl">
    <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
      <Icono className="size-7" />
    </span>
    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
      {tituloVacio}
    </h2>
    <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
      {descripcionVacio}
    </p>
    {accionVacio}
  </Card>
  ```

---

## 8. Buenas Prácticas de Testing (Vitest + React Testing Library)

1. Envolver con `<MemoryRouter>` siempre que se utilicen enlaces o navegación.
2. Proveer `QueryClientProvider` en el render de tests si la vista utiliza React Query.
3. Probar la apertura y cierre del modal flotante centrado:
   - Apertura al presionar el botón de edición o creación.
   - Cierre con el botón "Cancelar" y con el botón `X` de la esquina superior.
   - Validación visual ante campos vacíos u obligatorios.
