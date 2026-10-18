# Laravel Markdown

Editor Markdown y visor para Laravel Blade, con integración opcional con Livewire 3/4.
El editor portable usa JavaScript nativo: no necesita Alpine, Bootstrap ni una fuente de iconos.
No persiste contenido, no registra rutas y no decide permisos de aplicación.

## Compatibilidad

- PHP 8.3 o superior.
- Laravel 13 (`illuminate/support` y `illuminate/view` ^13.0).
- Livewire 3 o 4, opcional. El editor también funciona en formularios Blade convencionales.
- Recursos JavaScript y CSS listos para publicar; no exige Vite ni Laravel Mix.

La compatibilidad con Laravel 12 o versiones anteriores no está declarada.

## Instalación

Una vez publicada la versión `v0.1.0` en Packagist:

```bash
composer require edwin-ortizp/laravel-markdown:^0.1
php artisan vendor:publish --tag=markdown-assets --force
```

Laravel descubre automáticamente el service provider. Carga los scripts y estilos
que generan los componentes una sola vez por página. Publica de nuevo los recursos
al actualizar el paquete; no edites las copias de `vendor` ni `public/vendor`.

## Editor Blade

```blade
<label for="description">Descripción</label>
<x-markdown::editor
    id="description"
    name="description"
    :value="old('description', $description ?? '')"
    :rows="8"
    placeholder="Escribe en Markdown"
/>
```

El campo participa en el envío normal del formulario mediante `name`. Incluye edición,
vista previa y herramientas para títulos, negrita, cursiva, enlaces, listas, checklist,
citas y código. La aplicación valida, autoriza y guarda el texto original.

## Editor Livewire

```blade
<x-markdown::editor id="description" wire:model="description" />
<x-markdown::editor id="notes" wire:model.live.debounce.250ms="notes" />
```

Los modificadores de `wire:model` se transmiten sin cambios. La propiedad y la acción
de guardado pertenecen al componente Livewire de la aplicación. No uses `wire:ignore`
en el contenedor sin implementar un puente explícito de sincronización.

## Visor

```blade
<x-markdown::viewer :value="$description" class="article-content" />
```

El visor utiliza CommonMark, elimina HTML embebido y deshabilita enlaces inseguros.
Para mostrar las etiquetas HTML como texto, utiliza `html-input="escape"`.
El visor no ejecuta automáticamente Mermaid; para mejorar los bloques renderizados,
carga `vendor/laravel-markdown/editor.js` una sola vez en la página.

La vista previa cliente utiliza el dialecto histórico del editor y escapa HTML en
el componente portable. No garantiza el mismo resultado que CommonMark en todos los
casos (por ejemplo, tablas). No es un editor WYSIWYG ni un sustituto completo de CKEditor.
Mermaid se carga bajo demanda desde jsDelivr (`mermaid@11`), con `securityLevel: strict`;
requiere acceso de red y una CSP compatible. No incluye carga de archivos o imágenes.

## Perfiles de compatibilidad

Se conservan los perfiles `markdown::profiles.gesthor`, `miso` y `quizlab` para facilitar
la adopción en esas aplicaciones. Son adaptadores opcionales que dependen de sus
estilos, traducciones y contratos originales; no son el punto de entrada para un
proyecto Laravel nuevo. Los componentes `x-markdown::editor` y `x-markdown::viewer`
son las interfaces portables.

Gesthor publica además `php artisan vendor:publish --tag=markdown-gesthor --force`
para conservar su URL histórica y `window.GesthorMarkdownEditor`. Sus lectores de
HTML legado siguen siendo responsabilidad de la aplicación; no sustituirlos por el
visor portable ni convertir registros automáticamente.

## Desarrollo, validación y versiones

Consulta [validación](docs/VALIDATION.md) y [publicación](docs/RELEASE.md).
Las aplicaciones consumidoras mantienen su propio `composer.lock`. Las versiones
públicas se obtienen de etiquetas Git; no se fija `version` en el manifiesto.
Publica cada corrección mediante una nueva etiqueta: no reemplaces etiquetas existentes.

## Licencia

[MIT](LICENSE).
