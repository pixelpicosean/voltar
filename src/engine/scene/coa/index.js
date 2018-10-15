// Dependencies
import 'engine/scene/sprites/index';

import { node_class_map, loader_use_procs } from 'engine/registry';

import CutoutAnimation from './CutoutAnimation';

// Loading middleware
import coa_parser from './loader';
loader_use_procs.push(coa_parser);

// Internal classes that
export { default as Animator } from './Animator';
export * from './FrameData';
export * from './Model';
export * from './Provider';

// Register to global node class map
node_class_map['CutoutAnimation'] = CutoutAnimation;
