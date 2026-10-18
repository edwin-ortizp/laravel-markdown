            // --- Puente del editor markdown dentro de modales wire:ignore (GeneralCRUD) ---
            // El modal usa wire:ignore, así que wire:model no sincroniza solo; replicamos
            // el patrón de CKEditor escuchando el evento input del textarea fuente.
            document.addEventListener('input', function(event) {
                const source = event.target;
                if (!source || !source.classList || !source.classList.contains(
                        'gh-markdown-editor__source')) {
                    return;
                }
                if (source.dataset.markdownLivewire !== 'true') {
                    return;
                }
                const fieldName = source.getAttribute('wire:model');
                const componentName = source.dataset.component;
                if (!fieldName || !componentName) {
                    return;
                }
                const component = Livewire.find(componentName);
                if (component) {
                    // tercer parámetro false => actualización diferida (no dispara request por tecla)
                    component.set(fieldName, source.value, false);
                }
            });

            // Carga el contenido en edición y refresca la vista previa
            Livewire.on('markdownLivewireEdit', ([editorData, editorId]) => {
                const source = document.getElementById(editorId);
                if (!source) {
                    return;
                }
                source.value = editorData ?? '';
                // dispara input para sincronizar formData y refrescar la vista previa
                source.dispatchEvent(new Event('input', {
                    bubbles: true
                }));
                if (window.GesthorMarkdownEditor) {
                    window.GesthorMarkdownEditor.updatePreview(source);
                }
            });

            // Limpia el editor markdown (al crear / resetear el formulario)
            Livewire.on('markdownLivewireClean', (data) => {
                const payload = Array.isArray(data) ? data[0] : data;
                const componentId = payload && payload.componentId ? payload.componentId : null;
                const selector = componentId ?
                    `.gh-markdown-editor__source[data-component="${componentId}"]` :
                    '.gh-markdown-editor__source[data-markdown-livewire="true"]';
                document.querySelectorAll(selector).forEach(source => {
                    source.value = '';
                    if (window.GesthorMarkdownEditor) {
                        window.GesthorMarkdownEditor.updatePreview(source);
                    }
                });
            });

