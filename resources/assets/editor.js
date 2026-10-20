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

    var mermaidPromise = null;

    function ensureMermaid() {
        if (window.mermaid) {
            return Promise.resolve(window.mermaid);
        }

        if (!mermaidPromise) {
            mermaidPromise = new Promise(function (resolve, reject) {
                var script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
                script.onload = function () {
                    window.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
                    resolve(window.mermaid);
                };
                script.onerror = function () {
                    mermaidPromise = null;
                    reject(new Error('No se pudo cargar mermaid'));
                };
                document.head.appendChild(script);
            });
        }

        return mermaidPromise;
    }

    function renderMermaid(container) {
        var nodes = (container || document).querySelectorAll('.mermaid:not([data-processed])');

        if (nodes.length === 0) {
            return;
        }

        ensureMermaid().then(function (mermaid) {
            mermaid.run({ nodes: nodes }).catch(function (error) {
                console.error('Error renderizando diagrama mermaid:', error);
            });
        }).catch(function (error) {
            console.error(error);
        });
    }

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
            code: selected.indexOf('\n') >= 0 ? '```\n' + selected + '\n```' : '`' + (selected || 'codigo') + '`',
        };
        var snippet = snippets[type] || selected;

        textarea.value = textarea.value.substring(0, start) + snippet + textarea.value.substring(end);
        textarea.focus();
        textarea.selectionStart = start;
        textarea.selectionEnd = start + snippet.length;
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

    function expandedKey(event) {
        if (!expandedEditor) return;
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
        if (expandedEditor && !expandedEditor.contains(event.target)) {
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
