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

Instalación de la versión pública actual (`v0.1.0`) desde Packagist:

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

## Scroll y ampliación (próxima versión 0.2.0)

El cuerpo del editor tiene scroll interno y un límite predeterminado de `60dvh`.
La barra permanece visible. La aplicación puede definir `--lm-content-max-height`
en un contenedor para ajustarlo al espacio de un formulario o modal.

El botón **Ampliar / Restaurar** permite escribir o leer ocupando el viewport con
márgenes. No utiliza la pantalla completa del navegador ni guarda automáticamente.
Conserva el mismo textarea, su formulario, selección y bindings; permite alternar
edición/vista previa. Escape restaura el campo antes de cerrar el modal anfitrión.
El foco queda dentro de la superficie y se devuelve al control de origen.

```blade
<x-markdown::editor id="notes" name="notes" :expandable="false" />
```

`expandable` es verdadero por defecto. La ampliación requiere Popover API; si no
está disponible, el botón se oculta y el editor con scroll continúa funcionando.
`--lm-expanded-margin` controla los márgenes (16px; 8px en móvil). El tamaño ampliado
se adapta a `visualViewport`, incluido el teclado móvil. El paquete conserva el
scroll previo de lectura al restaurar, libera foco/scroll/inert al desmontarse o
al ocultarse el formulario. `LaravelMarkdownEditor.restoreExpanded()` permite
restaurar explícitamente antes de cerrar un contenedor desde otra integración.

Esta funcionalidad pertenece al editor portable. Los perfiles históricos conservan
sus contratos; no se cambian automáticamente al actualizar el paquete.

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
