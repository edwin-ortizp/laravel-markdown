# Validación y operación local

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

## Actualizar copias locales

Tras editar el paquete, en cada consumidor ejecutar `composer reinstall edwin/laravel-markdown --no-scripts`.
Publicar `markdown-assets` con --force; Gesthor también publica `markdown-gesthor`.
Publicar MiSo solo es necesario si utiliza el componente portable (el perfil actual
usa vistas del servidor y estilos de la aplicación).
Repetir las pruebas afectadas. No editar vendor ni activar symlink.

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
