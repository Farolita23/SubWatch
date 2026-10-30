import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'grid' | 'rows' | 'sliders' | 'plus' | 'pause' | 'play' | 'x-circle'
  | 'pencil' | 'trash' | 'calendar' | 'bell' | 'external';

const PATHS: Record<IconName, string> = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  rows: 'M4 6h16M4 12h16M4 18h16',
  sliders: 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M14 4v4M8 10v4M16 16v4',
  plus: 'M12 5v14M5 12h14',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 4l13 8-13 8z',
  'x-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15 9l-6 6M9 9l6 6',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
};

/** Icono SVG de linea decorativo (aria-hidden). */
@Component({
  selector: 'app-icon',
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path [attr.d]="path()" /></svg>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: inline-flex' },
})
export class Icon {
  readonly name = input.required<IconName>();
  protected path(): string {
    return PATHS[this.name()];
  }
}
