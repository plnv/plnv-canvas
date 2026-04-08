import { booleanAttribute, Directive, Input, OnInit } from '@angular/core';
import { PlnvCanvasHostBase } from '../classes/plnv-canvas-directive';
import { PlnvCanvasRenderService } from '../services/plnv-canvas-render.service';

@Directive({
    selector: 'canvas[plnvCanvas2d]',
    standalone: true,
    providers: [PlnvCanvasRenderService],
    exportAs: 'plnvCanvasDirective',
})
export class PlnvCanvas2dDirective extends PlnvCanvasHostBase<CanvasRenderingContext2D> implements OnInit {
    @Input({ transform: booleanAttribute }) performanceMode = false;

    @Input() set plnvCanvasRedraw(_: unknown) {
        this.notifyPlnvCanvasRedraw();
    }

    protected override readonly contextId = '2d';

    protected override get isPerformanceMode(): boolean {
        return this.performanceMode;
    }

    override ngOnInit() {
        super.ngOnInit();
        this.context.imageSmoothingEnabled = false;
    }

    protected clearContext() {
        this.context.clearRect(0, 0, this.width, this.height);
    }

    protected scaleContext(dpr = this.dpr) {
        this.context.scale(dpr, dpr);
    }
}
