// Agrega la baja logica y la correccion de mediciones a back/prisma/schema.prisma (modelo registros_progreso
// y las dos relaciones de usuarios). Uso, desde la raiz del repo:  node actualizar-schema.mjs
// Si ya se aplico, o si no encuentra donde insertar, no toca nada.
import { readFileSync, writeFileSync } from "node:fs";

const ruta = process.argv[2] ?? "back/prisma/schema.prisma";
const crudo = readFileSync(ruta, "utf8");
const usaCrlf = crudo.includes("\r\n");
let texto = crudo.replace(/\r\n/g, "\n");

if (texto.includes("fecha_baja") && /model registros_progreso \{[^}]*fecha_baja/.test(texto)) {
  console.log("registros_progreso ya tiene la baja logica: no se cambio nada.");
  process.exit(0);
}

const MODELO = `// Rutinas y progreso (US-27). El registro de progreso es una sesión de medición del alumno con sus medidas. Se
// corrige con PATCH (queda quién y cuándo) y se da de baja de forma lógica: sigue en la base pero ya no se muestra.
model registros_progreso {
  id_registro         Int       @id(map: "PK_registros_progreso") @default(autoincrement())
  id_alumno           Int
  id_profesora        Int
  fecha               DateTime  @db.Date
  observaciones       String?   @db.VarChar(500)
  // la última corrección; NULL si nunca se corrigió
  fecha_modificacion  DateTime? @db.Timestamp(6)
  id_usuario_modifica Int?
  // baja lógica; NULL mientras el registro está vigente
  fecha_baja          DateTime? @db.Timestamp(6)
  id_usuario_baja     Int?

  alumno           alumnos              @relation(fields: [id_alumno], references: [id_alumno], onDelete: NoAction, onUpdate: NoAction, map: "FK_registros_progreso_alumnos")
  profesora        profesoras           @relation(fields: [id_profesora], references: [id_profesora], onDelete: NoAction, onUpdate: NoAction, map: "FK_registros_progreso_profesoras")
  usuario_modifica usuarios?            @relation("registro_progreso_modifica", fields: [id_usuario_modifica], references: [id_usuario], onDelete: NoAction, onUpdate: NoAction, map: "FK_registros_progreso_usuario_modifica")
  usuario_baja     usuarios?            @relation("registro_progreso_baja", fields: [id_usuario_baja], references: [id_usuario], onDelete: NoAction, onUpdate: NoAction, map: "FK_registros_progreso_usuario_baja")
  medidas          medidas_corporales[]

  @@index([id_alumno], map: "IXFK_registros_progreso_alumnos")
  @@index([id_profesora], map: "IXFK_registros_progreso_profesoras")
  @@index([id_usuario_modifica], map: "IXFK_registros_progreso_usuario_modifica")
  @@index([id_usuario_baja], map: "IXFK_registros_progreso_usuario_baja")
}`;

// 1. El modelo registros_progreso, con el comentario que lo encabeza.
const inicio = texto.indexOf("model registros_progreso {");
if (inicio < 0) throw new Error("No encontre el modelo registros_progreso");
const fin = texto.indexOf("\n}\n", inicio);
if (fin < 0) throw new Error("No encontre el final del modelo registros_progreso");
let desde = inicio;
const lineas = texto.slice(0, inicio).split("\n");
lineas.pop(); // lo que hay en la misma linea que "model", vacio
while (lineas.length && lineas[lineas.length - 1].startsWith("//")) {
  desde -= lineas.pop().length + 1;
}
texto = texto.slice(0, desde) + MODELO + "\n" + texto.slice(fin + 3);

// 2. Las relaciones inversas en usuarios.
const ancla = /^(\s+seguimientos_inactividad\s+seguimientos_inactividad\[\].*)$/m;
if (!ancla.test(texto)) throw new Error("No encontre la relacion seguimientos_inactividad en usuarios");
texto = texto.replace(
  ancla,
  "$1\n  progreso_corregido     registros_progreso[]       @relation(\"registro_progreso_modifica\")\n" +
    "  progreso_dado_de_baja  registros_progreso[]       @relation(\"registro_progreso_baja\")",
);

writeFileSync(ruta, usaCrlf ? texto.replace(/\n/g, "\r\n") : texto, "utf8");
console.log("Listo: schema.prisma actualizado.");
