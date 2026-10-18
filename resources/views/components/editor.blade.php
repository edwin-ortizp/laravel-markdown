@props(['name' => null, 'value' => '', 'id' => null, 'rows' => 6, 'placeholder' => '', 'initialMode' => 'edit', 'emptyText' => 'Sin contenido'])
@php
    // Forward wire:model modifiers unchanged (Livewire 3 and 4).
    $attributes = $attributes->getAttributes();
@endphp
@include('markdown::editor')
