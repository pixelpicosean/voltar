export default class Basis {
    constructor(m00 = 1, m01 = 0, m02 = 0, m10 = 0, m11 = 1, m12 = 0, m20 = 0, m21 = 0, m22 = 1) {
        this.elements = [
            [m00, m01, m02],
            [m10, m11, m12],
            [m20, m21, m22],
        ];
    }
}
