/**
 * This namespace contains WebGL-only display filters that can be applied
 * to Node2Ds using the {@link V.Node2D#filters filters} property.
 * @example
 * // Create a new application
 * const app = new V.Application();
 *
 * // Draw a green rectangle
 * const rect = new V.Graphics()
 *     .beginFill(0x00ff00)
 *     .drawRect(40, 40, 200, 200);
 *
 * // Add a blur filter
 * rect.filters = [new V.filters.BlurFilter()];
 *
 * // Display rectangle
 * app.stage.addChild(rect);
 * document.body.appendChild(app.view);
 * @namespace V.filters
 */
export { default as FXAAFilter } from './fxaa/FXAAFilter';
export { default as NoiseFilter } from './noise/NoiseFilter';
export { default as DisplacementFilter } from './displacement/DisplacementFilter';
export { default as BlurFilter } from './blur/BlurFilter';
export { default as BlurXFilter } from './blur/BlurXFilter';
export { default as BlurYFilter } from './blur/BlurYFilter';
export { default as ColorMatrixFilter } from './colormatrix/ColorMatrixFilter';
export { default as VoidFilter } from './void/VoidFilter';
