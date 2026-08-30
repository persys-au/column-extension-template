import { describe, expect, it, vi } from 'vitest';

const { browserApi } = vi.hoisted(() => {
  const event = {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };

  return {
    browserApi: {
      runtime: {
        getURL: vi.fn(),
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
      sidePanel: {
        open: vi.fn().mockResolvedValue(undefined),
      },
    },
  };
});

vi.mock('webextension-polyfill', () => ({ default: browserApi }));

import { extensionPlatform } from './browser';

describe('browser platform binding', () => {
  it('binds the polyfilled API and Chromium panel in a Chromium runtime', async () => {
    expect(extensionPlatform.kind).toBe('chromium');

    await extensionPlatform.openPanel({ windowId: 7 });

    expect(browserApi.sidePanel.open).toHaveBeenCalledWith({ windowId: 7 });
  });
});
