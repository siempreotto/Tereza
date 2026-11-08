# Brief maestro: web app de registro de bebé con MCP

> Nombre de trabajo: **[NOMBRE_APP]** (pendiente de definir; reemplazar en todo el documento).
> Versión del brief: 1.0 · Noviembre 2026 · Autor: Otto Salvador

---

## 0. Cómo usar este documento

Este archivo es un prompt autocontenido. Se pega completo en una conversación nueva junto con **una** de las dos instrucciones de modo. Todo lo que está entre las secciones 1 y 11 es contexto compartido; no lo reinterpretes ni lo amplíes sin preguntar.

### Modo A: Plan de implementación

```
Usa el brief adjunto. Modo A.
```

Tu tarea es producir un plan de implementación ejecutable para la Fase 1 y un esbozo de la Fase 2. Antes de escribir el plan:

1. Lista las ambigüedades o contradicciones que encuentres en el brief y pregúntame por ellas. No asumas. Espera mi respuesta.
2. Con mis respuestas, entrega el plan con esta estructura: hitos con criterio de "terminado", tareas por hito en orden de dependencia, esquema SQL inicial con políticas RLS, contrato de cada herramienta MCP (input/output en JSON Schema), riesgos técnicos con mitigación, y lo que queda explícitamente fuera.
3. Marca con `[VERIFICAR]` cualquier afirmación sobre librerías, APIs o capacidades de plataforma que no hayas confirmado en documentación actual.

### Modo B: Diseño de todas las pantallas

```
Usa el brief adjunto. Modo B.
```

Tu tarea es diseñar todas las pantallas listadas en la sección 10 como un artifact de diseño en Claude Design. Antes de diseñar:

1. Propón un sistema visual compacto (paleta de 4 a 6 colores con hex, tipografías y su rol, concepto de layout con wireframe ASCII de la pantalla Hoy, y 3 principios propios de este producto). Revisa tu propuesta contra la sección 10.1 y corrige lo que se parezca a un default genérico. Muéstramela y espera aprobación.
2. Con la aprobación, diseña todas las pantallas en modo día y modo noche, con contenido realista en español (datos de un bebé ficticio de 5 meses llamado "Lucía", nacida a término), incluyendo estados vacíos, de carga y de error donde aplique.
3. Las pantallas de Fase 2 se diseñan completas pero llevan una marca discreta de "Fase 2" en el lienzo, no en la UI.

---

## 1. Rol esperado

Actúas como product lead técnico con criterio de diseño. Priorizas lo que hace la vida más fácil a un padre o madre agotado a las 3 a.m. sobre lo que impresiona en una demo. Señalas riesgos de seguridad infantil y de privacidad sin que te lo pidan. Nunca presentas heurísticas como ciencia.

---

## 2. Contexto del producto

**Qué es.** Una web app (PWA, mobile-first) para registrar la vida diaria de un bebé: sueño, tomas, pañales, medicamentos, crecimiento y visitas al pediatra. Se complementa con un servidor MCP remoto para que los cuidadores registren y consulten desde Claude (chat web y app móvil) en lenguaje natural.

**Para quién, por etapas.**
- **Ahora:** uso personal de una familia en Guatemala (dos cuidadores principales, posiblemente abuelos o niñera con acceso limitado).
- **Después:** producto para otras familias, inicialmente LATAM hispanohablante.

Por eso la arquitectura es multi-tenant desde el día uno aunque solo exista una familia.

**Idioma y región.** Interfaz en español. Zona horaria por familia (default `America/Guatemala`, UTC-6, sin horario de verano). Tratamiento de "tú" en la interfaz `[DECIDIR: tú vs. vos]`.

**Unidades configurables por familia.** Volumen en ml u oz (en Guatemala es común oz para biberón), peso en kg o lb (común lb en casa, kg en consulta), longitud en cm o in, temperatura en °C. Se guarda siempre en sistema métrico y se convierte en la presentación.

**Referentes de mercado.** Napper, Huckleberry, Sprout Baby, Baby Tracker. La sección 3 resume qué se puede y qué no se puede aprender de ellos.

---

## 3. Hallazgos de investigación (versión depurada)

Una investigación previa sobre Napper y Huckleberry contenía afirmaciones infladas. Esta es la versión verificada que rige el producto.

**Lo que sí se sostiene**
- La AASM (consenso 2016, avalado por la AAP) recomienda 12 a 16 h de sueño total en 24 h para 4 a 12 meses y 11 a 14 h para 1 a 2 años. La AASM no emite recomendación para menores de 4 meses; para ese rango se usa como referencia orientativa 14 a 17 h (National Sleep Foundation).
- El sueño se regula por dos procesos distintos: ritmo circadiano (reloj, se consolida en los primeros meses) y presión homeostática (se acumula con la vigilia). El modelo de datos y el predictor los tratan por separado.
- Huckleberry SweetSpot, según su propia documentación, parte de ventanas de vigilia apropiadas para la edad, las ajusta con los registros del niño y se mantiene dentro de rangos por edad; permite que los padres sobrescriban las ventanas. Requiere membresía pagada y aplica desde los 2 meses. Es un motor de reglas acotado con personalización, no una red neuronal documentada.
- La queja más frecuente en reseñas negativas de Huckleberry es que las predicciones están detrás de un muro de pago, y que a veces no encajan con el bebé.
- Huckleberry Plus ya ofrece "AI logging". El registro en lenguaje natural por sí solo no es un diferenciador.

**Lo que NO se sostiene y no debe aparecer en el producto ni en el copy**
- Que las ventanas de vigilia se basen en estudios científicos. Son una heurística clínica útil; no hay estudios que las validen como tal.
- Que el sobrecansancio dispare un "pico de cortisol" con umbral predecible.
- Que la competencia use redes neuronales sobre cientos de millones de datos.
- Que la regresión de los 4 meses convierta el sueño "en patrón adulto permanente". Lo correcto: los ciclos de sueño maduran alrededor de esa edad.

**Implicaciones de producto**
1. El predictor no necesita machine learning. Reglas por edad más personalización acotada replican lo esencial.
2. No tenemos ventaja de datos poblacionales; la ventaja es interoperabilidad (el registro vive en Claude y en un stack propio, con consultas abiertas sobre el historial) y la ausencia de muro de pago en lo esencial durante la etapa personal.
3. El copy dice "estimación basada en la edad y en tus registros", nunca "basado en ciencia del sueño".

---

## 4. Usuarios y escenarios clave

| Usuario | Escenario | Qué necesita |
|---|---|---|
| Cuidador principal, de noche | 3 a.m., una mano, bebé en brazos, poca luz | Iniciar o detener un timer en un toque, sin pantalla blanca que encandile |
| Cuidador principal, de día | Quiere saber cuánto lleva despierto y cuándo intentar la siesta | Estado actual de un vistazo y franja estimada |
| Segundo cuidador | Llega del trabajo y pregunta "¿cómo estuvo el día?" | Resumen del día, en la app o preguntándole a Claude |
| Abuela o niñera | Cuida medio día | Registrar tomas y pañales sin ver ni editar historial médico |
| Cuidador en consulta | Está con el pediatra | Resumen desde la última visita: crecimiento, sueño, tomas, medicamentos, dudas anotadas |
| Cuidador en Claude | "Tomó 4 oz a las 2 y se durmió a mitad" | Que se registre correctamente sin formularios |

---

## 5. Alcance por fases

**Fase 1 (MVP personal)**
- Registro completo de todos los tipos de evento (sección 7).
- Timers de sueño y toma (incluye lactancia por lado).
- Hoy, timeline diaria, vista semanal de patrones, resumen.
- Crecimiento con percentiles OMS.
- Medicamentos: tratamientos activos e historial de administración.
- Pediatra: visitas, vacunas, próxima cita, notas de dudas, resumen exportable.
- Multi-cuidador con roles.
- Servidor MCP remoto con OAuth y todas las herramientas de Fase 1.
- Modo noche.

**Fase 2**
- Predictor de próxima siesta y hora de dormir (sección 9).
- Notificaciones push antes de la franja estimada.
- Ajuste manual de ventanas de vigilia.

**Fuera de alcance (por ahora)**
- Sonidos o ruido blanco, cursos, contenido educativo largo.
- Integración con wearables, cámaras o básculas.
- Chat con expertos humanos.
- App nativa (la PWA cubre instalación en pantalla de inicio).
- Monetización.

---

## 6. Arquitectura y stack (decidido)

- **Datos y auth:** Supabase (Postgres, Auth, Row Level Security, Storage para adjuntos de visitas).
- **Web app:** Next.js en Vercel, PWA instalable, mobile-first.
- **MCP:** servidor remoto con transporte Streamable HTTP, desplegado en Vercel, con OAuth 2.1 para poder agregarse como conector personalizado en Claude y usarse desde la app móvil. `[VERIFICAR: soporte actual de Supabase como servidor OAuth para clientes MCP vs. implementar la capa OAuth aparte]`.
- **Identidad de cuidadores:** cada cuidador conecta su propia cuenta de Claude; el token OAuth se mapea a su usuario de Supabase, que pertenece a un `household` con un rol. Toda escritura vía MCP guarda `logged_by` y `source = 'mcp'`.
- **Tiempo:** todo en `timestamptz`. La interpretación de horas relativas ("hace 20 minutos", "a las 2") usa la zona horaria del household.
- **Seguridad:** RLS en todas las tablas por `household_id`. Ningún dato de salud en URLs, logs de servidor ni analítica.

---

## 7. Modelo de datos (propuesta base)

```
households      id, nombre, zona_horaria, unidades (jsonb), creado_en
members         id, household_id, user_id, nombre_visible, rol (admin | cuidador | limitado), creado_en
babies          id, household_id, nombre, fecha_nacimiento, semanas_gestacion, sexo (para curvas OMS), foto_url, activo
events          id, household_id, baby_id, tipo, started_at, ended_at (null si es puntual o timer activo),
                payload (jsonb), notas, logged_by, source (web | mcp), creado_en, editado_en, eliminado_en
measurements    id, household_id, baby_id, medido_en, peso_g, longitud_mm, perimetro_cefalico_mm, origen (casa | consulta), notas
medications     id, household_id, baby_id, nombre, indicacion_textual, prescrito_por, inicio, fin, activo
visits          id, household_id, baby_id, fecha, pediatra, motivo, notas, vacunas (jsonb), proxima_cita, adjuntos
questions       id, household_id, baby_id, texto, creada_en, resuelta_en_visita_id   ← dudas para el pediatra
```

**Tipos de evento y su `payload`**

| tipo | campos de payload |
|---|---|
| `sueno` | `lugar` (cuna, brazos, carriola, auto, otro), `como_se_durmio` (solo, arrullo, pecho, biberón), `calidad` opcional |
| `toma_pecho` | `lado_inicial`, `segundos_izq`, `segundos_der` |
| `toma_biberon` | `contenido` (materna, fórmula, mixta), `volumen_ml`, `sobrante_ml` |
| `toma_solidos` | `alimentos` (lista), `cantidad` textual, `reaccion` opcional |
| `extraccion` | `volumen_ml_izq`, `volumen_ml_der` |
| `panal` | `mojado` (bool), `sucio` (bool), `color` y `consistencia` opcionales |
| `medicamento` | `medication_id`, `cantidad_textual` (tal como la dijo el cuidador), `via` |
| `temperatura` | `valor_c`, `metodo` (axilar, rectal, frente, oído) |
| `sintoma` | `descripcion`, `severidad` opcional |
| `nota` | texto libre |

**Decisiones del modelo**
- Una tabla `events` única con vistas tipadas, porque las consultas cruzadas ("¿se despierta más los días que come menos?") son el caso de uso fuerte del MCP. `[DECIDIR en plan: validación del payload por tipo con CHECK + JSON Schema o en la capa de aplicación]`.
- `semanas_gestacion` existe para calcular **edad corregida** (para prematuros); predictor y percentiles usan edad corregida hasta los 24 meses.
- Borrado lógico (`eliminado_en`) para permitir deshacer.
- Solo puede haber un timer activo por tipo y bebé.
- El rol `limitado` puede crear eventos de toma, pañal y sueño, y ver el día actual; no ve medicamentos, visitas, crecimiento ni historial anterior.

---

## 8. Servidor MCP

### 8.1 Herramientas

| Herramienta | Fase | Qué hace | Inputs principales |
|---|---|---|---|
| `estado_actual` | 1 | Si duerme o está despierto y desde cuándo; última toma, último pañal, último medicamento; timers activos | `baby_id` opcional |
| `iniciar_timer` | 1 | Inicia sueño, toma de pecho (con lado) o extracción | `tipo`, `inicio` opcional, `lado` |
| `terminar_timer` | 1 | Cierra el timer activo y completa el payload | `tipo`, `fin` opcional, campos de payload |
| `registrar_evento` | 1 | Registra un evento ya ocurrido o puntual | `tipo`, `started_at`, `ended_at`, `payload`, `notas` |
| `corregir_evento` | 1 | Edita horas o payload | `event_id`, cambios |
| `eliminar_evento` | 1 | Borrado lógico | `event_id` |
| `consultar_eventos` | 1 | Timeline filtrada | `tipos`, `desde`, `hasta`, `limite` |
| `resumen` | 1 | Métricas del período: sueño total y comparación con el rango de referencia por edad, número y volumen de tomas, pañales mojados y sucios, siestas | `periodo` (hoy, ayer, 7d, 30d, rango) |
| `registrar_medida` | 1 | Guarda peso, longitud o perímetro y devuelve percentil OMS por edad corregida | medidas, `origen` |
| `registrar_medicamento` | 1 | Registra una administración de un tratamiento existente o crea el tratamiento con la indicación textual del cuidador | `nombre`, `cantidad_textual`, `hora` |
| `agregar_duda_pediatra` | 1 | Guarda una pregunta para la próxima consulta | `texto` |
| `resumen_pediatra` | 1 | Informe desde la última visita: crecimiento y percentiles, promedios de sueño y tomas, medicamentos administrados, síntomas y temperaturas registradas, dudas pendientes | `desde` opcional |
| `predecir_proximo_sueno` | 2 | Franja estimada para la próxima siesta u hora de dormir con nivel de confianza y explicación | `baby_id` opcional |

### 8.2 Comportamiento esperado

- Si la familia tiene un solo bebé activo, `baby_id` se infiere. Si hay más de uno y el cuidador no lo indica, la herramienta devuelve un error que pide aclarar cuál.
- Horas relativas y ambiguas se resuelven con la zona horaria del household. Si "a las 2" puede ser a.m. o p.m., se elige la más reciente en el pasado y la respuesta lo dice explícitamente para que el cuidador pueda corregir.
- Toda escritura responde con lo que quedó guardado en lenguaje claro ("Guardé: biberón de 120 ml de fórmula, 2:00 p.m., sobraron 20 ml") y el `event_id`.
- Si se intenta iniciar un timer que ya está activo, se devuelve el existente en vez de duplicarlo.
- El rol `limitado` recibe error de permiso en las herramientas fuera de su alcance.

### 8.3 Reglas de seguridad (van en las descripciones de las herramientas y en las respuestas del servidor)

- Las herramientas de medicamentos **solo registran**. Nunca sugieren, calculan ni validan dosis, intervalos o combinaciones. Ante una pregunta de dosis, la respuesta remite al pediatra o farmacéutico y a la etiqueta del producto.
- Cuando se registra algo que coincide con señales de alarma, la respuesta incluye una nota breve que recomienda contactar al pediatra o buscar atención. Lista inicial a validar con un pediatra antes de usarla: temperatura de 38 °C o más en menores de 3 meses; temperatura alta persistente a cualquier edad; muy pocos pañales mojados en el día; rechazo repetido de tomas; somnolencia excesiva o dificultad para despertarlo; dificultad para respirar. `[VALIDAR umbrales con pediatra]`
- Ninguna salida presenta un resumen o predicción como diagnóstico.
- El contenido de sueño seguro (boca arriba, superficie firme, sin objetos sueltos) aparece en el onboarding y en la documentación del predictor.

---

## 9. Predictor de sueño (Fase 2)

**Principio.** Es una heurística transparente, no un modelo de ciencia. La UI y el MCP siempre muestran una franja y por qué.

**Entradas.** Edad corregida, rangos de vigilia por edad (tabla configurable), historial de sueños de los últimos 7 a 14 días, hora habitual de dormir de la familia.

**Tabla inicial de rangos de vigilia (heurística, editable por la familia)**

| Edad corregida | Vigilia típica |
|---|---|
| menos de 8 semanas | sin predicción, solo registro |
| 2 meses | 60 a 90 min |
| 3 meses | 75 a 120 min |
| 4 meses | 90 a 150 min |
| 5 a 6 meses | 2 a 3 h |
| 7 a 8 meses | 2.5 a 3.5 h |
| 9 a 12 meses | 3 a 4 h |
| 13 a 18 meses | 4 a 6 h |

**Algoritmo propuesto**
1. Tomar las vigilias observadas recientes que terminaron en una siesta de al menos 30 minutos.
2. Calcular una mediana ponderada (más peso a los días recientes y a la misma posición de siesta en el día: primera, segunda, etc.).
3. Acotar el resultado al rango de la edad corregida.
4. Devolver una franja de ±15 minutos alrededor del valor y un nivel de confianza (alta, media, baja) según la cantidad y consistencia de datos.
5. Para la hora de dormir, combinar la vigilia de la última ventana con la hora habitual de dormir de la familia.
6. Si hubo una siesta muy corta o un día atípico (enfermedad registrada, viaje), bajar la confianza y explicarlo.

**Ajuste manual.** La familia puede fijar sus propias ventanas; en ese caso el predictor las usa y lo dice.

---

## 10. Diseño de pantallas

### 10.1 Dirección de diseño

- **Una mano, poca luz, cerebro cansado.** Objetivos táctiles de al menos 48 px, acciones principales en el tercio inferior de la pantalla, mínimo texto que escribir.
- **Modo noche como ciudadano de primera clase**, no un tema oscuro genérico: luminancia muy baja, tonos cálidos tenues, nada de blanco puro, sin animaciones que destellen. Se activa automáticamente por horario o manualmente.
- **Deshacer en vez de confirmar.** Registrar es inmediato; aparece un aviso con "Deshacer" unos segundos. Los diálogos de confirmación se reservan para eliminar datos de forma definitiva.
- **El estado actual es el héroe.** Lo primero que se ve es "Despierta hace 1 h 40 min" o "Durmiendo desde 1:15 p.m.", no un dashboard de tarjetas.
- **Evitar el cliché de app de bebé** (pasteles genéricos, nubes, ositos, estrellitas) y también los defaults de UI generada: cuadrícula de tarjetas idénticas con la misma sombra, etiquetas en mayúsculas sobre cada título, flechas añadidas a cada botón.
- **Copy:** español claro, voz activa, sin infantilizar al adulto. Los botones dicen exactamente lo que hacen ("Iniciar sueño", "Guardar toma"). Los errores explican qué pasó y cómo resolverlo. Los estados vacíos invitan a la primera acción.
- **Accesibilidad:** contraste AA en ambos modos, foco visible, respeta movimiento reducido, no depende solo del color para distinguir tipos de evento.

### 10.2 Navegación

Barra inferior con cuatro destinos: **Hoy**, **Diario**, **Salud** (crecimiento, medicamentos, pediatra), **Más** (patrones, ajustes). Un botón de registro rápido accesible desde Hoy y Diario.

### 10.3 Inventario de pantallas

**Onboarding**
1. Bienvenida: qué hace la app en una frase y entrada con Google o correo.
2. Crear familia: nombre del hogar, zona horaria (precargada), unidades.
3. Perfil del bebé: nombre, fecha de nacimiento, ¿nació antes de las 37 semanas? (si sí, semanas de gestación), sexo para curvas de crecimiento, foto opcional.
4. Sueño seguro: una pantalla breve con las pautas básicas.
5. Invitar cuidadores: enlace o correo, elegir rol, explicación corta de qué ve cada rol.
6. Conectar con Claude (opcional, se puede saltar): qué permite y cómo agregar el conector.

**Hoy**
7. Hoy, bebé despierto: estado y tiempo desde el último sueño, última toma y último pañal con "hace X", accesos rápidos (Sueño, Toma, Pañal, Más), lista corta de eventos de hoy.
8. Hoy, bebé durmiendo: timer grande, botón "Despertó", tiempo total dormido hoy.
9. Hoy, toma de pecho en curso: timer por lado, cambiar de lado, pausar, terminar.
10. Hoy con predicción (Fase 2): franja "Próxima siesta entre 10:40 y 11:10", confianza y "¿por qué?".

**Registro (hojas inferiores)**
11. Sueño: iniciar ahora o registrar uno pasado con hora de inicio y fin, lugar, cómo se durmió.
12. Toma: selector pecho / biberón / sólidos / extracción, cada uno con sus campos mínimos.
13. Pañal: mojado, sucio o ambos en un toque; detalles opcionales plegados.
14. Medicamento: elegir tratamiento activo o crear uno, cantidad tal como la indicó el médico (texto), hora. Sin ningún cálculo ni sugerencia.
15. Temperatura y síntoma: valor, método, descripción; muestra la nota de alarma si aplica.
16. Nota rápida.
17. Aviso de "Guardado" con Deshacer.

**Diario**
18. Diario del día: línea de tiempo vertical de 24 h con bloques de sueño y marcas de eventos, navegación entre días.
19. Detalle de evento: ver, editar horas y campos, quién lo registró y desde dónde (app o Claude), eliminar.

**Patrones y resumen**
20. Patrones semanales: bandas de sueño por día (día y noche), tendencia de horas totales contra el rango de referencia por edad.
21. Resumen del período: sueño, tomas, pañales; selector hoy / 7 días / 30 días.

**Salud**
22. Inicio de Salud: último peso y percentil, tratamientos activos, próxima cita, dudas pendientes.
23. Crecimiento: curvas OMS de peso, longitud y perímetro cefálico con los puntos del bebé; registrar medida.
24. Medicamentos: tratamientos activos e historial de administraciones.
25. Pediatra: lista de visitas, detalle de visita (notas, vacunas, adjuntos), próxima cita.
26. Dudas para el pediatra: lista, agregar, marcar resuelta en una visita.
27. Resumen para el pediatra: vista limpia e imprimible o para compartir, con rango de fechas.

**Más / Ajustes**
28. Ajustes del bebé (y agregar otro bebé).
29. Cuidadores y roles.
30. Unidades, zona horaria, horario automático del modo noche.
31. Notificaciones (Fase 2).
32. Ventanas de vigilia personalizadas (Fase 2).
33. Conexión con Claude: estado del conector, cuidadores conectados, revocar acceso.
34. Datos y privacidad: exportar todo (CSV y JSON), eliminar cuenta y datos.

**Estados transversales**
35. Estados vacíos: primer día sin registros, sin medidas, sin visitas.
36. Sin conexión: registro guardado localmente y pendiente de sincronizar.
37. Error de sincronización o conflicto (dos cuidadores editaron lo mismo).
38. Vista del rol limitado: Hoy y registro rápido, sin Salud ni historial.

---

## 11. Copy y límites de comunicación

- Predicciones: "Estimación basada en la edad de Lucía y en sus últimos registros." Nunca "científicamente probado" ni "basado en ciencia del sueño".
- Rangos de sueño: "Referencia por edad", no "lo que debería dormir".
- Medicamentos: la app registra; no aconseja.
- Señales de alarma: tono directo y breve, con acción concreta (llamar al pediatra, buscar atención), sin alarmismo.
- Nunca culpar al cuidador ("no registraste") en mensajes; usar "Faltan registros de hoy para estimar".

---

## 12. Decisiones abiertas

| # | Decisión | Opciones | Notas |
|---|---|---|---|
| 1 | Nombre de la app | — | Afecta copy y conector MCP |
| 2 | Tratamiento en la UI | tú / vos | "Vos" es más local en Guatemala; "tú" escala mejor a LATAM |
| 3 | Capa OAuth del MCP | Supabase como proveedor / implementación propia | Ver `[VERIFICAR]` en sección 6 |
| 4 | Validación de payloads | CHECK + JSON Schema en Postgres / capa de aplicación | — |
| 5 | Offline | Cola local con sincronización / solo online en Fase 1 | El escenario de las 3 a.m. pide al menos cola local |
| 6 | Umbrales de alarma | Lista de la sección 8.3 | Validar con un pediatra antes de activarlos |
| 7 | Requisitos legales de datos de salud de menores | Por mercado | No bloquea la fase personal; necesario antes de abrir a otras familias |
