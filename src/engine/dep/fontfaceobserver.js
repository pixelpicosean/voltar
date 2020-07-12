/* Font Face Observer v2.1.0 - © Bram Stein. License: BSD-3-Clause */
function l(a, b) {
    document.addEventListener ? a.addEventListener("scroll", b, !1) : a.attachEvent("scroll", b)
}

function m(a) {
    document.body ? a() : document.addEventListener("DOMContentLoaded", function c() {
        document.removeEventListener("DOMContentLoaded", c);
        a()
    })
};

function t(a) {
    this.a = document.createElement("div");
    this.a.setAttribute("aria-hidden", "true");
    this.a.appendChild(document.createTextNode(a));
    this.b = document.createElement("span");
    this.c = document.createElement("span");
    this.h = document.createElement("span");
    this.f = document.createElement("span");
    this.g = -1;
    this.b.style.cssText = "max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";
    this.c.style.cssText = "max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";
    this.f.style.cssText = "max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";
    this.h.style.cssText = "display:inline-block;width:200%;height:200%;font-size:16px;max-width:none;";
    this.b.appendChild(this.h);
    this.c.appendChild(this.f);
    this.a.appendChild(this.b);
    this.a.appendChild(this.c)
}

function u(a, b) {
    a.a.style.cssText = "max-width:none;min-width:20px;min-height:20px;display:inline-block;overflow:hidden;position:absolute;width:auto;margin:0;padding:0;top:-999px;white-space:nowrap;font-synthesis:none;font:" + b + ";"
}

function z(a) {
    var b = a.a.offsetWidth,
        c = b + 100;
    a.f.style.width = c + "px";
    a.c.scrollLeft = c;
    a.b.scrollLeft = a.b.scrollWidth + 100;
    return a.g !== b ? (a.g = b, !0) : !1
}

function A(a, b) {
    function c() {
        var a = k;
        z(a) && a.a.parentNode && b(a.g)
    }
    var k = a;
    l(a.b, c);
    l(a.c, c);
    z(a)
};

function B(a, b = {}) {
    var c = b;
    this.family = a;
    this.style = c.style || "normal";
    this.weight = c.weight || "normal";
    this.stretch = c.stretch || "normal"
}
var C = null,
    D = null,
    E = null,
    F = null;

function G() {
    if (null === D)
        if (J() && /Apple/.test(window.navigator.vendor)) {
            var a = /AppleWebKit\/([0-9]+)(?:\.([0-9]+))(?:\.([0-9]+))/.exec(window.navigator.userAgent);
            D = !!a && 603 > parseInt(a[1], 10)
        } else D = !1;
    return D
}

function J() {
    // @ts-ignore
    null === F && (F = !!document.fonts);
    return F
}

function K() {
    if (null === E) {
        var a = document.createElement("div");
        try {
            a.style.font = "condensed 100px sans-serif"
        } catch (b) {}
        E = "" !== a.style.font
    }
    return E
}

function L(a, b) {
    return [a.style, a.weight, K() ? a.stretch : "", "100px", b].join(" ")
}
B.prototype.load = function(a = "BESbswy", b = 3E3) {
    var c = this,
        k = a,
        r = 0,
        n = b,
        H = (new Date).getTime();
    return new Promise(function(a, b) {
        if (J() && !G()) {
            var M = new Promise(function(a, b) {
                    function e() {
                        (new Date).getTime() - H >= n ? b(Error("" + n + "ms timeout exceeded")) : document.fonts.load(L(c, '"' + c.family + '"'), k).then(function(c) {
                            1 <= c.length ? a() : setTimeout(e, 25)
                        }, b)
                    }
                    e()
                }),
                N = new Promise(function(a, c) {
                    r = setTimeout(function() {
                        c(Error("" + n + "ms timeout exceeded"))
                    }, n)
                });
            Promise.race([N, M]).then(function() {
                    clearTimeout(r);
                    a(c)
                },
                b)
        } else m(function() {
            function v() {
                var b;
                if (b = -1 != f && -1 != g || -1 != f && -1 != h || -1 != g && -1 != h)(b = f != g && f != h && g != h) || (null === C && (b = /AppleWebKit\/([0-9]+)(?:\.([0-9]+))/.exec(window.navigator.userAgent), C = !!b && (536 > parseInt(b[1], 10) || 536 === parseInt(b[1], 10) && 11 >= parseInt(b[2], 10))), b = C && (f == w && g == w && h == w || f == x && g == x && h == x || f == y && g == y && h == y)), b = !b;
                b && (d.parentNode && d.parentNode.removeChild(d), clearTimeout(r), a(c))
            }

            function I() {
                if ((new Date).getTime() - H >= n) d.parentNode && d.parentNode.removeChild(d), b(Error("" +
                    n + "ms timeout exceeded"));
                else {
                    var a = document.hidden;
                    if (!0 === a || void 0 === a) f = e.a.offsetWidth, g = p.a.offsetWidth, h = q.a.offsetWidth, v();
                    r = setTimeout(I, 50)
                }
            }
            var e = new t(k),
                p = new t(k),
                q = new t(k),
                f = -1,
                g = -1,
                h = -1,
                w = -1,
                x = -1,
                y = -1,
                d = document.createElement("div");
            d.dir = "ltr";
            u(e, L(c, "sans-serif"));
            u(p, L(c, "serif"));
            u(q, L(c, "monospace"));
            d.appendChild(e.a);
            d.appendChild(p.a);
            d.appendChild(q.a);
            document.body.appendChild(d);
            w = e.a.offsetWidth;
            x = p.a.offsetWidth;
            y = q.a.offsetWidth;
            I();
            A(e, function(a) {
                f = a;
                v()
            });
            u(e,
                L(c, '"' + c.family + '",sans-serif'));
            A(p, function(a) {
                g = a;
                v()
            });
            u(p, L(c, '"' + c.family + '",serif'));
            A(q, function(a) {
                h = a;
                v()
            });
            u(q, L(c, '"' + c.family + '",monospace'))
        })
    })
};

export const FontFaceObserver = B;
export const load = B.prototype.load;
