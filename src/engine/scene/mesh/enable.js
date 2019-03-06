// Renderer
import WebGLRenderer from "engine/servers/visual/webgl_renderer";
import MeshRenderer from "./renderer/mesh_renderer";

WebGLRenderer.register_plugin('mesh', MeshRenderer);

// Register to global node class map
import { node_class_map } from 'engine/registry';

import Mesh from './mesh';
import NineSlicePlane from './nine_slice_plane';
import Plane from './plane';
import Rope from './rope';

node_class_map['Mesh'] = Mesh;
node_class_map['NineSlicePlane'] = NineSlicePlane;
node_class_map['Plane'] = Plane;
node_class_map['Rope'] = Rope;
