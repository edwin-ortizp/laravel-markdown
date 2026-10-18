@php
    $name = $name ?? null;
    $value = $value ?? '';
    $id = $id ?? ($name ? \Illuminate\Support\Str::slug($name, '_').'_markdown' : 'markdown_'.\Illuminate\Support\Str::random(8));
    $initialMode = ($initialMode ?? 'edit') === 'preview' ? 'preview' : 'edit';
    $textareaAttributes = (new \Illuminate\View\ComponentAttributeBag($attributes ?? []))
        ->merge(['id' => $id, 'rows' => $rows ?? 6, 'placeholder' => $placeholder ?? ''])
        ->class(['lm-editor__source']);
@endphp
@once
    <link rel="stylesheet" href="{{ asset('vendor/laravel-markdown/editor.css') }}?v=0.1.0">
    <script src="{{ asset('vendor/laravel-markdown/editor.js') }}?v=0.1.0"></script>
@endonce
<div data-markdown-editor data-editor-id="{{ $id }}" data-initial-mode="{{ $initialMode }}" class="lm-editor">
    <div class="lm-editor__toolbar" role="toolbar" aria-label="Formato Markdown">
        <div class="lm-editor__mode" role="group" aria-label="Modo del editor">
            <button type="button" class="lm-editor__button" data-markdown-mode="edit">Editar</button>
            <button type="button" class="lm-editor__button" data-markdown-mode="preview">Vista previa</button>
        </div>
        @foreach (['heading' => 'Título', 'bold' => 'Negrita', 'italic' => 'Cursiva', 'link' => 'Enlace', 'list' => 'Lista', 'checklist' => 'Checklist', 'quote' => 'Cita', 'code' => 'Código'] as $tool => $label)
            <button type="button" class="lm-editor__button" data-markdown-snippet="{{ $tool }}">{{ $label }}</button>
        @endforeach
    </div>
    <div data-markdown-edit @if($initialMode !== 'edit') hidden @endif>
        <textarea data-markdown-source @if($name) name="{{ $name }}" @endif {{ $textareaAttributes }}>{{ $value }}</textarea>
    </div>
    <div data-markdown-preview class="lm-editor__preview" data-empty-text="{{ $emptyText ?? 'Sin contenido' }}" @if($initialMode !== 'preview') hidden @endif></div>
</div>
