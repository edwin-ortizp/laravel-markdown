<?php

namespace Edwin\LaravelMarkdown;

use Illuminate\Support\HtmlString;
use Illuminate\Support\Str;
use InvalidArgumentException;

class Renderer
{
    public static function render(?string $value, string $htmlInput = 'strip'): HtmlString
    {
        if (! in_array($htmlInput, ['strip', 'escape'], true)) {
            throw new InvalidArgumentException('Markdown HTML policy must be strip or escape.');
        }

        return new HtmlString(Str::markdown((string) $value, [
            'html_input' => $htmlInput,
            'allow_unsafe_links' => false,
        ]));
    }
}
