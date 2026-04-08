import { Injectable, OnDestroy, SimpleChanges } from '@angular/core';
import { auditTime, filter, MonoTypeOperatorFunction, Subject, Subscription } from 'rxjs';

export type RenderTask = (ctx: unknown) => void;
export type NeedRedraw = () => boolean;

export function renderAudit<T>(fps = 60): MonoTypeOperatorFunction<T> {
    return auditTime(Math.round(1000 / fps));
}

@Injectable()
export class PlnvCanvasRenderService<T> implements OnDestroy {
    public canvasElement!: HTMLCanvasElement;
    public context!: T;
    public height = 0;
    public scaleSize = 1;
    public width = 0;

    private readonly animationsSet: Set<NeedRedraw> = new Set<NeedRedraw>();
    private readonly checkTasksSubject: Subject<void> = new Subject();
    private readonly currentValues = new Map<string, unknown>();
    private readonly tasks: RenderTask[] = [];

    private elementToTaskMap = new WeakMap<HTMLElement, RenderTask>();
    private requestId?: number;
    private subscription!: Subscription;

    constructor() {
        this.subscribeToTasks();
    }

    ngOnDestroy() {
        this.cancelAnimation();
        this.subscription?.unsubscribe();
        this.animationsSet.clear();
        this.tasks.length = 0;
        this.currentValues.clear();
        this.elementToTaskMap = new WeakMap<HTMLElement, RenderTask>();
        this.canvasElement = null as unknown as HTMLCanvasElement;
        this.context = null as unknown as T;
    }

    public clearContext() {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    public scaleContext(dpr?: number): void {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    public lowMode(time: number): void {}

    public highMode() {}

    public addElement(element: HTMLElement, taskFn: RenderTask, needRedrawFn: NeedRedraw): void {
        this.elementToTaskMap.set(element, taskFn);
        this.animationsSet.add(needRedrawFn);

        this.mutateElements();
    }

    public removeElement(element: HTMLElement, needRedrawFn: NeedRedraw) {
        this.elementToTaskMap.delete(element);
        this.animationsSet.delete(needRedrawFn);

        this.mutateElements();
    }

    public mutateElements() {
        this.actualizeTaskByChildNodes();
        this.changeDetection();
    }

    public mutateElementsNow(): void {
        this.actualizeTaskByChildNodes();
        if (this.isReady()) {
            this.checkTasks();
        }
    }

    public do(): void {
        this.executeTasks();
    }

    public changeDetection(changes?: SimpleChanges): void {
        let changed = !changes;
        if (changes) {
            for (const i in changes) {
                const currentValue = changes[i].currentValue;

                if (!Object.is(this.currentValues.get(i), currentValue)) {
                    this.currentValues.set(i, currentValue);
                    changed = true;
                }
            }
        }

        if (changed) {
            this.checkTasksSubject.next();
        }
    }

    private subscribeToTasks() {
        this.subscription = this.checkTasksSubject
            .pipe(filter(() => this.isReady()), renderAudit())
            .subscribe(() => {
                this.checkTasks();
            });
    }

    private actualizeTaskByChildNodes() {
        this.tasks.length = 0;
        const canvas = this.canvasElement;
        canvas?.childNodes.forEach((node) => {
            const el = node as HTMLElement;
            const task = this.elementToTaskMap.get(el);
            if (task) {
                this.tasks.unshift(task);
            }
        });
    }

    private isReady() {
        return this.context && this.width > 1 && this.height > 1;
    }

    private checkTasks() {
        this.clearContext();
        this.executeTasks();
        this.requestAnimation(performance.now());
        this.currentValues.clear();
    }

    private cancelAnimation() {
        this.requestId && cancelAnimationFrame(this.requestId);
        this.requestId = undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private requestAnimation(time?: number): void {
        let animate = false;
        for (const isAnimationRequired of this.animationsSet) {
            if (isAnimationRequired() === true) {
                animate = true;
                break;
            }
        }
        if (animate) {
            this.cancelAnimation();
            this.requestId = requestAnimationFrame((time) => {
                this.clearContext();
                this.executeTasks();
                this.requestAnimation(time);
            });
        }
    }

    private executeTasks() {
        for (const task of this.tasks) task(this.context);
    }
}
