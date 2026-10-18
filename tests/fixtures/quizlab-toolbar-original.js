    const descTextarea = document.getElementById('wizard-description');
    document.querySelectorAll('[data-md]').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!descTextarea) return;
            const kind = this.dataset.md;
            const start = descTextarea.selectionStart;
            const end = descTextarea.selectionEnd;
            const val = descTextarea.value;
            const picked = val.slice(start, end);

            let replacement = '';
            if (kind === 'bold') {
                replacement = `**${picked || 'texto'}**`;
            } else if (kind === 'italic') {
                replacement = `_${picked || 'texto'}_`;
            } else if (kind === 'link') {
                replacement = `[${picked || 'enlace'}](https://)`;
            } else if (kind === 'ul') {
                replacement = (picked || 'Elemento').split('\n').map(l => `- ${l}`).join('\n');
                if (start > 0 && val[start - 1] !== '\n') replacement = '\n' + replacement;
            } else if (kind === 'ol') {
                replacement = (picked || 'Elemento').split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n');
                if (start > 0 && val[start - 1] !== '\n') replacement = '\n' + replacement;
            }

            descTextarea.setRangeText(replacement, start, end, 'select');
            descTextarea.focus();
            descTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
    });
