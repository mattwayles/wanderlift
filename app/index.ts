import { registerRootComponent } from 'expo';

import App from './App';
import { installGlobalErrorCapture } from './src/lib/errorCapture';
import { initSentry, wrapRoot } from './src/lib/sentry';

// First, so Sentry's own handlers are in place before the local capture wraps the global one.
initSentry();

// Record uncaught JS errors in the local ring buffer too (feeds "Share error details"); the
// previous handler, Sentry's included, still runs.
installGlobalErrorCapture();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(wrapRoot(App));
