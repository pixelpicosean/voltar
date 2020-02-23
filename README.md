Voltar
=============

Use Godot as visual editor but write game in JavaScript/TypeScript, a magic web game framework :)

## Voltar CommandLine Tools

`yarn global add voltar-cli` or `npm install -g voltar-cli`

### Commands

`voltar create`: create project, requires internet connection. Recommend to download the repo instead.

`voltar start`: start dev server with live-reloading

`voltar build`: build for production and copy `media` with compiled scripts to `dist`

For TypeScript support pass `-ts` parameter with the commands, and use `src/game/main.ts` as entry point
instead and you are ready to go.

## Godot Importer

You can edit scenes from Godot and then use the importer to convert **project setting**
and **scenes** to JSON, which will then be loaded automatically. Voltar editor
is deprecated in favor of the workflow with Godot and importer.

### Rules for Godot support

Scenes should be saved into the `assets/scene`, and uses assets located inside
`assets` folder.

Textures should **ALWAYS** go into `assets/image/*` and uses the texture packer
to generated atlas exported to `media` folder. Otherwise it won't work.

Single images that will be copied into `media` folder should be put in
the `assets/image/standalone` folder, so they will be copied automatically (even after you modified).

Bitmap font with BMFont format added to `assets/bitmapfont` will be automatically convert and copy to
`media` folder too.

### Steps

Make sure you've installed dependencies of the importer. In case you're not:
`cd tscn && yarn` or `cd tscn && npm install`

Setup Godot project (from project settings)

Create scenes, and save them into the `assets/scene` folder

Run `node tscn/main.js` to convert project settings and scenes to `JSON`
file, and then import these files or preload them as assets in your code. 
(in VSCode you can press `F5`, and find configs in Jetbrains IDEs)

### Supported Godot features

- [x] screen stretch mode/aspect
- [x] `CanvasLayer`
- [x] `ParallaxBackground`
- [x] `ParallaxLayer`
- [x] `Camera2D`
- [x] `Path2D`
- [x] `Node2D`
- [x] `YSort`
- [x] `RemoteTransform2D`
- [x] `VisibilityNotifier2D`
- [x] `Timer`
- [x] `Sprite`
- [x] `Control`, `Container` and most GUI nodes
- [x] `Label`
- [x] `TextureButton`
- [x] `TextureProgress`
- [x] `TextureRect`
- [x] `NinePatchRect`
- [x] `AnimatedSprite`
- [x] `AnimationPlayer`
- [x] Tween (tweens are no longer nodes, they are just data and runs through `tweens`)
- [x] Input
- [x] `CPUParticle2D`
- [x] `TileMap`
- [x] `Area2D`
- [x] `RayCast2D`
- [x] `StaticBody2D`
- [x] `KinematicBody2D`
- [x] shapes, font, curve
- [x] `Viewport`
- [ ] `RichTextLabel` (WIP)
- [ ] `RigidBody2D` (WIP)
