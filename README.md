Voltar
=============

Use Godot as visual editor but write game in TypeScript, a magic web game framework :)

## Prepare

Install build dependencies: `yarn` or `npm install`

## Scripts

`npm run start`: start dev server with live-reloading

`npm run build`: build for production and copy `media` with compiled scripts to `dist`, also generate `.br` and `.gz` for files.

## Godot Importer

You can edit scenes from Godot and then use the importer to convert **project setting**
and **scenes** to JSON, which will then be loaded automatically. Voltar editor
is deprecated in favor of the workflow with Godot and importer.

### Rules for Godot support

1. Scenes should be saved into the `assets/scene`, and uses assets located inside `assets` folder.

2. Textures should **ALWAYS** go into `assets/image/*` and uses the texture packer to generated atlas exported to `media` folder. Otherwise it won't work.

3. Single images that will be copied into `media` folder should be put in the `assets/image/standalone` folder, so they will be copied automatically (even after you modified).

4. Bitmap font with BMFont format added to `assets/bitmapfont` will be automatically convert and copy to
`media` folder too.

5. 3D data formats like `.dae`, `.fbx`, `.gltf` and `.obj` are not supported. But those are still usable by **SAVE imported mesh data as ".tscn" manually**. So basically any format supported by Godot become YES \o/

### Steps

Make sure you've installed dependencies of the importer. In case you're not:
`cd tscn && yarn` or `cd tscn && npm install`

Setup Godot project (from project settings)

Create scenes, and save them into the `assets/scene` folder

Run `node tscn/main` to convert project settings and scenes to `JSON`
file, and then import these files or preload them as assets in your code.
(in VSCode you can press `F5`, and find configs in Jetbrains IDEs)

### Supported Godot features

Most 2D features and basic 3D support (no 3D physics and particles yet).
Custom shader supported in a level (may not work with complex shaders right now).

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
- [x] `Spatial`
- [x] `Camera`
- [x] `MeshInstance` with primitive meshes and mesh with `escn` format
- [x] `Cube`, `Quad` and `Plane` primitive meshes
- [x] `Skeleton` and skeleton animation
- [x] `DirectionalLight` with shadow
- [x] `SpotLight` (no shadow support yet)
- [x] `OmniLight` with shadow support (not perfect but fast)
- [ ] `RichTextLabel` (WIP)
- [ ] `RigidBody2D` (WIP)

### Optimize build size

1. comment unused exports in `engine/index` to disable modules not used
2. uncomment export of PhysicsServer2D in `engine/servers/physics_2d` to enable physics support
3. uncomment code to replace usage of `earcut` in `engine/servers/visual/visual_server_canvas` for 2D polygon rendering
4. uncomment export of AudioServer in `engine/audio/index` to enable audio support
