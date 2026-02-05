import { bootstrapApplication } from '@angular/platform-browser';
import { ErrorHandler } from '@angular/core';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { GlobalErrorHandler } from './app/core/utils/system-logger';

const extendedConfig = {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),
    { provide: ErrorHandler, useClass: GlobalErrorHandler }
  ]
};

bootstrapApplication(App, extendedConfig)
  .catch((err) => {
    console.error('Bootstrap Error:', err);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:#1a0000; color:#ff4444; padding:2rem; font-family:monospace; z-index:9999; overflow:auto;';
    const h1 = document.createElement('h1');
    h1.textContent = 'CRITICAL BOOTSTRAP FAILURE';
    h1.style.cssText = 'border-bottom:1px solid #ff4444; padding-bottom:1rem; margin: 0 0 1rem 0;';

    const pre = document.createElement('pre');
    pre.textContent = err?.message || String(err);
    pre.style.cssText = 'font-size:1.2rem; white-space:pre-wrap; margin: 0;';

    const footer = document.createElement('div');
    footer.textContent = 'Check console for full stack trace.';
    footer.style.cssText = 'margin-top:2rem; color:#888;';

    errorDiv.appendChild(h1);
    errorDiv.appendChild(pre);
    errorDiv.appendChild(footer);
    document.body.appendChild(errorDiv);
  });
