import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { PlnvCanvas2dDirective } from '@plnv/canvas';
import { MountainLayerDirective } from './mountain-layer.directive';
import { SnowLayerDirective } from './snow-layer.directive';
import { SunMoonLayerDirective } from './sun-moon-layer.directive';

type ThemePreference = 'system' | 'light' | 'dark';

@Component({
    selector: 'app-root',
    imports: [
        PlnvCanvas2dDirective,
        SunMoonLayerDirective,
        SnowLayerDirective,
        MountainLayerDirective,
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
})
export class AppComponent {
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);

    readonly redrawToken = signal(0);
    readonly mountainsVisible = signal(true);
    /** По умолчанию следуем ОС; кнопка переключает система → светлая → тёмная → система. */
    readonly themePreference = signal<ThemePreference>('system');
    readonly systemDark = signal(false);

    readonly themeButtonLabel = computed(() => {
        switch (this.themePreference()) {
            case 'system':
                return 'Тема: как в системе';
            case 'light':
                return 'Тема: светлая';
            case 'dark':
                return 'Тема: тёмная';
        }
    });

    constructor() {
        const win = this.document.defaultView;
        const mq = win?.matchMedia('(prefers-color-scheme: dark)');
        const onSystem = () => {
            this.systemDark.set(mq?.matches ?? false);
        };
        if (mq) {
            onSystem();
            mq.addEventListener('change', onSystem);
            this.destroyRef.onDestroy(() => mq.removeEventListener('change', onSystem));
        }

        effect(() => {
            const pref = this.themePreference();
            const sys = this.systemDark();
            const dark = pref === 'dark' || (pref === 'system' && sys);
            this.document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
            queueMicrotask(() => this.redrawToken.update((t) => t + 1));
        });
    }

    cycleTheme(): void {
        this.themePreference.update((m) => (m === 'system' ? 'light' : m === 'light' ? 'dark' : 'system'));
    }

    toggleMountains(): void {
        this.mountainsVisible.update((v) => !v);
    }

    bumpRedraw(): void {
        this.redrawToken.set(this.redrawToken() + 1);
    }
}
