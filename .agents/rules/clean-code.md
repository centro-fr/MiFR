# Reglas de Código Limpio y Principios de Diseño

## Principios Fundamentales
1. **Legibilidad y Expresividad**:
   - Nombres que revelen la intención clara del negocio.
   - Funciones compactas (< 25-30 líneas) orientadas a una única responsabilidad (SRP).
   - Claridad sobre artificios complejos ("cleverness").
   - Comentarios estrictamente para explicar el "por qué", jamás el "qué".
2. **Diseño y Arquitectura**:
   - Cumplimiento riguroso de SOLID.
   - Composición sobre herencia.
   - Arquitectura en capas limpia: Presentación → Aplicación (Casos de Uso) → Dominio → Infraestructura.
   - Aislamiento del dominio de frameworks, protocolos HTTP y bases de datos.
3. **Manejo de Errores y Calidad**:
   - Prohibido silenciar errores o usar catch vacíos.
   - Errores de dominio tipados y explícitos mapeados a códigos HTTP adecuados (no 500 para validaciones).
   - Logging estructurado con contexto accionable.
4. **Testing y Mantenibilidad**:
   - Código desacoplado y testeable por diseño.
   - Tests unitarios y de integración que documenten el comportamiento esperado.
   - Simplicidad y YAGNI como filosofía base.
