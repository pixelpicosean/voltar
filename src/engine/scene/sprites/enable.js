// Inject renderers
import WebGLRenderer from 'engine/renderers/WebGLRenderer';

import SpriteRenderer from './renderer/SpriteRenderer';
WebGLRenderer.register_plugin('sprite', SpriteRenderer);

import TilingSpriteRenderer from './renderer/TilingSpriteRenderer';
WebGLRenderer.register_plugin('tiling_sprite', TilingSpriteRenderer);

// Register to global node class map
import { node_class_map } from 'engine/registry';

import AnimatedSprite from './AnimatedSprite';
import Sprite from './Sprite';
import NineSliceSprite from './NineSliceSprite';
import TilingSprite from './TilingSprite';

node_class_map['AnimatedSprite'] = AnimatedSprite;
node_class_map['Sprite'] = Sprite;
node_class_map['NineSliceSprite'] = NineSliceSprite;
node_class_map['TilingSprite'] = TilingSprite;
