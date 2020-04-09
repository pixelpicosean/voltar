tool
extends Node2D

export (int) var width := 0 setget set_width
export (int) var height := 0 setget set_height
export (String, "text", "email", "number") var el_type := "text"

func set_width(value: int) -> void:
	width = value
	update()

func set_height(value: int) -> void:
	height = value
	update()

func _draw() -> void:
	draw_rect(Rect2(0, 0, width, height), Color(0xE2F4F9FF), true)
