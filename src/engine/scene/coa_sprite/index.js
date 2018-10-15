import { node_class_map } from 'engine/registry';

import CoaSprite from './CoaSprite';

// Internal classes that may help
export { default as Animator } from './Animator';
export * from './FrameData';
export * from './Model';
export * from './Provider';

// Register to global node class map
node_class_map['CoaSprite'] = CoaSprite;

export default CoaSprite;
