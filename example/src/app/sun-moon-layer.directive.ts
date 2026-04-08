import { Directive } from '@angular/core';
import { PlnvCanvasElement } from '@plnv/canvas';

function dayFraction(now: Date): number {
    return (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000) / 86400;
}

const SYNODIC_DAYS = 29.53058867;

function lunarPhaseAngle(now: Date): number {
    return (2 * Math.PI * (now.getDate() - 13)) / SYNODIC_DAYS;
}

type OrbitGeom =
    | { ok: true; x: number; y: number; cx: number; cy: number; rx: number; ry: number }
    | { ok: false; x: number; y: number };

function orbitGeometry(
    pad: number,
    w: number,
    h: number,
    dayT: number,
    discR: number,
    haloR: number,
    phaseShiftRad: number,
): OrbitGeom {
    const margin = discR + haloR + 4;
    const L = pad + margin;
    const Rr = pad + w - margin;
    const T = pad + margin;
    const B = pad + h - margin;
    if (Rr <= L + 8 || B <= T + 8) {
        return { ok: false, x: pad + w * 0.5, y: pad + h * 0.35 };
    }
    const cx = (L + Rr) / 2;
    const rx = (Rr - L) / 2;
    const cy = T + (B - T) * 0.58;
    const ryTop = cy - T;
    const ryBot = B - cy;
    const ry = Math.max(6, Math.min(ryTop, ryBot) * 0.95);
    const theta = dayT * Math.PI * 2 - Math.PI / 2 + phaseShiftRad;
    return {
        ok: true,
        x: cx + rx * Math.cos(theta),
        y: cy + ry * Math.sin(theta),
        cx,
        cy,
        rx,
        ry,
    };
}

type OrbitBodyLayout = { g: OrbitGeom; r: number; haloR: number };

@Directive({
    selector: '[appSunMoonLayer]',
    standalone: true,
})
export class SunMoonLayerDirective extends PlnvCanvasElement<CanvasRenderingContext2D> {
    protected override needRedraw = false;

    private offscreen: HTMLCanvasElement | null = null;

    override ngOnDestroy(): void {
        this.offscreen = null;
        super.ngOnDestroy();
    }

    private getOffscreen(cw: number, ch: number): CanvasRenderingContext2D | null {
        if (!this.offscreen || this.offscreen.width !== cw || this.offscreen.height !== ch) {
            this.offscreen = document.createElement('canvas');
            this.offscreen.width = Math.max(1, Math.floor(cw));
            this.offscreen.height = Math.max(1, Math.floor(ch));
        }
        return this.offscreen.getContext('2d', { alpha: true });
    }

    protected override draw(ctx: CanvasRenderingContext2D): void {
        const cw = this.width;
        const ch = this.height;
        const pad = 20;
        const w = cw - pad * 2;
        const h = ch - pad * 2;
        if (w < 8 || h < 8) {
            return;
        }

        const octx = this.getOffscreen(cw, ch);
        if (!octx) {
            return;
        }
        octx.setTransform(1, 0, 0, 1, 0, 0);
        octx.clearRect(0, 0, cw, ch);

        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        const now = new Date();
        const t = dayFraction(now);

        if (dark) {
            const lay = this.computeBodyLayout(pad, w, h, t, 0.055, 3.2, Math.PI);
            this.strokeDashedOrbit(ctx, lay.g, 'rgba(148, 163, 184, 0.5)');
            this.drawMoonBody(octx, lay, now);
        } else {
            const lay = this.computeBodyLayout(pad, w, h, t, 0.052, 4, 0);
            this.strokeDashedOrbit(ctx, lay.g, 'rgba(251, 191, 36, 0.45)');
            this.drawSunBody(octx, lay);
        }

        const surface = this.offscreen;
        if (!surface) {
            return;
        }

        ctx.save();
        ctx.drawImage(surface, 0, 0, cw, ch);
        ctx.restore();
    }

    private strokeDashedOrbit(ctx: CanvasRenderingContext2D, g: OrbitGeom, strokeStyle: string): void {
        if (!g.ok) {
            return;
        }
        ctx.save();
        ctx.setLineDash([5, 7]);
        ctx.lineWidth = 1.15;
        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();
        ctx.ellipse(g.cx, g.cy, g.rx, g.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    private computeBodyLayout(
        pad: number,
        w: number,
        h: number,
        dayT: number,
        rScale: number,
        haloFactor: number,
        phaseShiftRad: number,
    ): OrbitBodyLayout {
        const r = Math.min(w, h) * rScale;
        const haloR = r * haloFactor;
        const g = orbitGeometry(pad, w, h, dayT, r, haloR, phaseShiftRad);
        return { g, r, haloR };
    }

    private drawSunBody(ctx: CanvasRenderingContext2D, lay: OrbitBodyLayout): void {
        const { g, r, haloR } = lay;
        const { x, y } = g;

        const glow = ctx.createRadialGradient(x, y, 0, x, y, haloR);
        glow.addColorStop(0, 'rgba(255, 248, 220, 0.95)');
        glow.addColorStop(0.35, 'rgba(255, 220, 120, 0.45)');
        glow.addColorStop(1, 'rgba(255, 200, 80, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, haloR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#fde68a';
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    private drawMoonBody(ctx: CanvasRenderingContext2D, lay: OrbitBodyLayout, now: Date): void {
        const { g, r, haloR } = lay;
        const { x, y } = g;

        const θ = lunarPhaseAngle(now);
        const illumination = (1 + Math.cos(θ)) / 2;

        if (illumination < 0.07) {
            ctx.beginPath();
            ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(203, 213, 225, ${0.25 + illumination * 5})`;
            ctx.fill();
        } else if (illumination >= 0.995) {
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = '#e8edf5';
            ctx.fill();
        } else {
            const d = 2 * r * illumination;
            const sign = now.getDate() < 13 ? -1 : 1;
            const sx = x + sign * d;

            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.clip();

            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = '#e8edf5';
            ctx.fill();

            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(sx, y, r, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();

            ctx.restore();
        }

        ctx.fillStyle = 'rgba(226, 232, 240, 0.12)';
        ctx.beginPath();
        ctx.arc(x, y, haloR, 0, Math.PI * 2);
        ctx.fill();
    }

    protected isReady(): boolean {
        return this.width > 1 && this.height > 1;
    }
}
