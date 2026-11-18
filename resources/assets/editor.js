(function (window) {
    'use strict';
    if (window.LaravelMarkdownEditor) return;

    function editorFromElement(element) {
        return element ? element.closest('[data-markdown-editor], .gh-markdown-editor') : null;
    }

    function source(editor) {
        return editor ? editor.querySelector('[data-markdown-source]') : null;
    }

    function preview(editor) {
        return editor ? editor.querySelector('[data-markdown-preview]') : null;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function sanitizeHtml(value) {
        var template = document.createElement('template');
        template.innerHTML = String(value || '');

        template.content.querySelectorAll('script, style, iframe, object, embed, form').forEach(function (node) {
            node.remove();
        });

        template.content.querySelectorAll('*').forEach(function (node) {
            Array.prototype.slice.call(node.attributes).forEach(function (attribute) {
                var name = attribute.name.toLowerCase();
                var value = attribute.value || '';

                if (name.indexOf('on') === 0 || (/^(href|src)$/).test(name) && /^\s*javascript:/i.test(value)) {
                    node.removeAttribute(attribute.name);
                }
            });
        });

        return template.innerHTML;
    }

    function renderLists(html) {
        var lines = html.split('\n');
        var rendered = [];
        var list = [];

        function flush() {
            if (list.length > 0) {
                rendered.push('<ul>' + list.map(function (item) {
                    return '<li>' + item + '</li>';
                }).join('') + '</ul>');
                list = [];
            }
        }

        lines.forEach(function (line) {
            var match = line.match(/^- (?:\[([ xX])\] )?(.*)$/);

            if (match) {
                var checked = match[1] && match[1].toLowerCase() === 'x';
                var prefix = match[1]
                    ? '<span class="gh-markdown-editor__checkbox" aria-hidden="true">' + (checked ? '&#9745;' : '&#9744;') + '</span> '
                    : '';
                list.push(prefix + match[2]);
            } else {
                flush();
                rendered.push(line);
            }
        });
        flush();

        return rendered.join('\n');
    }

    function render(markdown, emptyText, allowLegacyHtml) {
        var raw = String(markdown || '');

        // Extrae bloques de código y diagramas ANTES de cualquier formateo para
        // que su contenido (guiones bajos, asteriscos, etc.) quede intacto.
        var mermaidBlocks = [];
        var codeBlocks = [];
        var inlineCodes = [];

        raw = raw.replace(/```mermaid[ \t]*\r?\n([\s\S]*?)```/g, function (match, body) {
            mermaidBlocks.push(body);
            return '\uE000M' + (mermaidBlocks.length - 1) + '\uE000';
        });
        raw = raw.replace(/```[\w-]*[ \t]*\r?\n?([\s\S]*?)```/g, function (match, body) {
            codeBlocks.push(body);
            return '\uE000C' + (codeBlocks.length - 1) + '\uE000';
        });
        raw = raw.replace(/`([^`\n]+)`/g, function (match, body) {
            inlineCodes.push(body);
            return '\uE000I' + (inlineCodes.length - 1) + '\uE000';
        });

        var hasHtml = allowLegacyHtml !== false && /<\/?[a-z][\s\S]*>/i.test(raw);
        var escaped = hasHtml ? sanitizeHtml(raw).trim() : escapeHtml(raw).trim();

        if (!escaped && mermaidBlocks.length === 0 && codeBlocks.length === 0 && inlineCodes.length === 0) {
            return '<span class="text-muted fst-italic">' + escapeHtml(emptyText || '') + '</span>';
        }

        var html = escaped;
        html = html.replace(/^###### (.*)$/gm, '<h6>$1</h6>');
        html = html.replace(/^##### (.*)$/gm, '<h5>$1</h5>');
        html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
        html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Itálica solo cuando los guiones bajos delimitan una palabra completa;
        // los intra-palabra (survey_templates_table) se conservan literales.
        html = html.replace(/(^|[^\w\\])_([^_\n]+)_(?![\w])/g, '$1<em>$2</em>');
        html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        html = html.replace(/^&gt; ?(.*)$/gm, '<blockquote>$1</blockquote>');
        html = renderLists(html);
        html = html.replace(/\n{2,}/g, '</p><p>');
        html = html.replace(/\n/g, '<br>');

        // Restaura los fragmentos protegidos (siempre escapados: son texto plano).
        html = html.replace(/\uE000I(\d+)\uE000/g, function (match, index) {
            return '<code>' + escapeHtml(inlineCodes[index]) + '</code>';
        });
        html = html.replace(/(?:<br>)?\uE000C(\d+)\uE000(?:<br>)?/g, function (match, index) {
            return '<pre><code>' + escapeHtml(codeBlocks[index]) + '</code></pre>';
        });
        html = html.replace(/(?:<br>)?\uE000M(\d+)\uE000(?:<br>)?/g, function (match, index) {
            return '<div class="mermaid">' + escapeHtml(mermaidBlocks[index]) + '</div>';
        });

        return ('<p>' + html + '</p>').replace(/<p>(<h[1-6]>.*?<\/h[1-6]>)<\/p>/gs, '$1');
    }

    // Diagramas Mermaid renderizados con pele (https://pele.run): convierte el texto
    // en SVG de forma síncrona y sin medir el DOM, así que funciona en contenedores
    // ocultos (pestañas, modales, x-show) y no compite con los re-render del preview.
    var PELE_SRC = 'https://cdn.jsdelivr.net/npm/pele@1.13.0/dist/pele.global.js';
    var pelePromise = null;

    function ensurePele() {
        if (window.pele && typeof window.pele.render === 'function') {
            return Promise.resolve(window.pele);
        }

        if (!pelePromise) {
            pelePromise = new Promise(function (resolve, reject) {
                var script = document.createElement('script');
                script.src = PELE_SRC;
                script.onload = function () {
                    if (window.pele && typeof window.pele.render === 'function') resolve(window.pele);
                    else { pelePromise = null; reject(new Error('pele no está disponible')); }
                };
                script.onerror = function () {
                    pelePromise = null;
                    reject(new Error('No se pudo cargar el renderizador de diagramas'));
                };
                document.head.appendChild(script);
            });
        }

        return pelePromise;
    }

    var expandIcon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/></svg>';

    function renderDiagram(pele, node) {
        var src = node.dataset.source !== undefined ? node.dataset.source : node.textContent;
        node.dataset.source = src;
        node.setAttribute('data-processed', 'true');

        var result = null;
        try {
            result = pele.render(src.trim());
        } catch (error) {
            result = {error: error};
        }

        if (!result || result.error || !result.svg) {
            var message = result && result.error && result.error.message ? result.error.message : 'sintaxis no soportada';
            node.classList.add('lm-diagram--error');
            node.innerHTML = '<div class="lm-diagram__error">Diagrama inválido: ' + escapeHtml(message) + '</div><pre><code>' + escapeHtml(src) + '</code></pre>';
            return;
        }

        node.classList.remove('lm-diagram--error');
        node.classList.add('lm-diagram');
        node.innerHTML = '<div class="lm-diagram__canvas">' + result.svg + '</div>'
            + '<button type="button" class="lm-diagram__expand" data-diagram-expand title="Ver a pantalla completa" aria-label="Ver diagrama a pantalla completa">' + expandIcon + '</button>';
    }

    // Estilos del diagrama y del visor: se inyectan aquí porque los diagramas también
    // aparecen en vistas show que no cargan la hoja del editor.
    var DIAGRAM_CSS = ''
        + '.lm-diagram{position:relative;overflow:auto;max-width:100%;margin:.5rem 0}'
        + '.lm-diagram__canvas svg{max-width:100%;height:auto}'
        + '.lm-diagram__expand{position:absolute;top:.25rem;right:.25rem;display:inline-flex;align-items:center;justify-content:center;width:2rem;height:2rem;padding:0;border:1px solid var(--bs-border-color,#d9dee3);border-radius:.375rem;background:var(--bs-body-bg,#fff);color:var(--bs-body-color,#566a7f);opacity:.75;cursor:pointer}'
        + '.lm-diagram__expand:hover,.lm-diagram__expand:focus-visible{opacity:1}'
        + '.lm-diagram__error{color:var(--bs-danger,#b91c1c);font-size:.875em;margin-bottom:.25rem}'
        + '.lm-diagram-viewer{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;display:none;flex-direction:column;background:var(--bs-body-bg,#fff);color:var(--bs-body-color,#566a7f)}'
        + '.lm-diagram-viewer:popover-open{display:flex}'
        + '.lm-diagram-viewer::backdrop{background:rgba(0,0,0,.5)}'
        + '.lm-diagram-viewer__toolbar{display:flex;align-items:center;gap:.375rem;padding:.5rem .75rem;border-bottom:1px solid var(--bs-border-color,#d9dee3)}'
        + '.lm-diagram-viewer__toolbar button{min-width:2.25rem;height:2.25rem;padding:0 .625rem;border:1px solid var(--bs-border-color,#d9dee3);border-radius:.375rem;background:transparent;color:inherit;font-size:1rem;line-height:1;cursor:pointer}'
        + '.lm-diagram-viewer__toolbar button:hover{background:rgba(0,0,0,.05)}'
        + '.lm-diagram-viewer__zoom{min-width:3.5rem;font-size:.875rem;font-variant-numeric:tabular-nums}'
        + '.lm-diagram-viewer__close{margin-left:auto;font-size:1.25rem!important}'
        + '.lm-diagram-viewer__stage{position:relative;flex:1;overflow:hidden;cursor:grab;touch-action:none;outline:none}'
        + '.lm-diagram-viewer__stage.is-dragging{cursor:grabbing}'
        + '.lm-diagram-viewer__content{position:absolute;top:0;left:0;transform-origin:0 0}'
        + '.lm-diagram-viewer__content svg{display:block}'
        + '.lm-diagram-viewer__hint{padding:.25rem .75rem;font-size:.75rem;opacity:.7;text-align:center}';

    function injectDiagramStyles() {
        if (document.getElementById('lm-diagram-styles')) return;
        var style = document.createElement('style');
        style.id = 'lm-diagram-styles';
        style.textContent = DIAGRAM_CSS;
        document.head.appendChild(style);
    }

    function renderMermaid(container) {
        injectDiagramStyles();
        var nodes = (container || document).querySelectorAll('.mermaid:not([data-processed])');

        if (nodes.length === 0) {
            return;
        }

        ensurePele().then(function (pele) {
            nodes.forEach(function (node) {
                if (node.isConnected && !node.hasAttribute('data-processed')) renderDiagram(pele, node);
            });
        }).catch(function (error) {
            console.error(error);
        });
    }

    // ---- Visor de diagramas a pantalla completa -------------------------------------------
    // Usa la Popover API (top layer): queda encima de cualquier modal Bootstrap o del editor
    // ampliado sin abrir un segundo .modal (sin modal sobre modal, z-index ni robo de foco).
    var viewer = null;

    function buildViewer() {
        var root = document.createElement('div');
        root.className = 'lm-diagram-viewer';
        root.setAttribute('popover', 'manual');
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-label', 'Diagrama a pantalla completa');
        root.innerHTML = ''
            + '<div class="lm-diagram-viewer__toolbar">'
            + '<button type="button" data-viewer="zoom-in" title="Acercar (+)" aria-label="Acercar">+</button>'
            + '<button type="button" data-viewer="zoom-out" title="Alejar (-)" aria-label="Alejar">&minus;</button>'
            + '<button type="button" data-viewer="fit" title="Ajustar a pantalla (0)" aria-label="Ajustar a pantalla">Ajustar</button>'
            + '<button type="button" data-viewer="reset" title="Tamaño real (1)" aria-label="Tamaño real">100%</button>'
            + '<span class="lm-diagram-viewer__zoom" aria-live="polite"></span>'
            + '<button type="button" data-viewer="close" class="lm-diagram-viewer__close" title="Cerrar (Esc)" aria-label="Cerrar">&times;</button>'
            + '</div>'
            + '<div class="lm-diagram-viewer__stage" tabindex="0"><div class="lm-diagram-viewer__content"></div></div>'
            + '<div class="lm-diagram-viewer__hint">Arrastra para mover · Rueda para acercar/alejar · Flechas para desplazar</div>';
        document.body.appendChild(root);
        // El focus trap del modal Bootstrap escucha focusin en document: no debe verlo.
        root.addEventListener('focusin', function (event) { event.stopPropagation(); });

        var state = {root: root, stage: root.querySelector('.lm-diagram-viewer__stage'),
            content: root.querySelector('.lm-diagram-viewer__content'), label: root.querySelector('.lm-diagram-viewer__zoom'),
            scale: 1, x: 0, y: 0, width: 0, height: 0, invoker: null, drag: null, pointers: new Map(), pinch: null};

        root.addEventListener('click', function (event) {
            var button = event.target.closest('[data-viewer]');
            if (!button) return;
            var action = button.dataset.viewer;
            if (action === 'close') closeViewer();
            else if (action === 'fit') fitViewer();
            else if (action === 'reset') zoomTo(1);
            else zoomBy(action === 'zoom-in' ? 1.25 : 0.8);
        });

        state.stage.addEventListener('wheel', function (event) {
            event.preventDefault();
            var rect = state.stage.getBoundingClientRect();
            zoomBy(Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0015)), event.clientX - rect.left, event.clientY - rect.top);
        }, {passive: false});

        state.stage.addEventListener('pointerdown', function (event) {
            state.stage.setPointerCapture(event.pointerId);
            state.pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
            if (state.pointers.size === 2) {
                var p = Array.from(state.pointers.values());
                state.pinch = {distance: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)};
                state.drag = null;
            } else {
                state.drag = {x: event.clientX - state.x, y: event.clientY - state.y};
                state.stage.classList.add('is-dragging');
            }
        });
        state.stage.addEventListener('pointermove', function (event) {
            if (!state.pointers.has(event.pointerId)) return;
            state.pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
            if (state.pinch && state.pointers.size === 2) {
                var p = Array.from(state.pointers.values());
                var distance = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
                var rect = state.stage.getBoundingClientRect();
                zoomBy(distance / state.pinch.distance, (p[0].x + p[1].x) / 2 - rect.left, (p[0].y + p[1].y) / 2 - rect.top);
                state.pinch.distance = distance;
            } else if (state.drag) {
                state.x = event.clientX - state.drag.x;
                state.y = event.clientY - state.drag.y;
                applyTransform();
            }
        });
        function endPointer(event) {
            state.pointers.delete(event.pointerId);
            if (state.pointers.size < 2) state.pinch = null;
            if (state.pointers.size === 0) { state.drag = null; state.stage.classList.remove('is-dragging'); }
        }
        state.stage.addEventListener('pointerup', endPointer);
        state.stage.addEventListener('pointercancel', endPointer);

        return state;
    }

    function applyTransform() {
        viewer.content.style.transform = 'translate(' + viewer.x + 'px,' + viewer.y + 'px) scale(' + viewer.scale + ')';
        viewer.label.textContent = Math.round(viewer.scale * 100) + '%';
    }

    function zoomTo(scale, cx, cy) {
        var rect = viewer.stage.getBoundingClientRect();
        cx = cx === undefined ? rect.width / 2 : cx;
        cy = cy === undefined ? rect.height / 2 : cy;
        scale = Math.min(8, Math.max(0.05, scale));
        // Mantiene fijo el punto bajo el cursor.
        viewer.x = cx - (cx - viewer.x) * (scale / viewer.scale);
        viewer.y = cy - (cy - viewer.y) * (scale / viewer.scale);
        viewer.scale = scale;
        applyTransform();
    }

    function zoomBy(factor, cx, cy) {
        zoomTo(viewer.scale * factor, cx, cy);
    }

    function fitViewer() {
        var rect = viewer.stage.getBoundingClientRect();
        var padding = 32;
        var scale = Math.min((rect.width - padding * 2) / viewer.width, (rect.height - padding * 2) / viewer.height, 4);
        viewer.scale = scale > 0 && isFinite(scale) ? scale : 1;
        viewer.x = (rect.width - viewer.width * viewer.scale) / 2;
        viewer.y = (rect.height - viewer.height * viewer.scale) / 2;
        applyTransform();
    }

    function viewerKey(event) {
        if (!viewer || !viewer.root.matches(':popover-open')) return;
        var step = 60;
        var handled = true;
        if (event.key === 'Escape') closeViewer();
        else if (event.key === '+' || event.key === '=') zoomBy(1.25);
        else if (event.key === '-' || event.key === '_') zoomBy(0.8);
        else if (event.key === '0') fitViewer();
        else if (event.key === '1') zoomTo(1);
        else if (event.key === 'ArrowLeft') { viewer.x += step; applyTransform(); }
        else if (event.key === 'ArrowRight') { viewer.x -= step; applyTransform(); }
        else if (event.key === 'ArrowUp') { viewer.y += step; applyTransform(); }
        else if (event.key === 'ArrowDown') { viewer.y -= step; applyTransform(); }
        else if (event.key === 'Tab') {
            var targets = Array.from(viewer.root.querySelectorAll('button, [tabindex="0"]'));
            var index = targets.indexOf(document.activeElement);
            var next = event.shiftKey ? (index <= 0 ? targets.length - 1 : index - 1) : (index + 1) % targets.length;
            targets[next].focus();
        } else handled = false;
        if (handled) {
            // Captura: ni el modal Bootstrap ni el editor ampliado reciben la tecla (Esc no los cierra).
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }

    function viewerFocus(event) {
        if (viewer && viewer.root.matches(':popover-open') && !viewer.root.contains(event.target)) {
            event.stopImmediatePropagation();
            viewer.stage.focus({preventScroll: true});
        }
    }

    function openViewer(diagram, invoker) {
        var svg = diagram.querySelector('.lm-diagram__canvas svg');
        if (!svg || typeof HTMLElement.prototype.showPopover !== 'function') return;
        if (!viewer) viewer = buildViewer();

        var clone = svg.cloneNode(true);
        var box = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : svg.getBBox();
        viewer.width = parseFloat(svg.getAttribute('width')) || box.width || 800;
        viewer.height = parseFloat(svg.getAttribute('height')) || box.height || 600;
        clone.setAttribute('width', viewer.width);
        clone.setAttribute('height', viewer.height);
        clone.style.maxWidth = 'none';
        viewer.content.innerHTML = '';
        viewer.content.appendChild(clone);
        viewer.invoker = invoker || null;

        // Re-mostrar lo sube al tope del top layer, por encima del editor ampliado.
        if (viewer.root.matches(':popover-open')) viewer.root.hidePopover();
        viewer.root.showPopover();
        document.addEventListener('keydown', viewerKey, true);
        document.addEventListener('focusin', viewerFocus, true);
        fitViewer();
        viewer.stage.focus({preventScroll: true});
    }

    function closeViewer() {
        if (!viewer || !viewer.root.matches(':popover-open')) return;
        viewer.root.hidePopover();
        document.removeEventListener('keydown', viewerKey, true);
        document.removeEventListener('focusin', viewerFocus, true);
        viewer.content.innerHTML = '';
        if (viewer.invoker && viewer.invoker.isConnected) viewer.invoker.focus({preventScroll: true});
        viewer.invoker = null;
    }

    document.addEventListener('click', function (event) {
        var button = event.target.closest && event.target.closest('[data-diagram-expand]');
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        openViewer(button.closest('.lm-diagram'), button);
    });

    // Convierte los bloques ```mermaid renderizados en servidor (@markdown_content
    // genera <pre><code class="language-mermaid">) en diagramas.
    function upgradeServerRenderedMermaid(root) {
        (root || document).querySelectorAll('pre > code.language-mermaid').forEach(function (code) {
            var pre = code.parentElement;
            var div = document.createElement('div');
            div.className = 'mermaid';
            div.textContent = code.textContent;
            pre.replaceWith(div);
        });
        renderMermaid(root || document);
    }

    function updatePreview(element) {
        var editor = editorFromElement(element);
        var textarea = source(editor);
        var output = preview(editor);

        if (!textarea || !output) {
            return;
        }

        output.innerHTML = render(textarea.value, output.dataset.emptyText || '', editor.classList.contains('gh-markdown-editor'));
        renderMermaid(output);
    }

    function initialize(element) {
        var editor = editorFromElement(element) || element;

        if (!editor) {
            return;
        }

        labelToolbar(editor.parentElement || document);
        var mode = editor.dataset.initialMode || 'edit';

        if (mode === 'preview') {
            window.requestAnimationFrame(function () {
                updatePreview(editor);
            });
        }
    }

    function insertSnippet(element, type) {
        var editor = editorFromElement(element);
        var textarea = source(editor);

        if (!textarea) {
            return;
        }

        var start = textarea.selectionStart || 0;
        var end = textarea.selectionEnd || 0;
        var selected = textarea.value.substring(start, end);
        var lines = selected.split(/\r?\n/);
        var snippets = {
            heading: '## ' + (selected || 'Titulo'),
            bold: '**' + (selected || 'texto') + '**',
            italic: '_' + (selected || 'texto') + '_',
            link: '[' + (selected || 'texto') + '](https://)',
            list: selected ? lines.map(function (line) { return '- ' + line; }).join('\n') : '- Elemento',
            checklist: selected ? lines.map(function (line) { return '- [ ] ' + line; }).join('\n') : '- [ ] Elemento',
            quote: selected ? lines.map(function (line) { return '> ' + line; }).join('\n') : '> Cita',
            code: selected && selected.indexOf('\n') < 0 ? '`' + selected + '`' : '```\n' + (selected || 'codigo') + '\n```',
        };
        var snippet = snippets[type] || selected;
        var isBlock = type === 'code' && snippet.indexOf('```') === 0;

        // Un bloque de código va en líneas propias.
        if (isBlock) {
            if (start > 0 && textarea.value[start - 1] !== '\n') snippet = '\n' + snippet;
            if (end < textarea.value.length && textarea.value[end] !== '\n') snippet = snippet + '\n';
        }

        textarea.value = textarea.value.substring(0, start) + snippet + textarea.value.substring(end);
        textarea.focus();
        if (isBlock) {
            // Deja seleccionado el contenido del bloque para escribir encima.
            textarea.selectionStart = start + snippet.indexOf('```') + 4;
            textarea.selectionEnd = start + snippet.lastIndexOf('\n```');
        } else {
            textarea.selectionStart = start;
            textarea.selectionEnd = start + snippet.length;
        }
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        updatePreview(element);
    }

    // Plain Blade toolbar adapter. The QuizLab profile preserves its list/newline contract.
    function insertInto(textarea, type, profile) {
        if (!textarea) return;
        var start = textarea.selectionStart || 0;
        var end = textarea.selectionEnd || 0;
        var picked = textarea.value.slice(start, end);
        var replacements = {
            bold: '**' + (picked || 'texto') + '**',
            italic: '_' + (picked || 'texto') + '_',
            link: '[' + (picked || 'enlace') + '](https://)',
            ul: (picked || 'Elemento').split('\n').map(function (line) { return '- ' + line; }).join('\n'),
            ol: (picked || 'Elemento').split('\n').map(function (line, i) { return (i + 1) + '. ' + line; }).join('\n')
        };
        if (!(type in replacements)) return;
        var replacement = replacements[type];
        if ((type === 'ul' || type === 'ol') && start > 0 && textarea.value[start - 1] !== '\n') {
            replacement = '\n' + replacement;
        }
        textarea.setRangeText(replacement, start, end, 'select');
        textarea.focus();
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function bindToolbar(textarea, root) {
        if (!textarea || !root || root.dataset.markdownToolbarBound) return;
        root.dataset.markdownToolbarBound = 'true';
        root.querySelectorAll('[data-md]').forEach(function (button) {
            button.addEventListener('click', function () { insertInto(textarea, button.dataset.md, 'quizlab'); });
        });
    }

    var portableModes = new WeakMap();
    var portableBound = new WeakSet();

    // Promote the original node: its form, Alpine scope and Livewire bindings stay intact.
    var expandedEditor = null;
    var expansion = null;

    function viewportExpanded() {
        if (!expandedEditor) return;
        var viewport = window.visualViewport;
        var values = {
            left: viewport ? viewport.offsetLeft : 0, top: viewport ? viewport.offsetTop : 0,
            width: viewport ? viewport.width : window.innerWidth,
            height: viewport ? viewport.height : window.innerHeight
        };
        Object.keys(values).forEach(function (key) {
            expandedEditor.style.setProperty('--lm-viewport-' + key, values[key] + 'px');
        });
    }

    function expansionButton(editor, active) {
        var button = editor.querySelector('[data-markdown-expand]');
        if (!button) return;
        button.hidden = typeof editor.showPopover !== 'function';
        button.setAttribute('aria-expanded', String(active));
        var label = active ? 'Restaurar (Esc)' : withShortcut('Ampliar', 'expand');
        button.setAttribute('aria-label', label);
        button.title = label;
        if (active) button.removeAttribute('aria-keyshortcuts'); else button.setAttribute('aria-keyshortcuts', shortcutAria(shortcuts.expand));
        button.querySelector('path').setAttribute('d', active
            ? 'M3 8h5V3M21 8h-5V3M8 21v-5H3M16 21v-5h5'
            : 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5');
    }

    function restoreExpanded(focus) {
        if (!expandedEditor) return;
        var editor = expandedEditor;
        var state = expansion;
        expandedEditor = null;
        expansion = null;
        state.observer.disconnect();
        document.removeEventListener('keydown', expandedKey, true);
        document.removeEventListener('focusin', expandedFocus, true);
        window.removeEventListener('resize', viewportExpanded);
        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', viewportExpanded);
            window.visualViewport.removeEventListener('scroll', viewportExpanded);
        }
        if (editor.matches(':popover-open')) editor.hidePopover();
        editor.removeAttribute('popover');
        editor.classList.remove('lm-editor--expanded');
        ['left', 'top', 'width', 'height'].forEach(function (key) { editor.style.removeProperty('--lm-viewport-' + key); });
        if (state.role === null) editor.removeAttribute('role'); else editor.setAttribute('role', state.role);
        if (state.label === null) editor.removeAttribute('aria-label'); else editor.setAttribute('aria-label', state.label);
        editor.removeAttribute('aria-modal');
        state.inert.forEach(function (item) { item.element.inert = item.inert; });
        document.documentElement.style.overflow = state.overflow;
        expansionButton(editor, false);
        var body = editor.querySelector('[data-markdown-body]');
        if (body) body.scrollTop = state.bodyScroll;
        if (focus !== false && editor.isConnected) {
            (state.invoker && state.invoker.isConnected ? state.invoker : editor.querySelector('[data-markdown-expand]')).focus({preventScroll: true});
        }
    }

    function expandedTargets() {
        return Array.from(expandedEditor.querySelectorAll('button:not([disabled]), textarea, a[href], [tabindex="0"]')).filter(function (el) {
            return el.getClientRects().length && !el.closest('[hidden]');
        });
    }

    function viewerOpen() {
        return !!(viewer && viewer.root.matches(':popover-open'));
    }

    function expandedKey(event) {
        if (!expandedEditor || viewerOpen()) return;
        if (event.key === 'Escape') {
            event.preventDefault(); event.stopImmediatePropagation(); restoreExpanded();
        } else if (event.key === 'Tab') {
            var targets = expandedTargets();
            var first = targets[0], last = targets[targets.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault(); event.stopImmediatePropagation(); last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault(); event.stopImmediatePropagation(); first.focus();
            }
        }
    }

    function expandedFocus(event) {
        if (expandedEditor && !viewerOpen() && !expandedEditor.contains(event.target)) {
            event.stopImmediatePropagation();
            var target = expandedTargets()[0];
            if (target) target.focus({preventScroll: true});
        }
    }

    function syncExpanded() {
        if (!expandedEditor) return;
        var parent = expandedEditor.parentElement;
        if (!expandedEditor.isConnected) { restoreExpanded(false); return; }
        while (parent) {
            if (parent.hidden || getComputedStyle(parent).display === 'none') { restoreExpanded(false); return; }
            parent = parent.parentElement;
        }
        expandedEditor.classList.add('lm-editor--expanded');
        expandedEditor.setAttribute('popover', 'manual');
        expandedEditor.setAttribute('role', 'dialog');
        expandedEditor.setAttribute('aria-label', 'Editor Markdown ampliado');
        expandedEditor.setAttribute('aria-modal', 'true');
        if (!expandedEditor.matches(':popover-open')) expandedEditor.showPopover();
        expansionButton(expandedEditor, true);
        viewportExpanded();
    }

    function expandEditor(editor) {
        if (expandedEditor === editor) { restoreExpanded(); return; }
        if (typeof editor.showPopover !== 'function') return;
        restoreExpanded();
        expandedEditor = editor;
        expansion = {
            invoker: document.activeElement, role: editor.getAttribute('role'), label: editor.getAttribute('aria-label'),
            bodyScroll: editor.querySelector('[data-markdown-body]').scrollTop,
            overflow: document.documentElement.style.overflow, inert: []
        };
        // Only siblings are inert: no DOM reparenting and no inert ancestor of the field.
        var branch = editor;
        while (branch.parentElement && branch !== document.body) {
            Array.from(branch.parentElement.children).forEach(function (sibling) {
                if (sibling === branch || !(sibling instanceof HTMLElement)) return;
                expansion.inert.push({element: sibling, inert: sibling.inert});
                sibling.inert = true;
            });
            branch = branch.parentElement;
        }
        document.documentElement.style.overflow = 'hidden';
        expansion.observer = new MutationObserver(function (changes) {
            if (changes.some(function (change) {
                return change.type === 'childList' || !editor.contains(change.target);
            })) requestAnimationFrame(syncExpanded);
        });
        expansion.observer.observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'hidden', 'class']});
        document.addEventListener('keydown', expandedKey, true);
        document.addEventListener('focusin', expandedFocus, true);
        window.addEventListener('resize', viewportExpanded);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', viewportExpanded);
            window.visualViewport.addEventListener('scroll', viewportExpanded);
        }
        syncExpanded();
        var target = portableModes.get(editor) === 'edit' ? source(editor) : editor.querySelector('[data-markdown-body]');
        target.focus({preventScroll: true});
    }

    function setPortableMode(editor, mode) {
        mode = mode === 'preview' ? 'preview' : 'edit';
        portableModes.set(editor, mode);
        var edit = editor.querySelector('[data-markdown-edit]');
        var output = preview(editor);
        if (edit) edit.hidden = mode !== 'edit';
        if (output) output.hidden = mode !== 'preview';
        editor.querySelectorAll('[data-markdown-mode]').forEach(function (button) {
            button.classList.toggle('active', button.dataset.markdownMode === mode);
            button.setAttribute('aria-pressed', String(button.dataset.markdownMode === mode));
        });
        if (mode === 'preview') updatePreview(editor);
    }

    function initializePortable(root) {
        (root || document).querySelectorAll('.lm-editor[data-markdown-editor]').forEach(function (editor) {
            if (!portableBound.has(editor)) {
                portableBound.add(editor);
                editor.addEventListener('mousedown', function (event) {
                    if (event.target.closest('[data-markdown-snippet]')) event.preventDefault();
                });
                editor.addEventListener('click', function (event) {
                    var button = event.target.closest('[data-markdown-mode], [data-markdown-snippet], [data-markdown-expand]');
                    if (!button) return;
                    if (button.hasAttribute('data-markdown-expand')) {
                        expandEditor(editor);
                    } else if (button.dataset.markdownMode) {
                        setPortableMode(editor, button.dataset.markdownMode);
                        editor.dispatchEvent(new CustomEvent('markdown-editor-mode-changed', {
                            bubbles: true, detail: {editorId: editor.dataset.editorId, mode: portableModes.get(editor)}
                        }));
                    } else {
                        insertSnippet(button, button.dataset.markdownSnippet);
                    }
                });
                editor.addEventListener('input', function () { updatePreview(editor); });
            }
            setPortableMode(editor, portableModes.get(editor) || editor.dataset.initialMode);
            expansionButton(editor, expandedEditor === editor);
        });
        labelToolbar(root);
        syncExpanded();
    }


    // ---- Atajos de teclado, botón Copiar y tooltips con atajo -------------------------------
    // Una sola tabla para ejecutar los atajos y rotular los botones. `mod` = Ctrl (⌘ en Mac).
    var shortcuts = {
        bold: {key: 'b', mod: true},
        italic: {key: 'i', mod: true},
        link: {key: 'k', mod: true},
        checklist: {key: 'l', mod: true},
        copy: {key: 'c', alt: true, shift: true},
        expand: {key: 'f', mod: true, shift: true}
    };

    function isMac(nav) {
        nav = nav || window.navigator || {};
        var platform = (nav.userAgentData && nav.userAgentData.platform) || nav.platform || '';
        return /mac|iphone|ipad/i.test(platform);
    }

    function shortcutLabel(shortcut, mac) {
        if (!shortcut) return '';
        mac = mac === undefined ? isMac() : mac;
        return [shortcut.mod && (mac ? '⌘' : 'Ctrl'), shortcut.alt && (mac ? '⌥' : 'Alt'), shortcut.shift && 'Shift', shortcut.key.toUpperCase()]
            .filter(Boolean).join('+');
    }

    function shortcutAria(shortcut, mac) {
        if (!shortcut) return '';
        mac = mac === undefined ? isMac() : mac;
        return [shortcut.mod && (mac ? 'Meta' : 'Control'), shortcut.alt && 'Alt', shortcut.shift && 'Shift', shortcut.key.toUpperCase()]
            .filter(Boolean).join('+');
    }

    /** «Negrita (Ctrl+B)»; sin atajo devuelve la etiqueta tal cual. */
    function withShortcut(label, action, mac) {
        var shortcut = shortcuts[action];
        return shortcut ? label + ' (' + shortcutLabel(shortcut, mac) + ')' : label;
    }

    function shortcutAction(event, mac) {
        mac = mac === undefined ? isMac() : mac;
        var key = String(event.key || '').toLowerCase();
        var code = String(event.code || '').toLowerCase();
        var mod = mac ? event.metaKey : event.ctrlKey;
        var actions = Object.keys(shortcuts);
        for (var i = 0; i < actions.length; i++) {
            var shortcut = shortcuts[actions[i]];
            // Con Alt el carácter cambia según el teclado (Alt+C → «ç» en Mac): se compara también el código físico.
            var keyMatches = key === shortcut.key || code === 'key' + shortcut.key;
            if (keyMatches && !!shortcut.mod === !!mod && !!shortcut.alt === !!event.altKey && !!shortcut.shift === !!event.shiftKey) {
                return actions[i];
            }
        }
        return null;
    }

    // Solo escribe si cambia: quien observe `title` (p. ej. un adaptador) no entra en bucle.
    function setAttr(element, name, value) {
        if (element.getAttribute(name) !== value) element.setAttribute(name, value);
    }

    function labelButton(button, label, action) {
        var text = withShortcut(label, action);
        setAttr(button, 'aria-label', text);
        setAttr(button, 'title', text);
        var aria = shortcutAria(shortcuts[action]);
        if (aria) setAttr(button, 'aria-keyshortcuts', aria);
    }

    /** Añade el atajo al tooltip de cada botón de la barra (estándar y perfil Gesthor). */
    function labelToolbar(root) {
        (root || document).querySelectorAll('[data-markdown-editor]').forEach(function (editor) {
            editor.querySelectorAll('[data-markdown-snippet]').forEach(function (button) {
                if (!button.dataset.markdownLabel) {
                    button.dataset.markdownLabel = button.textContent.trim() || button.getAttribute('title') || button.getAttribute('aria-label') || '';
                }
                if (button.dataset.markdownLabel) labelButton(button, button.dataset.markdownLabel, button.dataset.markdownSnippet);
            });
            var copy = editor.querySelector('[data-markdown-copy]');
            if (copy && !copy.classList.contains('is-copied') && !copy.classList.contains('is-failed')) labelButton(copy, 'Copiar contenido', 'copy');
        });
    }

    var copyIcons = {
        idle: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/>',
        done: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
        fail: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="m10 12 4 4m0-4-4 4"/>'
    };

    // El icono puede ser el SVG del paquete o un <i> de la app con data-copy-idle/-done/-fail.
    function setCopyIcon(button, state) {
        var svg = button.querySelector('svg[data-markdown-copy-icon]');
        if (svg) { svg.innerHTML = copyIcons[state]; return; }
        var icon = button.querySelector('i[data-copy-idle]');
        if (icon) icon.className = icon.getAttribute('data-copy-' + state) || icon.getAttribute('data-copy-idle');
    }

    /** Copia el Markdown crudo del editor (también desde la vista previa). */
    function copyMarkdown(element) {
        var editor = editorFromElement(element);
        var button = editor && editor.querySelector('[data-markdown-copy]');
        var textarea = source(editor);
        var text = textarea ? textarea.value : '';
        if (!button || !text.trim()) return Promise.resolve(false);

        function fallback() {
            // Sin Clipboard API (HTTP, navegador antiguo): copia desde un textarea temporal.
            var helper = document.createElement('textarea');
            helper.value = text;
            helper.readOnly = true;
            helper.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
            editor.appendChild(helper);
            helper.select();
            var ok = false;
            try { ok = document.execCommand('copy'); } catch (error) { ok = false; }
            helper.remove();
            return ok;
        }

        var attempt = navigator.clipboard && navigator.clipboard.writeText
            ? navigator.clipboard.writeText(text).then(function () { return true; }, fallback)
            : Promise.resolve(fallback());

        return attempt.then(function (copied) {
            var label = copied ? 'Copiado' : 'No se pudo copiar';
            clearTimeout(button.markdownCopyTimer);
            button.classList.toggle('is-copied', copied);
            button.classList.toggle('is-failed', !copied);
            setAttr(button, 'aria-label', label);
            setAttr(button, 'title', label);
            setCopyIcon(button, copied ? 'done' : 'fail');
            var status = button.querySelector('[data-markdown-copy-status]');
            if (!status) {
                status = document.createElement('span');
                status.setAttribute('role', 'status');
                status.setAttribute('data-markdown-copy-status', '');
                status.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
                button.appendChild(status);
            }
            status.textContent = label;
            button.markdownCopyTimer = setTimeout(function () {
                button.classList.remove('is-copied', 'is-failed');
                labelButton(button, 'Copiar contenido', 'copy');
                setCopyIcon(button, 'idle');
                status.textContent = '';
            }, 1500);
            return copied;
        });
    }

    /** Ctrl+L: alterna la casilla de la línea actual (añade «- [ ] », la marca o la quita). */
    function toggleChecklistLine(textarea) {
        var start = textarea.selectionStart;
        var value = textarea.value;
        var lineStart = value.lastIndexOf('\n', start - 1) + 1;
        var lineEnd = value.indexOf('\n', start);
        var lineText = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
        var after = value.substring(lineStart + lineText.length);
        var unchecked = '- [ ] ';
        var checked = '- [x] ';

        if (lineText.indexOf(unchecked) === 0) {
            textarea.value = value.substring(0, lineStart) + checked + lineText.substring(unchecked.length) + after;
            textarea.selectionStart = textarea.selectionEnd = start;
        } else if (lineText.indexOf(checked) === 0) {
            textarea.value = value.substring(0, lineStart) + lineText.substring(checked.length) + after;
            textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - checked.length);
        } else {
            textarea.value = value.substring(0, lineStart) + unchecked + value.substring(lineStart);
            textarea.selectionStart = textarea.selectionEnd = start + unchecked.length;
        }
        textarea.dispatchEvent(new Event('input', {bubbles: true}));
    }

    document.addEventListener('click', function (event) {
        var button = event.target.closest && event.target.closest('[data-markdown-copy]');
        if (button) copyMarkdown(button);
    });

    // Atajos activos solo con el foco dentro de un editor (también ampliado).
    document.addEventListener('keydown', function (event) {
        var editor = event.target.closest && editorFromElement(event.target);
        if (!editor) return;
        var action = shortcutAction(event);
        if (!action) return;
        var textarea = source(editor);

        if (action === 'copy') {
            if (!editor.querySelector('[data-markdown-copy]')) return;
            event.preventDefault();
            copyMarkdown(editor);
        } else if (action === 'expand') {
            var expand = editor.querySelector('[data-markdown-expand]');
            if (!expand || expand.hidden || !editor.classList.contains('lm-editor')) return;
            event.preventDefault();
            expandEditor(editor);
        } else if (action === 'checklist') {
            if (event.target !== textarea) return;
            event.preventDefault();
            toggleChecklistLine(textarea);
        } else {
            if (event.target !== textarea) return;
            event.preventDefault();
            insertSnippet(textarea, action);
        }
    });

    window.addEventListener('markdown-editor-set-mode', function (event) {
        document.querySelectorAll('.lm-editor[data-markdown-editor]').forEach(function (editor) {
            if (event.detail && event.detail.editorId === editor.dataset.editorId) setPortableMode(editor, event.detail.mode);
        });
    });

    window.LaravelMarkdownEditor = {
        restoreExpanded: restoreExpanded,
        render: render,
        insertInto: insertInto,
        bindToolbar: bindToolbar,
        initialize: initialize,
        initializePortable: initializePortable,
        insertSnippet: insertSnippet,
        updatePreview: updatePreview,
        renderMermaid: renderMermaid,
        upgradeServerRenderedMermaid: upgradeServerRenderedMermaid,
        copy: copyMarkdown,
        labelToolbar: labelToolbar,
        shortcuts: shortcuts,
        shortcutAction: shortcutAction,
        shortcutLabel: shortcutLabel,
        shortcutAria: shortcutAria,
        withShortcut: withShortcut,
    };

    window.GesthorMarkdownEditor = window.LaravelMarkdownEditor;

    // Diagramas mermaid en contenido renderizado por el servidor (vistas show).
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            initializePortable(document);
            upgradeServerRenderedMermaid(document);
        });
    } else {
        initializePortable(document);
        upgradeServerRenderedMermaid(document);
    }

    // La vista previa es contenido generado en el cliente: el servidor siempre
    // envía el div vacío, así que el morph de Livewire la deja en blanco tras
    // cualquier acción del componente. Re-renderiza las vistas previas visibles
    // que hayan quedado vacías después de cada morph.
    document.addEventListener('livewire:init', function () {
        if (!window.Livewire || typeof window.Livewire.hook !== 'function') {
            return;
        }

        var scheduled = false;

        window.Livewire.hook('morph.updated', function () {
            if (scheduled) {
                return;
            }

            scheduled = true;
            window.requestAnimationFrame(function () {
                scheduled = false;
                initializePortable(document);
                document.querySelectorAll('[data-markdown-editor], .gh-markdown-editor').forEach(function (editor) {
                    var output = preview(editor);

                    if (output && output.offsetParent !== null && output.innerHTML.trim() === '') {
                        updatePreview(editor);
                    }
                });
            });
        });
    });
})(window);
