(function (window) {
    'use strict';

    function editorFromElement(element) {
        return element ? element.closest('.gh-markdown-editor') : null;
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

    function render(markdown, emptyText) {
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

        var hasHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
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

        output.innerHTML = render(textarea.value, output.dataset.emptyText || '');
        renderMermaid(output);
    }

    function initialize(element) {
        var editor = editorFromElement(element) || element;

        if (!editor) {
            return;
        }

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

    window.GesthorMarkdownEditor = {
        initialize: initialize,
        insertSnippet: insertSnippet,
        updatePreview: updatePreview,
        renderMermaid: renderMermaid,
        upgradeServerRenderedMermaid: upgradeServerRenderedMermaid,
    };

    // Diagramas mermaid en contenido renderizado por el servidor (vistas show).
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            upgradeServerRenderedMermaid(document);
        });
    } else {
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
                document.querySelectorAll('.gh-markdown-editor').forEach(function (editor) {
                    var output = preview(editor);

                    if (output && output.offsetParent !== null && output.innerHTML.trim() === '') {
                        updatePreview(editor);
                    }
                });
            });
        });
    });
})(window);
