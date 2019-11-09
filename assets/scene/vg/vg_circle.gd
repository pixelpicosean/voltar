tool
extends Node2D
class_name VGCircle

const MaxStepsPerCircle := 64
const MinStepsPerCircle := 20

export (float, 1.0, 1000.0) var radius := 32.0 setget _set_radius

export (Color) var color := Color.white setget _set_color

var points: PoolVector2Array

func _draw() -> void:
	var steps: int = max(MinStepsPerCircle, radius * 5 / (200 + radius * 5) * MaxStepsPerCircle)
	var angle_per_step := PI * 2 / steps
	points.resize(steps)
	for i in steps:
		points[i] = Vector2(radius, 0).rotated(angle_per_step * i)
	draw_colored_polygon(points, color)

func _set_radius(val: float) -> void:
	radius = val
	update()

func _set_color(val: Color) -> void:
	color = val
	update()
