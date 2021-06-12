/**
 * Bezier Curves formulas obtained from
 * http://en.wikipedia.org/wiki/Bézier_curve
 */

import { Vector3 } from "./vector3";

export function catmull_rom(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const v0 = (p2 - p0) * 0.5;
    const v1 = (p3 - p1) * 0.5;
    const t2 = t * t;
    const t3 = t * t2;
    return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (- 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
}
export function catmull_rom_vec3(t: number, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3): Vector3 {
    const v0 = p2.clone().subtract(p0).scale(0.5);
    const v1 = p3.clone().subtract(p1).scale(0.5);
    const t2 = t * t;
    const t3 = t * t2;
    return p1.clone().scale(2).subtract(p2.clone().scale(2)).add(v0).add(v1).scale(t3)
        .add(
            p1.clone().scale(-3).add(p2.scale(3)).subtract(v0.clone().scale(2)).subtract(v1).scale(t2)
        )
        .add(
            v0.clone().scale(t)
        )
        .add(p1)
}


function QuadraticBezierP0(t: number, p: number): number {
    const k = 1 - t;
    return k * k * p;
}
function QuadraticBezierP1(t: number, p: number): number {
    return 2 * (1 - t) * t * p;
}
function QuadraticBezierP2(t: number, p: number): number {
    return t * t * p;
}
export function quadratic_bezier(t: number, p0: number, p1: number, p2: number): number {
    return QuadraticBezierP0(t, p0) + QuadraticBezierP1(t, p1) + QuadraticBezierP2(t, p2);
}


export function cubic_bezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const omt = 1 - t;
    const omt2 = omt * omt;
    const omt3 = omt2 * omt;
    const t2 = t * t;
    const t3 = t2 * t;
    return p0 * omt3 + p1 * omt2 * t * 3 + p2 * omt * t2 * 3 + p3 * t3;
}
export function cubic_bezier_vec3(t: number, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3): Vector3 {
    const omt = 1 - t;
    const omt2 = omt * omt;
    const omt3 = omt2 * omt;
    const t2 = t * t;
    const t3 = t2 * t;
    return p0.clone().scale(omt3)
        .add(p1.clone().scale(omt2 * t * 3))
        .add(p2.clone().scale(omt * t2 * 3))
        .add(p3.clone().scale(t3))
}
