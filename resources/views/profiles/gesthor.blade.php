@php
    use Illuminate\Support\Str;
    use Illuminate\View\ComponentAttributeBag;

    $name = $name ?? null;
    $value = $value ?? '';
    $id = $id ?? ($name ? Str::slug($name, '_').'_markdown' : 'markdown_'.Str::random(8));
    $rows = $rows ?? 6;
    $placeholder = $placeholder ?? '';
    $emptyText = $emptyText ?? __('fields.description').'...';
    $requestedInitialMode = $initialMode ?? 'edit';
    $initialMode = in_array($requestedInitialMode, ['edit', 'preview'], true) ? $requestedInitialMode : 'edit';
    $wireModel = $wireModel ?? null;
    $wireKey = $wireKey ?? null;
    $saveAction = $saveAction ?? null;
    $cancelAction = $cancelAction ?? null;
    $saveLabel = $saveLabel ?? __('fields.save');
    $cancelLabel = $cancelLabel ?? __('fields.cancel');
    $editorAttributes = new ComponentAttributeBag($attributes ?? []);
    $textareaAttributes = $editorAttributes
        ->merge([
            'id' => $id,
            'rows' => $rows,
            'placeholder' => $placeholder,
        ])
        ->class(['form-control gh-markdown-editor__source']);
@endphp

@once
    <link rel="stylesheet" href="{{ asset('vendor/laravel-markdown/gesthor.css') }}?v=0.3.0">
@endonce

<div
    data-markdown-editor
    class="gh-markdown-editor"
    data-initial-mode="{{ $initialMode }}"
    data-editor-id="{{ $id }}"
    x-data="{ mode: $el.dataset.initialMode || 'edit' }"
    x-init="GesthorMarkdownEditor.initialize($el); $watch('mode', value => { $dispatch('markdown-editor-mode-changed', { mode: value, editorId: $el.dataset.editorId }); if (value === 'preview') { $nextTick(() => GesthorMarkdownEditor.updatePreview($el)); } })"
    @markdown-editor-set-mode.window="if ($event.detail.editorId === $el.dataset.editorId) { mode = $event.detail.mode }"
    @if ($wireKey) wire:key="{{ $wireKey }}" @endif
>
    <div class="gh-markdown-editor__toolbar">
        <div class="gh-markdown-editor__mode" role="group">
            <button type="button" class="gh-markdown-editor__button" :class="{ active: mode === 'edit' }" @mousedown.prevent @click="mode = 'edit'">Editar</button>
            <button type="button" class="gh-markdown-editor__button" :class="{ active: mode === 'preview' }" @mousedown.prevent @click="mode = 'preview'; $nextTick(() => GesthorMarkdownEditor.updatePreview($el))">Vista previa</button>
        </div>

        <button type="button" class="gh-markdown-editor__button" title="Titulo" data-markdown-snippet="heading" @mousedown.prevent @click="GesthorMarkdownEditor.insertSnippet($el, \'heading\')">
            <i class="icon-base ti tabler-heading"></i>
        </button>
        <button type="button" class="gh-markdown-editor__button" title="Negrita" data-markdown-snippet="bold" @mousedown.prevent @click="GesthorMarkdownEditor.insertSnippet($el, \'bold\')">
            <i class="icon-base ti tabler-bold"></i>
        </button>
        <button type="button" class="gh-markdown-editor__button" title="Italica" data-markdown-snippet="italic" @mousedown.prevent @click="GesthorMarkdownEditor.insertSnippet($el, \'italic\')">
            <i class="icon-base ti tabler-italic"></i>
        </button>
        <button type="button" class="gh-markdown-editor__button" title="Enlace" data-markdown-snippet="link" @mousedown.prevent @click="GesthorMarkdownEditor.insertSnippet($el, \'link\')">
            <i class="icon-base ti tabler-link"></i>
        </button>
        <button type="button" class="gh-markdown-editor__button" title="Lista" data-markdown-snippet="list" @mousedown.prevent @click="GesthorMarkdownEditor.insertSnippet($el, \'list\')">
            <i class="icon-base ti tabler-list"></i>
        </button>
        <button type="button" class="gh-markdown-editor__button" title="Checklist" data-markdown-snippet="checklist" @mousedown.prevent @click="GesthorMarkdownEditor.insertSnippet($el, \'checklist\')">
            <i class="icon-base ti tabler-list-check"></i>
        </button>
        <button type="button" class="gh-markdown-editor__button" title="Cita" data-markdown-snippet="quote" @mousedown.prevent @click="GesthorMarkdownEditor.insertSnippet($el, \'quote\')">
            <i class="icon-base ti tabler-blockquote"></i>
        </button>
        <button type="button" class="gh-markdown-editor__button" title="Codigo" data-markdown-snippet="code" @mousedown.prevent @click="GesthorMarkdownEditor.insertSnippet($el, \'code\')">
            <i class="icon-base ti tabler-code"></i>
        </button>
        <button type="button" class="gh-markdown-editor__button gh-markdown-editor__copy" data-markdown-copy title="Copiar contenido" aria-label="Copiar contenido" @mousedown.prevent>
            <i class="icon-base ti tabler-clipboard" data-copy-idle="icon-base ti tabler-clipboard" data-copy-done="icon-base ti tabler-clipboard-check" data-copy-fail="icon-base ti tabler-clipboard-x" aria-hidden="true"></i>
        </button>
    </div>

    <div x-show="mode === 'edit'">
        <textarea
            x-ref="source"
            data-markdown-source
            @input="GesthorMarkdownEditor.updatePreview($el)"
            @if ($name) name="{{ $name }}" @endif
            @if ($wireModel) wire:model="{{ $wireModel }}" @endif
            {{ $textareaAttributes }}
        >{{ $value }}</textarea>
    </div>

    <div
        x-show="mode === 'preview'"
        x-cloak
        x-ref="preview"
        data-markdown-preview
        class="gh-markdown-editor__preview"
        data-empty-text="{{ $emptyText }}"
    ></div>

    @if ($saveAction || $cancelAction)
        <div class="gh-markdown-editor__actions" x-show="mode === 'edit'" x-cloak>
            @if ($saveAction)
                <button type="button" class="btn btn-primary rounded-pill"
                    @click="$wire.{{ $saveAction }}().then(() => { mode = 'preview'; $nextTick(() => GesthorMarkdownEditor.updatePreview($el)); })">{{ $saveLabel }}</button>
            @endif
            @if ($cancelAction)
                <button type="button" class="btn btn-label-secondary rounded-pill waves-effect"
                    @click="$wire.{{ $cancelAction }}().then(() => { mode = 'preview'; $nextTick(() => GesthorMarkdownEditor.updatePreview($el)); })">{{ $cancelLabel }}</button>
            @endif
        </div>
    @endif
</div>
