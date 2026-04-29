# Notas de prototipo

Estas piezas existen para facilitar la maqueta y las pruebas internas. No deben tratarse como requerimientos funcionales finales.

## Elementos demo

- `RoleSwitcher`: componente de ayuda para cambiar de usuario/rol durante pruebas. No forma parte del flujo de negocio final.
- `resetData`: accion tecnica para reiniciar datos locales del prototipo. No debe exponerse como funcionalidad final.
- Navegacion tipo app, bottom nav y dashboards: decisiones de UX del prototipo, no requerimientos funcionales.
- Persistencia en `localStorage`: mecanismo temporal del prototipo frontend. El sistema final debe reemplazarlo por backend, autenticacion y persistencia real.

## Configuracion que si corresponde al negocio

La pantalla `Configuracion` queda limitada a reglas operativas:

- descuento maximo para colaborador
- recargo de tarjeta
- comision por par vendido
- umbral de stock bajo
- politica de pago/liquidacion

## Decisiones funcionales

Las decisiones cerradas antes de continuar estan en `docs/decisiones-funcionales.md`.
