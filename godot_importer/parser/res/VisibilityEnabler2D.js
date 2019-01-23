const Node2D = require('./Node2D');

module.exports = (data) => {
    return Object.assign(Node2D(data), {
        type: 'VisibilityEnabler2D',
        freeze_bodies: data.prop.freeze_bodies,
        pause_animated_sprites: data.prop.pause_animated_sprites,
        pause_animations: data.prop.pause_animations,
        pause_particles: data.prop.pause_particles,
        physics_process_parent: data.prop.physics_process_parent,
        process_parent: data.prop.process_parent,
    });
};
