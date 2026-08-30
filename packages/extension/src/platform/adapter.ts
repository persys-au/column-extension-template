export type BrowserKind = 'chromium' | 'firefox';

export interface ExtensionTab {
  id?: number;
  windowId?: number;
  url?: string;
}

export interface RuntimeMessageSender {
  tab?: Pick<ExtensionTab, 'id'>;
  url?: string;
}

export interface TabChangeInfo {
  status?: string;
}

export interface TabActiveInfo {
  tabId: number;
  windowId: number;
}

type EventListener = (...args: never[]) => void;

export interface ExtensionEvent<Listener extends EventListener> {
  addListener(listener: Listener): void;
  removeListener(listener: Listener): void;
}

export type RuntimeMessageListener = (
  message: unknown,
  sender: RuntimeMessageSender,
  sendResponse: (response: unknown) => void,
) => boolean | void;

interface RawExtensionBrowserApi {
  runtime: {
    getURL(path: string): string;
    sendMessage<TResponse = unknown>(message: unknown): Promise<TResponse | undefined>;
    onMessage: ExtensionEvent<RuntimeMessageListener>;
  };
  tabs: {
    get(tabId: number): Promise<ExtensionTab>;
    query(query: { active?: boolean; lastFocusedWindow?: boolean }): Promise<ExtensionTab[]>;
    sendMessage<TResponse = unknown>(
      tabId: number,
      message: unknown,
    ): Promise<TResponse | undefined>;
    onActivated: ExtensionEvent<(activeInfo: TabActiveInfo) => void>;
    onUpdated: ExtensionEvent<(tabId: number, changeInfo: TabChangeInfo) => void>;
    onRemoved: ExtensionEvent<(tabId: number) => void>;
  };
  action: {
    disable(tabId: number): Promise<void>;
    enable(tabId: number): Promise<void>;
    setIcon(details: { tabId: number; path: Record<number, string> }): Promise<void>;
    setTitle(details: { tabId: number; title: string }): Promise<void>;
    onClicked: ExtensionEvent<(tab: ExtensionTab) => void>;
  };
  scripting: {
    executeScript(details: { target: { tabId: number }; files: string[] }): Promise<unknown>;
  };
  sidePanel?: {
    open(details: { windowId: number }): Promise<void>;
  };
  sidebarAction?: {
    open(): Promise<void>;
  };
}

export type ExtensionBrowserApi = RawExtensionBrowserApi;

export interface ExtensionPlatform {
  kind: BrowserKind;
  runtime: RawExtensionBrowserApi['runtime'];
  tabs: RawExtensionBrowserApi['tabs'];
  action: RawExtensionBrowserApi['action'];
  scripting: RawExtensionBrowserApi['scripting'];
  openPanel(tab: ExtensionTab): Promise<void>;
}

/**
 * Adapt the browser API surface used by an extension to one promise-based contract.
 *
 * @param api Promise-based browser API supplied by the runtime binding.
 * @param kind Browser family that owns the panel implementation.
 * @returns The browser capabilities used by extension entry points.
 * @throws If the selected browser does not expose its panel API or the target tab has no window.
 */
export function createExtensionPlatform(
  api: ExtensionBrowserApi,
  kind: BrowserKind,
): ExtensionPlatform {
  return {
    kind,
    runtime: api.runtime,
    tabs: api.tabs,
    action: api.action,
    scripting: api.scripting,
    openPanel: async (tab) => {
      if (kind === 'firefox') {
        if (!api.sidebarAction) {
          throw new Error('The Firefox sidebar API is unavailable.');
        }

        await api.sidebarAction.open();
        return;
      }

      if (!api.sidePanel) {
        throw new Error('The Chromium side panel API is unavailable.');
      }

      if (tab.windowId === undefined) {
        throw new Error('The active tab does not belong to a browser window.');
      }

      await api.sidePanel.open({ windowId: tab.windowId });
    },
  };
}
