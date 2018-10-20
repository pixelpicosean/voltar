/**
 * Interface represents either a WebAudio source or an HTML5 AudioElement source
 * @typedef IMedia
 * @property {Filter[]} filters Collection of global filters
 * @property {IMediaContext} context Reference to the context.
 * @property {number} duration Length of sound in seconds.
 * @property {boolean} isPlayable Flag to check if sound is currently playable (e.g., has been loaded/decoded).
 * @property {() => IMediaInstance} create
 * @property {(sound: Sound) => void} init
 * @property {(callback?: LoadedCallback) => void} load
 * @property {() => void} destroy
 */

/**
 * Represents the audio context for playing back sounds. This can
 * represent either an HTML or WebAudio context.
 * @typedef IMediaContext
 * @property {boolean} muted `true` if all sounds are muted
 * @property {number} volume Volume to apply to all sounds
 * @property {number} speed The speed of all sounds
 * @property {boolean} paused Set the paused state for all sounds
 * @property {Filter[]} filters Collection of global filters
 * @property {() => boolean} toggleMute Toggle mute for all sounds
 * @property {() => boolean} togglePause Toggle pause for all sounds
 * @property {() => void} refresh Dispatch event to refresh all instances volume, mute, etc.
 * @property {() => void} destroy Destroy the context and don't use after this.
 * @property {AudioContext} audioContext Reference to the Web Audio API AudioContext element, if Web Audio is available
 */

 /**
  * Interface for single instance return by a Sound play call. This can either
  * be a WebAudio or HTMLAudio instance.
  * @typedef IMediaInstance
  * @property {number} id Auto-incrementing ID for the instance.
  * @property {number} progress Current progress of the sound from 0 to 1
  * @property {boolean} paused If the instance is paused, if the sound or global context
  *                           is paused, this could still be false.
  * @property {number} volume Current volume of the instance. This is not the actual volume
  *                           since it takes into account the global context and the sound volume.
  * @property {number} speed Current speed of the instance. This is not the actual speed
  *                          since it takes into account the global context and the sound volume.
  * @property {boolean} loop If the current instance is set to loop
  * @property {boolean} muted Set the muted state of the instance
  * @property {() => void} stop Stop the current instance from playing.
  * @property {() => void} refresh
  * @property {() => void} refreshPaused
  * @property {(parent: IMedia) => void} init
  * @property {(options: PlayOptions) => void} play
  * @property {() => void} destroy
  * @property {() => string} toString
  * @property {(event: string, fn: Function, context?: any) => this} once
  * @property {(event: string, fn: Function, context?: any) => this} on
  * @property {(event: string, fn: Function, context?: any) => this} off
  */
