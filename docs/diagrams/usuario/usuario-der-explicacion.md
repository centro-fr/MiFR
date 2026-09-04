
## Casos de Uso (Usuario, Perfil, Alumno)

| Caso | USUARIO | PERFIL | ALUMNO.id_usuario_responsable |
| :--- | :--- | :--- | :--- |
| Alumno adulto con celular | El suyo propio | rol = ALUMNO | Apunta a sí mismo |
| Menor de edad | El del padre/madre/tutor | rol = ALUMNO (del tutor) | Apunta al tutor |
| Adulto mayor sin dispositivo | No existe | No existe | NULL |
| Profesora que también entrena | El suyo (uno solo) | rol = PROFESOR | Fila en ALUMNO apuntando a sí misma |

