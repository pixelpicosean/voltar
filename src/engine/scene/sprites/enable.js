// Inject renderers
import WebGLRenderer from 'engine/servers/visual/webgl_renderer';

import SpriteRenderer from './renderer/sprite_renderer';
WebGLRenderer.register_plugin('sprite', SpriteRenderer);

import TilingSpriteRenderer from './renderer/tiling_sprite_renderer';
WebGLRenderer.register_plugin('tiling_sprite', TilingSpriteRenderer);

// Register to global node class map
import { node_class_map } from 'engine/registry';

import AnimatedSprite from './animated_sprite';
import Sprite from './sprite';
import NineSliceSprite from './nine_slice_sprite';
import TilingSprite from './tiling_sprite';

node_class_map['AnimatedSprite'] = AnimatedSprite;
node_class_map['Sprite'] = Sprite;
node_class_map['NineSliceSprite'] = NineSliceSprite;
node_class_map['TilingSprite'] = TilingSprite;
