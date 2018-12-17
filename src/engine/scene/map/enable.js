// Dependencies
import 'engine/scene/sprites/enable';

// Inject renderer
import WebGLRenderer from 'engine/renderers/WebGLRenderer';
import TileRenderer from './renderer/TileRenderer';
WebGLRenderer.register_plugin('tilemap', TileRenderer);

// Register to global node class map
import { node_class_map } from 'engine/registry';
import TileMap from './BackgroundMap';

node_class_map['TileMap'] = TileMap;
