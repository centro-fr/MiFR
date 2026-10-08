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

});