import { describe, it, expect, afterEach, vi } from 'vitest';
import { downloadFile } from './download';

describe('downloadFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates an object URL and clicks a download link', async () => {
    const click = vi.fn();
    const revoke = vi.fn();
    const createObjectURL = vi.fn().mockReturnValue('blob:photo');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['img'], { type: 'image/jpeg' }),
    }));
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: revoke });

    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'a') {
        el.click = click;
      }
      return el;
    });

    await downloadFile('https://content.prolov.id/a.jpg', 'a.jpg');

    expect(click).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
  });
});
