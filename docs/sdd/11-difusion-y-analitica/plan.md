# Plan Técnico: Difusión y Analítica de Negocio

## 1. Decisiones Técnicas y Arquitectura

### 1.1. Backend

- Endpoint público desprovisto de middlewares de autenticación (`/api/v1/publico/disponibilidad`).
- Consulta agregada optimizada que calcula vacantes mediante `LEFT JOIN` con `inscripcion_horarios` de inscripciones activas.
- Estrategia de caché:
  - Cache en memoria con TTL de 60 segundos (`node-cache` o headers HTTP `Cache-Control: public, s-maxage=60`).
  - Rate limiting específico para endpoints públicos con `express-rate-limit` para prevenir scraping agresivo.

### 1.2. Frontend

- Landing page pública `/disponibilidad`:
  - Diseño visualmente llamativo con paleta corporativa MiFR (modo oscuro moderno o estética fitness premium).
  - Componente Hero con "Próxima Clase a Comenzar" y contador de vacantes.
  - Sección de "Disciplinas y Horarios de la Semana" con badges semafóricos de cupo.
  - Banner destacado de "Promoción Vigente".
  - Botón Sticky / Flotante de WhatsApp (`https://wa.me/549...?text=Hola!%20Quiero%20sumarme%20a%20MiFR`).

---

## 2. Modelo de Datos y Consulta Pública

La información se obtiene de las tablas ya existentes en el DER (`actividades`, `horarios`, `profesoras`, `usuarios`, `inscripciones`, `promociones`), proyectando únicamente atributos seguros:

```sql
-- Consulta de disponibilidad pública segura
SELECT 
    a.nombre AS actividad,
    a.tipo AS tipo_actividad,
    h.dia_semana,
    h.hora_inicio,
    h.hora_fin,
    u.nombre AS profesora_nombre,
    COALESCE(h.cupo_maximo, a.cupo_maximo) AS cupo_total,
    COUNT(i.id_inscripcion) AS inscriptos_actuales,
    GREATEST(0, COALESCE(h.cupo_maximo, a.cupo_maximo) - COUNT(i.id_inscripcion)) AS cupos_libres
FROM horarios h
JOIN actividades a ON h.id_actividad = a.id_actividad
JOIN profesoras p ON h.id_profesora = p.id_profesora
JOIN usuarios u ON p.id_usuario = u.id_usuario
LEFT JOIN inscripcion_horarios ih ON h.id_horario = ih.id_horario
LEFT JOIN inscripciones i ON ih.id_inscripcion = i.id_inscripcion AND i.estado = 'ACTIVA'
WHERE a.activo = TRUE AND h.fecha_baja IS NULL
GROUP BY a.id_actividad, h.id_horario, u.id_usuario;
```

---

## 3. Endpoints y Contratos de API

### 3.1. Panel Público (`/api/v1/publico`)

- `GET /api/v1/publico/disponibilidad`:
  - Respuesta 200 OK:

    ```json
    {
      "proxima_clase": {
        "actividad": "Pilates Reformer",
        "hora_inicio": "18:00",
        "profesora": "Camila",
        "cupos_libres": 1,
        "estado_cupo": "ULTIMOS_LUGARES"
      },
      "promocion_vigente": {
        "titulo": "Promo Primavera",
        "descripcion": "15% de descuento en planes de 3 días",
        "descuento": "15% OFF"
      },
      "cronograma": [
        {
          "actividad": "Funcional",
          "tipo": "GRUPAL",
          "horarios": [
            { "dia": "LUNES", "inicio": "19:00", "fin": "20:00", "profesora": "Sofía", "cupos_libres": 5, "estado_cupo": "DISPONIBLE" }
          ]
        }
      ]
    }
    ```

---

## 4. Consideraciones de Seguridad

- Endpoint completamente de solo lectura (`GET`).
- Bloqueo absoluto de cualquier dato personal de clientes o histórico financiero.
