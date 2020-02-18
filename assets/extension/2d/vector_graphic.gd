tool
extends CollisionShape2D
class_name VectorGraphic

export (Color) var color := Color(1, 1, 1, 1) setget set_color
export (Vector2) var offset_position := Vector2(0, 0)

##### NOTIFICATION #####

func _draw() -> void:
	if shape is CircleShape2D:
		draw_circle(offset_position, shape.radius, color)
	elif shape is RectangleShape2D:
		var rect := Rect2(offset_position - shape.extents, shape.extents * 2.0)
		draw_rect(rect, color)
	elif shape is CapsuleShape2D:
		draw_capsule(offset_position, shape.radius, shape.height, color)

##### PUBLIC METHODS #####

func draw_capsule(capsule_position: Vector2, capsule_radius: float,
		capsule_height: float, capsule_color: Color) -> void:

	var upper_circle_position: Vector2 = capsule_position + Vector2(0, capsule_height * 0.5)
	draw_circle(upper_circle_position, capsule_radius, capsule_color)

	var lower_circle_position: Vector2 = capsule_position - Vector2(0, capsule_height * 0.5)
	draw_circle(lower_circle_position, capsule_radius, capsule_color)

	var rect_position: Vector2 = capsule_position - Vector2(capsule_radius, capsule_height * 0.5)
	var rect := Rect2(rect_position, Vector2(capsule_radius * 2, capsule_height))
	draw_rect(rect, capsule_color)

##### SETTERS AND GETTERS #####

func set_color(new_color: Color) -> void:
	color = new_color
	update()
