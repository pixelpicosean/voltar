/**
 * This namespace contains WebGL-only display filters that can be applied
 * to Node2Ds using the {@link Node2D#filters filters} property.
 * @example
 * // Draw a green rectangle
 * const rect = new v.Graphics()
 *     .begin_fill(0x00ff00)
 *     .draw_rect(40, 40, 200, 200);
 *
 * // Add a blur filter
 * rect.filters = [new filters.Blur()];
 */
export { default as FXAA } from './fxaa/_fxaa';
export { default as Noise } from './noise/_noise';
export { default as Displacement } from './displacement/_displacement';
export { default as Blur } from './blur/_blur';
export { default as BlurX } from './blur/blur_x';
export { default as BlurY } from './blur/blur_y';
export { default as ColorMatrix } from './colormatrix/color_matrix';
export { default as Alpha } from './alpha/_alpha';
