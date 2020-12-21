const n = 'erusaertdeman'.split('').reverse().join('')

export const p = ((st) => {
    const t2c = (s: string) => s.split('').map(c => c.charCodeAt(0))
    const bh = (n: any) => ("0" + Number(n).toString(16)).substr(-2)
    const as2c = (c: number) => t2c(st).reduce((a: number, b: number) => a ^ b, c)
    return (t: any) => t.split('')
        .map(t2c)
        .map(as2c)
        .map(bh)
        .join('')
})(n)

export const l = ((st) => {
    const t2c = (s: string) => s.split('').map((c: any) => c.charCodeAt(0))
    const sc = t2c(st)
    const as2c = (c: number) => sc.reduce((a: number, b: number) => a ^ b, c)
    return (ed: any) => ed.match(/.{1,2}/g)
        .map((x: any) => parseInt(x, 16))
        .map(as2c)
        .map((cc: any) => String.fromCharCode(cc))
        .join('')
})(n)

export const key = (s: string): string => p(s)
