/**
 * @namespace V
 */
export * from './const';
export * from './math';

import * as utils from './utils';
import * as ticker from './ticker';
import settings from './settings';

import CanvasRenderer from './renderers/canvas/CanvasRenderer';
import WebGLRenderer from './renderers/webgl/WebGLRenderer';

export { settings, utils, ticker, CanvasRenderer, WebGLRenderer };


export { default as glCore } from 'pixi-gl-core';


export { default as Node2D } from './scene/Node2D';

export * from './rnd';

export * from './scene/particles';

export { default as Sprite } from './scene/sprites/Sprite';
export { default as AnimatedSprite } from './scene/sprites/AnimatedSprite';
export { SpriteFrames } from './scene/sprites/AnimatedSprite';
export { default as TilingSprite } from './scene/sprites/TilingSprite';
export { default as CanvasTinter } from './scene/sprites/canvas/CanvasTinter';
export { default as SpriteRenderer } from './scene/sprites/webgl/SpriteRenderer';
export { default as CanvasSpriteRenderer } from './scene/sprites/canvas/CanvasSpriteRenderer';

export { default as Graphics } from './scene/graphics/Graphics';
export { default as GraphicsData } from './scene/graphics/GraphicsData';
export { default as GraphicsRenderer } from './scene/graphics/webgl/GraphicsRenderer';
export { default as CanvasGraphicsRenderer } from './scene/graphics/canvas/CanvasGraphicsRenderer';

export { default as BitmapText } from './scene/BitmapText';
export { default as Text } from './scene/text/Text';
export { default as TextStyle } from './scene/text/TextStyle';
export { default as TextMetrics } from './scene/text/TextMetrics';

export { default as Mesh } from './scene/mesh/Mesh';
export { default as NineSlicePlane } from './scene/mesh/NineSlicePlane';
export { default as Plane } from './scene/mesh/Plane';
export { default as Rope } from './scene/mesh/Rope';

export { default as RectangleShape2D } from './scene/physics/RectangleShape2D';
export { default as CollisionObject2D } from './scene/physics/CollisionObject2D';
export { default as Area2D } from './scene/physics/Area2D';
export { default as PhysicsBody2D } from './scene/physics/PhysicsBody2D';

export { default as Spritesheet } from './textures/Spritesheet';
export { default as Texture } from './textures/Texture';
export { default as BaseTexture } from './textures/BaseTexture';
export { default as RenderTexture } from './textures/RenderTexture';
export { default as BaseRenderTexture } from './textures/BaseRenderTexture';
export { default as VideoBaseTexture } from './textures/VideoBaseTexture';
export { default as TextureUvs } from './textures/TextureUvs';
export { default as TextureTransform } from './textures/TextureTransform';

export { default as CanvasRenderTarget } from './renderers/canvas/utils/CanvasRenderTarget';

export { default as Shader } from './Shader';

export { default as WebGLManager } from './renderers/webgl/managers/WebGLManager';
export { default as ObjectRenderer } from './renderers/webgl/utils/ObjectRenderer';
export { default as RenderTarget } from './renderers/webgl/utils/RenderTarget';
export { default as Quad } from './renderers/webgl/utils/Quad';
export { default as SpriteMaskFilter } from './renderers/webgl/filters/spriteMask/SpriteMaskFilter';
export { default as Filter } from './renderers/webgl/filters/Filter';
