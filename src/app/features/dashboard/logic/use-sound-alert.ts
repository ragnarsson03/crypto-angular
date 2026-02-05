import { effect, Signal } from '@angular/core';
import { WorkerResponse } from '../../../core/models/crypto.model';

export function useSoundAlert(statsSignal: Signal<WorkerResponse[]>) {
    const previousAlertStates = new Map<string, boolean>();
    const alertAudio = new Audio('assets/sounds/alert.mp3');

    effect(() => {
        const stats = statsSignal();

        stats.forEach(s => {
            if (s.isAlertActive) {
                // Play only on rising edge (false -> true)
                if (!previousAlertStates.get(s.id)) {
                    alertAudio.currentTime = 0;
                    alertAudio.play().catch(err => console.warn('Audio play failed (Autoplay?):', err));
                    previousAlertStates.set(s.id, true);
                }
            } else {
                previousAlertStates.set(s.id, false);
            }
        });
    });
}
