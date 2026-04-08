import {
    ElementRef,
    inject,
    Injectable,
    OnChanges,
    OnDestroy,
    OnInit,
    SimpleChange,
    SimpleChanges,
} from '@angular/core';
import { PlnvCanvasRenderService } from '../services/plnv-canvas-render.service';
import { ContextType } from './plnv-canvas-directive';

type ComponentChanges<T> = Record<keyof T, SimpleChange>;

@Injectable()
export abstract class PlnvCanvasElement<T = ContextType> implements OnInit, OnChanges, OnDestroy {
    private readonly elementRef = inject(ElementRef);
    private readonly renderService = inject(PlnvCanvasRenderService<T>);

    public get canvasElement(): HTMLCanvasElement {
        return this.renderService.canvasElement;
    }

    public get context(): T {
        return this.renderService.context;
    }

    public get height(): number {
        return this.renderService.height;
    }

    public get width(): number {
        return this.renderService.width;
    }

    public get scaleSize(): number {
        return this.renderService.scaleSize;
    }

    protected needRedraw = false;

    protected abstract draw(ctx: T): void;

    protected abstract isReady(): boolean;

    ngOnInit() {
        this.renderService.addElement(this.elementRef.nativeElement, this.task, this.needAnimation);
    }

    ngOnChanges(changes: ComponentChanges<PlnvCanvasElement>) {
        if (this.isReady()) {
            this.renderService.changeDetection(changes);
        }
    }

    ngOnDestroy() {
        this.renderService.removeElement(this.elementRef.nativeElement, this.needAnimation);
    }

    protected drawAll(changes?: SimpleChanges) {
        if (this.isReady()) {
            this.renderService.changeDetection(changes);
        }
    }

    private task = (ctx: unknown): void => {
        if (this.isReady()) {
            this.draw(ctx as T);
        }
    };
    private needAnimation = (): boolean => this.needRedraw;
}
