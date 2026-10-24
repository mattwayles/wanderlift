import { registerRootComponent } from 'expo';

import App from './App';
import { installGlobalErrorCapture } from './src/lib/errorCapture';

// Record uncaught JS errors locally (never sent anywhere); the previous handler still runs.
installGlobalErrorCapture();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
