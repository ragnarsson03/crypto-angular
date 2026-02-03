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
    errorDiv.innerHTML = `
      <h1 style="border-bottom:1px solid #ff4444; padding-bottom:1rem;">CRITICAL BOOTSTRAP FAILURE</h1>
      <pre style="font-size:1.2rem; white-space:pre-wrap;">${err?.message || err}</pre>
      <div style="margin-top:2rem; color:#888;">Check console for full stack trace.</div>
    `;
    document.body.appendChild(errorDiv);
  });
