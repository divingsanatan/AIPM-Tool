import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AiConfigProvider } from './context/AiConfigContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AiConfigProvider>
      <App />
    </AiConfigProvider>
  </StrictMode>,
);

