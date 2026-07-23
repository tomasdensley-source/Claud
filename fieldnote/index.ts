// ⚠️ TEMPORARY DIAGNOSTIC BUILD — the `import 'react-native-gesture-handler'`
// side-effect import is removed here on purpose so the minimal build triggers
// no JS-side native initialization. Restored with the real App.tsx right after.
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
