@props(['value' => '', 'htmlInput' => 'strip'])
<div {{ $attributes }}>{{ \Edwin\LaravelMarkdown\Renderer::render($value, $htmlInput) }}</div>
