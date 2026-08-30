import browser from 'webextension-polyfill';
import {
  createExtensionPlatform,
  type ExtensionBrowserApi,
  type ExtensionPlatform,
} from './adapter';

interface BrowserGlobals {
  browser?: {
    sidebarAction?: unknown;
  };
  chrome?: {
    sidePanel?: ExtensionBrowserApi['sidePanel'];
  };
}

const browserGlobals = globalThis as unknown as BrowserGlobals;
const browserApi = browser as unknown as ExtensionBrowserApi;
const browserKind = browserGlobals.browser?.sidebarAction ? 'firefox' : 'chromium';
const chromiumPanelApi = browserGlobals.chrome?.sidePanel;

const platformApi: ExtensionBrowserApi = chromiumPanelApi
  ? { ...browserApi, sidePanel: chromiumPanelApi }
  : browserApi;

export const extensionPlatform: ExtensionPlatform = createExtensionPlatform(
  platformApi,
  browserKind,
);
