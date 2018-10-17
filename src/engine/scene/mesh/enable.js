// Renderer
import WebGLRenderer from "engine/renderers/WebGLRenderer";
import MeshRenderer from "./renderer/MeshRenderer";

WebGLRenderer.register_plugin('mesh', MeshRenderer);

// Register to global node class map
import { node_class_map } from 'engine/registry';

import Mesh from './Mesh';
import NineSlicePlane from './NineSlicePlane';
import Plane from './Plane';
import Rope from './Rope';

node_class_map['Mesh'] = Mesh;
node_class_map['NineSlicePlane'] = NineSlicePlane;
node_class_map['Plane'] = Plane;
node_class_map['Rope'] = Rope;
