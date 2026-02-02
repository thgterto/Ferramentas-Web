# Specifications for CEP PRO Refactoring

## 1. Directory Structure

-   `index.html` (Entry point)
-   `css/`
    -   `style.css` (Theme, Typography, Components)
    -   `layout.css` (Grid, Sidebar, Panel)
-   `js/`
    -   `main.js` (Initialization, Event Listeners)
    -   `state.js` (State Store)
    -   `ui.js` (DOM Manipulation, Templates)
    -   `charts.js` (Plotly rendering)
    -   `utils.js` (Helpers)
-   `workers/`
    -   `worker.js` (SPC Math & Rule Engine)

## 2. File Details

### `css/style.css`
Contains root variables, typography, component styles (buttons, inputs, cards).
*Action:* Extract content from `<style>` in `CEP PRO`.
- Root variables (`:root`)
- General resets
- Header styles
- KPI Deck styles
- Button styles (`.btn`, `.btn-primary`, etc.)
- Input styles
- Tabs styles
- Chart container styles
- Modal styles

### `css/layout.css`
Contains body grid, sidebar, main stage, and panel layout rules.
*Action:* Extract layout-specific CSS from `<style>` in `CEP PRO`.
- `body` grid layout
- `.sidebar` layout
- `.stage` layout
- `.panel` layout
- Responsive modifiers (`.hide-sidebar`, `.hide-panel`)

### `js/utils.js`
*Action:* Extract utility functions.
```javascript
export function debounce(func, wait) { ... }
export function fmt(n, d=2) { ... }
export function parseLocaleNumber(stringVal) { ... }
export function downsamplePairs(idx, data, threshold) { ... }
```

### `js/state.js`
*Action:* Implement state management.
```javascript
const listeners = new Set();
export const state = {
  raw: [], data: [], col: null,
  processed: { vals:[], means:[], ranges:[], stds:[] },
  limits: {}, stats: {}, descStats: {}, violations: [], notes: {},
  window: { size: 0, offset: 0 },
  advanced: { cusum: {}, ewma: {}, run: {} },
  stratCol: null, strata: [],
  logRendered: 0, logBatchSize: 50
};

export const subscribe = (fn) => listeners.add(fn);
export const notify = () => listeners.forEach(fn => fn(state));
export const updateState = (updates) => {
  Object.assign(state, updates);
  notify();
};
```

### `workers/worker.js`
*Action:* Move `SPC` object and implementation of calculation logic.
- Copy the `SPC` object from `CEP PRO`.
- Implement `onmessage` to handle:
    - Input: `{ cmd: 'calc', data: [...], config: {...} }`
    - Logic: Perform all statistical calculations (Mean, StdDev, Limits, Rules, Advanced stats).
    - Output: `{ processed, limits, stats, descStats, advanced, violations }`

### `js/charts.js`
*Action:* Encapsulate Plotly logic.
- Import `state` (or receive it as arg).
- Export `renderCharts()`, `renderSixpack()`, `renderRunChart()`, `renderAdvanced()`.
- Export `initCharts()`.
- Use `Plotly.react` for updates.

### `js/ui.js`
*Action:* DOM manipulation.
- Export `UI` string templates.
- Export functions: `renderKPIs`, `renderStatsPanel`, `renderLog`, `toggle`, `switchTab`, `openModal`, `closeModal`.
- Needs access to `state` (import it) to read data for rendering.

### `js/main.js`
*Action:* Application entry point.
- Import `state`, `updateState` from `./state.js`.
- Import `UI` functions from `./ui.js`.
- Import `Charts` functions from `./charts.js`.
- Initialize `Worker`.
- Set up DOM event listeners (file input, buttons, selects).
- `worker.onmessage`: Receive results, call `updateState`, then trigger `UI.render...` and `Charts.render...`.

### `index.html`
*Action:* New HTML structure.
- Link `css/style.css` and `css/layout.css`.
- Load external libs (Plotly, SheetJS, jStat).
- Load `<script type="module" src="js/main.js"></script>`.
- Remove all inline JS and CSS.
