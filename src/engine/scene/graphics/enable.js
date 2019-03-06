// Dependencies
import 'engine/scene/sprites/enable';

// Inject renderer
import WebGLRenderer from "engine/servers/visual/webgl_renderer";

import GraphicsRenderer from "./renderer/graphics_renderer";
WebGLRenderer.register_plugin('graphics', GraphicsRenderer);

// Register to global node class map
import { node_class_map } from 'engine/registry';

import Graphics from './graphics';

node_class_map['Graphics'] = Graphics;
