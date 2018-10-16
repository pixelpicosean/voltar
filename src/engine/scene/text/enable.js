// Dependencies
import 'engine/scene/sprites/enable';

// Loader middleware
import bitmap_font_parser from './bitmap_font_parser';
import { loader_use_procs } from 'engine/registry';
loader_use_procs.push(bitmap_font_parser);

// Register to global node class map
import { node_class_map } from 'engine/registry';

import Text from './Text';
import BitmapText from './BitmapText';

node_class_map['Text'] = Text;
node_class_map['BitmapText'] = BitmapText;
