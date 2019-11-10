tool
extends EditorPlugin

const anchor_icon := preload("res://addons/vg_editor/anchor.svg")

var node: Node2D

var handles: Array
var dragging_handle


func handles(object: Object) -> bool:
	return object.get("is_vg_node")

func edit(object: Object) -> void:
	node = object

func make_visible(visible: bool) -> void:
	if not visible:
		edit(null)

func forward_canvas_draw_over_viewport(overlay: Control) -> void:
	if not node or not node.is_inside_tree():
		return

	handles = []

	var transform := node.get_viewport_transform() * node.get_global_transform()
	var tex_size := anchor_icon.get_size()

	match node.vg_type:
		"Rect":
			var position: Vector2
			var hit_area: Rect2

			position = transform.xform(-Vector2(0, node.height / 2))
			hit_area = Rect2(position - tex_size / 2, tex_size)
			overlay.draw_texture(anchor_icon, hit_area.position)
			handles.append({
				node = node,
				position = position,
				hit_area = hit_area,
				top = true,
			})

			position = transform.xform(Vector2(node.width / 2, 0))
			hit_area = Rect2(position - tex_size / 2, tex_size)
			overlay.draw_texture(anchor_icon, hit_area.position)
			handles.append({
				node = node,
				position = position,
				hit_area = hit_area,
				top = false,
			})
		"Circle":
			var position: Vector2 = transform.xform(Vector2(node.radius, 0))
			var hit_area := Rect2(position - tex_size / 2, tex_size)
			overlay.draw_texture(anchor_icon, hit_area.position)
			handles.append({
				node = node,
				position = position,
				hit_area = hit_area,
			})
		"Line":
			var position: Vector2
			var hit_area: Rect2

			position = transform.xform(node.start)
			hit_area = Rect2(position - tex_size / 2, tex_size)
			overlay.draw_texture(anchor_icon, hit_area.position)
			handles.append({
				node = node,
				position = position,
				hit_area = hit_area,
				anchor = "start",
			})

			position = transform.xform(node.end)
			hit_area = Rect2(position - tex_size / 2, tex_size)
			overlay.draw_texture(anchor_icon, hit_area.position)
			handles.append({
				node = node,
				position = position,
				hit_area = hit_area,
				anchor = "end",
			})

			var width: Vector2 = node.end - node.start
			position = transform.xform(width.rotated(-PI / 2).normalized() * node.width / 2 + node.start)
			hit_area = Rect2(position - tex_size / 2, tex_size)
			overlay.draw_texture(anchor_icon, hit_area.position)
			handles.append({
				node = node,
				position = position,
				hit_area = hit_area,
				anchor = "width",
			})


func drag_handle_to(position: Vector2) -> void:
	if not dragging_handle:
		return

	match node.vg_type:
		"Rect":
			if dragging_handle.top:
				node.height = abs(position.y) * 2
			else:
				node.width = abs(position.x) * 2
		"Circle":
			node.radius = abs(position.x)
		"Line":
			match dragging_handle.anchor:
				"start":
					node.start = position
				"end":
					node.end = position
				"width":
					node.width = position.distance_to(node.start) * 2

func forward_canvas_gui_input(event: InputEvent) -> bool:
	if not node or not node.visible:
		return false

	if dragging_handle and event.is_action_pressed("ui_cancel"):
		var undo := get_undo_redo()
		undo.commit_action()
		undo.undo()
		update_overlays()
		dragging_handle = null
		return true

	if not event is InputEventMouse:
		return false

	if dragging_handle != null:
		if event is InputEventMouseMotion:
			var viewport_position: Vector2 = node.get_viewport().get_global_canvas_transform().affine_inverse().xform(event.position)
			var position: Vector2 = node.get_global_transform().affine_inverse().xform(viewport_position)
			drag_handle_to(position)
			update_overlays()
			return true

		if is_mouse_button(event, BUTTON_LEFT, false):
			var undo := get_undo_redo()
			match dragging_handle.node.get("vg_type"):
				"Rect":
					undo.add_do_property(dragging_handle.node, "width", dragging_handle.node.width)
					undo.add_do_property(dragging_handle.node, "height", dragging_handle.node.height)
				"Circle":
					undo.add_do_property(dragging_handle.node, "radius", dragging_handle.node.radius)
				"Line":
					undo.add_do_property(dragging_handle.node, "start", dragging_handle.node.start)
					undo.add_do_property(dragging_handle.node, "end", dragging_handle.node.end)
					undo.add_do_property(dragging_handle.node, "width", dragging_handle.node.width)
			undo.commit_action()
			dragging_handle = null
			return true

	elif is_mouse_button(event, BUTTON_LEFT, true):
		for handle in handles:
			if handle.hit_area.has_point(event.position):
				var undo := get_undo_redo()
				undo.create_action("Move anchor")
				match handle.node.get("vg_type"):
					"Rect":
						undo.add_undo_property(handle.node, "width", handle.node.width)
						undo.add_undo_property(handle.node, "height", handle.node.height)
					"Circle":
						undo.add_undo_property(handle.node, "radius", handle.node.radius)
					"Line":
						undo.add_undo_property(handle.node, "start", handle.node.start)
						undo.add_undo_property(handle.node, "end", handle.node.end)
						undo.add_undo_property(handle.node, "width", handle.node.width)
				dragging_handle = handle
				return true

	return false


func is_mouse_button(event: InputEventMouse, button: int, pressed: bool) -> bool:
	return (
		event is InputEventMouseButton and
		event.button_index & button == button and
		event.is_pressed() == pressed
	)
