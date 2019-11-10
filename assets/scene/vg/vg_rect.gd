tool
extends Node2D
class_name VGRect

export (float) var width := 32.0 setget _set_width
export (float) var height := 32.0 setget _set_height

export (Color) var color := Color.white setget _set_color

var is_vg_node := true
var vg_type := "Rect"

func _draw() -> void:
	draw_rect(Rect2(-width / 2, -height / 2, width, height), color, true)

func _set_width(val: float) -> void:
	width = val
	update()

func _set_height(val: float) -> void:
	height = val
	update()

func _set_color(val: Color) -> void:
	color = val
	update()
