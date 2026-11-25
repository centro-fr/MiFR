import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { ModalFormActividad } from '../components/modal-form-actividad';

// Necesitamos simular el esquema de Zod si está en otro archivo, 
// o dejar que el test lo importe y lo use si está bien configurado.
// Asumiendo que el import de 'actividadFormSchema' funciona bien en el test:
// Usamos vi.stubGlobal de Vitest en lugar de asignarlo a 'global' directamente
vi.stubGlobal('ResizeObserver', class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
});
describe('US-03: ModalFormActividad', () => {

  test('Alta de clase personalizada sin definir cupo → no llama a onSave', async () => {
    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    // Renderizamos el componente con las props obligatorias
    render(
      <ModalFormActividad 
        actividad={null} 
        guardando={false} 
        errorGuardado={null} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
      />
    );

    // 1. Llenamos los campos obligatorios
    fireEvent.change(screen.getByLabelText(/Código/i), { target: { value: 'PILATES' } });
    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Pilates Reformer' } });

    // 2. Seleccionamos la modalidad "Personalizada"
    // El radio button tiene un <Label> que contiene el texto "Personalizada"
    fireEvent.click(screen.getByLabelText(/Personalizada/i));

    // 3. Dejamos el cupo vacío (simulado borrando el input si tuviera algo)
    fireEvent.change(screen.getByRole('spinbutton', { name: /Cupo máximo/i }), { target: { value: '' } });

    // 4. Intentamos guardar
    fireEvent.click(screen.getByRole('button', { name: /Guardar actividad/i }));

    // 5. Verificamos que la función onSave NUNCA se haya llamado porque Zod falló
    await waitFor(() => {
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    // Opcional: Podrías buscar el texto del error exacto que devuelve Zod en tu esquema, 
    // por ejemplo: expect(screen.getByText(/El cupo es obligatorio/i)).toBeInTheDocument();
  });

  test('Alta de actividad exitosa → llama a onSave con los datos limpios', async () => {
    const mockOnSave = vi.fn();
    
    render(
      <ModalFormActividad 
        actividad={null} 
        guardando={false} 
        errorGuardado={null} 
        onClose={vi.fn()} 
        onSave={mockOnSave} 
      />
    );

    fireEvent.change(screen.getByLabelText(/Código/i), { target: { value: 'ZUMBA' } });
    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Zumba Master' } });
    
    // Por defecto es GRUPAL, pero lo marcamos explícitamente
    fireEvent.click(screen.getByLabelText(/Grupal/i));
    fireEvent.change(screen.getByRole('spinbutton', { name: /Cupo máximo/i }), { target: { value: '20' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar actividad/i }));

    // Verificamos que pasó la validación y llamó a la función con el objeto correcto
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        codigo: 'ZUMBA',
        nombre: 'Zumba Master',
        modalidad: 'GRUPAL',
        cupoMaximo: 20
      }));
    });
  });

  test('Personalizada con cupo mayor a 40 → rechaza y no llama a onSave', async () => {
    const mockOnSave = vi.fn();

    render(
      <ModalFormActividad
        actividad={null}
        guardando={false}
        errorGuardado={null}
        onClose={vi.fn()}
        onSave={mockOnSave}
      />
    );

    fireEvent.change(screen.getByLabelText(/Código/i), { target: { value: 'PERSO' } });
    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Personalizado' } });
    fireEvent.click(screen.getByLabelText(/Personalizada/i));

    // Si intenta ingresar 45 (o más de 40)
    fireEvent.change(screen.getByRole('spinbutton', { name: /Cupo máximo/i }), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar actividad/i }));

    await waitFor(() => {
      expect(mockOnSave).not.toHaveBeenCalled();
      expect(screen.getByText(/El cupo máximo no puede superar los 40 alumnos/i)).toBeInTheDocument();
    });
  });

  test('Grupal con cupo mayor a 60 → rechaza y no llama a onSave', async () => {
    const mockOnSave = vi.fn();

    render(
      <ModalFormActividad
        actividad={null}
        guardando={false}
        errorGuardado={null}
        onClose={vi.fn()}
        onSave={mockOnSave}
      />
    );

    fireEvent.change(screen.getByLabelText(/Código/i), { target: { value: 'CROSS' } });
    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Crossfit Grupal' } });
    fireEvent.click(screen.getByLabelText(/Grupal/i));

    // Si intenta ingresar 65 (o más de 60)
    fireEvent.change(screen.getByRole('spinbutton', { name: /Cupo máximo/i }), { target: { value: '65' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar actividad/i }));

    await waitFor(() => {
      expect(mockOnSave).not.toHaveBeenCalled();
      expect(screen.getByText(/El cupo máximo no puede superar los 60 alumnos/i)).toBeInTheDocument();
    });
  });

  test('Input de cupo recorta entradas a máximo 2 dígitos evitando 99999', () => {
    render(
      <ModalFormActividad
        actividad={null}
        guardando={false}
        errorGuardado={null}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    const inputCupo = screen.getByRole('spinbutton', { name: /Cupo máximo/i }) as HTMLInputElement;

    // Intentamos escribir 99999
    fireEvent.change(inputCupo, { target: { value: '99999' } });
    expect(inputCupo.value).toBe('99');
  });

  test('Acepta cupos en los límites máximos permitidos (40 personalizada, 60 grupal)', async () => {
    const mockOnSave = vi.fn();

    const { rerender } = render(
      <ModalFormActividad
        key="perso"
        actividad={null}
        guardando={false}
        errorGuardado={null}
        onClose={vi.fn()}
        onSave={mockOnSave}
      />
    );

    // Personalizada con 40
    fireEvent.change(screen.getByLabelText(/Código/i), { target: { value: 'PERSO40' } });
    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Personal 40' } });
    fireEvent.click(screen.getByLabelText(/Personalizada/i));
    fireEvent.change(screen.getByRole('spinbutton', { name: /Cupo máximo/i }), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar actividad/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        codigo: 'PERSO40',
        modalidad: 'PERSONALIZADA',
        cupoMaximo: 40,
      }));
    });

    mockOnSave.mockClear();

    // Grupal con 60
    rerender(
      <ModalFormActividad
        key="grup"
        actividad={null}
        guardando={false}
        errorGuardado={null}
        onClose={vi.fn()}
        onSave={mockOnSave}
      />
    );

    fireEvent.change(screen.getByLabelText(/Código/i), { target: { value: 'GRUP60' } });
    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Grupal 60' } });
    fireEvent.click(screen.getByLabelText(/Grupal/i));
    fireEvent.change(screen.getByRole('spinbutton', { name: /Cupo máximo/i }), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar actividad/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        codigo: 'GRUP60',
        modalidad: 'GRUPAL',
        cupoMaximo: 60,
      }));
    });
  });

  const actividadExistente = {
    id: '1',
    codigo: 'FUNC',
    nombre: 'Acondicionamiento físico',
    descripcion: 'Entrenamiento general',
    modalidad: 'GRUPAL' as const,
    cupoMaximo: 20,
    activo: true,
    requiereMedidas: false,
  };

  test('Al editar una actividad, NO se muestran las opciones de selección de modalidad', () => {
    render(
      <ModalFormActividad
        actividad={actividadExistente}
        guardando={false}
        errorGuardado={null}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.queryByLabelText(/^Grupal$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Personalizada$/i)).not.toBeInTheDocument();
  });

  test('Al editar, permite modificar nombre, descripción, cupo y pide peso y altura', async () => {
    const mockOnSave = vi.fn();

    render(
      <ModalFormActividad
        actividad={actividadExistente}
        guardando={false}
        errorGuardado={null}
        onClose={vi.fn()}
        onSave={mockOnSave}
      />
    );

    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Funcional Avanzado' } });
    fireEvent.change(screen.getByLabelText(/Descripción/i), { target: { value: 'Nueva descripción' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /Cupo máximo/i }), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Pide peso y altura al inscribirse/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Solo para menores de 18 años/i }));

    fireEvent.click(screen.getByRole('button', { name: /Guardar actividad/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        nombre: 'Funcional Avanzado',
        descripcion: 'Nueva descripción',
        cupoMaximo: 25,
        requiereMedidas: true,
        soloMenores: true,
        modalidad: 'GRUPAL',
      }));
    });
  });

  test('Al editar, rechaza un cupo menor a la cantidad máxima de alumnos inscriptos en una de sus clases', async () => {
    const mockOnSave = vi.fn();

    render(
      <ModalFormActividad
        actividad={actividadExistente}
        maxInscriptosEnClases={12}
        guardando={false}
        errorGuardado={null}
        onClose={vi.fn()}
        onSave={mockOnSave}
      />
    );

    // Intentamos bajar el cupo a 10 cuando hay una clase con 12 inscriptos
    fireEvent.change(screen.getByRole('spinbutton', { name: /Cupo máximo/i }), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar actividad/i }));

    await waitFor(() => {
      expect(mockOnSave).not.toHaveBeenCalled();
      expect(screen.getByText(/El cupo no puede ser menor a 12, ya que hay una clase con esa cantidad de alumnos inscriptos/i)).toBeInTheDocument();
    });
  });

  test('Al editar, acepta un cupo igual o mayor a la cantidad máxima de inscriptos', async () => {
    const mockOnSave = vi.fn();

    render(
      <ModalFormActividad
        actividad={actividadExistente}
        maxInscriptosEnClases={12}
        guardando={false}
        errorGuardado={null}
        onClose={vi.fn()}
        onSave={mockOnSave}
      />
    );

    // Ingresamos cupo 12 (exactamente el número de inscriptos)
    fireEvent.change(screen.getByRole('spinbutton', { name: /Cupo máximo/i }), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar actividad/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        cupoMaximo: 12,
      }));
    });
  });

});