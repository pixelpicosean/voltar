/**
 * This namespace provides renderer-specific plugins for exporting content from a renderer.
 * For instance, these plugins can be used for saving an Image, Canvas element or for exporting the raw image data (pixels).
 *
 * Do not instantiate these plugins directly. It is available from the `renderer.plugins` property.
 * @example
 * // Draw a red circle
 * const graphics = new Graphics()
 *     .begin_fill(0xFF0000)
 *     .draw_circle(0, 0, 50);
 *
 * // Render the graphics as an HTMLImageElement
 * const image = v.scene_tree.extract.image(graphics);
 * document.body.appendChild(image);
 */

// Inject renderer
import WebGLRenderer from 'engine/servers/visual/webgl_renderer';
import WebGLExtract from './webgl_extract';
WebGLRenderer.register_plugin('extract', WebGLExtract);

// Export so SceneTree can initialize it
import { optional } from 'engine/registry';
optional['Extract'] = WebGLExtract;
