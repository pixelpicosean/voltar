import settings from 'engine/settings';
import Texture from 'engine/textures/Texture';
import { get_resolution_of_url } from 'engine/utils/index';
import { Rectangle } from 'engine/math/index';

export const registered_bitmap_fonts = {};

/**
 * Register a bitmap font with data and a texture.
 *
 * @static
 * @param {XMLDocument} xml - The XML document data.
 * @param {Object<string, Texture>|Texture|Texture[]} textures - List of textures for each page.
 *  If providing an object, the key is the `<page>` element's `file` attribute in the FNT file.
 * @return {Object} Result font object with font, size, lineHeight and char fields.
 */
export function register_font(xml, textures) {
    const data = {};
    const info = xml.getElementsByTagName('info')[0];
    const common = xml.getElementsByTagName('common')[0];
    const pages = xml.getElementsByTagName('page');
    const res = get_resolution_of_url(pages[0].getAttribute('file'), settings.RESOLUTION);
    const pages_textures = {};

    data.font = info.getAttribute('face');
    data.size = parseInt(info.getAttribute('size'), 10);
    data.lineHeight = parseInt(common.getAttribute('lineHeight'), 10) / res;
    data.chars = {};

    // Single texture, convert to list
    if (textures instanceof Texture) {
        textures = [textures];
    }

    // Convert the input Texture, Textures or object
    // into a page Texture lookup by "id"
    for (let i = 0; i < pages.length; i++) {
        const id = pages[i].getAttribute('id');
        const file = pages[i].getAttribute('file');

        pages_textures[id] = textures instanceof Array ? textures[i] : textures[file];
    }

    // parse letters
    const letters = xml.getElementsByTagName('char');

    for (let i = 0; i < letters.length; i++) {
        const letter = letters[i];
        const char_code = parseInt(letter.getAttribute('id'), 10);
        const page = letter.getAttribute('page') || 0;
        const texture_rect = new Rectangle(
            (parseInt(letter.getAttribute('x'), 10) / res) + (pages_textures[page].frame.x / res),
            (parseInt(letter.getAttribute('y'), 10) / res) + (pages_textures[page].frame.y / res),
            parseInt(letter.getAttribute('width'), 10) / res,
            parseInt(letter.getAttribute('height'), 10) / res
        );

        data.chars[char_code] = {
            xOffset: parseInt(letter.getAttribute('xoffset'), 10) / res,
            yOffset: parseInt(letter.getAttribute('yoffset'), 10) / res,
            xAdvance: parseInt(letter.getAttribute('xadvance'), 10) / res,
            kerning: {},
            texture: new Texture(pages_textures[page].base_texture, texture_rect),
            page,
        };
    }

    // parse kernings
    const kernings = xml.getElementsByTagName('kerning');

    for (let i = 0; i < kernings.length; i++) {
        const kerning = kernings[i];
        const first = parseInt(kerning.getAttribute('first'), 10) / res;
        const second = parseInt(kerning.getAttribute('second'), 10) / res;
        const amount = parseInt(kerning.getAttribute('amount'), 10) / res;

        if (data.chars[second]) {
            data.chars[second].kerning[first] = amount;
        }
    }

    // I'm leaving this as a temporary fix so we can test the bitmap fonts in v3
    // but it's very likely to change
    registered_bitmap_fonts[data.font] = data;

    return data;
}
