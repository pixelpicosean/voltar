Voltar
=============

Next generation of LesserPanda framework.

## Godot Importer

Scenes should be saved into the `assets/scene`, and uses assets located inside
`assets` folder.

Textures should **ALWAYS** go into `assets/image/*` and uses the texture packer
to generated atlas exported to `media` folder. Otherwise it won't work.

### Steps

Setup Godot project (from project settings)

Create scenes, and save them into the `assets/scene` folder

Run `node godot_importer/main.js` to convert project settings and scenes to `JSON`
file, and then import these files or preload them as assets in your code.
