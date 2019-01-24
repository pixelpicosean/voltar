import * as v from 'engine/index';
import layout from 'scene/PathSample.json';

export default class ParticleTest extends v.Node2D {
    static instance() {
        return v.assemble_scene(new ParticleTest(), layout);
    }
    _ready() {
        /**
         * @type {v.CPUParticles2D}
         */
        this.particle = this.get_node('CPUParticles2D');

        this.set_process(true);
    }

    /**
     * @param {number} delta
     */
    _process(delta) {
        this.particle.position.copy(v.input.mouse);
    }
}
