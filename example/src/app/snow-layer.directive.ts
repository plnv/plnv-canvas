import { Directive, OnDestroy, OnInit } from '@angular/core';
import { PlnvCanvasElement } from '@plnv/canvas';

type Flake = { x: number; y: number; vx: number; vy: number };

@Directive({
    selector: '[appSnowLayer]',
    standalone: true,
})
export class SnowLayerDirective extends PlnvCanvasElement<CanvasRenderingContext2D> implements OnInit, OnDestroy {
    protected override needRedraw = true;

    private flakes: Flake[] = [];
    private mouseX = -9999;
    private mouseY = -9999;
    private readonly onMove = (e: MouseEvent) => this.trackMouse(e);
    private readonly onLeave = () => {
        this.mouseX = -9999;
        this.mouseY = -9999;
    };

    override ngOnInit() {
        super.ngOnInit();
        queueMicrotask(() => {
            const c = this.canvasElement;
            if (!c) {
                return;
            }
            c.addEventListener('mousemove', this.onMove, { passive: true });
            c.addEventListener('mouseleave', this.onLeave, { passive: true });
        });
    }

    override ngOnDestroy() {
        const c = this.canvasElement;
        c?.removeEventListener('mousemove', this.onMove);
        c?.removeEventListener('mouseleave', this.onLeave);
        super.ngOnDestroy();
    }

    private trackMouse(e: MouseEvent) {
        const canvas = this.canvasElement;
        if (!canvas) {
            return;
        }
        const r = canvas.getBoundingClientRect();
        this.mouseX = e.clientX - r.left;
        this.mouseY = e.clientY - r.top;
    }

    private ensureFlakes() {
        const w = this.width;
        const h = this.height;
        if (w < 2 || h < 2) {
            return;
        }
        const target = Math.min(3000, Math.floor((w * h) / 1000));
        if (this.flakes.length === target) {
            return;
        }
        this.flakes = [];
        for (let i = 0; i < target; i++) {
            this.flakes.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.4,
                vy: 0.15 + Math.random() * 0.55,
            });
        }
    }

    protected override draw(ctx: CanvasRenderingContext2D): void {
        this.ensureFlakes();
        const w = this.width;
        const h = this.height;
        const mx = this.mouseX;
        const my = this.mouseY;
        const repelR = 72;
        const repelPush = 1.35;

        for (const p of this.flakes) {
            let dx = p.x - mx;
            let dy = p.y - my;
            let d = Math.hypot(dx, dy);
            if (d < repelR && d > 0.001) {
                const strength = ((repelR - d) / repelR) ** 1.5;
                p.vx += (dx / d) * strength * repelPush;
                p.vy += (dy / d) * strength * repelPush;
            }

            p.vy += 0.018;
            p.vx *= 0.985;
            p.vy *= 0.985;
            p.x += p.vx;
            p.y += p.vy;

            if (p.y > h + 4) {
                p.y = -4;
                p.x = Math.random() * w;
                p.vy = 0.12 + Math.random() * 0.45;
                p.vx = (Math.random() - 0.5) * 0.35;
            }
            if (p.x < -4) {
                p.x = w + 4;
            }
            if (p.x > w + 4) {
                p.x = -4;
            }
        }

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
        for (const p of this.flakes) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.25, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    protected isReady(): boolean {
        return this.width > 1 && this.height > 1;
    }
}
