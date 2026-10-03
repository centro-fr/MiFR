# Git: ramas y commits

## Jerarquía de ramas

Cuatro niveles. Los merges suben siempre en este orden, nunca se saltea un escalón.

```text
main                          entregas estables
 └── dev                      integracion del equipo
      ├── <nombre>            rama personal, de vida larga, una por persona
      │    └── usuario        rama de trabajo, se borra al integrar
      └── <otro-nombre>
           └── inscripciones
```

El backend lo llevan dos personas, así que hay dos ramas personales vivas bajo `dev`, cada una con el nombre de quien la usa.

- La rama de trabajo sale **de la rama personal actualizada**, no de `dev`.
- La rama de trabajo se llama como el tema, en minúsculas, sin prefijo de autor ni de tipo: `usuario`, `sesion`, `cuotas`, `inscripciones`.
- Se integra `usuario → <nombre>`, después `<nombre> → dev`, y `dev → main` solo para entregas.
- La rama de trabajo se borra una vez integrada. La personal se mantiene viva.
- Nunca se commitea directo sobre `dev` ni sobre `main`.

```bash
git checkout <nombre>
git pull
git checkout -b usuario
# ... trabajo y commits ...
git checkout <nombre>
git merge usuario
git branch -d usuario
```

Antes de subir la rama personal a `dev`, traer primero lo que la otra persona ya integró, para resolver los conflictos en la rama propia y no en `dev`:

```bash
git checkout dev && git pull
git checkout <nombre> && git merge dev
# resolver conflictos aca, correr los tests
git checkout dev && git merge <nombre>
```

**Cuidado con las colisiones.** Como los nombres de trabajo no llevan prefijo de autor, si las dos personas toman el mismo tema a la vez las ramas chocan al pushear. Antes de crear una rama, avisar qué tema se toma. Si igual hay choque, desempatar con sufijo: `usuario-2`.

## Commits

Conventional Commits con la descripción en español, en infinitivo, sin punto final.

```text
feat(usuario): agregar validacion de rol
fix(sesion): corregir expiracion del JWT
docs(der): actualizar diagrama entidad-relacion
test(rol): cubrir caso de usuario sin roles
refactor(usuario): extraer mapeo de roles al repositorio
chore(deps): actualizar prisma a 6.x
```

Tipos permitidos:

| Tipo | Para qué |
| --- | --- |
| `feat` | Funcionalidad nueva |
| `fix` | Corrección de un error |
| `docs` | Documentación y diagramas |
| `test` | Tests, sin tocar código de producción |
| `refactor` | Reorganizar sin cambiar comportamiento |
| `chore` | Dependencias, configuración, tareas de mantenimiento |
| `style` | Formato que no altera el comportamiento |

El ámbito entre paréntesis es el módulo o área afectada: `usuario`, `sesion`, `rol`, `der`, `deps`.

Un commit es un cambio con sentido propio. No mezclar un refactor con una funcionalidad nueva: son dos commits. Si el mensaje necesita un "y", probablemente sean dos commits.

### El commit no menciona herramientas de IA

El mensaje describe el cambio y nada más. Queda prohibido:

- Nombrar a Claude, Claude Code o cualquier asistente en el título o el cuerpo.
- Agregar `Co-Authored-By: Claude` ni ningún otro coautor que no sea una persona del equipo.
- Agregar líneas de sesión, enlaces a conversaciones o etiquetas de generación automática (`Claude-Session:`, `Generated with...`, y similares).

La autoría del commit es de quien lo hace. El historial documenta qué cambió y por qué, no con qué herramienta se escribió. Esto vale también cuando el commit lo redacta un asistente: si aparece cualquiera de esas líneas, se borran antes de commitear.

Lo mismo aplica a las descripciones de pull requests y a los comentarios de código.

## Qué no se commitea

`.env`, `node_modules/`, `dist/`, credenciales de cualquier tipo. Cuando aparece una variable de entorno nueva, se agrega a `.env.example` con un valor de ejemplo, nunca con el valor real.
