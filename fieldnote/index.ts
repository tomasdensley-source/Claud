// ⚠️ TEMPORARY DIAGNOSTIC ENTRY — the real app (./App) is untouched and is
// reachable as stage 6 inside StagedDiagnostic. The gesture-handler
// side-effect import stays out of the entry on purpose so stage 1 can test
// it explicitly rather than it running before any stage is chosen.
import { registerRootComponent } from 'expo';

import { StagedDiagnostic } from './src/components/StagedDiagnostic';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(StagedDiagnostic);
