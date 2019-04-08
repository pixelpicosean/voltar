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

Single images that will be copied into `media` folder should be put in
the `assets/image/standalone` folder, so they will be copied automatically (even after you modified).

### Steps

Make sure you've installed dependencies of the importer. In case you're not:
`cd godot_importer && yarn` or `cd godot_importer && npm install`

Setup Godot project (from project settings)

Create scenes, and save them into the `assets/scene` folder

Run `node godot_importer/main.js` to convert project settings and scenes to `JSON`
file, and then import these files or preload them as assets in your code.

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
- [x] `Control`, `Container` and sub-classes
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
- [x] `TileMap` (limit to 1 texture per `TileSet`, only render and collision are supported)
- [x] `Area2D`
- [x] `RayCast2D`
- [x] `StaticBody2D`
- [x] `KinematicBody2D`
- [x] shapes, font, curve
- [ ] `RigidBody2D` (WIP)
- [ ] `Viewport` (WIP)

### Extra features

- [x] Convert Godot scene/resource into JSON and load
- [x] Extract anything rendered to HTML5 image
- [x] Several simple mesh nodes (Plane, Rope, NineSlice)
- [x] Graphics (Flash like primitive shape rendering)
- [x] Sound (also different from Godot, sounds are much more simpler/less features)
- [x] Several built-in filters (Material/Shaders)
