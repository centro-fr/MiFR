# Arquitectura Frontend y Aislamiento de Mocks (front/AGENTS.md)

Este estándar define las reglas obligatorias de desarrollo frontend en `front/` de acuerdo con las especificaciones de `front/AGENTS.md`.

---

## 1. Aislamiento Estricto de Mocks

1. **Ubicación Única de Mocks**:
   - Todo mock debe residir exclusivamente en `src/mocks/handlers/` (un handler por dominio/épica).
   - Datos auxiliares estáticos o generadores Faker van en `src/mocks/data/` o en su respectivo handler.
2. **Prohibición de Importaciones Directas en Código de Producción**:
   - **Prohibido** importar constantes de mocks (`MOCK_*`) dentro de componentes (`components/`), hooks (`hooks/`) o páginas (`pages/`).
   - Los componentes y hooks deben consumir llamadas HTTP abstractas (`api/` o servicios).
   - Los mocks son interceptados en la capa de red mediante **MSW (Mock Service Worker)** controlado por la variable de entorno `VITE_USE_MOCKS`.
3. **Desconexión Limpia de Mocks**:
   - Cuando el backend esté listo, la integración debe ocurrir cambiando `VITE_USE_MOCKS=false` y configurando `VITE_API_URL` en Axios, sin tener que tocar ni una sola línea de lógica en los hooks ni en los componentes.

---

## 2. Flujo de Datos y Consumo (SOLID / DIP)

1. **Esquema de Capas Obligatorio**:
   $$\text{Componente (UI)} \longrightarrow \text{Custom Hook (React Query)} \longrightarrow \text{API Client (Axios)} \longrightarrow \text{MSW / Backend Real}$$
2. **Hooks de Features**:
   - Los hooks deben usar `useQuery` para data fetching y `useMutation` para mutaciones (crear, editar, eliminar).
   - Prohibido inicializar estados locales `useState(MOCK_DATOS)` para simular bases de datos en memoria dentro del componente o hook de la vista.
3. **Esquemas de Validación**:
   - Todo formulario o mutación debe contar con su esquema Zod en `src/features/<dominio>/schemas/`.
   - Los tipos deben inferirse de Zod (`z.infer<typeof schema>`) o corresponder a los DTOs de `src/types/`.

---

## 3. Datos de Sesión, Roles y Navegación

1. **Cero Sesiones Hardcodeadas**:
   - Prohibido hardcodear nombres, emails, roles o iniciales de usuarios en layouts o sidebars (ej. `Mariana Rodríguez`).
   - Toda información del usuario logueado debe obtenerse del estado de autenticación (store de sesión con Zustand o hook `useAuth()`).
2. **Navegación Dinámica por Roles**:
   - Los menús y opciones deben ajustarse según los roles y permisos del usuario conectado respetando `docs/design/MENUS.md`.

---

## 4. Terminología Obligatoria del Glosario

De acuerdo con `front/AGENTS.md`, el sistema no procesa pagos directamente. Es obligatorio respetar los términos en toda la interfaz de usuario:

| ❌ Término Prohibido | ✅ Término Obligatorio |
| :--- | :--- |
| "Pago" / "Mis pagos" | "Transferencia" / "Mis transferencias" |
| "Registrar pago" / "Enviar pago" | "Informar transferencia" |
| "Confirmar pago" | "Verificar transferencia" |
| "Pendiente de confirmación" | "Pendiente de verificación" |
| "Monto pagado" | "Monto de la transferencia" |
| "Efectivo en sala" | "Efectivo" |
| "Cobro" | Efectivo registrado por la profesora |
| "Rendición" | Entrega del efectivo a la propietaria |
