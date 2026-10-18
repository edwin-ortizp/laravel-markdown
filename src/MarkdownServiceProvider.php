<?php

namespace Edwin\LaravelMarkdown;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

class MarkdownServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $root = dirname(__DIR__);
        $this->loadViewsFrom($root.'/resources/views', 'markdown');
        Blade::anonymousComponentPath($root.'/resources/views/components', 'markdown');
        $this->publishes([$root.'/resources/assets' => public_path('vendor/laravel-markdown')], 'markdown-assets');
        // Compatibility path used by existing Gesthor layouts and test fixtures.
        $this->publishes([$root.'/resources/assets/editor.js' => public_path('gesthor/js/markdown-editor.js')], 'markdown-gesthor');
    }
}
