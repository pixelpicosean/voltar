// Inject renderers
import WebGLRenderer from 'engine/renderers/WebGLRenderer';

import SpriteRenderer from './renderer/SpriteRenderer';
WebGLRenderer.register_plugin('sprite', SpriteRenderer);

import TilingSpriteRenderer from './renderer/TilingSpriteRenderer';
WebGLRenderer.register_plugin('tiling_sprite', TilingSpriteRenderer);

// Export classes
export { default as AnimatedSprite } from './AnimatedSprite';
export { default as Sprite } from './Sprite';
export { default as NineSliceSprite } from './NineSliceSprite';
export { default as TilingSprite } from './TilingSprite';
