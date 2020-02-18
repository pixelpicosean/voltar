declare module 'remove-array-items' {
    export default function remove_items<T>(arr: T[], start_index: number, remove_count: number): void;
}

declare module 'ismobilejs' {
    export declare type isMobileResult = {
        apple: {
            phone: boolean;
            ipod: boolean;
            tablet: boolean;
            device: boolean;
        };
        amazon: {
            phone: boolean;
            tablet: boolean;
            device: boolean;
        };
        android: {
            phone: boolean;
            tablet: boolean;
            device: boolean;
        };
        windows: {
            phone: boolean;
            tablet: boolean;
            device: boolean;
        };
        other: {
            blackberry: boolean;
            blackberry10: boolean;
            opera: boolean;
            firefox: boolean;
            chrome: boolean;
            device: boolean;
        };
        phone: boolean;
        tablet: boolean;
        any: boolean;
    };
    export default function isMobile(userAgent?: string): isMobileResult;
}

declare module 'earcut' {
    export default function earcut(data: number[], hole_indices?: number[], dim?: number): number[];
}
