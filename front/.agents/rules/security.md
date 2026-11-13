# Reglas de Ciberseguridad y Buenas Prácticas Web

## Principios de Seguridad (Security by Design)

1. **Confianza Cero en el Cliente**:
   - Toda entrada debe ser validada y sanitizada estrictamente en el backend (DTOs, schemas con Zod/Joi).
   - El cliente solo refleja permisos para UX; el backend aplica la autorización inmutable.
2. **Mitigación Activa de OWASP Top 10**:
   - Prevención de Injection (consultas parametrizadas y ORM seguro).
   - Prevención de XSS (sanitización de HTML y escape contextual).
   - Prevención de CSRF y Clickjacking (headers `SameSite`, `X-Frame-Options`, `Content-Security-Policy`).
3. **Gestión de Sesión e Identidad**:
   - Cero secrets en repositorios o bundles de frontend.
   - Cookies `HttpOnly; Secure; SameSite=Lax` para tokens de sesión.
   - Verificación de tokens criptográficos en el servidor (validación de claims, expiración y audiencia).
4. **Performance y Resiliencia**:
   - Prevención de ataques DoS mediante rate limiting en endpoints críticos (auth, endpoints públicos).
   - Minimización de dependencias para reducir superficie de ataque (`pnpm audit`).
5. **Jerarquía Decisional**:
   $$\text{Seguridad} > \text{Mantenibilidad} > \text{Performance} > \text{Features nuevas}$$
