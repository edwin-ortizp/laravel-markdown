# Validación y operación local

## Desarrollo 0.2.0 (local, sin publicar)

La fuente incorpora scroll limitado y ampliación del componente portable. MiSo
consume una copia Composer path `0.2.0-dev`, sin enlaces. La prueba integrada usa el
modal real con estado sintético e incluye un formulario Blade sin adaptador MiSo.
No se modifican los demás consumidores en este cambio. Los resultados siguientes
de extracción y preparación pública son históricos; no equivalen a validar 0.2.0
en Gesthor, QuizLab o CertMind.

## Pruebas aisladas

Todas las pruebas nuevas registran rutas `/__markdown-test` solo dentro del proceso
de testing, usan estado Livewire sintético y no crean modelos ni ejecutan migraciones.
Exigen APP_ENV=testing, configuración sin caché, SQLite :memory: y DB_URL vacío.
No apuntar las pruebas antiguas de Gesthor a un tenant de uso diario: contienen escrituras.

PowerShell (desde cada proyecto):

```powershell
$env:APP_ENV='testing'; $env:DB_CONNECTION='sqlite'; $env:DB_DATABASE=':memory:'; $env:DB_URL=''; $env:APP_CONFIG_CACHE="$PWD/bootstrap/cache/markdown-testing-config.php"
```

- Gesthor: `php vendor/bin/pest tests/Browser/Componentes/MarkdownPaqueteTest.php`
- MiSo: `php vendor/bin/pest tests/Browser/Componentes/MarkdownTest.php`
- QuizLab: `php vendor/bin/pest tests/Browser/Componentes/MarkdownTest.php`

Gesthor cubre API compatible, selección, Unicode, aislamiento entre editores, puente
wire:ignore, guardado/cancelación en memoria, morph, renderizado histórico, Mermaid y
componente portable sin Alpine/Livewire. MiSo cubre los dos modos de sincronización.
QuizLab renderiza el formulario real con colecciones vacías y prueba localStorage,
restauración y eventos de la barra. Mermaid requiere acceso al CDN original.

Esto no equivale a validar permisos/guardado de cada módulo contra bases reales.
La migración no cambia los servicios de persistencia ni permisos de aplicación.

## Estado inicial de las copias locales (histórico)

Los consumidores de la extracción inicial usan `edwin/laravel-markdown` 0.1.0.
La fuente pública cambia a `edwin-ortizp/laravel-markdown`, sin cambiar código PHP,
JavaScript ni vistas. Las copias existentes siguen funcionando; no reinstalarlas
contra la fuente renombrada hasta completar la adopción descrita en [RELEASE.md](RELEASE.md).
Las pruebas sobre esas copias validan el mismo código de ejecución; la nueva identidad
Composer se valida aparte con una instalación temporal, sin editar los consumidores.

## Reversión

Restaurar únicamente los archivos de esta extracción, conservando trabajo ajeno:
los includes originales, el JS original de Gesthor y el bloque de barra de QuizLab;
restaurar require/repositories y lock previos; ejecutar composer install sin scripts
de migración. El paquete conserva snapshots sintéticos/de origen bajo tests/fixtures.
La recuperación no requiere convertir contenido ni SQL. Eliminar recursos publicados
solo después de retirar todos sus consumidores.

## Resultado local verificado (2026-10-18)

- Gesthor: 4 pruebas Browser, 28 aserciones; incluye 390px y Mermaid real desde CDN.
- MiSo: 2 pruebas Browser, 10 aserciones; inmediata y diferida.
- QuizLab: 1 prueba Browser, 6 aserciones; formulario real, borrador y Livewire 3.
- Composer validate: correcto en los tres consumidores. Instalaciones path sin symlink.
- MiSo ui:conformance: sin deuda visual nueva (268 desviaciones, baseline 345).
- Pint aplicado a los PHP del cambio; sintaxis JS verificada con node --check.
- Composer: ninguna dependencia existente actualizada. MiSo añade Pest/Browser
  y sus dependencias de desarrollo para disponer del runner requerido.
- Los tests antiguos de tenant se migraron de carpeta, pero no se ejecutaron.
- Sin migraciones, conversiones de contenido, commits ni publicación remota.

## Preparación pública verificada (2026-10-18)

- Nuevo nombre `edwin-ortizp/laravel-markdown`, licencia MIT y versión inferida de Git.
- `composer validate --strict`: correcto, sin advertencias.
- Repetidas las 7 pruebas Browser existentes: 44 aserciones, todas correctas.
- Comparados por SHA-256 los 12 archivos PHP/vistas/recursos de ejecución contra las
  tres copias instaladas: sin diferencias. No se reinstaló ni migró ningún consumidor.
- Instalación limpia del nombre nuevo mediante repositorio path sin symlink y override
  de versión solo en una aplicación desechable bajo storage/framework/testing.
  Verificados auto-descubrimiento, editor/visor Blade y publicación de recursos.
- Esa instalación valida la nueva identidad local; no prueba disponibilidad en
  Packagist. La instalación desde Packagist y la adopción en consumidores quedan
  pendientes de publicación/autorización y acceso a la cuenta mantenedora.


## Scroll y ampliación: verificación local de 0.2.0-dev

MiSo: 12 pruebas Browser, 131 aserciones, todas correctas. Cubren el modal real,
contenido extenso, misma identidad del textarea y selección, foco/Escape,
Livewire inmediata/diferida y morph, guardado/cancelación/reapertura, cierre del
ancestro y desmontaje, varios editores, móvil/pantalla baja y redimensionamiento.
Incluyen un formulario Blade sin adaptador MiSo, expandable:false y fallback sin
Popover. No se ejecutaron pruebas contra bases de datos de aplicación.

Composer validate, sintaxis JS, build MiSo, Pint dirigido y ui:conformance correctos.
Solo cambió el paquete en el lock local respecto al inicio del trabajo; instalación
Composer path con copia verificada, no symlink. Sin commits, etiquetas ni publicación.
No equivale a validación sobre un dispositivo móvil con teclado real.
