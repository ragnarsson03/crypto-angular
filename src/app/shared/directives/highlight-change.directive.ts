import { Directive, ElementRef, Input, OnChanges, Renderer2, SimpleChanges } from '@angular/core';

@Directive({
    selector: '[appHighlightChange]',
    standalone: true
})
export class HighlightChangeDirective implements OnChanges {
    @Input('appHighlightChange') value: number | undefined;

    constructor(private el: ElementRef, private renderer: Renderer2) { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['value']) {
            const current = changes['value'].currentValue;
            const previous = changes['value'].previousValue;

            // Only animate if we have a previous value to compare against
            if (previous !== undefined && current !== undefined) {
                this.updateClass(current, previous);
            }
        }
    }

    private updateClass(current: number, previous: number): void {
        const element = this.el.nativeElement;

        // Remove classes immediately to reset or flip direction
        this.renderer.removeClass(element, 'flash-up');
        this.renderer.removeClass(element, 'flash-down');

        // Trigger reflow to restart animation if needed (optional but good for consistency)
        // void element.offsetWidth; 

        if (current > previous) {
            this.renderer.addClass(element, 'flash-up');
        } else if (current < previous) {
            this.renderer.addClass(element, 'flash-down');
        }

        // Remove class after 500ms to match animation duration
        setTimeout(() => {
            this.renderer.removeClass(element, 'flash-up');
            this.renderer.removeClass(element, 'flash-down');
        }, 500);
    }
}
