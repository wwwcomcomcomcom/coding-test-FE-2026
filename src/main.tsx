import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import App from './App';
import './index.css';

async function enableMocking() {
  const { worker } = await import('./mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Theme accentColor="indigo" grayColor="slate" radius="medium">
        <App />
      </Theme>
    </StrictMode>,
  );
});
