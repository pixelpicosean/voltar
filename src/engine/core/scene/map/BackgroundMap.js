import Node2D from '../Node2D';

import Shader from '../../Shader';
import ObjectRenderer from '../../renderers/webgl/utils/ObjectRenderer';
import WebGLRenderer from '../../renderers/webgl/WebGLRenderer';
import { TextureCache } from '../../utils';


class SquareTileShader extends Shader {
    constructor(shaderManager, vertexSrc, fragmentSrc, customUniforms, customAttributes) {
        var uniforms = {
            uSampler:           { type: 'sampler2D', value: 0 },
            animationFrame:     { type: '2f', value: new Float32Array([0, 0]) },
            samplerSize:        { type: '2f', value: new Float32Array([0, 0]) },
            projectionMatrix:   { type: 'mat3', value: new Float32Array([1, 0, 0,
                0, 1, 0,
                0, 0, 1]) },
            pointScale:         { type: '2f', value: new Float32Array([0, 0])},
            projectionScale:    { type: 'f', value: 1 }
        };
        if (customUniforms)
        {
            for (var u in customUniforms)
            {
                uniforms[u] = customUniforms[u];
            }
        }
        var attributes = {
            aVertexPosition:    0,
            aSize:              0
        };
        if (customAttributes)
        {
            for (var a in customAttributes)
            {
                attributes[a] = customAttributes[a];
            }
        }
        vertexSrc = vertexSrc || SquareTileShader.defaultVertexSrc;
        fragmentSrc = fragmentSrc || SquareTileShader.defaultFragmentSrc;

        super(shaderManager, vertexSrc, fragmentSrc, uniforms, attributes);

        this.vertSize = 7;
        this.vertPerQuad = 1;
        this.stride = this.vertSize * 4;
    }
    bindBuffer(gl, vb) {
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.vertexAttribPointer(this.attributes.aVertexPosition, 4, gl.FLOAT, false, this.stride, 0);
        gl.vertexAttribPointer(this.attributes.aSize, 3, gl.FLOAT, false, this.stride, 4 * 4);
    }
}

/**
 * The default vertex shader source
 *
 * @static
 * @constant
 */
SquareTileShader.defaultVertexSrc = [
    'precision lowp float;',
    'attribute vec4 aVertexPosition;',
    'attribute vec3 aSize;',

    'uniform mat3 projectionMatrix;',
    'uniform vec2 samplerSize;',
    'uniform vec2 animationFrame;',
    'uniform float projectionScale;',

    'varying vec2 vTextureCoord;',
    'varying float vSize;',

    'void main(void){',
    '   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition.xy + aSize.x * 0.5, 1.0)).xy, 0.0, 1.0);',
    '   gl_PointSize = aSize.x * projectionScale;',
    '   vTextureCoord = (aVertexPosition.zw + aSize.yz * animationFrame ) * samplerSize;',
    '   vSize = aSize.x;',
    '}'
].join('\n');

SquareTileShader.defaultFragmentSrc = [
    'precision lowp float;',

    'varying vec2 vTextureCoord;',
    'varying float vSize;',
    'uniform vec2 samplerSize;',

    'uniform sampler2D uSampler;',
    'uniform vec2 pointScale;',

    'void main(void){',
    '   float margin = 1.0/vSize;',
    '   vec2 clamped = vec2(clamp(gl_PointCoord.x, margin, 1.0 - margin), clamp(gl_PointCoord.y, margin, 1.0 - margin));',
    '   gl_FragColor = texture2D(uSampler, ((clamped-0.5) * pointScale + 0.5) * vSize * samplerSize + vTextureCoord);',
    '}'
].join('\n');

class RectTileShader extends Shader {
    constructor(shaderManager, vertexSrc, fragmentSrc, customUniforms, customAttributes) {
        var uniforms = {
            uSampler:           { type: 'sampler2D', value: 0 },
            animationFrame:     { type: '2f', value: new Float32Array([0, 0]) },
            samplerSize:        { type: '2f', value: new Float32Array([0, 0]) },
            projectionMatrix:   { type: 'mat3', value: new Float32Array([1, 0, 0,
                0, 1, 0,
                0, 0, 1]) }
        };
        if (customUniforms)
        {
            for (var u in customUniforms)
            {
                uniforms[u] = customUniforms[u];
            }
        }
        var attributes = {
            aVertexPosition:    0,
            aAnim:              0
        };
        if (customAttributes)
        {
            for (var a in customAttributes)
            {
                attributes[a] = customAttributes[a];
            }
        }
        vertexSrc = vertexSrc || RectTileShader.defaultVertexSrc;
        fragmentSrc = fragmentSrc || RectTileShader.defaultFragmentSrc;

        super(shaderManager, vertexSrc, fragmentSrc, uniforms, attributes);

        this.vertSize = 6;
        this.vertPerQuad = 6;
        this.stride = this.vertSize * 4;
    }

    bindBuffer(gl, vb) {
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.vertexAttribPointer(this.attributes.aVertexPosition, 4, gl.FLOAT, false, this.stride, 0);
        gl.vertexAttribPointer(this.attributes.aAnim, 2, gl.FLOAT, false, this.stride, 4 * 4);
    }
}

/**
 * The default vertex shader source
 *
 * @static
 * @constant
 */
RectTileShader.defaultVertexSrc = [
    'precision lowp float;',
    'attribute vec4 aVertexPosition;',
    'attribute vec2 aAnim;',

    'uniform mat3 projectionMatrix;',
    'uniform vec2 samplerSize;',
    'uniform vec2 animationFrame;',

    'varying vec2 vTextureCoord;',

    'void main(void){',
    '   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition.xy, 1.0)).xy, 0.0, 1.0);',
    '   vTextureCoord = (aVertexPosition.zw + aAnim * animationFrame ) * samplerSize;',
    '}'
].join('\n');

RectTileShader.defaultFragmentSrc = [
    'precision lowp float;',
    'varying vec2 vTextureCoord;',
    'uniform sampler2D uSampler;',
    'void main(void){',
    '   gl_FragColor = texture2D(uSampler, vTextureCoord);',
    '}'
].join('\n');

class TileRenderer extends ObjectRenderer {
    constructor(renderer) {
        super(renderer);
        this.vbs = {};
        this.lastTimeCheck = 0;
    }

    onContextChange() {
        this.rectShader = new RectTileShader(this.renderer.shaderManager);
        this.squareShader = new SquareTileShader(this.renderer.shaderManager);
        this.vbs = {};
    }


    checkLeaks() {
        var now = Date.now();
        var old = now - 10000;
        if (this.lastTimeCheck < old ||
            this.lastTimeCheck > now) {
            this.lastTimeCheck = now;
            var vbs = this.vbs;
            for (var key in vbs) {
                if (vbs[key].lastTimeAccess < old) {
                    this.renderer.gl.deleteBuffer(vbs[key].vb);
                    delete vbs[key];
                }
            }
        }
    }

    start() {
        this.renderer.blendModeManager.setBlendMode( PIXI.BLEND_MODES.NORMAL );
        //sorry, nothing
    }

    getVb(id) {
        this.checkLeaks();
        var vb = this.vbs[id];
        if (vb) {
            vb.lastAccessTime = Date.now();
            return vb;
        }
        return null;
    }

    createVb() {
        var id = ++TileRenderer.vbAutoincrement;
        var vb = this.renderer.gl.createBuffer();
        return this.vbs[id] = { id: id, vb: vb, lastTimeAccess: Date.now() };
    }

    removeVb(id) {
        if (this.vbs[id]) {
            this.renderer.gl.deleteBuffer(this.vbs[id]);
            delete this.vbs[id];
        }
    }

    getShader(useSquare) {
        return useSquare ? this.squareShader : this.rectShader;
    }

    destroy() {
        super.destroy();
        this.rectShader.destroy();
        this.squareShader.destroy();
        this.rectShader = null;
        this.squareShader = null;
    }
}

TileRenderer.vbAutoincrement = 0;

WebGLRenderer.registerPlugin('tile', TileRenderer);


export default class BackgroundMap extends Node2D {
    get texture() {
        return this._texture;
    }
    set texture(t) {
        if (typeof(t) === 'string') {
            this._texture = TextureCache[t];
        }
        else {
            this._texture = t;
        }
    }

    constructor(texture) {
        super();

        this.type = 'BackgroundMap';

        this.texture = texture;
        this.pointsBuf = [];
    }

    addRect(u, v, x, y, tileWidth, tileHeight, animX, animY) {
        var pb = this.pointsBuf;
        this.hasAnim = this.hasAnim || animX > 0 || animY > 0;
        if (tileWidth == tileHeight) {
            pb.push(u);
            pb.push(v);
            pb.push(x);
            pb.push(y);
            pb.push(tileWidth);
            pb.push(tileHeight);
            pb.push(animX | 0);
            pb.push(animY | 0);
        } else {
            //horizontal line on squares
            if (tileWidth % tileHeight == 0) {
                for (var i=0;i<tileWidth/tileHeight;i++) {
                    pb.push(u + i * tileHeight);
                    pb.push(v);
                    pb.push(x + i * tileHeight);
                    pb.push(y);
                    pb.push(tileWidth);
                    pb.push(tileHeight);
                    pb.push(animX | 0);
                    pb.push(animY | 0);
                }
            } else {
                //ok, ok, lets use rectangle. but its not working with square shader yet
                pb.push(u);
                pb.push(v);
                pb.push(x);
                pb.push(y);
                pb.push(tileWidth);
                pb.push(tileHeight);
                pb.push(animX | 0);
                pb.push(animY | 0);
            }
        }
    }

    clear() {
        this.pointsBuf.length = 0;
        this.modificationMarker = 0;
        this.hasAnim = false;
    }

    render_canvas(renderer) {
        // Check texture
        if (!this._texture || !this._texture.valid) return;

        // Update transform
        var wt = this.world_transform;
        renderer.context.setTransform(
            wt.a,
            wt.b,
            wt.c,
            wt.d,
            wt.tx * renderer.resolution,
            wt.ty * renderer.resolution
        );

        // Draw tiles
        // TODO: optimize by drawing visible tiles only
        var points = this.pointsBuf;
        for (var i = 0, n = points.length; i < n; i += 8) {
            var x1 = points[i], y1 = points[i+1];
            var x2 = points[i+2], y2 = points[i+3];
            var w = points[i+4];
            var h = points[i+5];
            x1 += points[i+6] * (renderer.tileAnimX | 0);
            y1 += points[i+7] * (renderer.tileAnimY | 0);
            renderer.context.drawImage(this._texture.base_texture.source, x1, y1, w, h, x2, y2, w, h);
        }
    }

    render_webGL(renderer, useSquare) {
        if (!this.texture || !this.texture.valid) return;
        var points = this.pointsBuf;
        if (points.length == 0) return;

        var gl = renderer.gl;
        var tile = renderer.plugins.tile;
        var shader = tile.getShader(useSquare);
        gl.activeTexture(gl.TEXTURE0);
        var texture = this.texture.baseTexture;
        if (!texture._glTextures[gl.id])
            renderer.updateTexture(texture);
        else
            gl.bindTexture(gl.TEXTURE_2D, texture._glTextures[gl.id]);
        var ss =  shader.uniforms.samplerSize;
        ss.value[0] = 1.0 / texture.width;
        ss.value[1] = 1.0 / texture.height;
        shader.syncUniform(ss);
        //lost context! recover!
        var vb = tile.getVb(this.vbId);
        if (!vb) {
            vb = tile.createVb();
            this.vbId = vb.id;
            this.vbBuffer = null;
            this.modificationMarker = 0;
        }
        vb = vb.vb;
        //if layer was changed, reupload vertices
        shader.bindBuffer(gl, vb);
        var vertices = points.length / 8 * shader.vertPerQuad;
        if (this.modificationMarker != vertices) {
            this.modificationMarker = vertices;
            var vs = shader.stride * vertices;
            if (!this.vbBuffer || this.vbBuffer.byteLength < vs) {
                //!@#$
                var bk = shader.stride;
                while (bk < vs) {
                    bk *= 2;
                }
                this.vbBuffer = new ArrayBuffer(bk);
                this.vbArray = new Float32Array(this.vbBuffer);
                this.vbInts = new Uint32Array(this.vbBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, this.vbArray, gl.DYNAMIC_DRAW);
            }

            var arr = this.vbArray, ints = this.vbInts;
            //upload vertices!
            var sz = 0;
            //var tint = 0xffffffff;
            if (useSquare) {
                for (var i = 0; i < points.length; i += 8) {
                    arr[sz++] = points[i + 2];
                    arr[sz++] = points[i + 3];
                    arr[sz++] = points[i + 0];
                    arr[sz++] = points[i + 1];
                    arr[sz++] = points[i + 4];
                    arr[sz++] = points[i + 6];
                    arr[sz++] = points[i + 7];
                }
            } else {
                var ww = texture.width, hh = texture.height;
                //var tint = 0xffffffff;
                var tint = -1;
                for (var i=0;i<points.length;i+=8) {
                    var x = points[i+2], y = points[i+3];
                    var w = points[i+4], h = points[i+5];
                    var u = points[i], v = points[i+1];
                    var animX = points[i+6], animY = points[i+7];
                    arr[sz++] = x;
                    arr[sz++] = y;
                    arr[sz++] = u;
                    arr[sz++] = v;
                    arr[sz++] = animX;
                    arr[sz++] = animY;
                    arr[sz++] = x + w;
                    arr[sz++] = y;
                    arr[sz++] = u + w;
                    arr[sz++] = v;
                    arr[sz++] = animX;
                    arr[sz++] = animY;
                    arr[sz++] = x + w;
                    arr[sz++] = y + h;
                    arr[sz++] = u + w;
                    arr[sz++] = v + h;
                    arr[sz++] = animX;
                    arr[sz++] = animY;
                    arr[sz++] = x;
                    arr[sz++] = y;
                    arr[sz++] = u;
                    arr[sz++] = v;
                    arr[sz++] = animX;
                    arr[sz++] = animY;
                    arr[sz++] = x + w;
                    arr[sz++] = y + h;
                    arr[sz++] = u + w;
                    arr[sz++] = v + h;
                    arr[sz++] = animX;
                    arr[sz++] = animY;
                    arr[sz++] = x;
                    arr[sz++] = y + h;
                    arr[sz++] = u;
                    arr[sz++] = v + h;
                    arr[sz++] = animX;
                    arr[sz++] = animY;
                }
            }
            if (vs > this.vbArray.length/2 ) {
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr);
            } else {
                var view = arr.subarray(0, vs)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, view);
            }
        }
        if (useSquare)
            gl.drawArrays(gl.POINTS, 0, vertices);
        else
            gl.drawArrays(gl.TRIANGLES, 0, vertices);
    }
}

class CompositeRectTileLayer extends Node2D {
    constructor() {
        super();
        this.initialize.apply(this, arguments);
    }

    //can be initialized multiple times
    initialize(zIndex, bitmaps, useSquare) {
        this.z = this.zIndex = zIndex;
        this.useSquare = useSquare;
        bitmaps && this.setBitmaps(bitmaps);
    }

    setBitmaps(bitmaps) {
        this.removeChildren();
        for (var i=0;i<bitmaps.length;i++)
            this.addChild(new BackgroundMap(this.zIndex, bitmaps[i]));
        this.modificationMarker = 0;
    }

    clear() {
        for (var i=0;i<this.children.length;i++)
            this.children[i].clear();
        this.modificationMarker = 0;
    }

    addRect(num, u, v, x, y, tileWidth, tileHeight) {
        if (this.children[num] && this.children[num].texture)
            this.children[num].addRect(u, v, x, y, tileWidth, tileHeight);
    }

    /**
     * "hello world!" of pixi-tilemap library. Pass it texture and it will be added
     * @param texture
     * @param x
     * @param y
     * @returns {boolean}
     */
    addFrame(texture, x, y) {
        if (typeof texture === "string") {
            texture = TextureCache[texture];
        }
        var children = this.children;
        var layer = null;
        for (var i=0;i<children.length; i++) {
            if (children[i].texture.baseTexture === texture.baseTexture) {
                layer = children[i];
                break;
            }
        }
        if (!layer) {
            children.push(layer = new BackgroundMap(this.zIndex, texture));
        }
        layer.addRect(texture.frame.x, texture.frame.y, x, y, texture.frame.width, texture.frame.height);
        return true;
    }

    renderCanvas(renderer) {
        if (!renderer.dontUseTransform) {
            var wt = this.worldTransform;
            renderer.context.setTransform(
                wt.a,
                wt.b,
                wt.c,
                wt.d,
                wt.tx * renderer.resolution,
                wt.ty * renderer.resolution
            );
        }
        var layers = this.children;
        for (var i = 0; i < layers.length; i++)
            layers[i].renderCanvas(renderer);
    }


    renderWebGL(renderer) {
        var gl = renderer.gl;
        var shader = renderer.plugins.tile.getShader(this.useSquare);
        renderer.setObjectRenderer(renderer.plugins.tile);
        renderer.shaderManager.setShader(shader);
        var tm = shader.uniforms.projectionMatrix;
        //TODO: dont create new array, please
        this._globalMat = this._globalMat || new PIXI.Matrix();
        renderer.currentRenderTarget.projectionMatrix.copy(this._globalMat).append(this.worldTransform);
        tm.value = this._globalMat.toArray(true);
        if (this.useSquare) {
            var ps = shader.uniforms.pointScale;
            ps.value[0] = this._globalMat.a >= 0?1:-1;
            ps.value[1] = this._globalMat.d < 0?1:-1;
            ps = shader.uniforms.projectionScale;
            ps.value = Math.abs(this.worldTransform.a);
        }
        var af = shader.uniforms.animationFrame.value;
        af[0] = renderer.tileAnimX | 0;
        af[1] = renderer.tileAnimY | 0;
        //shader.syncUniform(shader.uniforms.animationFrame);
        shader.syncUniforms();
        var layers = this.children;
        for (var i = 0; i < layers.length; i++)
            layers[i].renderWebGL(renderer, this.useSquare);
    }


    isModified(anim) {
        var layers = this.children;
        if (this.modificationMarker != layers.length) {
            return true;
        }
        for (var i=0;i<layers.length;i++) {
            if (layers[i].modificationMarker != layers[i].pointsBuf.length ||
                anim && layers[i].hasAnim) {
                return true;
            }
        }
        return false;
    }

    clearModify() {
        var layers = this.children;
        this.modificationMarker = layers.length;
        for (var i = 0; i < layers.length; i++) {
            layers[i].modificationMarker = layers[i].pointsBuf.length;
        }
    }
}

CompositeRectTileLayer.prototype.updateTransform = CompositeRectTileLayer.prototype.node2d_update_transform;
