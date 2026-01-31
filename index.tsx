// SAFETY: TelegramGameProxy fallback (для всех окружений)
const w = window as any;

if (!w.TelegramGameProxy) {
  w.TelegramGameProxy = {};
}

if (typeof w.TelegramGameProxy.receiveEvent !== 'function') {
  w.TelegramGameProxy.receiveEvent = () => {};
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);