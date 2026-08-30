import { describe, expect, it, vi } from 'vitest';
import { createExtensionPlatform, type ExtensionBrowserApi, type ExtensionTab } from './adapter';

function createBrowserApi(): ExtensionBrowserApi {
  const event = {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };

  return {
    runtime: {
      getURL: vi.fn((path: string) => `browser://${path}`),
      sendMessage: vi.fn(),
      onMessage: event,
    },
    tabs: {
      get: vi.fn(),
      query: vi.fn(),
      sendMessage: vi.fn(),
      onActivated: event,
      onUpdated: event,
      onRemoved: event,
    },
    action: {
      disable: vi.fn(),
      enable: vi.fn(),
      setIcon: vi.fn(),
      setTitle: vi.fn(),
      onClicked: event,
    },
    scripting: {
      executeScript: vi.fn(),
    },
  };
}

describe('extension platform adapter', () => {
  it('opens the Chromium side panel for the active tab window', async () => {
    const api = createBrowserApi();
    const open = vi.fn().mockResolvedValue(undefined);
    api.sidePanel = { open };
    const platform = createExtensionPlatform(api, 'chromium');

    await platform.openPanel({ windowId: 42 });

    expect(open).toHaveBeenCalledWith({ windowId: 42 });
  });

  it('opens the Firefox sidebar without Chromium window options', async () => {
    const api = createBrowserApi();
    const open = vi.fn().mockResolvedValue(undefined);
    api.sidebarAction = { open };
    const platform = createExtensionPlatform(api, 'firefox');

    await platform.openPanel({ windowId: 42 });

    expect(open).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith();
  });

  it('rejects an unavailable panel API or missing window', async () => {
    const chromiumPlatform = createExtensionPlatform(createBrowserApi(), 'chromium');
    const firefoxPlatform = createExtensionPlatform(createBrowserApi(), 'firefox');

    await expect(chromiumPlatform.openPanel({ windowId: 42 })).rejects.toThrow(
      'Chromium side panel API is unavailable',
    );
    await expect(
      createExtensionPlatform(
        Object.assign(createBrowserApi(), {
          sidePanel: { open: vi.fn().mockResolvedValue(undefined) },
        }),
        'chromium',
      ).openPanel({} as ExtensionTab),
    ).rejects.toThrow('does not belong to a browser window');
    await expect(firefoxPlatform.openPanel({})).rejects.toThrow(
      'Firefox sidebar API is unavailable',
    );
  });
});
