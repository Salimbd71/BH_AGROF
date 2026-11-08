/**
 * BH Agro Ltd. - Router & Browser History Module
 * Prevents app closure on back button by handling pushState & popstate history.
 */

import { store } from './store.ts';
import { APP_RULES, canAccessTab } from '../config/appMode.ts';

export class Router {
  private isHandlingPop = false;

  init(renderCallback: () => void) {
    // Listen for browser back / forward button
    window.addEventListener('popstate', (e) => {
      this.isHandlingPop = true;
      if (e.state && e.state.tab && canAccessTab(e.state.tab)) {
        store.activeTab = e.state.tab;
      } else {
        // Fallback to this site's default page
        store.activeTab = APP_RULES.defaultTab;
      }
      renderCallback();
      this.isHandlingPop = false;
    });

    // Set initial state if not present
    if (!window.history.state) {
      window.history.replaceState({ tab: store.activeTab }, '', `#${store.activeTab}`);
    }
  }

  navigate(tab: string, renderCallback: () => void) {
    if (store.activeTab === tab) return;
    if (!canAccessTab(tab)) return; // এই সাইটে অনুমোদিত নয়

    store.activeTab = tab;
    if (!this.isHandlingPop) {
      window.history.pushState({ tab: tab }, '', `#${tab}`);
    }
    renderCallback();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export const router = new Router();
