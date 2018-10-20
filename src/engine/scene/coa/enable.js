// Dependencies
import 'engine/scene/sprites/enable';

import { node_class_map, loader_use_procs } from 'engine/registry';

import CutoutAnimation from './CutoutAnimation';

// Loading middleware
import coa_parser from './loader';
loader_use_procs.push(coa_parser);

// Register to global node class map
node_class_map['CutoutAnimation'] = CutoutAnimation;
