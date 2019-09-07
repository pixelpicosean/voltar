export class VisualServerScene {
    render_camera(camera, scenario, size, shadow_atlas) {
        throw new Error("Method not implemented.");
    }

    render_probes() {
        throw new Error("Method not implemented.");
    }

    free_rid(rid) {
        return false;
    }
}
