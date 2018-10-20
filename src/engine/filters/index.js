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
export { default as FXAA } from './fxaa/FXAA';
export { default as Noise } from './noise/Noise';
export { default as Displacement } from './displacement/Displacement';
export { default as Blur } from './blur/Blur';
export { default as BlurX } from './blur/BlurX';
export { default as BlurY } from './blur/BlurY';
export { default as ColorMatrix } from './colormatrix/ColorMatrix';
export { default as Alpha } from './alpha/Alpha';
