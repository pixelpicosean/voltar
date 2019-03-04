declare module 'remove-array-items' {
    export default function remove_items<T>(arr: T[], start_index: number, remove_count: number): void;
}

declare module 'ismobilejs' {
    export const apple: {
        phone: boolean,
        ipod: boolean,
        tablet: boolean,
        device: string,
    };
    export const android: {
        phone: boolean,
        tablet: boolean,
        device: string,
    };
    export const amazon: {
        phone: boolean,
        tablet: boolean,
        device: string,
    };
    export const windows: {
        phone: boolean,
        tablet: boolean,
        device: string,
    };
    export const seven_inch: boolean;
    export const other: {
        blackberry_10: boolean,
        blackberry: boolean,
        opera: boolean,
        firefox: boolean,
        chrome: boolean,
        device: string,
    };
    export const any: boolean;
    export const phone: boolean;
    export const tablet: boolean;
}

declare module 'earcut' {
    export default function earcut(data: number[], hole_indices?: number[], dim?: number): number[];
}
