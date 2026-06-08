// Application state — single reactive store.
// Modules register their own initial state via the registry.

class AppState {
  constructor() {
    this.billing = 'annual';
    this.discount = null;      // active Discount Preset id, or null for no discount
    this.activeModules = [];   // ordered array of active module IDs
    this.moduleStates = {};    // moduleId → module-specific state object
    this._listeners = new Set();
  }

  // Subscribe to all state changes. Returns an unsubscribe function.
  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify() {
    this._listeners.forEach(fn => fn(this));
  }

  setBilling(cycle) {
    this.billing = cycle;
    this._notify();
  }

  setDiscount(id) {
    this.discount = id || null;
    this._notify();
  }

  activateModule(id, initialState) {
    if (this.activeModules.includes(id)) return;
    this.activeModules.push(id);
    this.moduleStates[id] = { ...initialState };
    this._notify();
  }

  deactivateModule(id) {
    this.activeModules = this.activeModules.filter(m => m !== id);
    delete this.moduleStates[id];
    this._notify();
  }

  isActive(id) {
    return this.activeModules.includes(id);
  }

  // Merge partial updates into a module's state, then notify.
  updateModule(id, updates) {
    if (!this.moduleStates[id]) return;
    Object.assign(this.moduleStates[id], updates);
    this._notify();
  }

  getModule(id) {
    return this.moduleStates[id];
  }
}

export const appState = new AppState();
