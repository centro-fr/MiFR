// Quién hace el pedido, para las reglas que dependen de la persona y no solo del permiso: una
// profesora ve y edita solo a los alumnos a su cargo; la propietaria, a todos (US-09, US-10).
export interface Solicitante {
  idUsuario: number;
  esPropietaria: boolean;
}
