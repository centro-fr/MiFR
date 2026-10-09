import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { ModalBajaActividad } from '../components/modal-baja-actividad';

describe('US-03: ModalBajaActividad', () => {
  const actividadFalsa = {
    id: '123',
    codigo: 'FUNCIONAL',
    nombre: 'Funcional Grupal',
    descripcion: '',
    modalidad: 'GRUPAL' as const,
    cupoMaximo: null,
    activa: true
  };

  test('Debe llamar a onConfirm al hacer clic en Confirmar baja', () => {
    const mockOnConfirm = vi.fn();

    render(
      <ModalBajaActividad 
        actividad={actividadFalsa}
        dandoDeBaja={false}
        errorBaja={null}
        onClose={vi.fn()}
        onConfirm={mockOnConfirm}
      />
    );

    // Hacemos clic en el botón de confirmar
    fireEvent.click(screen.getByRole('button', { name: /Confirmar baja/i }));

    // Verificamos que se ejecutó la función
    expect(mockOnConfirm).toHaveBeenCalledOnce();
  });
});