Voltar
=============

Next generation of LesserPanda framework.

## Voltar CommandLine Tools

`yarn global add voltar-cli` or `npm install -g voltar-cli`

### Commands

`voltar create`: create project, slow and require network. Recommend to copy the whole repo instead.

`voltar start`: start dev server with live-reloading

`voltar build`: build for production and copy `media` with compiled scripts to `dist`

## Godot Importer

You can edit scenes from Godot and then use the importer to convert **project setting**
and **scenes** to JSON format, then load them like normal config data. Voltar editor
is deprecated in favor of the workflow with Godot and importer.

### Rules for Godot support

Scenes should be saved into the `assets/scene`, and uses assets located inside
`assets` folder.

Textures should **ALWAYS** go into `assets/image/*` and uses the texture packer
to generated atlas exported to `media` folder. Otherwise it won't work.

### Steps

Setup Godot project (from project settings)

Create scenes, and save them into the `assets/scene` folder

Run `node godot_importer/main.js` to convert project settings and scenes to `JSON`
file, and then import these files or preload them as assets in your code.

### Supported Godot features

- [x] Node2D
- [x] Sprite
- [x] AnimatedSprite
- [x] Text (as `Text` or `BitmapText` based on the font)
- [x] AnimationPlayer
- [x] Tween (tweens are no longer nodes, they are just data and runs through `tweens`)
- [x] Input
- [ ] Control and tons of UI elements (WIP)
- [ ] Particle (WIP)
- [ ] Tilemap (WIP)
- [ ] More complex physics (WIP)

### Extra features

- [x] Cutout animation exported from `Spriter`
- [x] Extract anything rendered to HTML5 image
- [x] Several simple mesh nodes (Plane, Rope, NineSlice)
- [x] Tilemap (this is very different from Godot, but impact.js like)
- [x] Graphics (Flash like primitive shape rendering)
- [x] Sound (also different from Godot, sounds are much more simpler/less features)
- [x] Accessibility
- [x] Several built-in filters (Material/Shaders)
