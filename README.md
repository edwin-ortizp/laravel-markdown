# Laravel Markdown (privado)

PHP 8.3+, Laravel 13. Livewire 3/4 opcional. No persiste datos ni registra rutas.

## Instalación local

En cada aplicación agregar un repositorio Composer `path` con `url: ../laravel-markdown`
y `options: {symlink: false}`, requerir `edwin/laravel-markdown: 0.1.0` y ejecutar
`composer update edwin/laravel-markdown --minimal-changes`.
Publicar recursos con `php artisan vendor:publish --tag=markdown-assets --force`.
Gesthor publica además `--tag=markdown-gesthor --force` para conservar la URL antigua.
No editar vendor ni los recursos publicados: editar este paquete y reinstalarlo.

## Componentes

```blade
<x-markdown::editor name="description" :value="old('description')" />
<x-markdown::editor wire:model="description" />
<x-markdown::viewer :value="$description" />
```

El editor portable funciona con JavaScript nativo, también sin Alpine o Livewire.
`wire:model` y sus modificadores se transmiten sin cambios; los perfiles
de aplicación conservan sus propios modificadores. No incluir el editor dentro de un
`wire:ignore` sin un puente de sincronización (Gesthor ya lo tiene).

Los perfiles `markdown::profiles.gesthor`, `miso` y `quizlab` mantienen contratos y
presentaciones existentes. Sus estilos/traducciones del host son intencionales;
el componente portable no requiere Bootstrap, Material Design, Tabler ni Alpine.

## Renderizado y compatibilidad

El visor usa CommonMark con HTML eliminado y enlaces inseguros deshabilitados.
El perfil MiSo conserva ese criterio. La vista previa portable escapa HTML. El renderizador JS de compatibilidad conserva
el dialecto histórico de Gesthor; no garantiza paridad con CommonMark. El HTML legado
de Gesthor permanece bajo el helper de la aplicación, no bajo el visor portable.
No migrar contenido ni reemplazar renderizadores de lectura automáticamente.
Mermaid conserva la carga bajo demanda de Gesthor desde jsDelivr (`mermaid@11`);
requiere conectividad y CSP compatible. No supone almacenamiento ni acceso a datos.

## Distribución y reversión

La versión inicial es 0.1.0. El repositorio remoto privado y sus etiquetas quedan
pendientes de publicación autorizada. Para distribuir, registrar ese repositorio VCS
en cada consumidor y mantener composer.lock. No usar enlaces compartidos en producción.
Para volver atrás, restaurar solo los adaptadores y cambios Composer de esta extracción,
reinstalar con el lock anterior y restaurar los recursos previos. No requiere SQL.
