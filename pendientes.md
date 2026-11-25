# Plan Kid

[x] validar que solo los alumnos menores de edad puedan acceder a este plan.
  Hecho el 24/11/2026: el plan tiene la casilla "Solo para menores de 18 años" (`planes.solo_menores` en el DER, migración `agregar_plan_solo_menores`). El back rechaza con 400 a quien ya cumplió 18 al inscribir, pre-inscribir, reactivar o cambiar de plan; quien cumple 18 ya inscripto sigue. La casilla está al crear y al editar el plan, y la pre-inscripción no le ofrece esos planes a un mayor. Kid Fit queda marcado en los datos de la presentación y Plan Kids en los mocks.
  25/11/2026: las actividades también tienen la casilla "Solo para menores de 18 años" (`actividades.solo_menores`, migración `agregar_actividad_solo_menores`); Kid Fit queda marcada. Un plan solo para menores ofrece y admite solo esas actividades, y un mayor no puede tomarlas con ningún plan. Caso PI-101 (G-45 a G-47).

# En nuevo pre-inscripcion

[x] separar en dos campos direccion y salud como los otros campos, osea direccion (opcional) y apto medico (opcional)
  Hecho: sin el desplegable, "Dirección (opcional)" y "Apto médico (opcional)" quedan como los demás campos; la fecha del apto se pide solo si se marca. Las observaciones médicas siguen debajo, también opcionales.
[x] cambiar el titulo "Mes a mes, año contra año" en el reporte de inscripciones, darme opciones de nombres para elegir el mejor.
  Hecho: "Comparación entre años".
[x] cambiar "Cobros en mano" por otro nombre como "cantidad de cobros" o dame opciones.
  Hecho: "Cobros a rendir", también en la vista de celular ("3 cobros a rendir").
