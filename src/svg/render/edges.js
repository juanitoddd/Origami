/**
 * fold to svg (c) Robby Kraft
 */
import * as K from "../keys";
import { is_folded_form } from "../../graph/query";
import SVG from "../../extensions/svg";
const Libraries = { SVG };

const GROUP_FOLDED = {};

const GROUP_FLAT = {
	stroke: "black",
}

const STYLE_FOLDED = {};

const STYLE_FLAT = {
	m: { stroke: "red" },
	v: { stroke: "blue" },
	f: { stroke: "lightgray" },
};

const edges_assignment_names = {
  B: K.boundary,
  b: K.boundary,
  M: K.mountain,
  m: K.mountain,
  V: K.valley,
  v: K.valley,
  F: K.mark,
  f: K.mark,
  U: K.unassigned,
  u: K.unassigned
};

// todo: test- is this much faster than running .toLower() on every string?
const edges_assignment_to_lowercase = {
  B: "b",
  b: "b",
  M: "m",
  m: "m",
  V: "v",
  v: "v",
  F: "f",
  f: "f",
  U: "u",
  u: "u",
};

/**
 * @returns an object with 5 keys, each value is an array 
 * {b:[], m:[], v:[], f:[], u:[]}
 * arrays contain the unique indices of each edge from the edges_ arrays sorted by assignment
 * if no edges_assignment, or only some defined, remaining edges become "unassigned"
 */
const edges_assignment_indices = (graph) => {
  const assignment_indices = { u:[], f:[], v:[], m:[], b:[] };
  const lowercase_assignment = graph[K.edges_assignment]
		.map(a => edges_assignment_to_lowercase[a]);
  graph[K.edges_vertices]
		.map((_, i) => lowercase_assignment[i] || "u")
		.forEach((a, i) => assignment_indices[a].push(i));
  return assignment_indices;
};

const edges_coords = ({ vertices_coords, edges_vertices }) => {
	if (!vertices_coords || !edges_vertices) { return []; }
	return edges_vertices.map(ev => ev.map(v => vertices_coords[v]));
};
/**
 * segment is a line segment in the form: [[x1, y1], [x2, y2]]
 */
const segment_to_path = s => `M${s[0][0]} ${s[0][1]}L${s[1][0]} ${s[1][1]}`;

const edges_path_data = (graph) => edges_coords(graph)
	.map(segment => segment_to_path(segment)).join("");

const edges_path_data_assign = ({ vertices_coords, edges_vertices, edges_assignment }) => {
	if (!vertices_coords || !edges_vertices) { return {}; }
	if (!edges_assignment) {
		return ({ u: edges_path_data({ vertices_coords, edges_vertices }) });
	}
  // const segments = edges_coords({ vertices_coords, edges_vertices, edges_assignment });
  const data = edges_assignment_indices({ vertices_coords, edges_vertices, edges_assignment });
	// replace each value in data from array of indices [1,2,3] to path string "M2,3L2.."
	Object.keys(data).forEach(key => {
		data[key] = edges_path_data({
			vertices_coords,
			edges_vertices: data[key].map(i => edges_vertices[i]),
		});
	});
	Object.keys(data).forEach(key => {
		if (data[key] === "") { delete data[key]; }
	});
  return data;
};

/**
 * replace edges_path_data_assign values from path strings "M2,3L.." to <path> elements
 */
const edges_paths_assign = ({ vertices_coords, edges_vertices, edges_assignment }) => {
	const data = edges_path_data_assign({ vertices_coords, edges_vertices, edges_assignment });
  Object.keys(data).forEach(assignment => {
    const path = Libraries.SVG.path(data[assignment]);
    path[K.setAttributeNS](null, K._class, edges_assignment_names[assignment]);
    data[assignment] = path;
  });
	return data;
};

const apply_style = (el, attributes = {}) => Object.keys(attributes)
	.forEach(key => el[K.setAttributeNS](null, key, attributes[key]));

/**
 * @returns an array of SVG Path elements.
 * if edges_assignment exists, there will be as many paths as there are types of edges
 * if no edges_assignment exists, there will be an array of 1 path.
 */
export const edges_paths = (graph, attributes = {}) => {
	const isFolded = is_folded_form(graph);
	const paths = edges_paths_assign(graph);
	const group = Libraries.SVG.g();
	Object.keys(paths).forEach(key => {
		paths[key][K.setAttributeNS](null, K._class, edges_assignment_names[key]);
		apply_style(paths[key], isFolded ? STYLE_FOLDED[key] : STYLE_FLAT[key]);
		apply_style(paths[key], attributes[key]);
		apply_style(paths[key], attributes[edges_assignment_names[key]]);
		group[K.appendChild](paths[key]);
		Object.defineProperty(group, edges_assignment_names[key], { get: () => paths[key] });
	});
	apply_style(group, isFolded ? GROUP_FOLDED : GROUP_FLAT);
	// todo: everything else that isn't a class name. filter out classes
	// const no_class_attributes = Object.keys(attributes).filter(
	apply_style(group, attributes.stroke ? { stroke: attributes.stroke } : {});
	return group;
};

// const make_edges_assignment_names = ({ edges_vertices, edges_assignment }) => {
// 	if (!edges_vertices) { return []; }
// 	if (!edges_assignment) { return edges_vertices.map(() => edges_assignment_names["u"]); }
// 	return edges_vertices
// 		.map((_, i) => edges_assignment[i])
// 		.map((a) => edges_assignment_names[(a ? a : "u")]);
// };

// const edges_lines = ({ vertices_coords, edges_vertices, edges_assignment }) => {
// 	if (!vertices_coords || !edges_vertices) { return []; }
//   const svg_edges = edges_coords({ vertices_coords, edges_vertices })
//     .map(e => libraries.svg.line(e[0][0], e[0][1], e[1][0], e[1][1]));
//   make_edges_assignment_names(graph)
//     .foreach((a, i) => svg_edges[i][k.setAttributeNS](null, k._class, a));
//   return svg_edges;
// };


