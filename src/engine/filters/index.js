/**
 * This namespace contains display filters that can be applied
 * to `Node2D` using the `filters` property.
 * @example
 * const rect = new v.Graphics()
 *     .begin_fill(0x00ff00)
 *     .draw_rect(40, 40, 200, 200);
 *
 * rect.filters = [new filters.Blur()];
 */
export { default as Alpha } from './alpha/alpha';
export { default as Blur } from './blur/blur';
export { default as BlurX } from './blur/blur_x';
export { default as BlurY } from './blur/blur_y';
export { default as ColorMatrix } from './colormatrix/color_matrix';
export { default as Displacement } from './displacement/displacement';
export { default as Dot } from './dot/dot';
export { default as FXAA } from './fxaa/fxaa';
export { default as KawaseBlur } from './kawase_blur/blur';
export { default as Noise } from './noise/noise';
export { default as Outline } from './outline/outline';
export { default as SharpBlur } from './sharp_blur/blur';
export { default as SimpleOutline } from './simple_outline/outline';
