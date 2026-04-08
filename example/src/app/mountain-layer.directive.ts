import { Directive, Input } from '@angular/core';
import { PlnvCanvasElement } from '@plnv/canvas';

type Point2 = { x: number; y: number };

const RIDGE_LAYER_CONFIG = [
    { base: 0.17, ampScale: 0.2, maxV: 0.48, minV: 0.09 },
    { base: 0.33, ampScale: 0.3, maxV: 0.66, minV: 0.11 },
    { base: 0.48, ampScale: 0.4, maxV: 0.9, minV: 0.14 },
] as const;

function buildMountainRidgePoints(
    n: number,
    pad: number,
    w: number,
    h: number,
    seed: number,
    layer: number,
): Point2[] {
    const cfg = RIDGE_LAYER_CONFIG[Math.min(layer, RIDGE_LAYER_CONFIG.length - 1)];
    const s = seed + layer * 41.7;
    const pts: Point2[] = [];

    for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        let v: number = cfg.base;

        const freqs = [
            { f: 2.1, a: 0.22 },
            { f: 4.3, a: 0.14 },
            { f: 7.9, a: 0.09 },
            { f: 13.2, a: 0.06 },
        ];
        for (const { f, a } of freqs) {
            v += cfg.ampScale * a * Math.abs(Math.sin(u * Math.PI * f + s * 0.31 + layer));
        }
        v += cfg.ampScale * 0.05 * Math.sin(u * Math.PI * 19 + s * 1.1);

        v = Math.min(cfg.maxV, Math.max(cfg.minV, v));

        pts.push({ x: pad + u * w, y: pad + h * (1 - v) });
    }
    return pts;
}

@Directive({
    selector: '[appMountainLayer]',
    standalone: true,
})
export class MountainLayerDirective extends PlnvCanvasElement<CanvasRenderingContext2D> {
    protected override needRedraw = false;

    private seed = Math.random() * 1000;

    @Input() set mountainRedraw(_: unknown) {
        this.seed = Math.random() * 1000;
        queueMicrotask(() => this.drawAll());
    }

    protected override draw(ctx: CanvasRenderingContext2D): void {
        const pad = 20;
        const w = this.width - pad * 2;
        const h = this.height - pad * 2;
        if (w < 8 || h < 8) {
            return;
        }

        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        const n = Math.max(24, Math.min(96, Math.floor(w / 5)));

        ctx.save();
        this.drawSky(ctx, pad, w, h, dark);

        const ranges: { layer: number; fill: string; stroke: string }[] = dark
            ? [
                  { layer: 0, fill: 'rgba(55, 65, 81, 0.55)', stroke: 'rgba(71, 85, 105, 0.5)' },
                  { layer: 1, fill: 'rgba(38, 48, 64, 0.75)', stroke: 'rgba(51, 65, 85, 0.55)' },
                  { layer: 2, fill: 'rgba(24, 32, 48, 0.92)', stroke: 'rgba(148, 163, 184, 0.35)' },
              ]
            : [
                  { layer: 0, fill: 'rgba(148, 163, 184, 0.45)', stroke: 'rgba(100, 116, 139, 0.35)' },
                  { layer: 1, fill: 'rgba(100, 116, 139, 0.55)', stroke: 'rgba(71, 85, 105, 0.45)' },
                  { layer: 2, fill: 'rgba(71, 85, 105, 0.72)', stroke: 'rgba(51, 65, 85, 0.5)' },
              ];

        for (const { layer, fill, stroke } of ranges) {
            const pts = buildMountainRidgePoints(n, pad, w, h, this.seed, layer);
            this.fillMountain(ctx, pts, pad, w, h, fill);
            this.strokeRidge(ctx, pts, stroke);
        }

        ctx.restore();
    }

    private drawSky(
        ctx: CanvasRenderingContext2D,
        pad: number,
        w: number,
        h: number,
        dark: boolean,
    ): void {
        const g = ctx.createLinearGradient(pad, pad, pad, pad + h);
        if (dark) {
            g.addColorStop(0, '#1a2744');
            g.addColorStop(0.45, '#243352');
            g.addColorStop(1, '#1e293b');
        } else {
            g.addColorStop(0, '#bfdbfe');
            g.addColorStop(0.35, '#dbeafe');
            g.addColorStop(0.7, '#e8f0fa');
            g.addColorStop(1, '#f1f5f9');
        }
        ctx.fillStyle = g;
        ctx.fillRect(pad, pad, w, h);
    }

    private fillMountain(
        ctx: CanvasRenderingContext2D,
        pts: Point2[],
        pad: number,
        w: number,
        h: number,
        fill: string,
    ): void {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.lineTo(pad + w, pad + h);
        ctx.lineTo(pad, pad + h);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
    }

    private strokeRidge(ctx: CanvasRenderingContext2D, pts: Point2[], stroke: string): void {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.25;
        ctx.stroke();
    }

    protected isReady(): boolean {
        return this.width > 1 && this.height > 1;
    }
}
