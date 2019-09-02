const n = 'namedtreasure'

export const p = ((st) => {
    const t2c = (s) => s.split('').map(c => c.charCodeAt(0))
    const bh = (n) => ("0" + Number(n).toString(16)).substr(-2)
    const as2c = (c) => t2c(st).reduce((a, b) => a ^ b, c)
    return (t) => t.split('')
        .map(t2c)
        .map(as2c)
        .map(bh)
        .join('')
})(n)

export const l = ((st) => {
    const t2c = (s) => s.split('').map(c => c.charCodeAt(0))
    const sc = t2c(st)
    const as2c = (c) => sc.reduce((a, b) => a ^ b, c)
    return (ed) => ed.match(/.{1,2}/g)
        .map((x) => parseInt(x, 16))
        .map(as2c)
        .map((cc) => String.fromCharCode(cc))
        .join('')
})(n)

export const key = (s) => p(key)
