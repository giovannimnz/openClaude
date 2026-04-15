import React from 'react';
import type { StatsStore } from './context/stats.js';
import type { Root } from './ink.js';
import type { Props as REPLProps } from './screens/REPL.js';
import type { AppState } from './state/AppStateStore.js';
import type { FpsMetrics } from './utils/fpsTracker.js';
type AppWrapperProps = {
  getFpsMetrics: () => FpsMetrics | undefined;
  stats?: StatsStore;
  initialState: AppState;
};
export async function launchRepl(root: Root, appProps: AppWrapperProps, replProps: REPLProps, renderAndRun: (root: Root, element: React.ReactNode) => Promise<void>): Promise<void> {
  try {
    console.log('launchRepl: Starting REPL...');
    const {
      App
    } = await import('./components/App.js');
    const {
      REPL
    } = await import('./screens/REPL.js');
    console.log('launchRepl: App and REPL imported successfully');
    await renderAndRun(root, <App {...appProps}>
        <REPL {...replProps} />
      </App>);
    console.log('launchRepl: REPL rendered successfully');
  } catch (error) {
    console.error('Error in launchRepl:', error);
    throw error;
  }
}
