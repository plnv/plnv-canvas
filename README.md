# @plnv/canvas

Требования: **Angular 21** (сборка библиотеки и демо проверялись на **21.2.x**). **Node.js** не ниже **20.19**, **22.12** или **24+** (как у Angular CLI);

## Сборка

```bash
npm install
npm run build
```

Артефакты — в каталоге `dist/`.

## Демо-приложение

В каталоге `example/` — демо на Angular 21. Алиас **`@plnv/canvas`** задан в **`example/tsconfig.json`** через `paths` на `../src/public-api.ts`, поэтому **`ng serve` / сборка примера не требуют предварительного `npm run build` библиотеки**.

```bash
cd example && npm install && npx ng serve
# в каталоге example также: npm run serve | npm start
```

С корня репозитория:

```bash
npm run example        # сборка библиотеки в dist/ + ng serve в example/
npm run example:serve  # только ng serve в example/
```

Скрипт `example` по-прежнему собирает библиотеку перед демо (полезно проверить `dist/` перед публикацией).

После открытия в браузере вы увидите канвас с тестовым слоем и кнопку «Перерисовать».

## Подключение в приложение

```bash
npm install @plnv/canvas
```

Убедитесь, что в приложении установлены peer-зависимости (`@angular/core`, `rxjs`).

### Базовый сценарий (2D)

Родительский `<canvas>` задаёт контекст и `PlnvCanvasRenderService` для дерева шаблона. Элементы-слои — это директивы (или компоненты с той же логикой), которые **находятся внутри** `<canvas>` в шаблоне и наследуют `PlnvCanvasElement`: они регистрируют функцию отрисовки и порядок совпадает с порядком дочерних узлов в DOM.

Родителю канваса нужны ненулевые размеры (`clientWidth` / `clientHeight`), иначе при инициализации высота и ширина останутся некорректными.

**Шаблон компонента:**

```html
<div class="chart-surface">
  <canvas plnvCanvas2d [plnvCanvasRedraw]="redrawToken">
    <canvas appMyLayer></canvas>
  </canvas>
</div>
```

**Стили (пример):** обёртка задаёт размер; канвас позиционируется директивой как `absolute` и заполняет родителя.

```css
.chart-surface {
  position: relative;
  width: 100%;
  height: 320px;
}

.chart-surface canvas {
  display: block;
}
```

**Компонент:**

```typescript
import { Component, signal } from '@angular/core';
import { PlnvCanvas2dDirective } from '@plnv/canvas';
import { MyLayerDirective } from './my-layer.directive';

@Component({
  selector: 'app-demo-chart',
  standalone: true,
  imports: [PlnvCanvas2dDirective, MyLayerDirective],
  templateUrl: './demo-chart.component.html',
  styleUrl: './demo-chart.component.css',
})
export class DemoChartComponent {
  /** Смена значения перезапускает пересборку очереди отрисовки (см. `plnvCanvasRedraw` у директивы канваса). */
  readonly redrawToken = signal(0);

  forceRedraw(): void {
    this.redrawToken.update((v) => v + 1);
  }
}
```

**Директива слоя** (наследник `PlnvCanvasElement`):

```typescript
import { Directive } from '@angular/core';
import { PlnvCanvasElement } from '@plnv/canvas';

@Directive({
  selector: '[appMyLayer]',
  standalone: true,
})
export class MyLayerDirective extends PlnvCanvasElement<CanvasRenderingContext2D> {
  protected override draw(ctx: CanvasRenderingContext2D): void {
    const w = this.width;
    const h = this.height;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(8, 8, Math.max(0, w - 16), Math.max(0, h - 16));
  }

  protected isReady(): boolean {
    return this.width > 0 && this.height > 0;
  }
}
```

Чтобы перерисовать слои после изменения своих `@Input`, вызовите у слоя `drawAll()` или пробросьте новое значение в `[plnvCanvasRedraw]` на `<canvas>` (как в примере с `redrawToken`).

### WebGL2

Подключите `PlnvCanvasWebglDirective` на `<canvas plnvCanvasWebgl>` и используйте `PlnvCanvasElement<WebGL2RenderingContext>` в слоях, рисуя через переданный контекст WebGL2.

### Дополнительно

- **`[performanceMode]`** — `@Input` с `booleanAttribute` на `PlnvCanvas2dDirective` / `PlnvCanvasWebglDirective` (логика в `PlnvCanvasHostBase`).
- **`PlnvCanvasRenderService`** и **`renderAudit`** экспортируются из пакета, если нужна кастомная подписка или свой пайп для частоты перерисовок.

Дополнительные сценарии из монорепозитория: `angular/libs/canvas/README.md`.

## Зависимости

- **peer:** `@angular/core` ^21, `rxjs` ^7.5

### Вход `plnvCanvasRedraw`

Это обычный `@Input()` (сеттер): при каждом изменении привязки вызывается пересборка очереди отрисовки. Удобно передавать счётчик или `signal()` в шаблоне, например `[plnvCanvasRedraw]="redrawToken()"`.
