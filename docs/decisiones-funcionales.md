# Decisiones funcionales cerradas

Estas decisiones refinan los requerimientos del Word v7 y el comportamiento del prototipo antes de continuar con desarrollo.

## 1. Estados de venta

Estados finales:

- `pendiente_cobro`
- `confirmada`
- `anulada`
- `corregida`

Decision: no se usara un estado separado `registrada`. En el sistema, una venta registrada por el colaborador queda como `pendiente_cobro` hasta que Caja confirme el pago conciliado.

## 2. Estados de inventario

Estados finales:

- `disponible`
- `reservado`
- `vendido`
- `con_falla`
- `bloqueado`

Decision: `trasladado` no sera estado de inventario. Los traslados se registran como movimientos con origen, destino, responsable y fecha, pero el estado operativo del item se mantiene independiente de la ubicacion.

## 3. Otros autorizados

Decision para el prototipo actual:

- Pueden recibir productos en entregas desde deposito o almacen con nombre exacto.
- No ingresan directamente al sistema.
- No venden directamente desde la UI.
- Si una venta fisica fue realizada por "otros", el administrador debe regularizarla bajo un usuario interno responsable.
- No generan comision automatica propia. La comision solo se calcula para usuarios con rol Colaborador.

## 4. Politica de adelantos

Decision:

- Un colaborador puede tener varios adelantos registrados.
- Todos los adelantos registrados se descuentan automaticamente de la liquidacion.
- El prototipo no maneja pagos parciales de adelantos; cada adelanto queda como registro completo.
- La liquidacion a pagar no puede quedar negativa: si los adelantos superan la comision, el neto a pagar queda en S/ 0.
- El excedente se muestra como saldo por descontar en una liquidacion posterior.

## 5. Politica de precios por talla o rango

Decision:

- La configuracion de precios se define a nivel de producto de catalogo, entendido operativamente como marca + modelo dentro del catalogo.
- Cada producto puede usar un solo modo de precio a la vez: precio base, talla exacta o rango de tallas.
- Talla exacta y rango de tallas no coexisten en el mismo producto.
- El precio se aplica automaticamente segun la talla del producto vendido.

## 6. Productos en tienda

Decision:

- `tienda` y `puesto` se tratan como la misma categoria operativa. Las nuevas ubicaciones de venta se registran como `tienda`.
- La asignacion a tienda y el retorno a deposito son operaciones de almacen/deposito.
- Un colaborador sin rol de almacen no mueve productos entre tienda y deposito.
- Un colaborador con doble rol Colaborador + Almacen puede hacerlo solo usando el permiso operativo de almacen.
- Para calzado, el flujo normal mueve el par completo.
- Las piezas individuales quedan para trazabilidad, falla o ajuste autorizado; no son venta normal.

## 7. Roles finales

Decision:

- Los roles visibles finales son Administrador general, Colaborador, Caja y Almacen.
- No existe un quinto rol separado para esas tareas.
- El control general del sistema queda en `admin`.
- La confirmacion de cobros y operaciones de caja queda en `cajero`.
- La compatibilidad con datos antiguos del prototipo solo sirve para abrir datos guardados previamente y convertirlos al rol operativo correcto.

## 8. RF-29 Calculo de utilidad y rentabilidad

Decision:

- El administrador general registra el costo del producto/par desde catalogo.
- La utilidad de cada linea se calcula como `precio final vendido - costo`.
- La utilidad total queda ligada a la venta confirmada.
- La utilidad solo se muestra en pantallas de administrador general y responsables autorizados.
- El precio por mayor se mantiene separado del descuento y no se presenta como rebaja.
