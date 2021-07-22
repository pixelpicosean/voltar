import {
    Color,
    Rect2,
    Node2D,
} from "engine/index";

import {
    simplex2,
    simplex_seed,
} from "./simplex";

function inverse_lerp(min: number, max: number, value: number) {
    return (value - min) / (max - min);
}

/**
 * @param {number} width
 * @param {number} height
 * @param {number} scale
 * @param {number} seed [1, 65535]
 * @param {number} octaves
 * @param {number} persistence
 * @param {number} lacunarity
 * @param {number} offset_x
 * @param {number} offset_y
 */
export function generate_noise_map(width: number, height: number, scale: number, seed: number, octaves: number, persistence: number, lacunarity: number, offset_x: number, offset_y: number) {
    let noise_map: number[][] = Array(width);
    for (let i = 0; i < width; i++) noise_map[i] = Array(height);

    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;

    simplex_seed(seed);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let amplitude = 1.0;
            let frequency = 1.0;
            let noise_height = 0.0;

            for (let i = 0; i < octaves; i++) {
                let value = simplex2(
                    x / scale * frequency + offset_x,
                    y / scale * frequency + offset_y
                );
                noise_height += value * amplitude;

                amplitude *= persistence;
                frequency *= lacunarity;
            }

            noise_map[x][y] = noise_height;

            if (noise_height > max) {
                max = noise_height;
            } else if (noise_height < min) {
                min = noise_height;
            }
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            noise_map[x][y] = inverse_lerp(min, max, noise_map[x][y]);
        }
    }

    return noise_map;
}

const default_palette = [
    { height: 0.3, color: Color.hex(0x3262C0) }, // water deep
    { height: 0.4, color: Color.hex(0x3565C6) }, // water shallow
    { height: 0.45, color: Color.hex(0xD0D07E) }, // sand
    { height: 0.55, color: Color.hex(0x579618) }, // grass
    { height: 0.6, color: Color.hex(0x3D6A12) }, // grass 2
    { height: 0.7, color: Color.hex(0x5B423D) }, // rock
    { height: 0.9, color: Color.hex(0x4A3B36) }, // rock 2
    { height: 1.0, color: Color.hex(0xFFFFFF) }, // snow
]

export class NoiseMapViewer extends Node2D {
    static instance() { return new NoiseMapViewer }

    noise_map: number[][] = null;
    cell_size = 8;
    palette = default_palette;

    draw(noise_map: number[][], cell_size: number, palette = default_palette) {
        this.noise_map = noise_map;
        this.cell_size = cell_size;
        this.palette = palette;

        this.update();
    }

    _draw() {
        if (!this.noise_map || this.noise_map.length == 0 || this.noise_map[0].length == 0) return;

        const width = this.noise_map.length;
        const height = this.noise_map[0].length;

        let rect = Rect2.new();

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let noise_height = this.noise_map[x][y];

                for (let i = 0; i < this.palette.length; i++) {
                    if (noise_height < this.palette[i].height) {
                        this.draw_rect(
                            rect.set(x * this.cell_size, y * this.cell_size, this.cell_size, this.cell_size),
                            this.palette[i].color
                        )
                        break;
                    }
                }
            }
        }

        Rect2.free(rect);
    }
}
