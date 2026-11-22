import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/atkinson-hyperlegible-next';
import './index.css';
import App from './App';
import { restoreFromAutoBackupIfNeeded } from './store';
import { isNative } from './native';
import { StatusBar, Style } from '@capacitor/status-bar';

if (isNative()) {
  // Light mode always: dark icons on a light status bar.
  void StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  void StatusBar.setBackgroundColor({ color: '#EDF3F0' }).catch(() => {});
}

void restoreFromAutoBackupIfNeeded();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
