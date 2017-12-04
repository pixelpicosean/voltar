/**
 * Set of dynamic filters to be applied to v.audio.Sound.
 * @example
 * const sound = v.audio.Sound.from('file.mp3');
 * sound.filters = [
 *   new v.audio.filters.StereoFilter(-1),
 *   new v.audio.filters.ReverbFilter()
 * ];
 * @namespace v.audio.filters
 */
export { default as Filter } from './Filter';
export { default as EqualizerFilter } from './EqualizerFilter';
export { default as DistortionFilter } from './DistortionFilter';
export { default as StereoFilter } from './StereoFilter';
export { default as ReverbFilter } from './ReverbFilter';
export { default as MonoFilter } from './MonoFilter';
export { default as TelephoneFilter } from './TelephoneFilter';
