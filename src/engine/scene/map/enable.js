// Dependencies
import 'engine/scene/sprites/enable';

// Inject renderer
import WebGLRenderer from 'engine/servers/visual/webgl_renderer';
import TileRenderer from './renderer/tile_renderer';
WebGLRenderer.register_plugin('tilemap', TileRenderer);

// Register to global node class map
import { node_class_map } from 'engine/registry';
import TileMap from './tile_map';

node_class_map['TileMap'] = TileMap;
