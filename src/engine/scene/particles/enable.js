// Inject renderer
import WebGLRenderer from 'engine/servers/visual/webgl_renderer';
import ParticleRenderer from './renderer/particle_renderer';

WebGLRenderer.register_plugin('particle', ParticleRenderer);

// Register to global node class map
import { node_class_map } from 'engine/registry';

import ParticleNode2D from './particle_node_2d';

node_class_map['ParticleNode2D'] = ParticleNode2D;
