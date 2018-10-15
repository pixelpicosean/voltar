// Dependencies
import 'engine/scene/sprites/enable';

// Inject renderer
import WebGLRenderer from "engine/renderers/WebGLRenderer";

import GraphicsRenderer from "./renderer/GraphicsRenderer";
WebGLRenderer.register_plugin('graphics', GraphicsRenderer);

// Register to global node class map
import { node_class_map } from 'engine/registry';

import Graphics from './Graphics';

node_class_map['Graphics'] = Graphics;
