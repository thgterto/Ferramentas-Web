const listeners = new Set();
export const state = {
  raw: [], data: [], col: null,
  processed: { vals:[], means:[], ranges:[], stds:[] },
  limits: {}, stats: {}, descStats: {}, violations: [], notes: {},
  window: { size: 0, offset: 0 },
  advanced: { cusum: {}, ewma: {}, run: {} },
  stratCol: null,
  strata: [],
  logRendered: 0,
  logBatchSize: 50
};

export const subscribe = (fn) => listeners.add(fn);
export const notify = () => listeners.forEach(fn => fn(state));
export const updateState = (updates) => {
  Object.assign(state, updates);
  notify();
};
