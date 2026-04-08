import { booleanAttribute, Directive, Input } from '@angular/core';
import { PlnvCanvasHostBase } from '../classes/plnv-canvas-directive';
import { PlnvCanvasRenderService } from '../services/plnv-canvas-render.service';

@Directive({
    selector: 'canvas[plnvCanvasWebgl]',
    standalone: true,
    providers: [PlnvCanvasRenderService],
    exportAs: 'plnvCanvasDirective',
})
export class PlnvCanvasWebglDirective extends PlnvCanvasHostBase<WebGL2RenderingContext> {
    @Input({ transform: booleanAttribute }) performanceMode = false;

    @Input() set plnvCanvasRedraw(_: unknown) {
        this.notifyPlnvCanvasRedraw();
    }

    protected override readonly contextId = 'webgl2';

    protected override get isPerformanceMode(): boolean {
        return this.performanceMode;
    }

    protected clearContext() {}

    protected scaleContext(dpr = this.dpr) {
        this.context.viewport(0, 0, this.width * dpr, this.height * dpr);
    }
}
