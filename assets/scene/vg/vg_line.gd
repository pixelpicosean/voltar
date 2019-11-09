tool
extends Node2D
class_name VGLine

const MaxStepsPerHalfCircle := 32
const MinStepsPerHalfCircle := 10

export (Vector2) var start: Vector2 setget _set_start
export (Vector2) var end: Vector2 setget _set_end

export (Color) var color: Color = Color.white setget _set_color

export (float) var width: float = 1.0 setget _set_width

enum LineCap { BUTT, ROUND, SQUARE }
export (LineCap) var line_cap := LineCap.BUTT setget _set_line_cap


var points: PoolVector2Array


func _draw() -> void:
	var angle := atan2(end.y - start.y, end.x - start.x)
	var c := cos(angle)
	var s := sin(angle)

	var half_width := width / 2

	var p0 := start
	var p1 := end

	if line_cap == LineCap.SQUARE:
		p0 -= Vector2(half_width * c, half_width * s)
		p1 += Vector2(half_width * c, half_width * s)

	if line_cap == LineCap.BUTT or line_cap == LineCap.SQUARE:
		points.resize(5)
		points[0] = Vector2(p0.x - half_width * s, p0.y + half_width * c)
		points[1] = Vector2(p0.x + half_width * s, p0.y - half_width * c)
		points[2] = Vector2(p1.x + half_width * s, p1.y - half_width * c)
		points[3] = Vector2(p1.x - half_width * s, p1.y + half_width * c)
		points[4] = points[0]
	else:
		var steps: int = max(MinStepsPerHalfCircle, half_width * 5 / (200 + half_width * 5) * MaxStepsPerHalfCircle)
		var angle_per_step := PI / steps
		points.resize(steps * 2 + 2 + 1)
		var start_angle := angle + PI / 2
		for i in steps + 1:
			points[i] = Vector2(half_width, 0).rotated(start_angle + angle_per_step * i) + start
		start_angle = angle - PI / 2
		for i in steps + 1:
			points[steps + 1 + i] = Vector2(half_width, 0).rotated(start_angle + angle_per_step * i) + end
		points[steps * 2 + 2] = points[0]

	draw_colored_polygon(points, color)

func _set_start(val: Vector2) -> void:
	start = val
	update()

func _set_end(val: Vector2) -> void:
	end = val
	update()

func _set_color(val: Color) -> void:
	color = val
	update()

func _set_width(val: float) -> void:
	width = val
	update()

func _set_line_cap(val: int) -> void:
	line_cap = val
	update()
