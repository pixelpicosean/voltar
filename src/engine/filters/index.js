/**
 * This namespace contains WebGL-only display filters that can be applied
 * to Node2Ds using the {@link v.Node2D#filters filters} property.
 * @example
 * // Draw a green rectangle
 * const rect = new v.Graphics()
 *     .begin_fill(0x00ff00)
 *     .draw_rect(40, 40, 200, 200);
 *
 * // Add a blur filter
 * rect.filters = [new v.filters.BlurFilter()];
 *
 * @namespace v.filters
 */
export { default as FXAAFilter } from './fxaa/FXAAFilter';
export { default as NoiseFilter } from './noise/NoiseFilter';
export { default as DisplacementFilter } from './displacement/DisplacementFilter';
export { default as BlurFilter } from './blur/BlurFilter';
export { default as BlurXFilter } from './blur/BlurXFilter';
export { default as BlurYFilter } from './blur/BlurYFilter';
export { default as ColorMatrixFilter } from './colormatrix/ColorMatrixFilter';
export { default as AlphaFilter } from './alpha/AlphaFilter';
