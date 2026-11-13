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

  test('Debe llamar a onConfirm y NO llamar a onClose al hacer clic en Dar de baja', () => {
    const mockOnConfirm = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <ModalBajaActividad 
        actividad={actividadFalsa}
        dandoDeBaja={false}
        errorBaja={null}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));

    expect(mockOnConfirm).toHaveBeenCalledOnce();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('Debe mostrar la alerta con el mensaje de error cuando errorBaja está presente', () => {
    const mensajeError = 'La actividad tiene horarios activos: hay que darlos de baja antes que la actividad';

    render(
      <ModalBajaActividad 
        actividad={actividadFalsa}
        dandoDeBaja={false}
        errorBaja={mensajeError}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText(mensajeError)).toBeInTheDocument();
  });

  test('Debe deshabilitar el botón y mostrar "Dando de baja…" mientras dandoDeBaja sea true', () => {
    render(
      <ModalBajaActividad 
        actividad={actividadFalsa}
        dandoDeBaja={true}
        errorBaja={null}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const boton = screen.getByRole('button', { name: 'Dando de baja…' });
    expect(boton).toBeDisabled();
  });

  test('Debe llamar a onClose al hacer clic en Cancelar', () => {
    const mockOnClose = vi.fn();

    render(
      <ModalBajaActividad 
        actividad={actividadFalsa}
        dandoDeBaja={false}
        errorBaja={null}
        onClose={mockOnClose}
        onConfirm={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(mockOnClose).toHaveBeenCalledOnce();
  });
});