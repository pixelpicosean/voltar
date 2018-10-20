/**
 * Set of dynamic filters to be applied to v.audio.Sound.
 * @example
 * const sound = audio.Sound.from('file.mp3');
 * sound.filters = [
 *   new audio.filters.StereoFilter(-1),
 *   new audio.filters.ReverbFilter()
 * ];
 */
export { default as Filter } from './Filter';
export { default as EqualizerFilter } from './EqualizerFilter';
export { default as DistortionFilter } from './DistortionFilter';
export { default as StereoFilter } from './StereoFilter';
export { default as ReverbFilter } from './ReverbFilter';
export { default as MonoFilter } from './MonoFilter';
export { default as TelephoneFilter } from './TelephoneFilter';
