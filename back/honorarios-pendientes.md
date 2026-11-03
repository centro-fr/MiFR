  
## Decision tomada: devoluciones y reversos  
  
- Si la liquidacion esta en BORRADOR se resta el importe de la devolucion/reverso al calcular el cobrado neto del mes.  
- Si la liquidacion esta CERRADA o PAGADA no se modifica. Se crea un registro nuevo de devolucion/reverso aparte vinculado al pago original y se traslada como ajuste a la liquidacion del mes siguiente con debito a la profesora.  
- Trazabilidad obligatoria: fecha, importe, id_pago, id_inscripcion, id_profesora, motivo y usuario que lo registro.  
- Cobrado neto: pagos CONFIRMADOS - devoluciones/reversos vigentes segun estado de la liquidacion. 
