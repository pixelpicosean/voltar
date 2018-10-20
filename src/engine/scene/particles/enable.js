// Inject renderer
import WebGLRenderer from 'engine/renderers/WebGLRenderer';
import ParticleRenderer from './renderer/ParticleRenderer';

WebGLRenderer.register_plugin('particle', ParticleRenderer);

// Register to global node class map
import { node_class_map } from 'engine/registry';

import ParticleNode2D from './ParticleNode2D';

node_class_map['ParticleNode2D'] = ParticleNode2D;
