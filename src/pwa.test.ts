// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { manifestIcons } from '../vite.config';

describe('PWA icons', () => {
  it.each(manifestIcons)('$src exists with declared size', async ({ src, sizes }) => {
    const file = resolve(__dirname, '../public', src);
    expect(existsSync(file)).toBe(true);
    const meta = await sharp(file).metadata();
    expect(`${meta.width}x${meta.height}`).toBe(sizes);
    expect(meta.format).toBe('png');
  });
});

describe('index.html', () => {
  it('viewport laat de pagina met het toetsenbord meekrimpen (I-3)', () => {
    const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content" />');
  });
});
