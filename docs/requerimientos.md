# Requerimientos del Sistema de Venta y Almacen de Zapatos

Fuente: `c:\Users\gianf\Downloads\Sistema_Ventas_Almacen_Actualizado_v8.docx`
Documento original fechado: 23/04/2026
Guardado en el proyecto: 28/04/2026

## Contenido extraido

DOCUMENTO DE IDENTIFICACIÓN Y ESPECIFICACIÓN DE REQUERIMIENTOS

Sistema de Venta y Almacén de Zapatos

Versión consolidada para revisión, observaciones y validación del cliente

Resumen del documento

Resumen del documento

Propósito

Presentar al cliente una propuesta funcional consolidada del sistema para revisión, comentarios y validación del alcance.

Enfoque

Documento orientado a uso interno del negocio, con reglas operativas refinadas para ventas, inventario, pagos, cambios, asistencia, autorizaciones y trazabilidad.

Preparado por

Equipo de análisis funcional

Fecha

23/04/2026

Propósito de revisión con el cliente

Este documento incorpora ajustes solicitados por el cliente sobre reglas de venta, descuentos, QR, cambios, comisiones, alertas operativas, asistencia y control administrativo interno.

Los requerimientos, prioridades y estimaciones pueden afinarse luego de la reunión final de validación.

El lenguaje se mantiene claro y orientado al negocio para facilitar la toma de decisiones.

1. Presentación del documento

El presente documento reúne la identificación y especificación actualizada de los requerimientos del Sistema de Venta y Almacén de Zapatos. Su finalidad es presentar al cliente una visión clara de cómo se espera que funcione la solución interna, qué usuarios intervendrán y cuáles serán los procesos más importantes que deberán ser cubiertos por el sistema.

El documento ha sido redactado con enfoque de negocio, buscando que pueda ser revisado tanto por personal operativo como por responsables administrativos, sin depender de conocimiento técnico avanzado. A partir de esta base, el cliente podrá indicar qué desea mantener, cambiar, ampliar o simplificar.

1.1 Objetivo general

Definir de forma ordenada los requerimientos funcionales y no funcionales del sistema.

Presentar una base de trabajo que permita validar el alcance actualizado con el cliente.

Reducir ambigüedades antes de la etapa de desarrollo o diseño detallado.

1.2 Alcance funcional considerado

Control del catálogo de zapatos y accesorios relacionados, diferenciando calzado por producto, par y pieza, y accesorios por unidad, con precios base, precios por rango de tallas o por talla exacta según configuración administrativa.

Gestión de inventario separando ubicación física y estado operativo, incluyendo tienda, puesto, depósito, almacén y otras zonas definidas por la empresa.

Asignación de ubicación operativa a usuarios internos, posibilidad controlada de rol secundario vendedor + almacén y registro de asistencia de entrada con foto.

Manejo de productos ubicados en tienda para apoyo de venta, diferenciando claramente qué está en depósito o tienda y qué está en estado disponible o con falla, además de entregas escaneadas desde depósito a vendedores u otros responsables.

Registro de ventas con precio base, descuentos controlados, precio por mayor, ventas registradas, ventas pendientes de cobro, ventas confirmadas y comisiones visibles según rol.

Gestión de cambios, correcciones administrativas, historial de autorizaciones, alertas de stock mínimo, adelantos al personal y reportes de trazabilidad.

Registro básico del número de cliente asociado a la venta para promociones internas futuras.

2. Identificación de los requerimientos

2.1 Usuarios que intervienen en el sistema

Usuario / actor

Participación dentro del sistema o del proceso

Administrador general

Usuario principal del sistema. Configura catálogos, usuarios, ubicaciones, asigna la ubicación operativa principal de cada usuario, define precios base, límites de descuento, precio por mayor, reglas de recargo, comisiones, asistencia, dashboard, alertas de stock e historial de autorizaciones.

Vendedor

Usuario interno de venta. Opera desde una tienda, puesto o ubicación asignada, marca su asistencia de entrada con foto, consulta stock, utiliza productos ubicados en tienda para apoyar la venta, registra ventas preliminares permitidas, identifica productos por QR y visualiza únicamente su propia comisión e historial de adelantos. Cuando el administrador lo autorice, puede operar también con rol secundario de almacén, dejando trazabilidad del rol usado en cada acción.

Encargado de almacén / depósito

Usuario interno de control operativo. Opera desde el depósito o almacén asignado, marca su asistencia de entrada con foto, recibe pares y accesorios, controla ingreso de inventario, marca estados como con falla, traslada productos entre ubicaciones y registra entregas escaneadas a vendedores u otros responsables. Cuando el administrador lo autorice, puede compartir también funciones de vendedor sin modificar catálogos ni precios.

Responsable administrativo / caja

Usuario interno de control económico. Revisa ventas registradas o pendientes de cobro, consolida pagos, confirma ventas cuando el pago queda conciliado, valida diferencias económicas, consulta historial de autorizaciones, apoya liquidaciones, control de adelantos y seguimiento de reportes operativos y comerciales.

Otros autorizados (registro nominal)

Actor interno eventual que puede recibir o vender productos fuera del rol vendedor formal. Debe quedar identificado por su nombre exacto y su operación debe ser regularizada o confirmada por el administrador cuando corresponda.

Cliente final (actor externo)

No usa el sistema directamente, pero participa en la venta, cambio de producto y definición de talla. El sistema interno solo puede registrar datos básicos de contacto asociados a la operación realizada.

2.2 Historias de usuario

Código

Historia de usuario

HU-01

Como administrador general, quiero ingresar al sistema con acceso seguro para gestionar la información del negocio sin exponer datos sensibles.

HU-02

Como administrador general, quiero registrar zapatos y accesorios, definir precios base y configurar límites de descuento para controlar la venta.

HU-03

Como encargado de almacén, quiero registrar el ingreso de pares y accesorios, generar QR y controlar el estado del stock desde su llegada.

HU-04

Como encargado de almacén, quiero escanear qué producto entrego y a quién se lo entrego para mantener trazabilidad cuando sale de depósito.

HU-05

Como vendedor, quiero escanear un producto ubicado en tienda o un QR para identificar rápido el producto correcto y vender el par completo o el accesorio correcto.

HU-06

Como vendedor, quiero registrar la venta con precio final y dejarla pendiente de cobro cuando el pago será confirmado por caja, para no perder la operación realizada.

HU-07

Como administrador general, quiero permitir precio por mayor o descuentos superiores al límite solo cuando yo lo autorice.

HU-08

Como administrador general, quiero corregir o anular ventas mal registradas para diferenciar esos casos de los cambios solicitados por el cliente.

HU-09

Como responsable administrativo, quiero registrar cambios de producto con reglas claras de diferencia económica para no perder trazabilidad.

HU-10

Como administrador general, quiero registrar el número del cliente y relacionarlo con lo que compró para futuras promociones internas.

HU-11

Como vendedor, quiero ver solo mi comisión acumulada, mientras el administrador revisa la comisión general y la de todos.

HU-12

Como administrador general, quiero revisar un dashboard de ventas confirmadas, alertas operativas y ganancia para tomar decisiones con información consolidada.

HU-13

Como administrador general, quiero asignar a cada usuario su tienda, puesto, depósito o almacén principal para controlar dónde opera.

HU-14

Como usuario interno, quiero registrar mi asistencia de entrada con foto para que el sistema guarde evidencia, fecha y hora del sistema.

HU-15

Como administrador general, quiero consultar la asistencia del personal por fecha y ubicación para supervisar la operación.

HU-16

Como administrador general, quiero revisar el historial de autorizaciones administrativas para auditar excepciones y regularizaciones.

HU-17

Como administrador general, quiero definir stock mínimo por producto y ubicación para recibir alertas antes de quedarme sin mercadería.

HU-18

Como cajero o responsable administrativo, quiero confirmar el cobro de una venta registrada por el vendedor para cambiar su estado a venta confirmada solo cuando el pago esté conciliado.

HU-19

Como administrador general, quiero definir precios por rango de tallas o por talla exacta según marca y modelo para aplicar automáticamente el precio correcto al vender.

HU-20

Como administrador general, quiero registrar adelantos al personal y consultar su historial para controlar la liquidación final según la fecha o política de pago definida.

HU-21

Como administrador general, quiero asignar a un usuario un rol secundario de vendedor y almacén cuando la operación lo requiera, dejando trazabilidad del rol con que realiza cada acción.

HU-22

Como encargado de almacén, quiero ingresar stock al depósito usando productos ya definidos en catálogo, sin poder editar precios ni maestros comerciales.

3. Requerimientos funcionales

La siguiente tabla resume los requerimientos funcionales identificados para el sistema. Se presenta el número correlativo, el nombre del requerimiento y el usuario principal asociado.

Número

Requerimiento funcional

Usuario

RF-01

Inicio de sesión y control de acceso

Usuarios internos

RF-02

Gestión de usuarios y roles

Administrador general

RF-03

Gestión de ubicaciones

Administrador general

RF-04

Registro del catálogo de productos y accesorios

Administrador general

RF-05

Identificación de producto, par y pieza

Administrador general / Encargado de almacén

RF-06

Generación y lectura de QR o código escaneable

Administrador general / Vendedor / Encargado de almacén

RF-07

Registro de ingreso de inventario

Encargado de almacén / depósito

RF-08

Consulta de inventario por producto, par, pieza, accesorio y ubicación

Administrador general / Vendedor / Encargado de almacén

RF-09

Gestión de estados y disponibilidad

Administrador general / Encargado de almacén

RF-10

Gestión de productos en tienda

Vendedor / Encargado de almacén

RF-11

Traslado de pares, piezas y accesorios

Encargado de almacén / depósito

RF-12

Ajustes de inventario

Administrador general / Encargado de almacén

RF-13

Venta normal por par y venta de accesorios

Vendedor / Administrador general

RF-14

Entrega y asignación desde depósito a vendedor u otros

Encargado de almacén / depósito / Administrador general

RF-15

Gestión de precios, descuentos y precio final

Administrador general / Vendedor

RF-16

Registro de método de pago, recargos y pago mixto

Vendedor / Responsable administrativo

RF-17

Gestión de cambios de producto

Vendedor / Responsable administrativo

RF-18

Cálculo de diferencias económicas en cambios

Vendedor / Responsable administrativo

RF-19

Comisiones por vendedor y visibilidad por rol

Administrador general / Vendedor

RF-20

Liquidaciones, dashboard, reportes y trazabilidad

Administrador general / Responsable administrativo

RF-21

Registro de cliente y promociones

Vendedor / Administrador general

RF-22

Corrección y anulación administrativa de ventas

Administrador general

RF-23

Historial de autorizaciones administrativas

Administrador general / Responsable administrativo

RF-24

Alertas de stock mínimo

Administrador general / Encargado de almacén

RF-25

Registro de asistencia de entrada con foto

Usuarios internos / Administrador general

RF-26

Confirmación de venta y cierre de cobro

Vendedor / Cajero / Responsable administrativo

RF-27

Gestión de precios por talla o rango de tallas

Administrador general

RF-28

Registro y control de adelantos al personal

Administrador general / Vendedor

3.1 Detalle de los requerimientos funcionales

RF-01 - Inicio de sesión y control de acceso

Nombre de requerimiento

Inicio de sesión y control de acceso

Descripción

El sistema debe permitir el ingreso seguro de usuarios mediante credenciales y aplicar restricciones de acceso según el rol asignado.

Indicador

RF-01

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Usuarios internos

Datos de entrada

• Nombre de usuario• Contraseña

Datos de salida

• Aprobación de acceso al sistema• Denegación de acceso con mensaje claro• Pantalla según rol del usuario

RF-02 - Gestión de usuarios y roles

Nombre de requerimiento

Gestión de usuarios y roles

Descripción

El sistema debe permitir crear, editar, activar y desactivar usuarios, así como asignarles rol principal, permisos, ubicación operativa principal y, cuando el negocio lo requiera, un rol secundario compatible. Inicialmente, la combinación permitida de doble rol será vendedor + almacén.

Indicador

RF-02

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Administrador general

Datos de entrada

• Datos del usuario• Rol principal• Rol secundario opcional• Estado del usuario• Ubicación operativa principal

Datos de salida

• Usuario registrado o actualizado• Confirmación de activación o desactivación• Acceso restringido según rol• Ubicación operativa asignada• Trazabilidad del rol usado en cada acción

RF-03 - Gestión de ubicaciones

Nombre de requerimiento

Gestión de ubicaciones

Descripción

El sistema debe permitir registrar y administrar tiendas, puestos, pisos, depósitos, almacenes u otras ubicaciones operativas, identificando por separado dónde se encuentra físicamente el stock y en qué zona opera cada usuario o elemento.

Indicador

RF-03

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Administrador general

Datos de entrada

• Nombre de ubicación• Código de ubicación• Tipo operativo• Clasificación de la zona• Estado

Datos de salida

• Ubicación registrada• Ubicación actualizada• Listado de ubicaciones disponibles• Clasificación visible para consulta

RF-04 - Registro del catálogo de productos y accesorios

Nombre de requerimiento

Registro del catálogo de productos y accesorios

Descripción

El sistema debe permitir registrar cada producto del catálogo, diferenciando calzado y accesorios relacionados, considerando marca, modelo, color, talla o presentación, categoría, precio base y configuración de precio por rango de tallas o por talla exacta cuando corresponda.

Indicador

RF-04

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Administrador general

Datos de entrada

• Tipo de artículo (calzado o accesorio)• Marca• Modelo o descripción• Color, talla o presentación• Categoría• Precio base• Modo de precio (rango o talla exacta)• Configuración de precios por talla o rango

Datos de salida

• Producto registrado• Código de producto generado o asignado• Configuración de precios guardada• Producto disponible para inventario y venta

RF-05 - Identificación de producto, par y pieza

Nombre de requerimiento

Identificación de producto, par y pieza

Descripción

El sistema debe manejar una estructura de identificación compuesta por producto, par y pieza, permitiendo distinguir cada zapato físico como izquierdo o derecho sin perder la unidad comercial del par. Las piezas existirán para control interno, operación en tienda o trazabilidad, no para venta individual.

Indicador

RF-05

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Administrador general / Encargado de almacén

Datos de entrada

• Producto registrado• Ingreso de nuevo par

Datos de salida

• Código de producto• Código único de par• Código único de pieza izquierda y derecha relacionadas al mismo par

RF-06 - Generación y lectura de QR o código escaneable

Nombre de requerimiento

Generación y lectura de QR o código escaneable

Descripción

El sistema debe permitir generar y leer un QR o código escaneable para identificar rápidamente productos, pares, piezas o accesorios. Para calzado, la codificación debe distinguir el par y sus piezas, por ejemplo A00001-D para derecha y A00001-I para izquierda.

Indicador

RF-06

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Administrador general / Vendedor / Encargado de almacén

Datos de entrada

• Registro de producto, par, pieza o accesorio• Escaneo del código

Datos de salida

• QR o código generado• Identificación automática del elemento• Consulta inmediata de información asociada

RF-07 - Registro de ingreso de inventario

Nombre de requerimiento

Registro de ingreso de inventario

Descripción

El sistema debe permitir registrar el ingreso de pares al inventario y generar automáticamente las piezas izquierda y derecha asociadas, además de registrar accesorios por unidad. Este proceso se realizará usando productos previamente creados en catálogo y no permitirá al usuario de almacén editar maestros comerciales ni precios ya definidos.

Indicador

RF-07

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Encargado de almacén / depósito

Datos de entrada

• Producto previamente registrado• Cantidad de pares o unidades• Ubicación inicial• Responsable de almacén o depósito

Datos de salida

• Ingreso registrado• Pares o unidades creadas• Piezas izquierda y derecha asociadas cuando corresponda• Stock incorporado al depósito o inventario sin alterar el catálogo comercial

RF-08 - Consulta de inventario por producto, par, pieza, accesorio y ubicación

Nombre de requerimiento

Consulta de inventario por producto, par, pieza, accesorio y ubicación

Descripción

El sistema debe mostrar el inventario disponible de forma clara, permitiendo consultar por producto, por par, por pieza, por accesorio y por ubicación física, diferenciando además el estado actual del elemento consultado.

Indicador

RF-08

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Administrador general / Vendedor / Encargado de almacén

Datos de entrada

• Código o filtro de búsqueda• Ubicación• Producto, par, pieza o accesorio

Datos de salida

• Stock disponible• Ubicación actual• Estado actual del elemento consultado• Referencia de si está en depósito o tienda

RF-09 - Gestión de estados y disponibilidad

Nombre de requerimiento

Gestión de estados y disponibilidad

Descripción

El sistema debe controlar el estado comercial y físico de cada par, pieza y accesorio, validando si puede venderse, moverse, cambiarse o bloquearse cuando corresponda. El estado debe administrarse de forma independiente de la ubicación física para distinguir, por ejemplo, un elemento disponible en depósito de otro disponible en tienda. Debe contemplar estados como disponible, reservado, vendido, con falla y bloqueado.

Indicador

RF-09

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Administrador general / Encargado de almacén

Datos de entrada

• Par, pieza o accesorio seleccionado• Nuevo estado• Motivo si corresponde

Datos de salida

• Estado actualizado• Disponibilidad validada• Historial del cambio• Relación clara entre estado y ubicación

RF-10 - Gestión de productos en tienda

Nombre de requerimiento

Gestión de productos en tienda

Descripción

El sistema debe permitir asignar elementos autorizados a la ubicación tienda para apoyar la venta, sin perder su vínculo con el producto, par o pieza original. También debe permitir retornarlos al depósito u otra ubicación operativa autorizada y conservar la trazabilidad del cambio.

Indicador

RF-10

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Vendedor / Encargado de almacén

Datos de entrada

• Código del elemento• Ubicación en tienda• Asignación a tienda• Acción de retorno a depósito o cambio de ubicación autorizado

Datos de salida

• Elemento asignado a tienda• Ubicación en tienda registrada• Retorno o reasignación de ubicación registrada• Consulta del producto desde tienda

RF-11 - Traslado de pares, piezas y accesorios

Nombre de requerimiento

Traslado de pares, piezas y accesorios

Descripción

El sistema debe permitir trasladar pares completos, piezas o accesorios entre ubicaciones, dejando trazabilidad de origen, destino y responsable.

Indicador

RF-11

Prioridad

Media

Tipo de requerimiento

Funcional

Usuario

Encargado de almacén / depósito

Datos de entrada

• Par, pieza o accesorio• Ubicación origen• Ubicación destino• Motivo del traslado

Datos de salida

• Traslado registrado• Ubicación actualizada• Confirmación de recepción

RF-12 - Ajustes de inventario

Nombre de requerimiento

Ajustes de inventario

Descripción

El sistema debe permitir corregir diferencias físicas encontradas en el inventario, siempre registrando motivo, fecha y responsable.

Indicador

RF-12

Prioridad

Media

Tipo de requerimiento

Funcional

Usuario

Administrador general / Encargado de almacén

Datos de entrada

• Par, pieza, accesorio o producto afectado• Tipo de ajuste• Motivo• Responsable

Datos de salida

• Ajuste registrado• Inventario corregido• Historial de la regularización

RF-13 - Venta normal por par y venta de accesorios

Nombre de requerimiento

Venta normal por par y venta de accesorios

Descripción

El sistema debe registrar la venta normal del calzado únicamente por par completo como unidad comercial principal del negocio. Los accesorios relacionados podrán venderse por unidad. Si la venta la realizó una persona bajo la opción otros, el administrador deberá regularizar la operación indicando el nombre exacto de quien vendió. Cuando el cobro se confirme posteriormente en caja, la venta deberá quedar inicialmente registrada o pendiente de cobro.

Indicador

RF-13

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Vendedor / Administrador general

Datos de entrada

• Producto, par o accesorio identificado• Par completo o unidad seleccionada• Vendedor o tipo de responsable• Ubicación de atención• Datos del cliente si se registran

Datos de salida

• Venta preliminar registrada• Estado de venta registrada o pendiente de cobro• Reserva operativa del par o accesorio hasta confirmación• Trazabilidad del responsable que inició la operación

RF-14 - Entrega y asignación desde depósito a vendedor u otros

Nombre de requerimiento

Entrega y asignación desde depósito a vendedor u otros

Descripción

El sistema debe permitir que el encargado de depósito escanee qué par, pieza o accesorio entrega, registre quién lo entrega y quién lo recibe. Debe existir la opción otros para consignar el nombre exacto cuando el receptor no pertenezca al rol vendedor formal.

Indicador

RF-14

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Encargado de almacén / depósito / Administrador general

Datos de entrada

• Elemento escaneado• Usuario que entrega• Usuario que recibe o tipo otros con nombre exacto• Ubicación o destino• Motivo de la entrega

Datos de salida

• Entrega registrada• Responsable actual del elemento• Historial de entrega y recepción

RF-15 - Gestión de precios, descuentos y precio final

Nombre de requerimiento

Gestión de precios, descuentos y precio final

Descripción

El sistema debe manejar un precio base por producto definido por el administrador. El administrador debe poder configurar el descuento máximo en soles que el vendedor puede aplicar. El vendedor podrá vender al precio base, con descuento dentro del límite configurado o por encima del precio base. El precio por mayor, el precio especial más bajo y todo descuento que exceda el límite configurado deberán quedar reservados al administrador.

Indicador

RF-15

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Administrador general / Vendedor

Datos de entrada

• Precio base• Descuento solicitado en soles• Límite de descuento configurado• Precio por mayor o especial cuando aplique• Motivo o autorización si corresponde

Datos de salida

• Precio final calculado• Validación del límite permitido• Autorización administrativa cuando aplique• Registro de diferencia positiva o negativa frente al precio base

RF-16 - Registro de método de pago, recargos y pago mixto

Nombre de requerimiento

Registro de método de pago, recargos y pago mixto

Descripción

El sistema debe obligar a registrar cómo pagó el cliente, permitiendo uno o varios medios de pago en la misma operación. Cuando el pago sea con tarjeta, el sistema debe permitir aplicar o no un recargo según la regla configurada por el negocio. En pagos mixtos, el recargo deberá calcularse solo sobre la parte pagada con tarjeta. Si el monto recibido es menor que el total, el sistema debe indicar cuánto falta y mantener la venta sin confirmar. Si la venta fue registrada por un vendedor y el cobro lo confirma caja, el sistema debe permitir esa conciliación posterior.

Indicador

RF-16

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Vendedor / Cajero / Responsable administrativo

Datos de entrada

• Método de pago• Montos por medio de pago• Indicador de recargo por tarjeta• Total de venta• Monto recibido

Datos de salida

• Pago registrado• Conciliación del total• Cálculo de recargo, faltante o excedente• Estado de venta confirmada o pendiente

RF-17 - Gestión de cambios de producto

Nombre de requerimiento

Gestión de cambios de producto

Descripción

El sistema debe permitir buscar la venta original, registrar el producto que regresa, entregar el nuevo producto y documentar el motivo del cambio. Este flujo debe diferenciarse claramente de una anulación administrativa por error de registro.

Indicador

RF-17

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Vendedor / Responsable administrativo

Datos de entrada

• Referencia de venta original• Producto devuelto• Nuevo producto• Motivo del cambio

Datos de salida

• Cambio registrado• Reingreso del producto devuelto• Salida del nuevo producto

RF-18 - Cálculo de diferencias económicas en cambios

Nombre de requerimiento

Cálculo de diferencias económicas en cambios

Descripción

El sistema debe calcular automáticamente si el cliente debe aumentar dinero al realizar un cambio. Si el nuevo producto tiene un valor igual o menor al producto original, el sistema no debe generar devolución ni saldo a favor.

Indicador

RF-18

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Vendedor / Responsable administrativo

Datos de entrada

• Valor del producto original• Valor del nuevo producto• Método de pago de la diferencia cuando aplique

Datos de salida

• Diferencia calculada cuando existe aumento• Cobro adicional registrado o confirmación de no diferencia• Historial económico del cambio

RF-19 - Comisiones por vendedor y visibilidad por rol

Nombre de requerimiento

Comisiones por vendedor y visibilidad por rol

Descripción

El sistema debe permitir definir y aplicar la comisión de cada vendedor sobre las ventas válidas del período. La visualización debe variar según el rol: el administrador podrá revisar la comisión general y la individual de todos los vendedores, mientras que cada vendedor solo podrá visualizar su propia comisión y el historial de adelantos que le corresponda.

Indicador

RF-19

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Administrador general / Vendedor

Datos de entrada

• Configuración de comisión• Ventas válidas por vendedor• Adelantos registrados• Rol del usuario que consulta

Datos de salida

• Comisión acumulada• Historial de adelantos visible según rol• Base de cálculo por período• Vista general o individual según permisos

RF-20 - Liquidaciones, dashboard, reportes y trazabilidad

Nombre de requerimiento

Liquidaciones, dashboard, reportes y trazabilidad

Descripción

El sistema debe generar liquidaciones de vendedores y reportes operativos, comerciales y de trazabilidad, además de un dashboard para el administrador con ventas confirmadas, descuentos, recargos, comisiones, movimientos y métricas de ganancia o utilidad estimada. El administrador también debe poder controlar la fecha o política de pago de cada trabajador y descontar adelantos cuando corresponda.

Indicador

RF-20

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Administrador general / Responsable administrativo

Datos de entrada

• Rango de fechas• Ventas confirmadas• Descuentos• Recargos• Comisiones• Adelantos registrados• Política o fecha de pago• Movimientos de inventario

Datos de salida

• Liquidación por vendedor• Dashboard administrativo• Reportes de ventas confirmadas, stock, descuentos y trazabilidad• Panel de alertas operativas• Liquidación neta según adelantos y fecha de pago

RF-21 - Registro de cliente y promociones

Nombre de requerimiento

Registro de cliente y promociones

Descripción

El sistema debe permitir registrar el número del cliente y asociarlo a la venta realizada para segmentar futuras promociones internas según los productos comprados, sin exponer funcionalidades online al cliente final.

Indicador

RF-21

Prioridad

Media

Tipo de requerimiento

Funcional

Usuario

Vendedor / Administrador general

Datos de entrada

• Número de cliente• Nombre u observación opcional• Producto comprado• Venta registrada

Datos de salida

• Cliente vinculado a la venta• Historial básico de compras• Base segmentable para promociones

RF-22 - Corrección y anulación administrativa de ventas

Nombre de requerimiento

Corrección y anulación administrativa de ventas

Descripción

El sistema debe permitir corregir o anular ventas mal registradas o compras cargadas por error. Este proceso solo podrá ser ejecutado por el administrador y debe dejar trazabilidad completa, diferenciándose del flujo de cambio de producto solicitado por el cliente.

Indicador

RF-22

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Administrador general

Datos de entrada

• Venta original• Tipo de corrección o anulación• Motivo• Administrador responsable

Datos de salida

• Venta corregida o anulada• Regularización de stock, pago y comisión• Historial auditable de la modificación

RF-23 - Historial de autorizaciones administrativas

Nombre de requerimiento

Historial de autorizaciones administrativas

Descripción

El sistema debe conservar un historial de las autorizaciones administrativas relevantes, como descuentos superiores al límite, precios por mayor, omisión de recargo, correcciones, anulaciones y otras regularizaciones especiales.

Indicador

RF-23

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Administrador general / Responsable administrativo

Datos de entrada

• Tipo de autorización• Operación afectada• Motivo• Administrador responsable• Fecha y hora del sistema

Datos de salida

• Autorización registrada• Historial auditable por tipo, fecha y responsable• Consulta para revisión administrativa

RF-24 - Alertas de stock mínimo

Nombre de requerimiento

Alertas de stock mínimo

Descripción

El sistema debe permitir definir stock mínimo por producto o accesorio y por ubicación, generando alertas cuando la disponibilidad llegue o caiga por debajo del umbral configurado.

Indicador

RF-24

Prioridad

Media

Tipo de requerimiento

Funcional

Usuario

Administrador general / Encargado de almacén

Datos de entrada

• Producto o accesorio• Ubicación• Stock mínimo configurado• Stock disponible actual

Datos de salida

• Alerta de stock mínimo• Listado de reposición sugerida• Indicador disponible en dashboard o reportes

RF-25 - Registro de asistencia de entrada con foto

Nombre de requerimiento

Registro de asistencia de entrada con foto

Descripción

El sistema debe permitir que cada usuario interno registre una sola asistencia de entrada con foto, guardando la fecha y hora del sistema y la ubicación operativa asignada. El administrador debe poder consultar el historial de asistencia.

Indicador

RF-25

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Usuarios internos / Administrador general

Datos de entrada

• Usuario• Foto de entrada• Ubicación operativa asignada• Fecha y hora del sistema

Datos de salida

• Asistencia registrada• Evidencia fotográfica• Sello horario del sistema• Consulta administrativa de asistencia

RF-26 - Confirmación de venta y cierre de cobro

Nombre de requerimiento

Confirmación de venta y cierre de cobro

Descripción

El sistema debe permitir que el vendedor registre una venta preliminar y que esta quede pendiente hasta que el cajero o responsable administrativo confirme el cobro. Solo después de la conciliación completa del pago la venta pasará a estado de venta confirmada.

Indicador

RF-26

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Vendedor / Cajero / Responsable administrativo

Datos de entrada

• Venta registrada por el vendedor• Método de pago• Monto recibido• Responsable que confirma el cobro

Datos de salida

• Venta en estado registrada o pendiente de cobro• Venta confirmada al conciliar el pago• Validación de faltante o pago completo• Historial de quién registró y quién confirmó

RF-27 - Gestión de precios por talla o rango de tallas

Nombre de requerimiento

Gestión de precios por talla o rango de tallas

Descripción

El sistema debe permitir al administrador definir precios de venta por modelo y marca, ya sea por rango de tallas o por talla exacta, para que el precio correcto se aplique automáticamente según la talla seleccionada en la operación.

Indicador

RF-27

Prioridad

Alta

Tipo de requerimiento

Funcional

Usuario

Administrador general

Datos de entrada

• Marca y modelo• Modo de precio (por rango o por talla exacta)• Rango de tallas o talla específica• Precio base y precio por mayor opcional• Responsable que configura

Datos de salida

• Configuración de precios guardada• Precio aplicado automáticamente según talla• Historial de configuración por modelo

RF-28 - Registro y control de adelantos al personal

Nombre de requerimiento

Registro y control de adelantos al personal

Descripción

El sistema debe permitir al administrador registrar adelantos otorgados al personal, consultar su historial y considerarlos en la liquidación final según la fecha o política de pago definida. Cada vendedor solo podrá visualizar su propia comisión y sus adelantos registrados.

Indicador

RF-28

Prioridad

Media

Tipo de requerimiento

Funcional

Usuario

Administrador general / Vendedor

Datos de entrada

• Trabajador• Monto del adelanto• Fecha• Motivo• Fecha o política de pago• Rol del usuario que consulta

Datos de salida

• Adelanto registrado• Historial de adelantos visible según rol• Relación entre comisión y adelantos• Base para liquidación neta administrativa

4. Especificaciones de los requerimientos funcionales

En esta sección se consolida cada requerimiento funcional con una breve descripción, nivel de prioridad y una estimación referencial de esfuerzo. La estimación se presenta como base de planificación y puede ajustarse luego de la validación con el cliente.

Id Req.

Requerimiento

Descripción

Prioridad

Estimación(horas)

RF-01

Inicio de sesión y control de acceso

El sistema debe permitir el ingreso seguro de usuarios mediante credenciales y aplicar restricciones de acceso según el rol asignado.

Alta

24

RF-02

Gestión de usuarios y roles

El sistema debe permitir crear, editar, activar y desactivar usuarios, así como asignarles rol principal, rol secundario compatible, permisos y ubicación operativa principal.

Alta

22

RF-03

Gestión de ubicaciones

Registrar y administrar ubicaciones físicas y operativas, diferenciando depósito, tienda u otras zonas del negocio.

Alta

16

RF-04

Registro del catálogo de productos y accesorios

El sistema debe permitir registrar productos y accesorios, incluyendo configuración de precios por talla exacta o por rango de tallas.

Alta

26

RF-05

Identificación de producto, par y pieza

El sistema debe manejar una estructura de identificación compuesta por producto, par y pieza, permitiendo distinguir cada zapato físico como izquierdo o derecho sin perder la unidad comercial del par. Las piezas existirán para control interno, operación en tienda o trazabilidad, no para venta individual.

Alta

28

RF-06

Generación y lectura de QR o código escaneable

El sistema debe permitir generar y leer un QR o código escaneable para identificar rápidamente productos, pares, piezas o accesorios. Para calzado, la codificación debe distinguir el par y sus piezas, por ejemplo A00001-D para derecha y A00001-I para izquierda.

Alta

20

RF-07

Registro de ingreso de inventario

Ingreso de pares y accesorios al depósito o inventario usando productos ya definidos en catálogo, sin editar maestros ni precios.

Alta

24

RF-08

Consulta de inventario por producto, par, pieza, accesorio y ubicación

Consultar inventario por producto, par, pieza o accesorio mostrando ubicación física y estado actual.

Alta

20

RF-09

Gestión de estados y disponibilidad

Controlar estados operativos de pares, piezas y accesorios, separados de la ubicación física.

Alta

20

RF-10

Gestión de productos en tienda

Asignar elementos autorizados a tienda y retornarlos a depósito u otra ubicación autorizada con trazabilidad.

Alta

22

RF-11

Traslado de pares, piezas y accesorios

El sistema debe permitir trasladar pares completos, piezas o accesorios entre ubicaciones, dejando trazabilidad de origen, destino y responsable.

Media

20

RF-12

Ajustes de inventario

El sistema debe permitir corregir diferencias físicas encontradas en el inventario, siempre registrando motivo, fecha y responsable.

Media

16

RF-13

Venta normal por par y venta de accesorios

El sistema debe registrar la venta normal del calzado únicamente por par completo y permitir la venta de accesorios por unidad. Cuando el cobro se confirme después en caja, la operación deberá quedar inicialmente registrada o pendiente de cobro.

Alta

32

RF-14

Entrega y asignación desde depósito a vendedor u otros

El sistema debe permitir que el encargado de depósito escanee qué par, pieza o accesorio entrega, registre quién lo entrega y quién lo recibe. Debe existir la opción otros para consignar el nombre exacto cuando el receptor no pertenezca al rol vendedor formal.

Alta

22

RF-15

Gestión de precios, descuentos y precio final

El sistema debe manejar un precio base por producto definido por el administrador. El administrador debe poder configurar el descuento máximo en soles que el vendedor puede aplicar. El vendedor podrá vender al precio base, con descuento dentro del límite configurado o por encima del precio base. El precio por mayor, el precio especial más bajo y todo descuento que exceda el límite configurado deberán quedar reservados al administrador.

Alta

24

RF-16

Registro de método de pago, recargos y pago mixto

El sistema debe obligar a registrar cómo pagó el cliente, permitiendo uno o varios medios de pago. Debe calcular recargos por tarjeta cuando corresponda, controlar faltantes y mantener la venta sin confirmar si el pago aún no está conciliado.

Alta

26

RF-17

Gestión de cambios de producto

El sistema debe permitir buscar la venta original, registrar el producto que regresa, entregar el nuevo producto y documentar el motivo del cambio. Este flujo debe diferenciarse claramente de una anulación administrativa por error de registro.

Alta

26

RF-18

Cálculo de diferencias económicas en cambios

El sistema debe calcular automáticamente si el cliente debe aumentar dinero al realizar un cambio. Si el nuevo producto tiene un valor igual o menor al producto original, el sistema no debe generar devolución ni saldo a favor.

Alta

18

RF-19

Comisiones por vendedor y visibilidad por rol

Configuración de comisión por vendedor con visibilidad diferenciada por rol y consulta del historial de adelantos.

Alta

22

RF-20

Liquidaciones, dashboard, reportes y trazabilidad

Liquidaciones, dashboard, trazabilidad y control administrativo de adelantos y fecha de pago.

Alta

38

RF-21

Registro de cliente y promociones

El sistema debe permitir registrar el número del cliente y asociarlo a la venta realizada para segmentar futuras promociones internas según los productos comprados, sin exponer funcionalidades online al cliente final.

Media

18

RF-22

Corrección y anulación administrativa de ventas

El sistema debe permitir corregir o anular ventas mal registradas o compras cargadas por error. Este proceso solo podrá ser ejecutado por el administrador y debe dejar trazabilidad completa, diferenciándose del flujo de cambio de producto solicitado por el cliente.

Alta

20

RF-23

Historial de autorizaciones administrativas

El sistema debe conservar un historial de las autorizaciones administrativas relevantes, como descuentos superiores al límite, precios por mayor, omisión de recargo, correcciones, anulaciones y otras regularizaciones especiales.

Alta

18

RF-24

Alertas de stock mínimo

El sistema debe permitir definir stock mínimo por producto o accesorio y por ubicación, generando alertas cuando la disponibilidad llegue o caiga por debajo del umbral configurado.

Media

14

RF-25

Registro de asistencia de entrada con foto

El sistema debe permitir que cada usuario interno registre una sola asistencia de entrada con foto, guardando la fecha y hora del sistema y la ubicación operativa asignada. El administrador debe poder consultar el historial de asistencia.

Alta

18

RF-26

Confirmación de venta y cierre de cobro

El sistema debe permitir que la venta registrada por el vendedor sea confirmada por caja o por un responsable autorizado solo cuando el pago haya quedado conciliado.

Alta

20

RF-27

Gestión de precios por talla o rango de tallas

Configuración de precios automáticos por rango de tallas o por talla exacta según modelo.

Alta

20

RF-28

Registro y control de adelantos al personal

Registro de adelantos, historial visible según rol y base para liquidación neta administrativa.

Media

18

5. Requerimientos no funcionales del software

Los requerimientos no funcionales definen cómo debe comportarse el sistema en aspectos de seguridad, rendimiento, facilidad de uso y continuidad operativa. Estos puntos son importantes porque aseguran que la solución no solo funcione, sino que también sea estable, confiable y útil para el negocio.

Número

Requerimiento no funcional

Usuario / alcance

RNF-01

Seguridad del sistema

Todos los usuarios internos

RNF-02

Facilidad de uso

Todos los usuarios internos

RNF-03

Rapidez de respuesta

Todos los usuarios internos

RNF-04

Disponibilidad operativa

Todos los usuarios internos

RNF-05

Integridad de datos

Administrador general / Responsable administrativo

RNF-06

Trazabilidad y auditoría

Administrador general

RNF-07

Escalabilidad

Empresa

RNF-08

Respaldo y recuperación de información

Empresa

RNF-09

Compatibilidad de uso

Todos los usuarios internos

RNF-10

Claridad de mensajes y errores

Todos los usuarios internos

5.1 Detalle de los requerimientos no funcionales

RNF-01 - Seguridad del sistema

Nombre de requerimiento

Seguridad del sistema

Descripción

El sistema debe proteger el acceso, la información y las operaciones sensibles mediante controles adecuados de autenticación, permisos y autorizaciones administrativas.

Indicador

RNF-01

Prioridad

Alta

Tipo de requerimiento

No funcional

Usuario

Todos los usuarios internos

Datos de entrada

• Credenciales• Perfil de usuario• Permisos configurados

Datos de salida

• Acceso seguro• Bloqueo de operaciones no autorizadas

RNF-02 - Facilidad de uso

Nombre de requerimiento

Facilidad de uso

Descripción

El sistema debe ser fácil de aprender y operar para usuarios no técnicos, especialmente vendedores, personal administrativo y almacén.

Indicador

RNF-02

Prioridad

Alta

Tipo de requerimiento

No funcional

Usuario

Todos los usuarios internos

Datos de entrada

• Interfaz del sistema• Flujo operativo

Datos de salida

• Uso sencillo• Menor dependencia de capacitación extensa

RNF-03 - Rapidez de respuesta

Nombre de requerimiento

Rapidez de respuesta

Descripción

El sistema debe responder con rapidez en consultas, escaneo QR, registro de ventas, validación de pagos y revisión de inventario.

Indicador

RNF-03

Prioridad

Alta

Tipo de requerimiento

No funcional

Usuario

Todos los usuarios internos

Datos de entrada

• Búsquedas• Escaneos• Operaciones de venta e inventario

Datos de salida

• Respuesta rápida• Atención fluida al cliente

RNF-04 - Disponibilidad operativa

Nombre de requerimiento

Disponibilidad operativa

Descripción

El sistema debe estar disponible durante el horario de trabajo del negocio con estabilidad suficiente para la operación diaria.

Indicador

RNF-04

Prioridad

Alta

Tipo de requerimiento

No funcional

Usuario

Todos los usuarios internos

Datos de entrada

• Jornada operativa• Acceso de usuarios

Datos de salida

• Sistema disponible• Continuidad del trabajo

RNF-05 - Integridad de datos

Nombre de requerimiento

Integridad de datos

Descripción

La información del sistema debe mantenerse consistente, evitando duplicidades, descuadres de inventario, errores de cobro o cálculos incoherentes en descuentos, recargos, cambios y comisiones.

Indicador

RNF-05

Prioridad

Alta

Tipo de requerimiento

No funcional

Usuario

Administrador general / Responsable administrativo

Datos de entrada

• Ventas• Movimientos• Cambios• Liquidaciones

Datos de salida

• Datos consistentes• Menor riesgo de errores operativos

RNF-06 - Trazabilidad y auditoría

Nombre de requerimiento

Trazabilidad y auditoría

Descripción

El sistema debe conservar la trazabilidad de cada operación relevante, indicando quién la hizo, cuándo, sobre qué elemento actuó y qué autorizaciones administrativas existieron.

Indicador

RNF-06

Prioridad

Alta

Tipo de requerimiento

No funcional

Usuario

Administrador general

Datos de entrada

• Operaciones del sistema• Usuario responsable• Fecha y hora

Datos de salida

• Historial auditable• Seguimiento confiable

RNF-07 - Escalabilidad

Nombre de requerimiento

Escalabilidad

Descripción

El sistema debe poder crecer en cantidad de usuarios, productos, pares, piezas, accesorios, tiendas y ventas sin requerir rehacer la solución.

Indicador

RNF-07

Prioridad

Media

Tipo de requerimiento

No funcional

Usuario

Empresa

Datos de entrada

• Crecimiento del negocio• Mayor volumen de registros

Datos de salida

• Capacidad de expansión• Continuidad del sistema

RNF-08 - Respaldo y recuperación de información

Nombre de requerimiento

Respaldo y recuperación de información

Descripción

La información del sistema debe poder respaldarse y recuperarse para evitar pérdidas ante fallas o errores.

Indicador

RNF-08

Prioridad

Alta

Tipo de requerimiento

No funcional

Usuario

Empresa

Datos de entrada

• Datos registrados• Esquema de respaldo

Datos de salida

• Copias de seguridad• Recuperación ante incidentes

RNF-09 - Compatibilidad de uso

Nombre de requerimiento

Compatibilidad de uso

Descripción

El sistema debe poder utilizarse en los equipos definidos por la empresa sin exigir condiciones especiales innecesarias, incluyendo los dispositivos con cámara requeridos para el registro de asistencia cuando aplique.

Indicador

RNF-09

Prioridad

Media

Tipo de requerimiento

No funcional

Usuario

Todos los usuarios internos

Datos de entrada

• Equipos de trabajo• Navegador o entorno de uso• Disponibilidad de cámara cuando corresponda

Datos de salida

• Uso operativo compatible• Acceso práctico en la empresa• Registro de asistencia posible en los equipos definidos

RNF-10 - Claridad de mensajes y errores

Nombre de requerimiento

Claridad de mensajes y errores

Descripción

El sistema debe mostrar mensajes claros cuando falten datos, exista un error, una operación no esté permitida o el pago registrado sea insuficiente.

Indicador

RNF-10

Prioridad

Alta

Tipo de requerimiento

No funcional

Usuario

Todos los usuarios internos

Datos de entrada

• Errores de usuario• Validaciones del sistema• Datos incompletos

Datos de salida

• Mensajes comprensibles• Menor confusión operativa

5.2 Especificaciones de los requerimientos no funcionales

Id Req.

Requerimiento

Descripción

Prioridad

Estimación(horas)

RNF-01

Seguridad del sistema

El sistema debe proteger el acceso, la información y las operaciones sensibles mediante controles adecuados de autenticación, permisos y autorizaciones administrativas.

Alta

16

RNF-02

Facilidad de uso

El sistema debe ser fácil de aprender y operar para usuarios no técnicos, especialmente vendedores, personal administrativo y almacén.

Alta

14

RNF-03

Rapidez de respuesta

El sistema debe responder con rapidez en consultas, escaneo QR, registro de ventas, validación de pagos y revisión de inventario.

Alta

12

RNF-04

Disponibilidad operativa

El sistema debe estar disponible durante el horario de trabajo del negocio con estabilidad suficiente para la operación diaria.

Alta

10

RNF-05

Integridad de datos

La información del sistema debe mantenerse consistente, evitando duplicidades, descuadres de inventario, errores de cobro o cálculos incoherentes en descuentos, recargos, cambios y comisiones.

Alta

14

RNF-06

Trazabilidad y auditoría

El sistema debe conservar la trazabilidad de cada operación relevante, indicando quién la hizo, cuándo, sobre qué elemento actuó y qué autorizaciones administrativas existieron.

Alta

12

RNF-07

Escalabilidad

El sistema debe poder crecer en cantidad de usuarios, productos, pares, piezas, accesorios, tiendas y ventas sin requerir rehacer la solución.

Media

10

RNF-08

Respaldo y recuperación de información

La información del sistema debe poder respaldarse y recuperarse para evitar pérdidas ante fallas o errores.

Alta

12

RNF-09

Compatibilidad de uso

El sistema debe poder utilizarse en los equipos definidos por la empresa sin exigir condiciones especiales innecesarias, incluyendo los dispositivos con cámara requeridos para el registro de asistencia cuando aplique.

Media

8

RNF-10

Claridad de mensajes y errores

El sistema debe mostrar mensajes claros cuando falten datos, exista un error, una operación no esté permitida o el pago registrado sea insuficiente.

Alta

8

6. Análisis de las especificaciones de los requerimientos funcionales

La etapa de análisis y especificación de requerimientos corresponde al proceso de recopilar, revisar y validar las necesidades del cliente con el fin de documentar una solución correcta, completa y entendible. En esta propuesta se han priorizado los requerimientos que sostienen la operación principal del negocio: control del inventario por producto, par y pieza; diferenciación entre ubicación física y estado operativo; uso de productos ubicados en tienda para apoyo de venta; registro comercial completo; control de cobros; visibilidad de comisiones por rol; precios por talla o rango de tallas; adelantos al personal; y consolidación de liquidaciones, alertas y reportes.

Para el desarrollo inicial del sistema se recomienda tomar como base los requerimientos con prioridad alta, ya que estos permiten cubrir la operación mínima necesaria para que el negocio pueda controlar inventario, vender, cobrar, gestionar cambios, administrar precios y revisar pagos al personal con trazabilidad suficiente.

RF-02 - Gestión de usuarios y roles

Código

RF-02

Nombre

Gestión de usuarios y roles

Prioridad

Alta

Descripción

El sistema debe asegurar que cada usuario interno tenga rol principal, permisos y una ubicación operativa principal claramente asignada. Cuando la operación lo requiera, el administrador podrá asignar un rol secundario compatible, inicialmente limitado a vendedor + almacén.

Usuario

Administrador general

Entrada

Datos del usuario, rol principal, rol secundario opcional, estado y ubicación operativa principal.

Proceso

El administrador crea o actualiza el usuario, le asigna la tienda, puesto, depósito o almacén desde donde operará y, si corresponde, un rol secundario permitido.

Salida

Usuario activo con permisos correctos, ubicación operativa definida y trazabilidad del rol usado para ventas, inventario y asistencia.

RF-05 - Identificación de producto, par y pieza

Código

RF-05

Nombre

Identificación de producto, par y pieza

Prioridad

Alta

Descripción

El sistema debe distinguir el producto comercial, el par como unidad normal de venta y la pieza individual como control físico izquierdo y derecho, sin habilitar venta por pieza.

Usuario

Administrador general / Encargado de almacén

Entrada

Registro del producto y del ingreso del nuevo par.

Proceso

El sistema asigna código al producto, crea un código único al par y genera dos piezas asociadas: derecha e izquierda.

Salida

Producto, par y piezas correctamente relacionados y listos para inventario, operación en tienda o venta por par.

RF-14 - Entrega y asignación desde depósito a vendedor u otros

Código

RF-14

Nombre

Entrega y asignación desde depósito a vendedor u otros

Prioridad

Alta

Descripción

El sistema debe controlar mediante escaneo qué producto sale de depósito, quién lo entrega y quién lo recibe, incluso bajo la opción otros con nombre exacto.

Usuario

Encargado de almacén / depósito / Administrador general

Entrada

Elemento escaneado, entregante, receptor y destino.

Proceso

Se registra la entrega y se reasigna el responsable actual del elemento dentro del flujo operativo.

Salida

Historial de entrega y recepción listo para auditoría y seguimiento.

RF-15 - Gestión de precios, descuentos y precio final

Código

RF-15

Nombre

Gestión de precios, descuentos y precio final

Prioridad

Alta

Descripción

El administrador debe definir el precio base, el precio por mayor y el descuento máximo en soles que puede aplicar el vendedor.

Usuario

Administrador general / Vendedor

Entrada

Precio base, descuento solicitado, límite permitido y autorización cuando aplique.

Proceso

El sistema valida el límite del vendedor, permite precios superiores al base y reserva al administrador el precio por mayor y descuentos mayores.

Salida

Precio final validado, con trazabilidad de la diferencia respecto al precio base.

RF-16 - Registro de método de pago, recargos y pago mixto

Código

RF-16

Nombre

Registro de método de pago, recargos y pago mixto

Prioridad

Alta

Descripción

El sistema debe registrar el método de pago, considerar recargos opcionales por tarjeta y dejar la venta confirmada solo cuando el monto recibido cubra el total final.

Usuario

Vendedor / Cajero / Responsable administrativo

Entrada

Método de pago, montos por medio, indicador de recargo, monto recibido y referencia de venta registrada si fue iniciada previamente.

Proceso

Se calcula el total final, el recargo sobre la parte pagada con tarjeta y la diferencia faltante o excedente para decidir si la venta queda confirmada o pendiente. Si el cobro lo realiza caja, se concilia contra la venta registrada por el vendedor.

Salida

Pago conciliado y registrado, con mensaje claro si falta dinero para cerrar la venta o si aún queda pendiente de confirmación.

RF-23 - Historial de autorizaciones administrativas

Código

RF-23

Nombre

Historial de autorizaciones administrativas

Prioridad

Alta

Descripción

Toda excepción administrativa importante debe quedar registrada con responsable, motivo y sello horario para fines de auditoría.

Usuario

Administrador general / Responsable administrativo

Entrada

Tipo de autorización, operación afectada, motivo y administrador responsable.

Proceso

El sistema guarda la autorización asociada a la operación específica y la mantiene consultable por fecha, tipo y responsable.

Salida

Historial auditable de autorizaciones administrativas y regularizaciones especiales.

RF-24 - Alertas de stock mínimo

Código

RF-24

Nombre

Alertas de stock mínimo

Prioridad

Media

Descripción

El sistema debe alertar cuando un producto o accesorio alcance el stock mínimo definido por ubicación.

Usuario

Administrador general / Encargado de almacén

Entrada

Producto o accesorio, ubicación, stock mínimo configurado y stock disponible.

Proceso

Se compara el stock actual con el umbral definido y se genera una alerta cuando se llega o se cae por debajo del mínimo.

Salida

Aviso de reposición y visibilidad del faltante en reportes o dashboard.

RF-25 - Registro de asistencia de entrada con foto

Código

RF-25

Nombre

Registro de asistencia de entrada con foto

Prioridad

Alta

Descripción

Cada usuario interno debe poder marcar una sola asistencia de entrada con foto, guardando la fecha y hora del sistema y su ubicación operativa.

Usuario

Usuarios internos / Administrador general

Entrada

Usuario, foto de entrada, ubicación operativa asignada y sello horario del sistema.

Proceso

El sistema registra la asistencia, almacena la evidencia fotográfica y deja el historial disponible para consulta administrativa.

Salida

Asistencia de entrada registrada con evidencia y consulta disponible para el administrador.

RF-26 - Confirmación de venta y cierre de cobro

Código

RF-26

Nombre

Confirmación de venta y cierre de cobro

Prioridad

Alta

Descripción

El sistema debe separar el registro de la venta del cierre definitivo del cobro, permitiendo que caja confirme la operación solo cuando el pago esté conciliado.

Usuario

Vendedor / Cajero / Responsable administrativo

Entrada

Venta registrada, método de pago, monto recibido y responsable que confirma el cobro.

Proceso

El vendedor registra la operación y esta queda en estado registrada o pendiente de cobro. Luego el cajero o responsable autorizado revisa el pago, valida si cubre el total y cambia el estado a venta confirmada cuando corresponda.

Salida

Venta confirmada con trazabilidad del registro inicial, del cobro y del responsable que realizó la confirmación.

Código

RF-27

Nombre

Gestión de precios por talla o rango de tallas

Prioridad

Alta

Descripción

El sistema debe permitir que el administrador defina precios por talla exacta o por rango de tallas según marca y modelo, para automatizar el precio aplicado en la venta.

Usuario

Administrador general

Entrada

Marca, modelo, modo de precio, talla o rango y precios configurados.

Proceso

El administrador selecciona el producto, define si el precio será por rango o por talla exacta y registra los valores correspondientes para su uso automático en la operación.

Salida

Configuración de precios guardada y lista para aplicarse según la talla vendida.

Código

RF-28

Nombre

Registro y control de adelantos al personal

Prioridad

Media

Descripción

El sistema debe permitir registrar adelantos al personal y relacionarlos con la liquidación administrativa, manteniendo visibilidad limitada según el rol del usuario.

Usuario

Administrador general / Vendedor

Entrada

Trabajador, monto, fecha, motivo, fecha o política de pago y rol del usuario que consulta.

Proceso

El administrador registra el adelanto, el sistema lo conserva en el historial del trabajador y lo deja disponible para el cálculo neto de liquidación, mientras el vendedor solo consulta su información propia.

Salida

Adelanto registrado, historial disponible según rol y base de liquidación administrativa.

6.1 Observaciones para revisión con el cliente

Confirmar si cada usuario tendrá una única ubicación operativa principal o si podrá rotar entre ubicaciones activas con reasignación del administrador.

Definir en qué casos la omisión de recargo, el descuento superior al límite o el precio por mayor requerirán autorización administrativa obligatoria.

Precisar si las alertas de stock mínimo se configurarán por producto general, por talla, por accesorio o por ubicación específica.

Validar si la foto de asistencia se tomará solo desde la cámara del dispositivo o también podrá adjuntarse desde un archivo autorizado.

Confirmar el tiempo de conservación de la evidencia fotográfica de asistencia y del historial de autorizaciones administrativas.

Revisar qué datos mínimos del cliente se solicitarán para promociones internas y bajo qué política comercial serán utilizados.

Confirmar que una venta pueda quedar en estado registrada o pendiente de cobro y que solo pase a venta confirmada cuando el pago conciliado cubra el total final calculado por el sistema.

7. Cierre

El presente documento constituye una base formal actualizada para revisión funcional con el cliente. Su objetivo es cerrar el alcance de un sistema interno para la empresa, reduciendo ambigüedades antes de la fase de diseño detallado y desarrollo. Las reglas operativas aquí descritas pueden seguir afinándose en la validación final, pero ya ofrecen una estructura consistente para inventario, ventas, control administrativo y seguimiento del personal.

