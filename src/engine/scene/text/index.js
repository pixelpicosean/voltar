// Loader middleware
import bitmap_font_parser from './bitmap_font_parser';
import { loader_use_procs } from 'engine/registry';
loader_use_procs.push(bitmap_font_parser);

// Renderer

// Class
export { default as BitmapText } from './BitmapText';
export { default as Text } from './Text';
