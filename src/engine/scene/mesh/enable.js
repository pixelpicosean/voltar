// Renderer
import WebGLRenderer from "engine/renderers/WebGLRenderer";
import MeshRenderer from "./renderer/MeshRenderer";

WebGLRenderer.register_plugin('mesh', MeshRenderer);

// Register to global node class map
import { node_class_map } from 'engine/registry';

import Mesh from './mesh';
import NineSlicePlane from './NineSlicePlane';
import Plane from './plane';
import Rope from './rope';

node_class_map['Mesh'] = Mesh;
node_class_map['NineSlicePlane'] = NineSlicePlane;
node_class_map['Plane'] = Plane;
node_class_map['Rope'] = Rope;
