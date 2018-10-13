/**
 * The prepare namespace provides renderer-specific plugins for pre-rendering Node2Ds. These plugins are useful for
 * asynchronously preparing assets, textures, graphics waiting to be displayed.
 *
 * Do not instantiate these plugins directly. It is available from the `renderer.plugins` property.
 * See {@link CanvasRenderer#plugins} or {@link WebGLRenderer#plugins}.
 * @example
 * // Create a new application
 * const app = new Application();
 * document.body.appendChild(app.view);
 *
 * // Don't start rendering right away
 * app.stop();
 *
 * // create a display object
 * const rect = new Graphics()
 *     .begin_fill(0x00ff00)
 *     .draw_rect(40, 40, 200, 200);
 *
 * // Add to the stage
 * app.stage.add_child(rect);
 *
 * // Don't start rendering until the graphic is uploaded to the GPU
 * app.renderer.plugins.prepare.upload(app.stage, () => {
 *     app.start();
 * });
 */
export { default as webgl } from './webgl/WebGLPrepare';
export { default as canvas } from './canvas/CanvasPrepare';
export { default as BasePrepare } from './BasePrepare';
export { default as CountLimiter } from './limiters/CountLimiter';
export { default as TimeLimiter } from './limiters/TimeLimiter';
