# CertMind: evaluación de sustitución de CKEditor

Revisión estática del 18 de octubre de 2026. Sin consultas a datos reales ni cambios
en edición, importaciones, exámenes o base de datos. CKEditor continúa activo.

## Evidencia

- `resources/views/livewire/admin/exams/questions/createdit.blade.php`: dos editores
  ClassicEditor, modales `wire:ignore`, campos descriptionQuestion/descriptionAnswer.
- `resources/views/livewire/templates/js/inputs-scripts.blade.php`: `getData()` escribe
  HTML en el componente; eventos ckeditorLivewireEdit/ckeditorLivewireClean.
- `app/Livewire/Admin/Exams/Questions/Createdit.php`: persiste esos strings directamente.
- `resources/views/user/exam/presentQuestion.blade.php`: enunciado y respuestas se
  imprimen como HTML (`{!! !!}`). La búsqueda encontró 13 vistas que mencionan
  descriptionQuestion o answer->description: deben inventariarse antes de conversión.
- `app/Http/Controllers/Admin/Examen/QuestionController.php`: importación JSON acepta
  varios nombres de enunciado, almacena descripciones sin conversión Markdown y
  compara duplicados con strip_tags. La referencia `.md` limpia nombres de temas;
  no establece un contrato Markdown para el enunciado.
- Hay CKEditor Classic en administración y CKEditor 4 en otras pantallas. El archivo
  `public/vendor/ckeditor/config.js` configura CKEditor 4: no prueba las funciones
  habilitadas del build Classic usado por los modales.
- composer.json requiere Livewire ^4.4; composer.lock y vendor consultados reportan
  v3.8.1. No se corrigió esa discrepancia dentro de esta extracción.

## Matriz de compatibilidad

| Función/contenido | Paquete 0.1.0 | Riesgo al sustituir |
|---|---|---|
| Negrita, cursiva, títulos, listas, citas y código | Herramientas y vista previa | Las vistas HTML actuales mostrarían sintaxis Markdown literal |
| Enlaces | Inserción HTTP(S), visor con enlaces inseguros deshabilitados | Revisar URLs relativas, mailto y anchors existentes |
| Tablas Markdown | Visor CommonMark estándar; preview histórico JS limitado | No equivalencia de tablas HTML, celdas combinadas ni estilos |
| Imágenes | Visor CommonMark admite Markdown; sin herramienta de carga | No sustituye carga, pegado ni atributos de imágenes HTML |
| Colores, alineación y estilos HTML | Fuera del contrato portable | Se perderían al convertir a Markdown básico |
| HTML existente | Solo adaptador legado de la aplicación | No usar el visor portable (elimina HTML) sobre datos existentes |
| Audio | Campo separado en el modal de preguntas | Mantener audio_path y reproducción sin acoplar al editor |
| Fórmulas/LaTeX | Sin soporte específico | No se confirmó una integración matemática en las fuentes revisadas |
| Mermaid | Soporte cliente heredado de Gesthor | Es una capacidad adicional, no equivale al HTML de CKEditor |
| Importaciones y detección de duplicados | Fuera del paquete | Deben adaptarse junto con los lectores si cambia el formato persistido |
| Modales y sincronización | Adaptador posible para Livewire 3/4 | Preservar carga, reset, cancelación y disparadores al cerrar |

## Resultado y condición para una sustitución

No es seguro reemplazar los editores de preguntas/respuestas en esta primera versión.
El cambio exige un contrato explícito del formato persistido y consumidores capaces
de distinguir HTML/Markdown; una heurística no garantiza distinguir todo el contenido.
No introducir un campo de formato ni convertir registros sin una propuesta específica.

Siguiente evaluación: inventario completo de lectores/exportadores e importadores,
inspección del build Classic y corpus sintético de HTML con imágenes, tablas y estilos.
Si posteriormente se autoriza revisar datos reales, hacerlo solo en lectura y con un
alcance definido. Comparar presentación y round-trip antes de escoger los campos aptos.
