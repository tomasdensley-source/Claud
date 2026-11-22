import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './index.css';
import App from './App';
import { restoreFromAutoBackupIfNeeded } from './store';
import { isNative } from './native';
import { StatusBar, Style } from '@capacitor/status-bar';

if (isNative()) {
  // Light mode always: dark icons on a light status bar.
  void StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  void StatusBar.setBackgroundColor({ color: '#F6F5F1' }).catch(() => {});
}

void restoreFromAutoBackupIfNeeded();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
