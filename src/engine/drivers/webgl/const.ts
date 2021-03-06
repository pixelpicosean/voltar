type AttribDesc = { name: string, loc: number };

type UniformTypes = '1i' | '2i' | '1f' | '2f' | '3f' | '4f' | 'mat3' | 'mat4';
type UniformDesc = { name: string, type: UniformTypes };
