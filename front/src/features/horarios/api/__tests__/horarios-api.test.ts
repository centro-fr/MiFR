import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/api/client";
import {
  listarProfesoras,
  listarHorarios,
  listarHorariosDeProfesora,
  crearHorario,
  actualizarHorario,
  darDeBajaHorario,
  cancelarBajaProgramadaHorario,
} from "../horarios-api";
import { crearHorario as crearHorarioMock, crearProfesora } from "../../__tests__/horarios-de-prueba";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("API de Horarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listarProfesoras", () => {
    it("pide la lista de profesoras, valida la respuesta y mapea los datos al dominio", async () => {
      const profesoraFalsa = crearProfesora();
      vi.mocked(apiClient.get).mockResolvedValue({ data: [profesoraFalsa] });

      const resultado = await listarProfesoras();

      expect(apiClient.get).toHaveBeenCalledWith("/profesoras");
      expect(resultado).toEqual([
        {
          id: "1",
          idUsuario: 10,
          nombre: "Lucía",
          apellido: "Gómez",
        },
      ]);
    });
  });

  describe("listarHorarios", () => {
    it("pide la lista de horarios y valida el esquema de respuesta", async () => {
      const mockData = [crearHorarioMock()];
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

      const resultado = await listarHorarios();
      expect(resultado).toEqual(mockData);
      expect(apiClient.get).toHaveBeenCalledWith("/horarios");
    });

    it("rechaza si el backend devuelve un formato inesperado", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { error: "no es un array" } });
      await expect(listarHorarios()).rejects.toThrow();
    });
  });

  describe("listarHorariosDeProfesora", () => {
    it("pasa el id_profesora por query params y valida la respuesta", async () => {
      const mockData = [crearHorarioMock()];
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

      const resultado = await listarHorariosDeProfesora(5);
      expect(resultado).toEqual(mockData);
      expect(apiClient.get).toHaveBeenCalledWith("/horarios", { params: { id_profesora: "5" } });
    });
  });

  describe("crearHorario", () => {
    it("hace el POST con el payload correspondiente y devuelve la respuesta parseada", async () => {
      const respuestaMock = crearHorarioMock();
      vi.mocked(apiClient.post).mockResolvedValue({ data: respuestaMock });
      
      const payload = {
        id_actividad: 1,
        id_profesora: 1,
        dia_semana: 1,
        hora_inicio: "10:00",
        hora_fin: "11:00",
        cupo_maximo: null,
      };

      const resultado = await crearHorario(payload);
      expect(resultado).toEqual(respuestaMock);
      expect(apiClient.post).toHaveBeenCalledWith("/horarios", payload);
    });
  });

  describe("actualizarHorario", () => {
    it("hace el PATCH con los cambios y devuelve el nuevo horario", async () => {
      const respuestaMock = crearHorarioMock({ hora_inicio: "11:00", hora_fin: "12:00" });
      vi.mocked(apiClient.patch).mockResolvedValue({ data: respuestaMock });

      const cambios = { hora_inicio: "11:00", hora_fin: "12:00" };
      const resultado = await actualizarHorario("1", cambios);
      
      expect(resultado).toEqual(respuestaMock);
      expect(apiClient.patch).toHaveBeenCalledWith("/horarios/1", cambios);
    });
  });

  describe("darDeBajaHorario", () => {
    it("hace el DELETE y devuelve la advertencia; sin alumnos la baja es inmediata", async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({
        data: { horario: crearHorarioMock(), advertencia: "El horario no tenía alumnos inscriptos." },
      });

      await expect(darDeBajaHorario("1")).resolves.toEqual({
        advertencia: "El horario no tenía alumnos inscriptos.",
        programada: false,
      });
      expect(apiClient.delete).toHaveBeenCalledWith("/horarios/1");
    });

    it("con alumnos inscriptos informa que la baja quedó programada (US-04)", async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({
        data: {
          horario: { ...crearHorarioMock(), fecha_baja_programada: "2026-11-13T00:00:00.000Z" },
          advertencia: "Tiene 3 alumnos inscriptos: no admite alumnos nuevos.",
        },
      });

      await expect(darDeBajaHorario("1")).resolves.toMatchObject({ programada: true });
    });
  });

  describe("cancelarBajaProgramadaHorario", () => {
    it("hace el DELETE de la baja programada", async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: crearHorarioMock() });

      await cancelarBajaProgramadaHorario("4");

      expect(apiClient.delete).toHaveBeenCalledWith("/horarios/4/baja-programada");
    });
  });
});
