/**
 * This namespace provides renderer-specific plugins for exporting content from a renderer.
 * For instance, these plugins can be used for saving an Image, Canvas element or for exporting the raw image data (pixels).
 *
 * Do not instantiate these plugins directly. It is available from the `renderer.plugins` property.
 * See {@link V.CanvasRenderer#plugins} or {@link V.WebGLRenderer#plugins}.
 * @example
 * // Create a new app (will auto-add extract plugin to renderer)
 * const app = new V.Application();
 *
 * // Draw a red circle
 * const graphics = new V.Graphics()
 *     .begin_fill(0xFF0000)
 *     .draw_circle(0, 0, 50);
 *
 * // Render the graphics as an HTMLImageElement
 * const image = app.renderer.plugins.extract.image(graphics);
 * document.body.appendChild(image);
 * @namespace V.extract
 */
export { default as webgl } from './webgl/WebGLExtract';
export { default as canvas } from './canvas/CanvasExtract';
