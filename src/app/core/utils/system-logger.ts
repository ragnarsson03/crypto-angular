import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    handleError(error: any): void {
        const isSignalError = error?.message?.includes('Signal');
        const isWorkerError = error?.message?.includes('Worker');

        let style = 'background: #333; color: white; padding: 2px 5px; border-radius: 2px;';
        let label = 'SYSTEM ERROR';

        if (isSignalError) {
            style = 'background: #ff0055; color: white; padding: 2px 5px; border-radius: 2px; font-weight: bold;';
            label = 'SIGNAL ERROR';
        } else if (isWorkerError) {
            style = 'background: #00e676; color: black; padding: 2px 5px; border-radius: 2px; font-weight: bold;';
            label = 'WORKER ERROR';
        }

        console.group(`%c${label}`, style);
        console.error(error);
        if (error.stack) {
            console.log('%cStack Trace:', 'color: #888;', error.stack);
        }
        console.groupEnd();
    }
}

export function checkWorkerAvailability(workerPath: string): void {
    fetch(workerPath)
        .then(response => {
            if (response.ok) {
                console.log(`%c[Worker Check] Success: Worker found at ${workerPath}`, 'color: #00e676');
            } else {
                console.error(`%c[Worker Check] Failed: Worker NOT found at ${workerPath} (Status: ${response.status})`, 'background: red; color: white;');
            }
        })
        .catch(err => {
            console.error(`%c[Worker Check] Network Error checking ${workerPath}`, 'background: red; color: white;', err);
        });
}
