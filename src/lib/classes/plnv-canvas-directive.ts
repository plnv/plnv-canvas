import { ElementRef, inject, Injectable, Injector, OnDestroy, OnInit } from '@angular/core';
import { PlnvCanvasRenderService } from '../services/plnv-canvas-render.service';

export type ContextType = CanvasRenderingContext2D | WebGL2RenderingContext;

@Injectable()
export abstract class PlnvCanvasHostBase<T = ContextType> implements OnInit, OnDestroy {
    public readonly dpr: number = window.devicePixelRatio || 1;
    public readonly injector = inject(Injector);

    public drawAll = () => {
        this.renderService.mutateElementsNow();
    };
    public height = 0;
    public width = 0;

    protected context!: T;
    protected canvasElement: HTMLCanvasElement;
    protected abstract readonly contextId: '2d' | 'webgl2';
    protected readonly renderService: PlnvCanvasRenderService<T> = inject(PlnvCanvasRenderService);

    private readonly elementRef: ElementRef<HTMLCanvasElement> = inject(ElementRef);
    private readonly resizeObserver: ResizeObserver;

    constructor() {
        this.canvasElement = this.elementRef.nativeElement;
        this.canvasElement.style.position = 'absolute';
        this.canvasElement.style.imageRendering = 'pixelated';

        this.resizeObserver = new ResizeObserver(([entry]) =>
            this.onResize(entry.contentRect.width, entry.contentRect.height),
        );
    }

    protected abstract get isPerformanceMode(): boolean;

    protected notifyPlnvCanvasRedraw(): void {
        this.renderService?.mutateElementsNow();
    }

    ngOnInit() {
        const parentElement = this.canvasElement.parentElement;
        if (!parentElement) {
            return;
        }
        const { clientWidth, clientHeight } = parentElement;

        this.width = clientWidth;
        this.height = clientHeight;
        this.setCanvasSize(clientWidth, clientHeight, this.dpr);

        this.context = this.canvasElement.getContext(this.contextId) as T;

        this.renderService.canvasElement = this.canvasElement;
        this.renderService.context = this.context;

        this.renderService.clearContext = this.clearContext;
        this.renderService.scaleContext = this.scaleContext;

        if (this.isPerformanceMode) {
            this.renderService.lowMode = (value) => this.lowMode(value);
            this.renderService.highMode = () => this.highMode();
        } else {
            this.renderService.lowMode = () => this.clearContext();
        }

        this.setServiceSize();
        this.scaleContext();

        this.resizeObserver.observe(parentElement);
    }

    ngOnDestroy() {
        this.resizeObserver.disconnect();
        this.setCanvasSize(0, 0, 0);
        this.canvasElement = null as unknown as HTMLCanvasElement;
        this.context = null as unknown as T;
    }

    protected abstract scaleContext(dpr?: number): void;
    protected abstract clearContext(): void;

    private onResize(width: number, height: number): void {
        let resizeDetected = false;
        if (width) {
            width = parseInt(String(width), 10);
            if (this.width !== width) {
                this.width = width;
                resizeDetected = true;
            }
        }

        if (height) {
            height = parseInt(String(height), 10);
            if (this.height !== height) {
                this.height = height;
                resizeDetected = true;
            }
        }

        if (resizeDetected) {
            this.highMode();
            this.renderService.do();
        }
    }

    private lowMode(time: number): void {
        const oneToFloor = 1 - Math.floor(time / 50) * 0.1;
        const scale = Math.max(oneToFloor, 0.6);
        this.setCanvasSize(this.width, this.height, scale);
        this.scaleContext(1);
        this.setServiceSize(this.width * scale, this.height * scale);
        this.renderService.scaleSize = scale;
    }

    private highMode(): void {
        const scale = this.dpr;
        this.setCanvasSize(this.width, this.height, scale);
        this.scaleContext(scale);
        this.setServiceSize();
        this.renderService.scaleSize = 1;
    }

    private setCanvasSize(width: number, height: number, scale: number, element = this.canvasElement): void {
        element.width = Math.floor(width * scale);
        element.height = Math.floor(height * scale);
        element.style.width = this.width + 'px';
        element.style.height = this.height + 'px';
    }

    private setServiceSize(width: number = this.width, height: number = this.height): void {
        this.renderService.width = Math.floor(width);
        this.renderService.height = Math.floor(height);
    }
}
