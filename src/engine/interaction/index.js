/**
 * This namespace contains a renderer plugin for handling mouse, pointer, and touch events.
 *
 * Do not instantiate this plugin directly. It is available from the `renderer.plugins` property.
 * See {@link V.CanvasRenderer#plugins} or {@link V.WebGLRenderer#plugins}.
 * @namespace V.interaction
 */
export { default as InteractionData } from './InteractionData';
export { default as InteractionManager } from './InteractionManager';
export { default as interactiveTarget } from './interactiveTarget';
