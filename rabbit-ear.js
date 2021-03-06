/* Rabbit Ear 0.9.12 alpha 2021-01-xx (c) Robby Kraft, MIT License */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.ear = factory());
}(this, (function () { 'use strict';

  const type_of = function (obj) {
    switch (obj.constructor.name) {
      case "vector":
      case "matrix":
      case "segment":
      case "ray":
      case "line":
      case "circle":
      case "ellipse":
      case "rect":
      case "polygon": return obj.constructor.name;
    }
    if (typeof obj === "object") {
      if (obj.radius != null) { return "circle"; }
      if (obj.width != null) { return "rect"; }
      if (obj.x != null || typeof obj[0] === "number") { return "vector"; }
      if (obj[0] != null && obj[0].length && (typeof obj[0].x === "number" || typeof obj[0][0] === "number")) { return "segment"; }
      if (obj.vector != null && obj.origin != null) { return "line"; }
    }
    return undefined;
  };
  const resize = (d, v) => (v.length === d
    ? v
    : Array(d).fill(0).map((z, i) => (v[i] ? v[i] : z)));
  const resize_up = (a, b) => {
    const size = a.length > b.length ? a.length : b.length;
    return [a, b].map(v => resize(size, v));
  };
  const resize_down = (a, b) => {
    const size = a.length > b.length ? b.length : a.length;
    return [a, b].map(v => resize(size, v));
  };
  const count_places = function (num) {
    const m = (`${num}`).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
    if (!m) { return 0; }
    return Math.max(0, (m[1] ? m[1].length : 0) - (m[2] ? +m[2] : 0));
  };
  const clean_number = function (num, places = 15) {
    if (typeof num !== "number") { return num; }
    const crop = parseFloat(num.toFixed(places));
    if (count_places(crop) === Math.min(places, count_places(num))) {
      return num;
    }
    return crop;
  };
  const is_iterable = obj => obj != null
    && typeof obj[Symbol.iterator] === "function";
  const semi_flatten_arrays = function () {
    switch (arguments.length) {
      case undefined:
      case 0: return Array.from(arguments);
      case 1: return is_iterable(arguments[0]) && typeof arguments[0] !== "string"
        ? semi_flatten_arrays(...arguments[0])
        : [arguments[0]];
      default:
        return Array.from(arguments).map(a => (is_iterable(a)
          ? [...semi_flatten_arrays(a)]
          : a));
    }
  };
  const flatten_arrays = function () {
    switch (arguments.length) {
      case undefined:
      case 0: return Array.from(arguments);
      case 1: return is_iterable(arguments[0]) && typeof arguments[0] !== "string"
        ? flatten_arrays(...arguments[0])
        : [arguments[0]];
      default:
        return Array.from(arguments).map(a => (is_iterable(a)
          ? [...flatten_arrays(a)]
          : a)).reduce((a, b) => a.concat(b), []);
    }
  };
  var resizers = Object.freeze({
    __proto__: null,
    resize: resize,
    resize_up: resize_up,
    resize_down: resize_down,
    clean_number: clean_number,
    semi_flatten_arrays: semi_flatten_arrays,
    flatten_arrays: flatten_arrays
  });
  const EPSILON = 1e-6;
  const R2D = 180 / Math.PI;
  const D2R = Math.PI / 180;
  const TWO_PI = Math.PI * 2;
  var constants = Object.freeze({
    __proto__: null,
    EPSILON: EPSILON,
    R2D: R2D,
    D2R: D2R,
    TWO_PI: TWO_PI
  });
  const fn_true = () => true;
  const fn_square = n => n * n;
  const fn_add = (a, b) => a + (b || 0);
  const fn_not_undefined = a => a !== undefined;
  const fn_and = (a, b) => a && b;
  const fn_cat = (a, b) => a.concat(b);
  const fn_vec2_angle = v => Math.atan2(v[1], v[0]);
  const fn_to_vec2 = a => [Math.cos(a), Math.sin(a)];
  const fn_equal = (a, b) => a === b;
  const fn_epsilon_equal = (a, b) => Math.abs(a - b) < EPSILON;
  const include = (n, epsilon = EPSILON) => n > -epsilon;
  const exclude = (n, epsilon = EPSILON) => n > epsilon;
  const include_l$1 = fn_true;
  const exclude_l = fn_true;
  const include_r = include;
  const exclude_r = exclude;
  const include_s = (t, e = EPSILON) => t > -e && t < 1 + e;
  const exclude_s = (t, e = EPSILON) => t > e && t < 1 - e;
  const line_limiter = dist => dist;
  const ray_limiter = dist => (dist < -EPSILON ? 0 : dist);
  const segment_limiter = (dist) => {
    if (dist < -EPSILON) { return 0; }
    if (dist > 1 + EPSILON) { return 1; }
    return dist;
  };
  var functions = Object.freeze({
    __proto__: null,
    fn_true: fn_true,
    fn_square: fn_square,
    fn_add: fn_add,
    fn_not_undefined: fn_not_undefined,
    fn_and: fn_and,
    fn_cat: fn_cat,
    fn_vec2_angle: fn_vec2_angle,
    fn_to_vec2: fn_to_vec2,
    fn_equal: fn_equal,
    fn_epsilon_equal: fn_epsilon_equal,
    include: include,
    exclude: exclude,
    include_l: include_l$1,
    exclude_l: exclude_l,
    include_r: include_r,
    exclude_r: exclude_r,
    include_s: include_s,
    exclude_s: exclude_s,
    line_limiter: line_limiter,
    ray_limiter: ray_limiter,
    segment_limiter: segment_limiter
  });
  var Constructors = Object.create(null);
  const identity2x2 = [1, 0, 0, 1];
  const identity2x3 = identity2x2.concat(0, 0);
  const multiply_matrix2_vector2 = (matrix, vector) => [
    matrix[0] * vector[0] + matrix[2] * vector[1] + matrix[4],
    matrix[1] * vector[0] + matrix[3] * vector[1] + matrix[5]
  ];
  const multiply_matrix2_line2 = (matrix, vector, origin) => ({
    vector: [
      matrix[0] * vector[0] + matrix[2] * vector[1],
      matrix[1] * vector[0] + matrix[3] * vector[1]
    ],
    origin: [
      matrix[0] * origin[0] + matrix[2] * origin[1] + matrix[4],
      matrix[1] * origin[0] + matrix[3] * origin[1] + matrix[5]
    ],
  });
  const multiply_matrices2 = (m1, m2) => [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
  ];
  const determinant2 = m => m[0] * m[3] - m[1] * m[2];
  const invert_matrix2 = (m) => {
    const det = determinant2(m);
    if (Math.abs(det) < 1e-6 || isNaN(det) || !isFinite(m[4]) || !isFinite(m[5])) {
      return undefined;
    }
    return [
      m[3] / det,
      -m[1] / det,
      -m[2] / det,
      m[0] / det,
      (m[2] * m[5] - m[3] * m[4]) / det,
      (m[1] * m[4] - m[0] * m[5]) / det
    ];
  };
  const make_matrix2_translate = (x = 0, y = 0) => identity2x2.concat(x, y);
  const make_matrix2_scale = (x, y, origin = [0, 0]) => [
    x,
    0,
    0,
    y,
    x * -origin[0] + origin[0],
    y * -origin[1] + origin[1]
  ];
  const make_matrix2_rotate = (angle, origin = [0, 0]) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
      cos,
      sin,
      -sin,
      cos,
      origin[0],
      origin[1]
    ];
  };
  const make_matrix2_reflect = (vector, origin = [0, 0]) => {
    const angle = Math.atan2(vector[1], vector[0]);
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const cos_Angle = Math.cos(-angle);
    const sin_Angle = Math.sin(-angle);
    const a = cosAngle * cos_Angle + sinAngle * sin_Angle;
    const b = cosAngle * -sin_Angle + sinAngle * cos_Angle;
    const c = sinAngle * cos_Angle + -cosAngle * sin_Angle;
    const d = sinAngle * -sin_Angle + -cosAngle * cos_Angle;
    const tx = origin[0] + a * -origin[0] + -origin[1] * c;
    const ty = origin[1] + b * -origin[0] + -origin[1] * d;
    return [a, b, c, d, tx, ty];
  };
  var matrix2 = Object.freeze({
    __proto__: null,
    identity2x2: identity2x2,
    identity2x3: identity2x3,
    multiply_matrix2_vector2: multiply_matrix2_vector2,
    multiply_matrix2_line2: multiply_matrix2_line2,
    multiply_matrices2: multiply_matrices2,
    determinant2: determinant2,
    invert_matrix2: invert_matrix2,
    make_matrix2_translate: make_matrix2_translate,
    make_matrix2_scale: make_matrix2_scale,
    make_matrix2_rotate: make_matrix2_rotate,
    make_matrix2_reflect: make_matrix2_reflect
  });
  const magnitude = v => Math.sqrt(v
    .map(fn_square)
    .reduce(fn_add, 0));
  const mag_squared = v => v
    .map(fn_square)
    .reduce(fn_add, 0);
  const normalize = (v) => {
    const m = magnitude(v);
    return m === 0 ? v : v.map(c => c / m);
  };
  const scale = (v, s) => v.map(n => n * s);
  const add = (v, u) => v.map((n, i) => n + (u[i] || 0));
  const subtract = (v, u) => v.map((n, i) => n - (u[i] || 0));
  const dot = (v, u) => v
    .map((_, i) => v[i] * u[i])
    .reduce(fn_add, 0);
  const midpoint = (v, u) => v.map((n, i) => (n + u[i]) / 2);
  const average = function () {
    if (arguments.length === 0) { return []; }
    const dimension = (arguments[0].length > 0) ? arguments[0].length : 0;
    const sum = Array(dimension).fill(0);
    Array.from(arguments)
      .forEach(vec => sum.forEach((_, i) => { sum[i] += vec[i] || 0; }));
    return sum.map(n => n / arguments.length);
  };
  const lerp = (v, u, t) => {
    const inv = 1.0 - t;
    return v.map((n, i) => n * inv + (u[i] || 0) * t);
  };
  const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
  const cross3 = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const distance2 = (a, b) => {
    const p = a[0] - b[0];
    const q = a[1] - b[1];
    return Math.sqrt((p * p) + (q * q));
  };
  const distance3 = (a, b) => {
    const c = a[0] - b[0];
    const d = a[1] - b[1];
    const e = a[2] - b[2];
    return Math.sqrt((c * c) + (d * d) + (e * e));
  };
  const distance = (a, b) => Math.sqrt(a
    .map((_, i) => (a[i] - b[i]) ** 2)
    .reduce((u, v) => u + v, 0));
  const flip = v => v.map(n => -n);
  const rotate90 = v => [-v[1], v[0]];
  const rotate270 = v => [v[1], -v[0]];
  const degenerate = (v, epsilon = EPSILON) => Math
    .abs(v.reduce(fn_add, 0)) < epsilon;
  const parallel = (a, b, epsilon = EPSILON) => 1 - Math
    .abs(dot(normalize(a), normalize(b))) < epsilon;
  var algebra = Object.freeze({
    __proto__: null,
    magnitude: magnitude,
    mag_squared: mag_squared,
    normalize: normalize,
    scale: scale,
    add: add,
    subtract: subtract,
    dot: dot,
    midpoint: midpoint,
    average: average,
    lerp: lerp,
    cross2: cross2,
    cross3: cross3,
    distance2: distance2,
    distance3: distance3,
    distance: distance,
    flip: flip,
    rotate90: rotate90,
    rotate270: rotate270,
    degenerate: degenerate,
    parallel: parallel
  });
  const identity3x3 = Object.freeze([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  const identity3x4 = Object.freeze(identity3x3.concat(0, 0, 0));
  const is_identity3x4 = m => identity3x4
    .map((n, i) => Math.abs(n - m[i]) < EPSILON)
    .reduce((a, b) => a && b, true);
  const multiply_matrix3_vector3 = (m, vector) => [
    m[0] * vector[0] + m[3] * vector[1] + m[6] * vector[2] + m[9],
    m[1] * vector[0] + m[4] * vector[1] + m[7] * vector[2] + m[10],
    m[2] * vector[0] + m[5] * vector[1] + m[8] * vector[2] + m[11]
  ];
  const multiply_matrix3_line3 = (m, vector, origin) => ({
    vector: [
      m[0] * vector[0] + m[3] * vector[1] + m[6] * vector[2],
      m[1] * vector[0] + m[4] * vector[1] + m[7] * vector[2],
      m[2] * vector[0] + m[5] * vector[1] + m[8] * vector[2]
    ],
    origin: [
      m[0] * origin[0] + m[3] * origin[1] + m[6] * origin[2] + m[9],
      m[1] * origin[0] + m[4] * origin[1] + m[7] * origin[2] + m[10],
      m[2] * origin[0] + m[5] * origin[1] + m[8] * origin[2] + m[11]
    ],
  });
  const multiply_matrices3 = (m1, m2) => [
    m1[0] * m2[0] + m1[3] * m2[1] + m1[6] * m2[2],
    m1[1] * m2[0] + m1[4] * m2[1] + m1[7] * m2[2],
    m1[2] * m2[0] + m1[5] * m2[1] + m1[8] * m2[2],
    m1[0] * m2[3] + m1[3] * m2[4] + m1[6] * m2[5],
    m1[1] * m2[3] + m1[4] * m2[4] + m1[7] * m2[5],
    m1[2] * m2[3] + m1[5] * m2[4] + m1[8] * m2[5],
    m1[0] * m2[6] + m1[3] * m2[7] + m1[6] * m2[8],
    m1[1] * m2[6] + m1[4] * m2[7] + m1[7] * m2[8],
    m1[2] * m2[6] + m1[5] * m2[7] + m1[8] * m2[8],
    m1[0] * m2[9] + m1[3] * m2[10] + m1[6] * m2[11] + m1[9],
    m1[1] * m2[9] + m1[4] * m2[10] + m1[7] * m2[11] + m1[10],
    m1[2] * m2[9] + m1[5] * m2[10] + m1[8] * m2[11] + m1[11]
  ];
  const determinant3 = m => (
      m[0] * m[4] * m[8]
    - m[0] * m[7] * m[5]
    - m[3] * m[1] * m[8]
    + m[3] * m[7] * m[2]
    + m[6] * m[1] * m[5]
    - m[6] * m[4] * m[2]
  );
  const invert_matrix3 = (m) => {
    const det = determinant3(m);
    if (Math.abs(det) < 1e-6 || isNaN(det)
      || !isFinite(m[9]) || !isFinite(m[10]) || !isFinite(m[11])) {
      return undefined;
    }
    const inv = [
      m[4] * m[8] - m[7] * m[5],
      -m[1] * m[8] + m[7] * m[2],
      m[1] * m[5] - m[4] * m[2],
      -m[3] * m[8] + m[6] * m[5],
      m[0] * m[8] - m[6] * m[2],
      -m[0] * m[5] + m[3] * m[2],
      m[3] * m[7] - m[6] * m[4],
      -m[0] * m[7] + m[6] * m[1],
      m[0] * m[4] - m[3] * m[1],
      -m[3] * m[7] * m[11] + m[3] * m[8] * m[10] + m[6] * m[4] * m[11]
        - m[6] * m[5] * m[10] - m[9] * m[4] * m[8] + m[9] * m[5] * m[7],
      m[0] * m[7] * m[11] - m[0] * m[8] * m[10] - m[6] * m[1] * m[11]
        + m[6] * m[2] * m[10] + m[9] * m[1] * m[8] - m[9] * m[2] * m[7],
      -m[0] * m[4] * m[11] + m[0] * m[5] * m[10] + m[3] * m[1] * m[11]
        - m[3] * m[2] * m[10] - m[9] * m[1] * m[5] + m[9] * m[2] * m[4]
    ];
    const invDet = 1.0 / det;
    return inv.map(n => n * invDet);
  };
  const make_matrix3_translate = (x = 0, y = 0, z = 0) => identity3x3.concat(x, y, z);
  const single_axis_rotate = (angle, origin, i0, i1, sgn) => {
    const mat = identity3x3.concat([0, 1, 2].map(i => origin[i] || 0));
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    mat[i0*3 + i0] = cos;
    mat[i0*3 + i1] = (sgn ? +1 : -1) * sin;
    mat[i1*3 + i0] = (sgn ? -1 : +1) * sin;
    mat[i1*3 + i1] = cos;
    return mat;
  };
  const make_matrix3_rotateX = (angle, origin = [0, 0, 0]) => single_axis_rotate(angle, origin, 1, 2, true);
  const make_matrix3_rotateY = (angle, origin = [0, 0, 0]) => single_axis_rotate(angle, origin, 0, 2, false);
  const make_matrix3_rotateZ = (angle, origin = [0, 0, 0]) => single_axis_rotate(angle, origin, 0, 1, true);
  const make_matrix3_rotate = (angle, vector = [0, 0, 1], origin = [0, 0, 0]) => {
    const vec = resize(3, normalize(vector));
    const pos = [0, 1, 2].map(i => origin[i] || 0);
    const [a, b, c] = vec;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const d = Math.sqrt((vec[1] * vec[1]) + (vec[2] * vec[2]));
    const b_d = Math.abs(d) < 1e-6 ? 0 : b / d;
    const c_d = Math.abs(d) < 1e-6 ? 1 : c / d;
    const t     = identity3x3.concat(-pos[0], -pos[1], -pos[2]);
    const t_inv = identity3x3.concat(pos[0], pos[1], pos[2]);
    const rx     = [1, 0, 0, 0, c_d, b_d, 0, -b_d, c_d, 0, 0, 0];
    const rx_inv = [1, 0, 0, 0, c_d, -b_d, 0, b_d, c_d, 0, 0, 0];
    const ry     = [d, 0, a, 0, 1, 0, -a, 0, d, 0, 0, 0];
    const ry_inv = [d, 0, -a, 0, 1, 0, a, 0, d, 0, 0, 0];
    const rz     = [cos, sin, 0, -sin, cos, 0, 0, 0, 1, 0, 0, 0];
    return multiply_matrices3(t_inv,
      multiply_matrices3(rx_inv,
        multiply_matrices3(ry_inv,
          multiply_matrices3(rz,
            multiply_matrices3(ry,
              multiply_matrices3(rx, t))))));
  };
  const make_matrix3_scale = (scale, origin = [0, 0, 0]) => [
    scale,
    0,
    0,
    0,
    scale,
    0,
    0,
    0,
    scale,
    scale * -origin[0] + origin[0],
    scale * -origin[1] + origin[1],
    scale * -origin[2] + origin[2]
  ];
  const make_matrix3_reflectZ = (vector, origin = [0, 0]) => {
    const angle = Math.atan2(vector[1], vector[0]);
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const cos_Angle = Math.cos(-angle);
    const sin_Angle = Math.sin(-angle);
    const a = cosAngle * cos_Angle + sinAngle * sin_Angle;
    const b = cosAngle * -sin_Angle + sinAngle * cos_Angle;
    const c = sinAngle * cos_Angle + -cosAngle * sin_Angle;
    const d = sinAngle * -sin_Angle + -cosAngle * cos_Angle;
    const tx = origin[0] + a * -origin[0] + -origin[1] * c;
    const ty = origin[1] + b * -origin[0] + -origin[1] * d;
    return [a, b, 0, c, d, 0, 0, 0, 1, tx, ty, 0];
  };
  var matrix3 = Object.freeze({
    __proto__: null,
    identity3x3: identity3x3,
    identity3x4: identity3x4,
    is_identity3x4: is_identity3x4,
    multiply_matrix3_vector3: multiply_matrix3_vector3,
    multiply_matrix3_line3: multiply_matrix3_line3,
    multiply_matrices3: multiply_matrices3,
    determinant3: determinant3,
    invert_matrix3: invert_matrix3,
    make_matrix3_translate: make_matrix3_translate,
    make_matrix3_rotateX: make_matrix3_rotateX,
    make_matrix3_rotateY: make_matrix3_rotateY,
    make_matrix3_rotateZ: make_matrix3_rotateZ,
    make_matrix3_rotate: make_matrix3_rotate,
    make_matrix3_scale: make_matrix3_scale,
    make_matrix3_reflectZ: make_matrix3_reflectZ
  });
  const vector_origin_form = (vector, origin) => ({
    vector: vector || [],
    origin: origin || []
  });
  const get_vector = function () {
    if (arguments[0] instanceof Constructors.vector) { return arguments[0]; }
    let list = flatten_arrays(arguments);
    if (list.length > 0
      && typeof list[0] === "object"
      && list[0] !== null
      && !isNaN(list[0].x)) {
      list = ["x", "y", "z"]
        .map(c => list[0][c])
        .filter(fn_not_undefined);
    }
    return list.filter(n => typeof n === "number");
  };
  const get_vector_of_vectors = function () {
    return semi_flatten_arrays(arguments)
      .map(el => get_vector(el));
  };
  const get_segment = function () {
    if (arguments[0] instanceof Constructors.segment) {
      return arguments[0];
    }
    const args = semi_flatten_arrays(arguments);
    if (args.length === 4) {
      return [
        [args[0], args[1]],
        [args[2], args[3]]
      ];
    }
    return args.map(el => get_vector(el));
  };
  const get_line = function () {
    const args = semi_flatten_arrays(arguments);
    if (args.length === 0) { return vector_origin_form([], []); }
    if (args[0] instanceof Constructors.line
      || args[0] instanceof Constructors.ray
      || args[0] instanceof Constructors.segment) { return args[0]; }
    if (args[0].constructor === Object) {
      return vector_origin_form(args[0].vector || [], args[0].origin || []);
    }
    return typeof args[0] === "number"
      ? vector_origin_form(get_vector(args))
      : vector_origin_form(...args.map(a => get_vector(a)));
  };
  const get_ray = get_line;
  const get_rect_params = (x = 0, y = 0, width = 0, height = 0) => ({
    x, y, width, height
  });
  const get_rect = function () {
    if (arguments[0] instanceof Constructors.rect) { return arguments[0]; }
    const list = flatten_arrays(arguments);
    if (list.length > 0
      && typeof list[0] === "object"
      && list[0] !== null
      && !isNaN(list[0].width)) {
      return get_rect_params(...["x", "y", "width", "height"]
        .map(c => list[0][c])
        .filter(fn_not_undefined));
    }
    const numbers = list.filter(n => typeof n === "number");
    const rect_params = numbers.length < 4
      ? [, , ...numbers]
      : numbers;
    return get_rect_params(...rect_params);
  };
  const get_circle_params = (radius = 1, ...args) => ({
  	radius,
  	origin: [...args],
  });
  const get_circle = function () {
  	if (arguments[0] instanceof Constructors.circle) { return arguments[0]; }
    const vectors = get_vector_of_vectors(arguments);
    const numbers = flatten_arrays(arguments).filter(a => typeof a === "number");
    if (arguments.length === 2) {
      if (vectors[1].length === 1) {
  			return get_circle_params(vectors[1][0], ...vectors[0]);
      } else if (vectors[0].length === 1) {
  			return get_circle_params(vectors[0][0], ...vectors[1]);
      } else if (vectors[0].length > 1 && vectors[1].length > 1) {
  			return get_circle_params(distance2(...vectors), ...vectors[0]);
      }
    }
    else {
      switch (numbers.length) {
        case 0: return get_circle_params(1, 0, 0, 0);
        case 1: return get_circle_params(numbers[0], 0, 0, 0);
        default: return get_circle_params(numbers.pop(), ...numbers);
      }
    }
  	return get_circle_params(1, 0, 0, 0);
  };
  const maps_3x4 = [
    [0, 1, 3, 4, 9, 10],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    [0, 1, 2, undefined, 3, 4, 5, undefined, 6, 7, 8, undefined, 9, 10, 11]
  ];
  [11, 7, 3].forEach(i => delete maps_3x4[2][i]);
  const matrix_map_3x4 = len => {
    let i;
    if (len < 8) i = 0;
    else if (len < 13) i = 1;
    else i = 2;
    return maps_3x4[i];
  };
  const get_matrix_3x4 = function () {
    const mat = flatten_arrays(arguments);
    const matrix = [...identity3x4];
    matrix_map_3x4(mat.length)
      .forEach((n, i) => { if (mat[i] != null) { matrix[n] = mat[i]; } });
    return matrix;
  };
  var getters = Object.freeze({
    __proto__: null,
    get_vector: get_vector,
    get_vector_of_vectors: get_vector_of_vectors,
    get_segment: get_segment,
    get_line: get_line,
    get_ray: get_ray,
    get_rect_params: get_rect_params,
    get_rect: get_rect,
    get_circle: get_circle,
    get_matrix_3x4: get_matrix_3x4
  });
  const array_similarity_test = (list, compFunc) => Array
    .from(Array(list.length - 1))
    .map((_, i) => compFunc(list[0], list[i + 1]))
    .reduce(fn_and, true);
  const equivalent_vector2 = (a, b) => [0, 1]
    .map(i => fn_epsilon_equal(a[i], b[i]))
    .reduce(fn_and, true);
  const equivalent_numbers = function () {
    if (arguments.length === 0) { return false; }
    if (arguments.length === 1 && arguments[0] !== undefined) {
      return equivalent_numbers(...arguments[0]);
    }
    return array_similarity_test(arguments, fn_epsilon_equal);
  };
  const equivalent_vectors = function () {
    const args = Array.from(arguments);
    const length = args.map(a => a.length).reduce((a, b) => a > b ? a : b);
    const vecs = args.map(a => resize(length, a));
    return Array.from(Array(arguments.length - 1))
      .map((_, i) => vecs[0]
        .map((_, n) => Math.abs(vecs[0][n] - vecs[i + 1][n]) < EPSILON)
        .reduce(fn_and, true))
      .reduce(fn_and, true);
  };
  const equivalent = function () {
    const list = semi_flatten_arrays(...arguments);
    if (list.length < 1) { return false; }
    const typeofList = typeof list[0];
    if (typeofList === "undefined") { return false; }
    switch (typeofList) {
      case "number":
        return array_similarity_test(list, fn_epsilon_equal);
      case "boolean":
      case "string":
        return array_similarity_test(list, fn_equal);
      case "object":
        if (list[0].constructor === Array) { return equivalent_vectors(...list); }
        return array_similarity_test(list, (a, b) => JSON.stringify(a) === JSON.stringify(b));
      default: return undefined;
    }
  };
  var equal = Object.freeze({
    __proto__: null,
    equivalent_vector2: equivalent_vector2,
    equivalent_numbers: equivalent_numbers,
    equivalent_vectors: equivalent_vectors,
    equivalent: equivalent
  });
  const sort_points_along_vector2 = (points, vector) => points
    .map(point => ({ point, d: point[0] * vector[0] + point[1] * vector[1] }))
    .sort((a, b) => a.d - b.d)
    .map(a => a.point);
  var sort = Object.freeze({
    __proto__: null,
    sort_points_along_vector2: sort_points_along_vector2
  });
  const smallest_comparison_search = (obj, array, compare_func) => {
    const objs = array.map((o, i) => ({ o, i, d: compare_func(obj, o) }));
    let index;
    let smallest_value = Infinity;
    for (let i = 0; i < objs.length; i += 1) {
      if (objs[i].d < smallest_value) {
        index = i;
        smallest_value = objs[i].d;
      }
    }
    return index;
  };
  const nearest_point2 = (point, array_of_points) => {
    const index = smallest_comparison_search(point, array_of_points, distance2);
    return index === undefined ? undefined : array_of_points[index];
  };
  const nearest_point = (point, array_of_points) => {
    const index = smallest_comparison_search(point, array_of_points, distance);
    return index === undefined ? undefined : array_of_points[index];
  };
  const nearest_point_on_line = (vector, origin, point, limiterFunc, epsilon = EPSILON) => {
    origin = resize(vector.length, origin);
    point = resize(vector.length, point);
    const magSquared = mag_squared(vector);
    const vectorToPoint = subtract(point, origin);
    const dotProd = dot(vector, vectorToPoint);
    const dist = dotProd / magSquared;
    const d = limiterFunc(dist, epsilon);
    return add(origin, scale(vector, d))
  };
  const nearest_point_on_polygon = (polygon, point) => {
    const v = polygon
      .map((p, i, arr) => subtract(arr[(i + 1) % arr.length], p));
    return polygon
      .map((p, i) => nearest_point_on_line(v[i], p, point, segment_limiter))
      .map((p, i) => ({ point: p, i, distance: distance(p, point) }))
      .sort((a, b) => a.distance - b.distance)
      .shift();
  };
  const nearest_point_on_circle = (radius, origin, point) => add(
    origin, scale(normalize(subtract(point, origin)), radius)
  );
  const nearest_point_on_ellipse = () => false;
  var nearest = Object.freeze({
    __proto__: null,
    smallest_comparison_search: smallest_comparison_search,
    nearest_point2: nearest_point2,
    nearest_point: nearest_point,
    nearest_point_on_line: nearest_point_on_line,
    nearest_point_on_polygon: nearest_point_on_polygon,
    nearest_point_on_circle: nearest_point_on_circle,
    nearest_point_on_ellipse: nearest_point_on_ellipse
  });
  const is_counter_clockwise_between = (angle, angleA, angleB) => {
    while (angleB < angleA) { angleB += TWO_PI; }
    while (angle > angleA) { angle -= TWO_PI; }
    while (angle < angleA) { angle += TWO_PI; }
    return angle < angleB;
  };
  const clockwise_angle_radians = (a, b) => {
    while (a < 0) { a += TWO_PI; }
    while (b < 0) { b += TWO_PI; }
    while (a > TWO_PI) { a -= TWO_PI; }
    while (b > TWO_PI) { b -= TWO_PI; }
    const a_b = a - b;
    return (a_b >= 0)
      ? a_b
      : TWO_PI - (b - a);
  };
  const counter_clockwise_angle_radians = (a, b) => {
    while (a < 0) { a += TWO_PI; }
    while (b < 0) { b += TWO_PI; }
    while (a > TWO_PI) { a -= TWO_PI; }
    while (b > TWO_PI) { b -= TWO_PI; }
    const b_a = b - a;
    return (b_a >= 0)
      ? b_a
      : TWO_PI - (a - b);
  };
  const clockwise_angle2 = (a, b) => {
    const dotProduct = b[0] * a[0] + b[1] * a[1];
    const determinant = b[0] * a[1] - b[1] * a[0];
    let angle = Math.atan2(determinant, dotProduct);
    if (angle < 0) { angle += TWO_PI; }
    return angle;
  };
  const counter_clockwise_angle2 = (a, b) => {
    const dotProduct = a[0] * b[0] + a[1] * b[1];
    const determinant = a[0] * b[1] - a[1] * b[0];
    let angle = Math.atan2(determinant, dotProduct);
    if (angle < 0) { angle += TWO_PI; }
    return angle;
  };
  const clockwise_bisect2 = (a, b) => fn_to_vec2(
    fn_vec2_angle(a) - clockwise_angle2(a, b) / 2
  );
  const counter_clockwise_bisect2 = (a, b) => fn_to_vec2(
    fn_vec2_angle(a) + counter_clockwise_angle2(a, b) / 2
  );
  const bisect_lines2 = (vectorA, originA, vectorB, originB, epsilon = EPSILON) => {
    const determinant = cross2(vectorA, vectorB);
    const dotProd = dot(vectorA, vectorB);
    const bisects = determinant > -epsilon
      ? [counter_clockwise_bisect2(vectorA, vectorB)]
      : [clockwise_bisect2(vectorA, vectorB)];
    bisects[1] = determinant > -epsilon
      ? rotate90(bisects[0])
      : rotate270(bisects[0]);
    const numerator = (originB[0] - originA[0]) * vectorB[1] - vectorB[0] * (originB[1] - originA[1]);
    const t = numerator / determinant;
    const normalized = [vectorA, vectorB].map(vec => normalize(vec));
    const isParallel = Math.abs(cross2(...normalized)) < epsilon;
    const origin = isParallel
      ? midpoint(originA, originB)
      : [originA[0] + vectorA[0] * t, originA[1] + vectorA[1] * t];
    const solution = bisects.map(vector => ({ vector, origin }));
    if (isParallel) { delete solution[(dotProd > -epsilon ? 1 : 0)]; }
    return solution;
  };
  const counter_clockwise_order_radians = function () {
    const radians = flatten_arrays(arguments);
    const counter_clockwise = radians
      .map((_, i) => i)
      .sort((a, b) => radians[a] - radians[b]);
    return counter_clockwise
      .slice(counter_clockwise.indexOf(0), counter_clockwise.length)
      .concat(counter_clockwise.slice(0, counter_clockwise.indexOf(0)));
  };
  const counter_clockwise_order2 = function () {
    return counter_clockwise_order_radians(
      get_vector_of_vectors(arguments).map(fn_vec2_angle)
    );
  };
  const counter_clockwise_sectors_radians = function () {
    const radians = flatten_arrays(arguments);
    const ordered = counter_clockwise_order_radians(radians)
      .map(i => radians[i]);
    return ordered.map((rad, i, arr) => [rad, arr[(i + 1) % arr.length]])
      .map(pair => counter_clockwise_angle_radians(pair[0], pair[1]));
  };
  const counter_clockwise_sectors2 = function () {
    return counter_clockwise_sectors_radians(
      get_vector_of_vectors(arguments).map(fn_vec2_angle)
    );
  };
  const counter_clockwise_subsect_radians = (divisions, angleA, angleB) => {
    const angle = counter_clockwise_angle_radians(angleA, angleB) / divisions;
    return Array.from(Array(divisions - 1))
      .map((_, i) => angleA + angle * (i + 1));
  };
  const counter_clockwise_subsect2 = (divisions, vectorA, vectorB) => {
    const angleA = Math.atan2(vectorA[1], vectorA[0]);
    const angleB = Math.atan2(vectorB[1], vectorB[0]);
    return counter_clockwise_subsect_radians(divisions, angleA, angleB)
      .map(fn_to_vec2);
  };
  var radial = Object.freeze({
    __proto__: null,
    is_counter_clockwise_between: is_counter_clockwise_between,
    clockwise_angle_radians: clockwise_angle_radians,
    counter_clockwise_angle_radians: counter_clockwise_angle_radians,
    clockwise_angle2: clockwise_angle2,
    counter_clockwise_angle2: counter_clockwise_angle2,
    clockwise_bisect2: clockwise_bisect2,
    counter_clockwise_bisect2: counter_clockwise_bisect2,
    bisect_lines2: bisect_lines2,
    counter_clockwise_order_radians: counter_clockwise_order_radians,
    counter_clockwise_order2: counter_clockwise_order2,
    counter_clockwise_sectors_radians: counter_clockwise_sectors_radians,
    counter_clockwise_sectors2: counter_clockwise_sectors2,
    counter_clockwise_subsect_radians: counter_clockwise_subsect_radians,
    counter_clockwise_subsect2: counter_clockwise_subsect2
  });
  const overlap_line_point = (vector, origin, point, func = exclude_l, epsilon = EPSILON) => {
    const p2p = subtract(point, origin);
    const lineMagSq = mag_squared(vector);
    const lineMag = Math.sqrt(lineMagSq);
    if (lineMag < epsilon) { return false; }
    const cross = cross2(p2p, vector.map(n => n / lineMag));
    const proj = dot(p2p, vector) / lineMagSq;
    return Math.abs(cross) < epsilon && func(proj, epsilon / lineMag);
  };
  const intersect_line_line = (
    aVector, aOrigin,
    bVector, bOrigin,
    aFunction = include_l$1,
    bFunction = include_l$1,
    epsilon = EPSILON
  ) => {
    const det_norm = cross2(normalize(aVector), normalize(bVector));
    if (Math.abs(det_norm) < epsilon) { return undefined; }
    const determinant0 = cross2(aVector, bVector);
    const determinant1 = -determinant0;
    const a2b = [bOrigin[0] - aOrigin[0], bOrigin[1] - aOrigin[1]];
    const b2a = [-a2b[0], -a2b[1]];
    const t0 = cross2(a2b, bVector) / determinant0;
    const t1 = cross2(b2a, aVector) / determinant1;
    if (aFunction(t0, epsilon / magnitude(aVector))
      && bFunction(t1, epsilon / magnitude(bVector))) {
      return add(aOrigin, scale(aVector, t0));
    }
    return undefined;
  };
  const circumcircle = function (a, b, c) {
    const A = b[0] - a[0];
    const B = b[1] - a[1];
    const C = c[0] - a[0];
    const D = c[1] - a[1];
    const E = A * (a[0] + b[0]) + B * (a[1] + b[1]);
    const F = C * (a[0] + c[0]) + D * (a[1] + c[1]);
    const G = 2 * (A * (c[1] - b[1]) - B * (c[0] - b[0]));
    if (Math.abs(G) < EPSILON) {
      const minx = Math.min(a[0], b[0], c[0]);
      const miny = Math.min(a[1], b[1], c[1]);
      const dx = (Math.max(a[0], b[0], c[0]) - minx) * 0.5;
      const dy = (Math.max(a[1], b[1], c[1]) - miny) * 0.5;
      return {
        origin: [minx + dx, miny + dy],
        radius: Math.sqrt(dx * dx + dy * dy),
      };
    }
    const origin = [(D * E - B * F) / G, (A * F - C * E) / G];
    const dx = origin[0] - a[0];
    const dy = origin[1] - a[1];
    return {
      origin,
      radius: Math.sqrt(dx * dx + dy * dy),
    };
  };
  const signed_area = points => 0.5 * points
    .map((el, i, arr) => {
      const next = arr[(i + 1) % arr.length];
      return el[0] * next[1] - next[0] * el[1];
    }).reduce(fn_add, 0);
  const centroid = (points) => {
    const sixthArea = 1 / (6 * signed_area(points));
    return points.map((el, i, arr) => {
      const next = arr[(i + 1) % arr.length];
      const mag = el[0] * next[1] - next[0] * el[1];
      return [(el[0] + next[0]) * mag, (el[1] + next[1]) * mag];
    }).reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0])
      .map(c => c * sixthArea);
  };
  const enclosing_rectangle = (points) => {
    const mins = Array(points[0].length).fill(Infinity);
    const maxs = Array(points[0].length).fill(-Infinity);
    points.forEach(point => point
      .forEach((c, i) => {
        if (c < mins[i]) { mins[i] = c; }
        if (c > maxs[i]) { maxs[i] = c; }
      }));
    const lengths = maxs.map((max, i) => max - mins[i]);
    return get_rect_params(mins[0], mins[1], lengths[0], lengths[1]);
  };
  const angle_array = count => Array
    .from(Array(Math.floor(count)))
    .map((_, i) => TWO_PI * (i / count));
  const angles_to_vecs = (angles, radius) => angles
    .map(a => [radius * Math.cos(a), radius * Math.sin(a)])
    .map(pt => pt.map(n => clean_number(n, 14)));
  const make_regular_polygon = (sides = 3, radius = 1) =>
    angles_to_vecs(angle_array(sides), radius);
  const make_regular_polygon_side_aligned = (sides = 3, radius = 1) => {
    const halfwedge = Math.PI / sides;
    const angles = angle_array(sides).map(a => a + halfwedge);
    return angles_to_vecs(angles, radius);
  };
  const make_regular_polygon_inradius = (sides = 3, radius = 1) =>
    make_regular_polygon(sides, radius / Math.cos(Math.PI / sides));
  const make_regular_polygon_inradius_side_aligned = (sides = 3, radius = 1) =>
    make_regular_polygon_side_aligned(sides, radius / Math.cos(Math.PI / sides));
  const make_regular_polygon_side_length = (sides = 3, length = 1) =>
    make_regular_polygon(sides, (length / 2) / Math.sin(Math.PI / sides));
  const make_regular_polygon_side_length_side_aligned = (sides = 3, length = 1) =>
    make_regular_polygon_side_aligned(sides, (length / 2) / Math.sin(Math.PI / sides));
  const split_convex_polygon = (poly, lineVector, linePoint) => {
    let vertices_intersections = poly.map((v, i) => {
      let intersection = overlap_line_point(lineVector, linePoint, v, include_l$1);
      return { point: intersection ? v : null, at_index: i };
    }).filter(el => el.point != null);
    let edges_intersections = poly.map((v, i, arr) => ({
        point: intersect_line_line(
          lineVector,
          linePoint,
          subtract(v, arr[(i + 1) % arr.length]),
          arr[(i + 1) % arr.length],
          exclude_l,
          exclude_s),
        at_index: i }))
      .filter(el => el.point != null);
    if (edges_intersections.length == 2) {
      let sorted_edges = edges_intersections.slice()
        .sort((a,b) => a.at_index - b.at_index);
      let face_a = poly
        .slice(sorted_edges[1].at_index+1)
        .concat(poly.slice(0, sorted_edges[0].at_index+1));
      face_a.push(sorted_edges[0].point);
      face_a.push(sorted_edges[1].point);
      let face_b = poly
        .slice(sorted_edges[0].at_index+1, sorted_edges[1].at_index+1);
      face_b.push(sorted_edges[1].point);
      face_b.push(sorted_edges[0].point);
      return [face_a, face_b];
    } else if (edges_intersections.length == 1 && vertices_intersections.length == 1) {
      vertices_intersections[0]["type"] = "v";
      edges_intersections[0]["type"] = "e";
      let sorted_geom = vertices_intersections.concat(edges_intersections)
        .sort((a,b) => a.at_index - b.at_index);
      let face_a = poly.slice(sorted_geom[1].at_index+1)
        .concat(poly.slice(0, sorted_geom[0].at_index+1));
      if (sorted_geom[0].type === "e") { face_a.push(sorted_geom[0].point); }
      face_a.push(sorted_geom[1].point);
      let face_b = poly
        .slice(sorted_geom[0].at_index+1, sorted_geom[1].at_index+1);
      if (sorted_geom[1].type === "e") { face_b.push(sorted_geom[1].point); }
      face_b.push(sorted_geom[0].point);
      return [face_a, face_b];
    } else if (vertices_intersections.length == 2) {
      let sorted_vertices = vertices_intersections.slice()
        .sort((a,b) => a.at_index - b.at_index);
      let face_a = poly
        .slice(sorted_vertices[1].at_index)
        .concat(poly.slice(0, sorted_vertices[0].at_index+1));
      let face_b = poly
        .slice(sorted_vertices[0].at_index, sorted_vertices[1].at_index+1);
      return [face_a, face_b];
    }
    return [poly.slice()];
  };
  const convex_hull = (points, include_collinear = false, epsilon = EPSILON) => {
    let INFINITE_LOOP = 10000;
    let sorted = points.slice().sort((a, b) =>
      (Math.abs(a[1] - b[1]) < epsilon
        ? a[0] - b[0]
        : a[1] - b[1]));
    let hull = [];
    hull.push(sorted[0]);
    let ang = 0;
    let infiniteLoop = 0;
    do {
      infiniteLoop += 1;
      let h = hull.length - 1;
      let angles = sorted
        .filter(el => !(Math.abs(el[0] - hull[h][0]) < epsilon
          && Math.abs(el[1] - hull[h][1]) < epsilon))
        .map((el) => {
          let angle = Math.atan2(hull[h][1] - el[1], hull[h][0] - el[0]);
          while (angle < ang) { angle += Math.PI * 2; }
          return { node: el, angle, distance: undefined };
        })
        .sort((a, b) => ((a.angle < b.angle) ? -1 : (a.angle > b.angle) ? 1 : 0));
      if (angles.length === 0) { return undefined; }
      let rightTurn = angles[0];
      angles = angles.filter(el => Math.abs(rightTurn.angle - el.angle) < epsilon)
        .map((el) => {
          let distance = Math.sqrt(((hull[h][0] - el.node[0]) ** 2) + ((hull[h][1] - el.node[1]) ** 2));
          el.distance = distance;
          return el;
        })
        .sort((a, b) => ((a.distance < b.distance) ? 1 : (a.distance > b.distance) ? -1 : 0));
      if (hull.filter(el => el === angles[0].node).length > 0) {
        return hull;
      }
      hull.push(angles[0].node);
      ang = Math.atan2(hull[h][1] - angles[0].node[1], hull[h][0] - angles[0].node[0]);
    } while (infiniteLoop < INFINITE_LOOP);
  };
  const recurse_skeleton = (points, lines, bisectors) => {
    const intersects = points
      .map((origin, i) => ({ vector: bisectors[i], origin }))
      .map((ray, i, arr) => intersect_line_line(
        ray.vector,
        ray.origin,
        arr[(i + 1) % arr.length].vector,
        arr[(i + 1) % arr.length].origin,
        exclude_r,
        exclude_r));
    const projections = lines.map((line, i) => nearest_point_on_line(
      line.vector, line.origin, intersects[i], a => a));
    if (points.length === 3) {
      return points.map(p => ({ type:"skeleton", points: [p, intersects[0]] }))
        .concat([{ type:"perpendicular", points: [projections[0], intersects[0]] }]);
    }
    const projectionLengths = intersects
      .map((intersect, i) => distance(intersect, projections[i]));
    let shortest = 0;
    projectionLengths.forEach((len, i) => {
      if (len < projectionLengths[shortest]) { shortest = i; }
    });
    const solutions = [
      { type:"skeleton",
        points: [points[shortest], intersects[shortest]] },
      { type:"skeleton",
        points: [points[(shortest + 1) % points.length], intersects[shortest]] },
      { type:"perpendicular", points: [projections[shortest], intersects[shortest]] }
    ];
    const newVector = clockwise_bisect2(
      flip(lines[(shortest + lines.length - 1) % lines.length].vector),
      lines[(shortest + 1) % lines.length].vector
    );
    const shortest_is_last_index = shortest === points.length - 1;
    points.splice(shortest, 2, intersects[shortest]);
    lines.splice(shortest, 1);
    bisectors.splice(shortest, 2, newVector);
    if (shortest_is_last_index) {
      points.splice(0, 1);
      bisectors.splice(0, 1);
      lines.push(lines.shift());
    }
    return solutions.concat(recurse_skeleton(points, lines, bisectors));
  };
  const straight_skeleton = (points) => {
    const lines = points
      .map((p, i, arr) => [p, arr[(i + 1) % arr.length]])
      .map(side => ({ vector: subtract(side[1], side[0]), origin: side[0] }));
    const bisectors = points
      .map((_, i, ar) => [(i - 1 + ar.length) % ar.length, i, (i + 1) % ar.length]
        .map(i => ar[i]))
      .map(p => [subtract(p[0], p[1]), subtract(p[2], p[1])])
      .map(v => clockwise_bisect2(...v));
    return recurse_skeleton([...points], lines, bisectors);
  };
  var geometry = Object.freeze({
    __proto__: null,
    circumcircle: circumcircle,
    signed_area: signed_area,
    centroid: centroid,
    enclosing_rectangle: enclosing_rectangle,
    make_regular_polygon: make_regular_polygon,
    make_regular_polygon_side_aligned: make_regular_polygon_side_aligned,
    make_regular_polygon_inradius: make_regular_polygon_inradius,
    make_regular_polygon_inradius_side_aligned: make_regular_polygon_inradius_side_aligned,
    make_regular_polygon_side_length: make_regular_polygon_side_length,
    make_regular_polygon_side_length_side_aligned: make_regular_polygon_side_length_side_aligned,
    split_convex_polygon: split_convex_polygon,
    convex_hull: convex_hull,
    straight_skeleton: straight_skeleton
  });
  const vector_origin_to_ud = ({ vector, origin }) => {
    const mag = magnitude(vector);
    const u = rotate90(vector);
    const d = dot(origin, u) / mag;
    return d < 0
      ? { u: [-u[0] / mag, -u[1] / mag], d: -d }
      : { u: [u[0] / mag, u[1] / mag], d };
  };
  const ud_to_vector_origin = ({ u, d }) => ({
    vector: rotate270(u),
    origin: scale(u, d),
  });
  const intersect_circle_line = (
    circle_radius, circle_origin,
    line_vector, line_origin,
    line_func = include_l$1,
    epsilon = EPSILON
  ) => {
    const magSq = line_vector[0] ** 2 + line_vector[1] ** 2;
    const mag = Math.sqrt(magSq);
    const norm = mag === 0 ? line_vector : line_vector.map(c => c / mag);
    const rot90 = rotate90(norm);
    const bvec = subtract(line_origin, circle_origin);
    const det = cross2(bvec, norm);
    if (Math.abs(det) > circle_radius + epsilon) { return undefined; }
    const side = Math.sqrt((circle_radius ** 2) - (det ** 2));
    const f = (s, i) => circle_origin[i] - rot90[i] * det + norm[i] * s;
    const results = Math.abs(circle_radius - Math.abs(det)) < epsilon
      ? [side].map((s) => [s, s].map(f))
      : [-side, side].map((s) => [s, s].map(f));
    const ts = results.map(res => res.map((n, i) => n - line_origin[i]))
      .map(v => v[0] * line_vector[0] + line_vector[1] * v[1])
      .map(d => d / magSq);
    return results.filter((_, i) => line_func(ts[i], epsilon));
  };
  const axiom1 = (pointA, pointB) => Constructors.line(
    normalize(subtract(...resize_up(pointB, pointA))),
    pointA
  );
  const axiom2 = (pointA, pointB) => Constructors.line(
    normalize(rotate90(subtract(...resize_up(pointB, pointA)))),
    midpoint(pointA, pointB)
  );
  const axiom3 = (vectorA, originA, vectorB, originB) => bisect_lines2(
    vectorA, originA, vectorB, originB).map(Constructors.line);
  const axiom4 = (vector, point) => Constructors.line(
    rotate90(normalize(vector)),
    point
  );
  const axiom5 = (vectorA, originA, pointA, pointB) => (intersect_circle_line(
      distance(pointA, pointB),
      pointA,
      vectorA,
      originA,
      include_l$1
    ) || []).map(sect => Constructors.line(
      normalize(rotate90(subtract(...resize_up(sect, pointB)))),
      midpoint(pointB, sect)
    ));
  const cubrt = n => n < 0
    ? -Math.pow(-n, 1/3)
    : Math.pow(n, 1/3);
  const axiom6 = (vectorA, originA, vectorB, originB, pointA, pointB) => {
    const lineA = vector_origin_to_ud({ vector: vectorA, origin: originA });
    const lineB = vector_origin_to_ud({ vector: vectorB, origin: originB });
    if (Math.abs(1 - (dot(lineA.u, pointA) / lineA.d)) < 0.02) { return []; }
    const lineAVec = [-lineA.u[1], lineA.u[0]];
    const vec1 = [
      pointA[0] + lineA.d * lineA.u[0] - 2 * pointB[0],
      pointA[1] + lineA.d * lineA.u[1] - 2 * pointB[1],
    ];
    const vec2 = [
      lineA.d * lineA.u[0] - pointA[0],
      lineA.d * lineA.u[1] - pointA[1],
    ];
    const c1 = dot(pointB, lineB.u) - lineB.d;
    const c2 = 2 * dot(vec2, lineAVec);
    const c3 = dot(vec2, vec2);
    const c4 = dot(add(vec1, vec2), lineAVec);
    const c5 = dot(vec1, vec2);
    const c6 = dot(lineAVec, lineB.u);
    const c7 = dot(vec2, lineB.u);
    const a = c6;
    const b = c1 + c4 * c6 + c7;
    const c = c1 * c2 + c5 * c6 + c4 * c7;
    const d = c1 * c3 + c5 * c7;
    const make_point = root => [
      lineA.d * lineA.u[0] + root * lineAVec[0],
      lineA.d * lineA.u[1] + root * lineAVec[1],
    ];
    let polynomial_degree = 0;
    if (Math.abs(c) > EPSILON) { polynomial_degree = 1; }
    if (Math.abs(b) > EPSILON) { polynomial_degree = 2; }
    if (Math.abs(a) > EPSILON) { polynomial_degree = 3; }
    const solutions = [];
    switch (polynomial_degree) {
      case 1:
      solutions.push(make_point(-d / c)); break;
      case 2: {
        const discriminant = (c ** 2) - (4 * b * d);
        if (discriminant < -EPSILON) {
          break; }
        const q1 = -c / (2 * b);
        if (discriminant < EPSILON) {
          solutions.push(make_point(q1));
          break;
        }
        const q2 = Math.sqrt(discriminant) / (2 * b);
        solutions.push(
          make_point(q1 + q2),
          make_point(q1 - q2),
        );
        break;
      }
      case 3: {
        const a2 = b / a;
        const a1 = c / a;
        const a0 = d / a;
        const Q = (3 * a1 - (a2 ** 2)) / 9;
        const R = (9 * a2 * a1 - 27 * a0 - 2 * (a2 ** 3)) / 54;
        const D = (Q ** 3) + (R ** 2);
        const U = -a2 / 3;
        if (D > 0) {
          const sqrtD = Math.sqrt(D);
          const S = cubrt(R + sqrtD);
          const T = cubrt(R - sqrtD);
          solutions.push(make_point(U + S + T));
          break;
        }
        if (Math.abs(D) < EPSILON) {
          const S = Math.pow(R, 1/3);
          if (isNaN(S)) { break; }
          solutions.push(
            make_point(U + 2 * S),
            make_point(U - S),
          );
          break;
        }
        const sqrtD = Math.sqrt(-D);
        const phi = Math.atan2(sqrtD, R) / 3;
        const rS = Math.pow((R ** 2) - D, 1/6);
        const Sr = rS * Math.cos(phi);
        const Si = rS * Math.sin(phi);
        solutions.push(
          make_point(U + 2 * Sr),
          make_point(U - Sr - Math.sqrt(3) * Si),
          make_point(U - Sr + Math.sqrt(3) * Si),
        );
        break;
      }
    }
    return solutions
      .map(p => normalize(subtract(p, pointA)))
      .map((u, i) => ({ u, d: dot(u, midpoint(solutions[i], pointA)) }))
      .map(ud_to_vector_origin)
      .map(Constructors.line);
  };
  const axiom7 = (vectorA, originA, vectorB, pointC) => {
    const intersect = intersect_line_line(
      vectorA, originA,
      vectorB, pointC,
      include_l$1, include_l$1);
    return intersect === undefined
      ? undefined
      : Constructors.line(
          normalize(rotate90(subtract(...resize_up(intersect, pointC)))),
          midpoint(pointC, intersect)
      );
  };
  var axioms = Object.freeze({
    __proto__: null,
    axiom1: axiom1,
    axiom2: axiom2,
    axiom3: axiom3,
    axiom4: axiom4,
    axiom5: axiom5,
    axiom6: axiom6,
    axiom7: axiom7
  });
  const acos_safe = (x) => {
    if (x >= 1.0) return 0;
    if (x <= -1.0) return Math.PI;
    return Math.acos(x);
  };
  const rotate_vector2 = (center, pt, a) => {
    const x = pt[0] - center[0];
    const y = pt[1] - center[1];
    const xRot = x * Math.cos(a) + y * Math.sin(a);
    const yRot = y * Math.cos(a) - x * Math.sin(a);
    return [center[0] + xRot, center[1] + yRot];
  };
  const intersect_circle_circle = (c1_radius, c1_origin, c2_radius, c2_origin, epsilon = EPSILON) => {
    const r = (c1_radius < c2_radius) ? c1_radius : c2_radius;
    const R = (c1_radius < c2_radius) ? c2_radius : c1_radius;
    const smCenter = (c1_radius < c2_radius) ? c1_origin : c2_origin;
    const bgCenter = (c1_radius < c2_radius) ? c2_origin : c1_origin;
    const vec = [smCenter[0] - bgCenter[0], smCenter[1] - bgCenter[1]];
    const d = Math.sqrt((vec[0] ** 2) + (vec[1] ** 2));
    if (d < epsilon) { return undefined; }
    const point = vec.map((v, i) => v / d * R + bgCenter[i]);
    if (Math.abs((R + r) - d) < epsilon
      || Math.abs(R - (r + d)) < epsilon) { return [point]; }
    if ((d + r) < R || (R + r < d)) { return undefined; }
    const angle = acos_safe((r * r - d * d - R * R) / (-2.0 * d * R));
    const pt1 = rotate_vector2(bgCenter, point, +angle);
    const pt2 = rotate_vector2(bgCenter, point, -angle);
    return [pt1, pt2];
  };
  const overlap_convex_polygon_point = (poly, point, func = exclude, epsilon = EPSILON) => poly
    .map((p, i, arr) => [p, arr[(i + 1) % arr.length]])
    .map(s => cross2(normalize(subtract(s[1], s[0])), subtract(point, s[0])))
    .map(side => func(side, epsilon))
    .map((s, _, arr) => s === arr[0])
    .reduce((prev, curr) => prev && curr, true);
  const get_unique_pair = (intersections) => {
    for (let i = 1; i < intersections.length; i += 1) {
      if (!equivalent_vector2(intersections[0], intersections[i])) {
        return [intersections[0], intersections[i]];
      }
    }
  };
  const intersect_convex_polygon_line_inclusive = (
    poly,
    vector, origin,
    fn_poly = include_s,
    fn_line = include_l$1,
    epsilon = EPSILON
  ) => {
    const intersections = poly
      .map((p, i, arr) => [p, arr[(i + 1) % arr.length]])
      .map(side => intersect_line_line(
        subtract(side[1], side[0]), side[0],
        vector, origin,
        fn_poly, fn_line,
        epsilon))
      .filter(a => a !== undefined);
    switch (intersections.length) {
      case 0: return undefined;
      case 1: return [intersections];
      default:
        return get_unique_pair(intersections) || [intersections[0]];
    }
  };
  const intersect_convex_polygon_line = (
    poly,
    vector, origin,
    fn_poly = include_s,
    fn_line = exclude_l,
    epsilon = EPSILON
  ) => {
    const sects = intersect_convex_polygon_line_inclusive(poly, vector, origin, fn_poly, fn_line, epsilon);
    let altFunc;
    switch (fn_line) {
      case exclude_r: altFunc = include_r; break;
      case exclude_s: altFunc = include_s; break;
      default: return sects;
    }
    const includes = intersect_convex_polygon_line_inclusive(poly, vector, origin, include_s, altFunc, epsilon);
    if (includes === undefined) { return undefined; }
    const uniqueIncludes = get_unique_pair(includes);
    if (uniqueIncludes === undefined) {
      switch (fn_line) {
        case exclude_l: return undefined;
        case exclude_r:
          return overlap_convex_polygon_point(poly, origin, exclude, epsilon)
            ? includes
            : undefined;
        case exclude_s:
          return overlap_convex_polygon_point(poly, add(origin, vector), exclude, epsilon)
            || overlap_convex_polygon_point(poly, origin, exclude, epsilon)
            ? includes
            : undefined;
      }
    }
    return overlap_convex_polygon_point(poly, midpoint(...uniqueIncludes), exclude, epsilon)
      ? uniqueIncludes
      : sects;
  };
  const intersect_param_form = {
    polygon: a => [a],
    rect: a => [a],
    circle: a => [a.radius, a.origin],
    line: a => [a.vector, a.origin],
    ray: a => [a.vector, a.origin],
    segment: a => [a.vector, a.origin],
  };
  const intersect_func = {
    polygon: {
      line: (a, b, fnA, fnB, ep) => intersect_convex_polygon_line(...a, ...b, include_s, fnB, ep),
      ray: (a, b, fnA, fnB, ep) => intersect_convex_polygon_line(...a, ...b, include_s, fnB, ep),
      segment: (a, b, fnA, fnB, ep) => intersect_convex_polygon_line(...a, ...b, include_s, fnB, ep),
    },
    circle: {
      circle: (a, b, fnA, fnB, ep) => intersect_circle_circle(...a, ...b, ep),
      line: (a, b, fnA, fnB, ep) => intersect_circle_line(...a, ...b, fnB, ep),
      ray: (a, b, fnA, fnB, ep) => intersect_circle_line(...a, ...b, fnB, ep),
      segment: (a, b, fnA, fnB, ep) => intersect_circle_line(...a, ...b, fnB, ep),
    },
    line: {
      polygon: (a, b, fnA, fnB, ep) => intersect_convex_polygon_line(...b, ...a, include_s, fnA, ep),
      circle: (a, b, fnA, fnB, ep) => intersect_circle_line(...b, ...a, fnA, ep),
      line: (a, b, fnA, fnB, ep) => intersect_line_line(...a, ...b, fnA, fnB, ep),
      ray: (a, b, fnA, fnB, ep) => intersect_line_line(...a, ...b, fnA, fnB, ep),
      segment: (a, b, fnA, fnB, ep) => intersect_line_line(...a, ...b, fnA, fnB, ep),
    },
    ray: {
      polygon: (a, b, fnA, fnB, ep) => intersect_convex_polygon_line(...b, ...a, include_s, fnA, ep),
      circle: (a, b, fnA, fnB, ep) => intersect_circle_line(...b, ...a, fnA, ep),
      line: (a, b, fnA, fnB, ep) => intersect_line_line(...b, ...a, fnB, fnA, ep),
      ray: (a, b, fnA, fnB, ep) => intersect_line_line(...a, ...b, fnA, fnB, ep),
      segment: (a, b, fnA, fnB, ep) => intersect_line_line(...a, ...b, fnA, fnB, ep),
    },
    segment: {
      polygon: (a, b, fnA, fnB, ep) => intersect_convex_polygon_line(...b, ...a, include_s, fnA, ep),
      circle: (a, b, fnA, fnB, ep) => intersect_circle_line(...b, ...a, fnA, ep),
      line: (a, b, fnA, fnB, ep) => intersect_line_line(...b, ...a, fnB, fnA, ep),
      ray: (a, b, fnA, fnB, ep) => intersect_line_line(...b, ...a, fnB, fnA, ep),
      segment: (a, b, fnA, fnB, ep) => intersect_line_line(...a, ...b, fnA, fnB, ep),
    },
  };
  const similar_intersect_types = {
    polygon: "polygon",
    rect: "polygon",
    circle: "circle",
    line: "line",
    ray: "ray",
    segment: "segment",
  };
  const default_intersect_domain_function = {
    polygon: exclude,
    rect: exclude,
    circle: exclude,
    line: exclude_l,
    ray: exclude_r,
    segment: exclude_s,
  };
  const intersect = function (a, b, epsilon) {
    const type_a = type_of(a);
    const type_b = type_of(b);
    const aT = similar_intersect_types[type_a];
    const bT = similar_intersect_types[type_b];
    const params_a = intersect_param_form[type_a](a);
    const params_b = intersect_param_form[type_b](b);
    const domain_a = a.domain_function || default_intersect_domain_function[type_a];
    const domain_b = b.domain_function || default_intersect_domain_function[type_b];
    return intersect_func[aT][bT](params_a, params_b, domain_a, domain_b, epsilon);
  };
  const overlap_line_line = (
    aVector, aOrigin,
    bVector, bOrigin,
    aFunction = exclude_l,
    bFunction = exclude_l,
    epsilon = EPSILON
  ) => {
    const denominator0 = cross2(aVector, bVector);
    const denominator1 = -denominator0;
    if (Math.abs(denominator0) < epsilon) {
      return overlap_line_point(aVector, aOrigin, bOrigin, aFunction, epsilon)
       || overlap_line_point(flip(aVector), add(aOrigin, aVector), bOrigin, aFunction, epsilon)
       || overlap_line_point(bVector, bOrigin, aOrigin, bFunction, epsilon)
       || overlap_line_point(flip(bVector), add(bOrigin, bVector), aOrigin, bFunction, epsilon);
    }
    const a2b = [bOrigin[0] - aOrigin[0], bOrigin[1] - aOrigin[1]];
    const b2a = [-a2b[0], -a2b[1]];
    const t0 = cross2(a2b, bVector) / denominator0;
    const t1 = cross2(b2a, aVector) / denominator1;
    return aFunction(t0, epsilon / magnitude(aVector))
      && bFunction(t1, epsilon / magnitude(bVector));
  };
  const overlap_convex_polygons = (poly1, poly2, fn_line = exclude_s, fn_point = exclude, epsilon = EPSILON) => {
    if (overlap_convex_polygon_point(poly1, poly2[0], fn_point, epsilon)) { return true; }
    if (overlap_convex_polygon_point(poly2, poly1[0], fn_point, epsilon)) { return true; }
    const e1 = poly1.map((p, i, arr) => [subtract(arr[(i + 1) % arr.length], p), p]);
    const e2 = poly2.map((p, i, arr) => [subtract(arr[(i + 1) % arr.length], p), p]);
    for (let i = 0; i < e1.length; i += 1) {
      for (let j = 0; j < e2.length; j += 1) {
        if (overlap_line_line(e1[i][0], e1[i][1], e2[j][0], e2[j][1], fn_line, fn_line, epsilon)) {
          return true;
        }
      }
    }
    return false;
  };
  const overlap_circle_point = (radius, origin, point, func = exclude, epsilon = EPSILON) =>
    func(radius - distance2(origin, point), epsilon);
  const overlap_param_form = {
    polygon: a => [a],
    rect: a => [a],
    circle: a => [a.radius, a.origin],
    line: a => [a.vector, a.origin],
    ray: a => [a.vector, a.origin],
    segment: a => [a.vector, a.origin],
    vector: a => [a],
  };
  const overlap_func = {
    polygon: {
      polygon: (a, b, fnA, fnB, ep) => overlap_convex_polygons(...a, ...b, exclude_s, exclude, ep),
      vector: (a, b, fnA, fnB, ep) => overlap_convex_polygon_point(...a, ...b, fnA, ep),
    },
    circle: {
      vector: (a, b, fnA, fnB, ep) => overlap_circle_point(...a, ...b, exclude, ep),
    },
    line: {
      line: (a, b, fnA, fnB, ep) => overlap_line_line(...a, ...b, fnA, fnB, ep),
      ray: (a, b, fnA, fnB, ep) => overlap_line_line(...a, ...b, fnA, fnB, ep),
      segment: (a, b, fnA, fnB, ep) => overlap_line_line(...a, ...b, fnA, fnB, ep),
      vector: (a, b, fnA, fnB, ep) => overlap_line_point(...a, ...b, fnA, ep),
    },
    ray: {
      line: (a, b, fnA, fnB, ep) => overlap_line_line(...b, ...a, fnB, fnA, ep),
      ray: (a, b, fnA, fnB, ep) => overlap_line_line(...a, ...b, fnA, fnB, ep),
      segment: (a, b, fnA, fnB, ep) => overlap_line_line(...a, ...b, fnA, fnB, ep),
      vector: (a, b, fnA, fnB, ep) => overlap_line_point(...a, ...b, fnA, ep),
    },
    segment: {
      line: (a, b, fnA, fnB, ep) => overlap_line_line(...b, ...a, fnB, fnA, ep),
      ray: (a, b, fnA, fnB, ep) => overlap_line_line(...b, ...a, fnB, fnA, ep),
      segment: (a, b, fnA, fnB, ep) => overlap_line_line(...a, ...b, fnA, fnB, ep),
      vector: (a, b, fnA, fnB, ep) => overlap_line_point(...a, ...b, fnA, ep),
    },
    vector: {
      polygon: (a, b, fnA, fnB, ep) => overlap_convex_polygon_point(...b, ...a, fnB, ep),
      circle: (a, b, fnA, fnB, ep) => overlap_circle_point(...b, ...a, exclude, ep),
      line: (a, b, fnA, fnB, ep) => overlap_line_point(...b, ...a, fnB, ep),
      ray: (a, b, fnA, fnB, ep) => overlap_line_point(...b, ...a, fnB, ep),
      segment: (a, b, fnA, fnB, ep) => overlap_line_point(...b, ...a, fnB, ep),
      vector: (a, b, fnA, fnB, ep) => equivalent_vector2(...a, ...b, ep),
    },
  };
  const similar_overlap_types = {
    polygon: "polygon",
    rect: "polygon",
    circle: "circle",
    line: "line",
    ray: "ray",
    segment: "segment",
    vector: "vector",
  };
  const default_overlap_domain_function = {
    polygon: exclude,
    rect: exclude,
    circle: exclude,
    line: exclude_l,
    ray: exclude_r,
    segment: exclude_s,
    vector: exclude_l,
  };
  const overlap = function (a, b, epsilon) {
    const type_a = type_of(a);
    const type_b = type_of(b);
    const aT = similar_overlap_types[type_a];
    const bT = similar_overlap_types[type_b];
    const params_a = overlap_param_form[type_a](a);
    const params_b = overlap_param_form[type_b](b);
    const domain_a = a.domain_function || default_overlap_domain_function[type_a];
    const domain_b = b.domain_function || default_overlap_domain_function[type_b];
    return overlap_func[aT][bT](params_a, params_b, domain_a, domain_b, epsilon);
  };
  const enclose_convex_polygons_inclusive = (outer, inner) => {
    const outerGoesInside = outer
      .map(p => overlap_convex_polygon_point(inner, p, include))
      .reduce((a, b) => a || b, false);
    const innerGoesOutside = inner
      .map(p => overlap_convex_polygon_point(inner, p, include))
      .reduce((a, b) => a && b, true);
    return (!outerGoesInside && innerGoesOutside);
  };
  const line_line_parameter = (
    line_vector, line_origin,
    poly_vector, poly_origin,
    poly_line_func = include_s,
    epsilon = EPSILON
  ) => {
    const det_norm = cross2(normalize(line_vector), normalize(poly_vector));
    if (Math.abs(det_norm) < epsilon) { return undefined; }
    const determinant0 = cross2(line_vector, poly_vector);
    const determinant1 = -determinant0;
    const a2b = subtract(poly_origin, line_origin);
    const b2a = flip(a2b);
    const t0 = cross2(a2b, poly_vector) / determinant0;
    const t1 = cross2(b2a, line_vector) / determinant1;
    if (poly_line_func(t1, epsilon / magnitude(poly_vector))) {
      return t0;
    }
    return undefined;
  };
  const line_point_from_parameter = (vector, origin, t) => add(origin, scale(vector, t));
  const get_intersect_parameters = (poly, vector, origin, poly_line_func, epsilon) => {
    const numbers = poly
      .map((p, i, arr) => [subtract(arr[(i + 1) % arr.length], p), p])
      .map(side => line_line_parameter(
        vector, origin,
        side[0], side[1],
        poly_line_func,
        epsilon))
      .filter(fn_not_undefined)
      .sort((a, b) => a - b);
    if (numbers.length < 2) { return undefined; }
    const ends = [numbers[0], numbers[numbers.length - 1]];
    return (ends[1] - ends[0]) > epsilon * magnitude(vector)
      ? ends
      : undefined;
  };
  const clip_line_in_convex_polygon = (
    poly,
    vector,
    origin,
    fn_poly = include,
    fn_line = include_l$1,
    epsilon = EPSILON
  ) => {
    const ends = get_intersect_parameters(poly, vector, origin, include_s, epsilon);
    if (ends === undefined) { return undefined; }
    const ends_clip = ends.map((t, i) => fn_line(t) ? t : (t < 0.5 ? 0 : 1));
    if (Math.abs(ends_clip[0] - ends_clip[1]) < epsilon) { return undefined; }
    const mid = line_point_from_parameter(vector, origin, (ends_clip[0] + ends_clip[1]) / 2);
    return overlap_convex_polygon_point(poly, mid, fn_poly, epsilon)
      ? ends_clip.map(t => line_point_from_parameter(vector, origin, t))
      : undefined;
  };
  const VectorArgs = function () {
    this.push(...get_vector(arguments));
  };
  const VectorGetters = {
    x: function () { return this[0]; },
    y: function () { return this[1]; },
    z: function () { return this[2]; },
  };
  const table = {
    preserve: {
      magnitude: function () { return magnitude(this); },
      isEquivalent: function () {
        return equivalent_vectors(this, get_vector(arguments));
      },
      isParallel: function () {
        return parallel(...resize_up(this, get_vector(arguments)));
      },
      isCollinear: function (line) {
        return overlap(this, line);
      },
      dot: function () {
        return dot(...resize_up(this, get_vector(arguments)));
      },
      distanceTo: function () {
        return distance(...resize_up(this, get_vector(arguments)));
      },
      overlap: function (other) {
        return overlap(this, other);
      },
    },
    vector: {
      copy: function () { return [...this]; },
      normalize: function () { return normalize(this); },
      scale: function () { return scale(this, arguments[0]); },
      flip: function () { return flip(this); },
      rotate90: function () { return rotate90(this); },
      rotate270: function () { return rotate270(this); },
      cross: function () {
        return cross3(
          resize(3, this),
          resize(3, get_vector(arguments))
        );
      },
      transform: function () {
        return multiply_matrix3_vector3(
          get_matrix_3x4(arguments),
          resize(3, this)
        );
      },
      add: function () {
        return add(this, resize(this.length, get_vector(arguments)));
      },
      subtract: function () {
        return subtract(this, resize(this.length, get_vector(arguments)));
      },
      rotateZ: function (angle, origin) {
        return multiply_matrix3_vector3(
          get_matrix_3x4(make_matrix2_rotate(angle, origin)),
          resize(3, this)
        );
      },
      lerp: function (vector, pct) {
        return lerp(this, resize(this.length, get_vector(vector)), pct);
      },
      midpoint: function () {
        return midpoint(...resize_up(this, get_vector(arguments)));
      },
      bisect: function () {
        return counter_clockwise_bisect2(this, get_vector(arguments));
      },
    }
  };
  const VectorMethods = {};
  Object.keys(table.preserve).forEach(key => {
    VectorMethods[key] = table.preserve[key];
  });
  Object.keys(table.vector).forEach(key => {
    VectorMethods[key] = function () {
      return Constructors.vector(...table.vector[key].apply(this, arguments));
    };
  });
  const VectorStatic = {
    fromAngle: function (angle) {
      return Constructors.vector(Math.cos(angle), Math.sin(angle));
    },
    fromAngleDegrees: function (angle) {
      return Constructors.vector.fromAngle(angle * D2R);
    },
  };
  var Vector = {
    vector: {
      P: Array.prototype,
      A: VectorArgs,
      G: VectorGetters,
      M: VectorMethods,
      S: VectorStatic,
    }
  };
  var Static = {
    fromPoints: function () {
      const points = get_vector_of_vectors(arguments);
      return this.constructor({
        vector: subtract(points[1], points[0]),
        origin: points[0],
      });
    },
    fromAngle: function() {
      const angle = arguments[0] || 0;
      return this.constructor({
        vector: [Math.cos(angle), Math.sin(angle)],
        origin: [0, 0],
      });
    },
    perpendicularBisector: function () {
      const points = get_vector_of_vectors(arguments);
      return this.constructor({
        vector: rotate90(subtract(points[1], points[0])),
        origin: average(points[0], points[1]),
      });
    },
  };
  const methods = {
    isParallel: function () {
      const arr = resize_up(this.vector, get_line(...arguments).vector);
      return parallel(...arr);
    },
    isCollinear: function () {
      const line = get_line(arguments);
      return overlap_line_point(this.vector, this.origin, line.origin)
        && parallel(...resize_up(this.vector, line.vector));
    },
    isDegenerate: function (epsilon = EPSILON) {
      return degenerate(this.vector, epsilon);
    },
    reflectionMatrix: function () {
      return Constructors.matrix(make_matrix3_reflectZ(this.vector, this.origin));
    },
    nearestPoint: function () {
      const point = get_vector(arguments);
      return Constructors.vector(
        nearest_point_on_line(this.vector, this.origin, point, this.clip_function)
      );
    },
    transform: function () {
      const dim = this.dimension;
      const r = multiply_matrix3_line3(
        get_matrix_3x4(arguments),
        resize(3, this.vector),
        resize(3, this.origin)
      );
      return this.constructor(resize(dim, r.vector), resize(dim, r.origin));
    },
    translate: function () {
      const origin = add(...resize_up(this.origin, get_vector(arguments)));
      return this.constructor(this.vector, origin);
    },
    intersect: function () {
      return intersect(this, ...arguments);
    },
    overlap: function () {
      return overlap(this, ...arguments);
    },
    bisect: function (lineType, epsilon) {
      const line = get_line(lineType);
      return bisect_lines2(this.vector, this.origin, line.vector, line.origin, epsilon)
        .map(line => this.constructor(line));
    },
  };
  var Line = {
    line: {
      P: Object.prototype,
      A: function () {
        const l = get_line(...arguments);
        this.vector = Constructors.vector(l.vector);
        this.origin = Constructors.vector(resize(this.vector.length, l.origin));
        Object.defineProperty(this, "domain_function", { writable: true, value: include_l$1 });
      },
      G: {
        dimension: function () {
          return [this.vector, this.origin]
            .map(p => p.length)
            .reduce((a, b) => Math.max(a, b), 0);
        },
      },
      M: Object.assign({}, methods, {
        inclusive: function () { this.domain_function = include_l$1; return this; },
        exclusive: function () { this.domain_function = exclude_l; return this; },
        clip_function: dist => dist,
        svgPath: function (length = 20000) {
          const start = add(this.origin, scale(this.vector, -length / 2));
          const end = scale(this.vector, length);
          return `M${start[0]} ${start[1]}l${end[0]} ${end[1]}`;
        },
      }),
      S: Static
    }
  };
  var Ray = {
    ray: {
      P: Object.prototype,
      A: function () {
        const ray = get_line(...arguments);
        this.vector = Constructors.vector(ray.vector);
        this.origin = Constructors.vector(resize(this.vector.length, ray.origin));
        Object.defineProperty(this, "domain_function", { writable: true, value: include_r });
      },
      G: {
        dimension: function () {
          return [this.vector, this.origin]
            .map(p => p.length)
            .reduce((a, b) => Math.max(a, b), 0);
        },
      },
      M: Object.assign({}, methods, {
        inclusive: function () { this.domain_function = include_r; return this; },
        exclusive: function () { this.domain_function = exclude_r; return this; },
        flip: function () {
          return Constructors.ray(flip(this.vector), this.origin);
        },
        scale: function (scale) {
          return Constructors.ray(this.vector.scale(scale), this.origin);
        },
        normalize: function () {
          return Constructors.ray(this.vector.normalize(), this.origin);
        },
        clip_function: ray_limiter,
        svgPath: function (length = 10000) {
          const end = this.vector.scale(length);
          return `M${this.origin[0]} ${this.origin[1]}l${end[0]} ${end[1]}`;
        },
      }),
      S: Static
    }
  };
  var Segment = {
    segment: {
      P: Array.prototype,
      A: function () {
        const a = get_segment(...arguments);
        this.push(...[a[0], a[1]].map(v => Constructors.vector(v)));
        this.vector = Constructors.vector(subtract(this[1], this[0]));
        this.origin = this[0];
        Object.defineProperty(this, "domain_function", { writable: true, value: include_s });
      },
      G: {
        points: function () { return this; },
        magnitude: function () { return magnitude(this.vector); },
        dimension: function () {
          return [this.vector, this.origin]
            .map(p => p.length)
            .reduce((a, b) => Math.max(a, b), 0);
        },
      },
      M: Object.assign({}, methods, {
        inclusive: function () { this.domain_function = include_s; return this; },
        exclusive: function () { this.domain_function = exclude_s; return this; },
        clip_function: segment_limiter,
        transform: function (...innerArgs) {
          const dim = this.points[0].length;
          const mat = get_matrix_3x4(innerArgs);
          const transformed_points = this.points
            .map(point => resize(3, point))
            .map(point => multiply_matrix3_vector3(mat, point))
            .map(point => resize(dim, point));
          return Constructors.segment(transformed_points);
        },
        translate: function() {
          const translate = get_vector(arguments);
          const transformed_points = this.points
            .map(point => add(...resize_up(point, translate)));
          return Constructors.segment(transformed_points);
        },
        midpoint: function () {
          return Constructors.vector(average(this.points[0], this.points[1]));
        },
        svgPath: function () {
          const pointStrings = this.points.map(p => `${p[0]} ${p[1]}`);
          return ["M", "L"].map((cmd, i) => `${cmd}${pointStrings[i]}`)
            .join("");
        },
      }),
      S: {
        fromPoints: function () {
          return this.constructor(...arguments);
        }
      }
    }
  };
  const CircleArgs = function () {
    const circle = get_circle(...arguments);
    this.radius = circle.radius;
    this.origin = Constructors.vector(...circle.origin);
  };
  const CircleGetters = {
    x: function () { return this.origin[0]; },
    y: function () { return this.origin[1]; },
    z: function () { return this.origin[2]; },
  };
  const pointOnEllipse = function (cx, cy, rx, ry, zRotation, arcAngle) {
    const cos_rotate = Math.cos(zRotation);
    const sin_rotate = Math.sin(zRotation);
    const cos_arc = Math.cos(arcAngle);
    const sin_arc = Math.sin(arcAngle);
    return [
      cx + cos_rotate * rx * cos_arc + -sin_rotate * ry * sin_arc,
      cy + sin_rotate * rx * cos_arc + cos_rotate * ry * sin_arc
    ];
  };
  const pathInfo = function (cx, cy, rx, ry, zRotation, arcStart_, deltaArc_) {
    let arcStart = arcStart_;
    if (arcStart < 0 && !isNaN(arcStart)) {
      while (arcStart < 0) {
        arcStart += Math.PI * 2;
      }
    }
    const deltaArc = deltaArc_ > Math.PI * 2 ? Math.PI * 2 : deltaArc_;
    const start = pointOnEllipse(cx, cy, rx, ry, zRotation, arcStart);
    const middle = pointOnEllipse(cx, cy, rx, ry, zRotation, arcStart + deltaArc / 2);
    const end = pointOnEllipse(cx, cy, rx, ry, zRotation, arcStart + deltaArc);
    const fa = ((deltaArc / 2) > Math.PI) ? 1 : 0;
    const fs = ((deltaArc / 2) > 0) ? 1 : 0;
    return {
      x1: start[0],
      y1: start[1],
      x2: middle[0],
      y2: middle[1],
      x3: end[0],
      y3: end[1],
      fa,
      fs
    };
  };
  const cln = n => clean_number(n, 4);
  const ellipticalArcTo = (rx, ry, phi_degrees, fa, fs, endX, endY) =>
    `A${cln(rx)} ${cln(ry)} ${cln(phi_degrees)} ${cln(fa)} ${cln(fs)} ${cln(endX)} ${cln(endY)}`;
  const CircleMethods = {
    nearestPoint: function () {
      return Constructors.vector(nearest_point_on_circle(
        this.radius,
        this.origin,
        get_vector(arguments)
      ));
    },
    intersect: function (object) {
      return intersect(this, object);
    },
    overlap: function (object) {
      return overlap(this, object);
    },
    svgPath: function (arcStart = 0, deltaArc = Math.PI * 2) {
      const info = pathInfo(this.origin[0], this.origin[1], this.radius, this.radius, 0, arcStart, deltaArc);
      const arc1 = ellipticalArcTo(this.radius, this.radius, 0, info.fa, info.fs, info.x2, info.y2);
      const arc2 = ellipticalArcTo(this.radius, this.radius, 0, info.fa, info.fs, info.x3, info.y3);
      return `M${info.x1} ${info.y1}${arc1}${arc2}`;
    },
    points: function (count = 128) {
      return Array.from(Array(count))
        .map((_, i) => ((2 * Math.PI) / count) * i)
        .map(angle => [
          this.origin[0] + this.radius * Math.cos(angle),
          this.origin[1] + this.radius * Math.sin(angle)
        ]);
    },
    polygon: function () {
      return Constructors.polygon(this.points(arguments[0]));
    },
    segments: function () {
      const points = this.points(arguments[0]);
      return points.map((point, i) => {
        const nextI = (i + 1) % points.length;
        return [point, points[nextI]];
      });
    }
  };
  const CircleStatic = {
    fromPoints: function () {
      if (arguments.length === 3) {
        const result = circumcircle(...arguments);
        return this.constructor(result.radius, result.origin);
      }
      return this.constructor(...arguments);
    },
    fromThreePoints: function () {
      const result = circumcircle(...arguments);
      return this.constructor(result.radius, result.origin);
    }
  };
  var Circle = {
    circle: { A: CircleArgs, G: CircleGetters, M: CircleMethods, S: CircleStatic }
  };
  const getFoci = function (center, rx, ry, spin) {
    const order = rx > ry;
    const lsq = order ? (rx ** 2) - (ry ** 2) : (ry ** 2) - (rx ** 2);
    const l = Math.sqrt(lsq);
    const trigX = order ? Math.cos(spin) : Math.sin(spin);
    const trigY = order ? Math.sin(spin) : Math.cos(spin);
    return [
      Constructors.vector(center[0] + l * trigX, center[1] + l * trigY),
      Constructors.vector(center[0] - l * trigX, center[1] - l * trigY),
    ];
  };
  var Ellipse = {
    ellipse: {
      A: function () {
        const numbers = flatten_arrays(arguments).filter(a => !isNaN(a));
        const params = resize(5, numbers);
        this.rx = params[0];
        this.ry = params[1];
        this.origin = Constructors.vector(params[2], params[3]);
        this.spin = params[4];
        this.foci = getFoci(this.origin, this.rx, this.ry, this.spin);
      },
      G: {
        x: function () { return this.origin[0]; },
        y: function () { return this.origin[1]; },
      },
      M: {
        svgPath: function (arcStart = 0, deltaArc = Math.PI * 2) {
          const info = pathInfo(this.origin[0], this.origin[1], this.rx, this.ry, this.spin, arcStart, deltaArc);
          const arc1 = ellipticalArcTo(this.rx, this.ry, (this.spin / Math.PI) * 180, info.fa, info.fs, info.x2, info.y2);
          const arc2 = ellipticalArcTo(this.rx, this.ry, (this.spin / Math.PI) * 180, info.fa, info.fs, info.x3, info.y3);
          return `M${info.x1} ${info.y1}${arc1}${arc2}`;
        },
        points: function (count = 128) {
          return Array.from(Array(count))
            .map((_, i) => ((2 * Math.PI) / count) * i)
            .map(angle => pointOnEllipse(
              this.origin.x, this.origin.y,
              this.rx, this.ry,
              this.spin, angle
            ));
        },
        polygon: function () {
          return Constructors.polygon(this.points(arguments[0]));
        },
        segments: function () {
          const points = this.points(arguments[0]);
          return points.map((point, i) => {
            const nextI = (i + 1) % points.length;
            return [point, points[nextI]];
          });
        }
      },
      S: {
      }
    }
  };
  const methods$1 = {
    area: function () {
      return signed_area(this);
    },
    centroid: function () {
      return Constructors.vector(centroid(this));
    },
    enclosingRectangle: function () {
      return Constructors.rect(enclosing_rectangle(this));
    },
    straightSkeleton: function () {
      return straight_skeleton(this);
    },
    scale: function (magnitude, center = centroid(this)) {
      const newPoints = this
        .map(p => [0, 1].map((_, i) => p[i] - center[i]))
        .map(vec => vec.map((_, i) => center[i] + vec[i] * magnitude));
      return this.constructor.fromPoints(newPoints);
    },
    rotate: function (angle, centerPoint = centroid(this)) {
      const newPoints = this.map((p) => {
        const vec = [p[0] - centerPoint[0], p[1] - centerPoint[1]];
        const mag = Math.sqrt((vec[0] ** 2) + (vec[1] ** 2));
        const a = Math.atan2(vec[1], vec[0]);
        return [
          centerPoint[0] + Math.cos(a + angle) * mag,
          centerPoint[1] + Math.sin(a + angle) * mag,
        ];
      });
      return Constructors.polygon(newPoints);
    },
    translate: function () {
      const vec = get_vector(...arguments);
      const newPoints = this.map(p => p.map((n, i) => n + vec[i]));
      return this.constructor.fromPoints(newPoints);
    },
    transform: function () {
      const m = get_matrix_3x4(...arguments);
      const newPoints = this
        .map(p => multiply_matrix3_vector3(m, resize(3, p)));
      return Constructors.polygon(newPoints);
    },
    nearest: function () {
      const point = get_vector(...arguments);
      const result = nearest_point_on_polygon(this, point);
      return result === undefined
        ? undefined
        : Object.assign(result, { edge: this.sides[result.i] });
    },
    split: function () {
      const line = get_line(...arguments);
      const split_func = split_convex_polygon;
      return split_func(this, line.vector, line.origin)
        .map(poly => Constructors.polygon(poly));
    },
    overlap: function () {
      return overlap(this, ...arguments);
    },
    intersect: function () {
      return intersect(this, ...arguments);
    },
    clip: function (line_type, epsilon) {
      const fn_line = line_type.domain_function ? line_type.domain_function : include_l;
      const segment = clip_line_in_convex_polygon(this,
        line_type.vector,
        line_type.origin,
        this.domain_function,
        fn_line,
        epsilon);
      return segment ? Constructors.segment(segment) : undefined;
    },
    svgPath: function () {
      const pre = Array(this.length).fill("L");
      pre[0] = "M";
      return `${this.map((p, i) => `${pre[i]}${p[0]} ${p[1]}`).join("")}z`;
    },
  };
  const rectToPoints = r => [
    [r.x, r.y],
    [r.x + r.width, r.y],
    [r.x + r.width, r.y + r.height],
    [r.x, r.y + r.height]
  ];
  const rectToSides = r => [
    [[r.x, r.y], [r.x + r.width, r.y]],
    [[r.x + r.width, r.y], [r.x + r.width, r.y + r.height]],
    [[r.x + r.width, r.y + r.height], [r.x, r.y + r.height]],
    [[r.x, r.y + r.height], [r.x, r.y]],
  ];
  var Rect = {
    rect: {
      P: Array.prototype,
      A: function () {
        const r = get_rect(...arguments);
        this.width = r.width;
        this.height = r.height;
        this.origin = Constructors.vector(r.x, r.y);
        this.push(...rectToPoints(this));
        Object.defineProperty(this, "domain_function", { writable: true, value: include });
      },
      G: {
        x: function () { return this.origin[0]; },
        y: function () { return this.origin[1]; },
        center: function () { return Constructors.vector(
          this.origin[0] + this.width / 2,
          this.origin[1] + this.height / 2,
        ); },
      },
      M: Object.assign({}, methods$1, {
        inclusive: function () { this.domain_function = include; return this; },
        exclusive: function () { this.domain_function = exclude; return this; },
        area: function () { return this.width * this.height; },
        segments: function () { return rectToSides(this); },
        svgPath: function () {
          return `M${this.origin.join(" ")}h${this.width}v${this.height}h${-this.width}Z`;
        },
      }),
      S: {
        fromPoints: function () {
          return Constructors.rect(enclosing_rectangle(get_vector_of_vectors(arguments)));
        }
      }
    }
  };
  var Polygon = {
    polygon: {
      P: Array.prototype,
      A: function () {
        this.push(...semi_flatten_arrays(arguments));
        this.sides = this
          .map((p, i, arr) => [p, arr[(i + 1) % arr.length]]);
        this.vectors = this.sides.map(side => subtract(side[1], side[0]));
        Object.defineProperty(this, "domain_function", { writable: true, value: include });
      },
      G: {
        isConvex: function () {
          return true;
        },
        points: function () {
          return this;
        },
      },
      M: Object.assign({}, methods$1, {
        inclusive: function () { this.domain_function = include; return this; },
        exclusive: function () { this.domain_function = exclude; return this; },
        segments: function () {
          return this.sides;
        },
      }),
      S: {
        fromPoints: function () {
          return this.constructor(...arguments);
        },
        regularPolygon: function () {
          return this.constructor(make_regular_polygon(...arguments));
        },
        convexHull: function () {
          return this.constructor(convex_hull(...arguments));
        },
      }
    }
  };
  const assign = (thisMat, mat) => {
    for (let i = 0; i < 12; i += 1) {
      thisMat[i] = mat[i];
    }
    return thisMat;
  };
  var Matrix = {
    matrix: {
      P: Array.prototype,
      A: function () {
        get_matrix_3x4(arguments).forEach(m => this.push(m));
      },
      G: {
      },
      M: {
        copy: function () { return Constructors.matrix(...Array.from(this)); },
        set: function () {
          return assign(this, get_matrix_3x4(arguments));
        },
        isIdentity: function () { return is_identity3x4(this); },
        multiply: function (mat) {
          return assign(this, multiply_matrices3(this, mat));
        },
        determinant: function () {
          return determinant3(this);
        },
        inverse: function () {
          return assign(this, invert_matrix3(this));
        },
        translate: function (x, y, z) {
          return assign(this,
            multiply_matrices3(this, make_matrix3_translate(x, y, z)));
        },
        rotateX: function (radians) {
          return assign(this,
            multiply_matrices3(this, make_matrix3_rotateX(radians)));
        },
        rotateY: function (radians) {
          return assign(this,
            multiply_matrices3(this, make_matrix3_rotateY(radians)));
        },
        rotateZ: function (radians) {
          return assign(this,
            multiply_matrices3(this, make_matrix3_rotateZ(radians)));
        },
        rotate: function (radians, vector, origin) {
          const transform = make_matrix3_rotate(radians, vector, origin);
          return assign(this, multiply_matrices3(this, transform));
        },
        scale: function (amount) {
          return assign(this,
            multiply_matrices3(this, make_matrix3_scale(amount)));
        },
        reflectZ: function (vector, origin) {
          const transform = make_matrix3_reflectZ(vector, origin);
          return assign(this, multiply_matrices3(this, transform));
        },
        transform: function (...innerArgs) {
          return Constructors.vector(
            multiply_matrix3_vector3(this, resize(3, get_vector(innerArgs)))
          );
        },
        transformVector: function (vector) {
          return Constructors.vector(
            multiply_matrix3_vector3(this, resize(3, get_vector(vector)))
          );
        },
        transformLine: function (...innerArgs) {
          const l = get_line(innerArgs);
          return Constructors.line(multiply_matrix3_line3(this, l.vector, l.origin));
        },
      },
      S: {
      }
    }
  };
  const Definitions = Object.assign({},
    Vector,
    Line,
    Ray,
    Segment,
    Circle,
    Ellipse,
    Rect,
    Polygon,
    Matrix,
  );
  const create = function (primitiveName, args) {
    const a = Object.create(Definitions[primitiveName].proto);
    Definitions[primitiveName].A.apply(a, args);
    return a;
  };
  const vector = function () { return create("vector", arguments); };
  const circle = function () { return create("circle", arguments); };
  const ellipse = function () { return create("ellipse", arguments); };
  const rect = function () { return create("rect", arguments); };
  const polygon = function () { return create("polygon", arguments); };
  const line = function () { return create("line", arguments); };
  const ray = function () { return create("ray", arguments); };
  const segment = function () { return create("segment", arguments); };
  const matrix = function () { return create("matrix", arguments); };
  Object.assign(Constructors, {
    vector,
    circle,
    ellipse,
    rect,
    polygon,
    line,
    ray,
    segment,
    matrix,
  });
  Object.keys(Definitions).forEach(primitiveName => {
    const Proto = {};
    Proto.prototype = Definitions[primitiveName].P != null
      ? Object.create(Definitions[primitiveName].P)
      : Object.create(Object.prototype);
    Proto.prototype.constructor = Proto;
    Constructors[primitiveName].prototype = Proto.prototype;
    Constructors[primitiveName].prototype.constructor = Constructors[primitiveName];
    Object.keys(Definitions[primitiveName].G)
      .forEach(key => Object.defineProperty(Proto.prototype, key, {
        get: Definitions[primitiveName].G[key],
      }));
    Object.keys(Definitions[primitiveName].M)
      .forEach(key => Object.defineProperty(Proto.prototype, key, {
        value: Definitions[primitiveName].M[key],
      }));
    Object.keys(Definitions[primitiveName].S)
      .forEach(key => Object.defineProperty(Constructors[primitiveName], key, {
        value: Definitions[primitiveName].S[key]
          .bind(Constructors[primitiveName].prototype),
      }));
    Definitions[primitiveName].proto = Proto.prototype;
  });
  const math = Constructors;
  math.core = Object.assign(Object.create(null),
    constants,
    resizers,
    getters,
    functions,
    algebra,
    equal,
    sort,
    geometry,
    radial,
    matrix2,
    matrix3,
    nearest,
    axioms,
    {
      enclose_convex_polygons_inclusive,
      intersect_convex_polygon_line,
      intersect_circle_circle,
      intersect_circle_line,
      intersect_line_line,
      overlap_convex_polygons,
      overlap_convex_polygon_point,
      overlap_line_line,
      overlap_line_point,
      clip_line_in_convex_polygon,
    }
  );
  math.typeof = type_of;
  math.intersect = intersect;
  math.overlap = overlap;

  var root = Object.create(null);

  const use = function (library) {
    if (library == null || typeof library.linker !== "function") {
      return;
    }
    library.linker(this);
  };

  const axiom_param_map = [null,
    a => a,
    a => a,
    (_, l) => [l[0].vector, l[0].origin, l[1].vector, l[1].origin],
    (p, l) => [l[0].vector, p[0]],
    (p, l) => [l[0].vector, l[0].origin, p[0], p[1]],
    (p, l) => [l[0].vector, l[0].origin, l[1].vector, l[1].origin, p[0], p[1]],
    (p, l) => [l[0].vector, l[0].origin, l[1].vector, p[0]],
  ];
  const axiom_paramify = (number, points, lines) => axiom_param_map[number]
    ? axiom_param_map[number](points, lines)
    : [];
  const axiom_arrayify = (number, result) => {
    switch (number) {
      case "1": case 1:
      case "2": case 2:
      case "4": case 4:
      case "7": case 7: return [result];
      case "3": case 3:
      case "5": case 5:
      case "6": case 6: return result;
    }
  };
  const axiom = (number, params = {}) => {
    const points = (params.points || []).map(p => math.core.get_vector(p));
    const lines = (params.lines || []).map(l => math.core.get_line(l));
    const result = math.core[`axiom${number}`](...axiom_paramify(number, points, lines));
    return axiom_arrayify(number, result);
  };
  const axioms$1 = [null, 1, 2, 3, 4, 5, 6, 7];
  delete axioms$1[0];
  Object.keys(axioms$1).forEach(number => {
    axiom[number] = (...args) => axiom(number, ...args);
  });

  const line_line_for_arrows = (a, b) => math.core.intersect_line_line(
  	a.vector, a.origin, b.vector, b.origin, math.core.include_l, math.core.include_l
  );
  const reflect_point = (foldLine, point) => {
  	const matrix = math.core.make_matrix2_reflect(foldLine.vector, foldLine.origin);
    return math.core.multiply_matrix2_vector2(matrix, point);
  };
  const boundary_for_arrows = ({ vertices_coords }) => math.core
  	.convex_hull(vertices_coords);
  const widest_perp = (graph, foldLine, point) => {
  	const boundary = boundary_for_arrows(graph);
  	if (point === undefined) {
  		const foldSegment = math.core.clip_line_in_convex_polygon(boundary,
        foldLine.vector,
        foldLine.origin,
        math.core.exclude,
        math.core.include_l);
  		point = math.core.midpoint(...foldSegment);
  	}
    const perpVector = math.core.rotate270(foldLine.vector);
  	const smallest = math.core
  		.clip_line_in_convex_polygon(boundary,
        perpVector,
        point,
        math.core.exclude,
        math.core.include_l)
    	.map(pt => math.core.distance(point, pt))
      .sort((a, b) => a - b)
      .shift();
  	const scaled = math.core.scale(math.core.normalize(perpVector), smallest);
  	return math.segment(
  		math.core.add(point, math.core.flip(scaled)),
  		math.core.add(point, scaled)
  	);
  };
  const between_2_segments = (params, segments, foldLine) => {
  	const midpoints = segments
  		.map(seg => math.core.midpoint(seg[0], seg[1]));
  	const midpointLine = math.line.fromPoints(...midpoints);
  	const origin = math.intersect(foldLine, midpointLine);
  	const perpLine = math.line(foldLine.vector.rotate90(), origin);
  	return math.segment(params.lines.map(line => math.intersect(line, perpLine)));
  };
  const between_2_intersecting_segments = (params, intersect, foldLine, boundary) => {
    const paramVectors = params.lines.map(l => l.vector);
    const flippedVectors = paramVectors.map(math.core.flip);
    const paramRays = paramVectors
      .concat(flippedVectors)
      .map(vec => math.ray(vec, intersect));
    const a1 = paramRays.filter(ray =>
      math.core.dot(ray.vector, foldLine.vector) > 0 &&
      math.core.cross2(ray.vector, foldLine.vector) > 0
    ).shift();
    const a2 = paramRays.filter(ray =>
      math.core.dot(ray.vector, foldLine.vector) > 0 &&
      math.core.cross2(ray.vector, foldLine.vector) < 0
    ).shift();
    const b1 = paramRays.filter(ray =>
      math.core.dot(ray.vector, foldLine.vector) < 0 &&
      math.core.cross2(ray.vector, foldLine.vector) > 0
    ).shift();
    const b2 = paramRays.filter(ray =>
      math.core.dot(ray.vector, foldLine.vector) < 0 &&
      math.core.cross2(ray.vector, foldLine.vector) < 0
    ).shift();
    const rayEndpoints = [a1, a2, b1, b2].map(ray => math.core
  		.intersect_convex_polygon_line(boundary, ray.vector, ray.origin, math.core.exclude_s, math.core.exclude_r)
  		.shift()
  		.shift());
    const rayLengths = rayEndpoints
      .map(pt => math.core.distance(pt, intersect));
  	const arrowStart = (rayLengths[0] < rayLengths[1]
  		? rayEndpoints[0]
  		: rayEndpoints[1]);
  	const arrowEnd = (rayLengths[0] < rayLengths[1]
  		? math.core.add(a2.origin, a2.vector.normalize().scale(rayLengths[0]))
  		: math.core.add(a1.origin, a1.vector.normalize().scale(rayLengths[1])));
  	const arrowStart2 = (rayLengths[2] < rayLengths[3]
  		? rayEndpoints[2]
  		: rayEndpoints[3]);
  	const arrowEnd2 = (rayLengths[2] < rayLengths[3]
  		? math.core.add(b2.origin, b2.vector.normalize().scale(rayLengths[2]))
  		: math.core.add(b1.origin, b1.vector.normalize().scale(rayLengths[3])));
  	return [
  		math.segment(arrowStart, arrowEnd),
  		math.segment(arrowStart2, arrowEnd2)
  	];
  };
  const axiom_1_arrows = (params, graph) => axiom(1, params)
  	.map(foldLine => [widest_perp(graph, foldLine)]);
  const axiom_2_arrows = params => [
  	[math.segment(params.points)]
  ];
  const axiom_3_arrows = (params, graph) => {
  	const boundary = boundary_for_arrows(graph);
  	const segs = params.lines.map(l => math.core
  		.clip_line_in_convex_polygon(boundary,
        l.vector,
        l.origin,
        math.core.exclude,
        math.core.include_l));
    const segVecs = segs.map(seg => math.core.subtract(seg[1], seg[0]));
    const intersect = math.core.intersect_line_line(
  		segVecs[0], segs[0][0], segVecs[1], segs[1][0],
      math.core.exclude_s, math.core.exclude_s);
    return !intersect
  		? [between_2_segments(params, segs, axiom(3, params)
  			.filter(a => a !== undefined).shift())]
  		: axiom(3, params).map(foldLine => between_2_intersecting_segments(
  				params, intersect, foldLine, boundary
  			));
  };
  const axiom_4_arrows = (params, graph) => axiom(4, params)
  	.map(foldLine => [widest_perp(
  		graph,
  		foldLine,
  		line_line_for_arrows(foldLine, params.lines[0])
  	)]);
  const axiom_5_arrows = (params) => axiom(5, params)
  	.map(foldLine => [math.segment(
  		params.points[1],
  		reflect_point(foldLine, params.points[1])
  	)]);
  const axiom_6_arrows = (params) => axiom(6, params)
  	.map(foldLine => params.points
  		.map(pt => math.segment(pt, reflect_point(foldLine, pt))));
  const axiom_7_arrows = (params, graph) => axiom(7, params)
  	.map(foldLine => [
  		math.segment(params.points[0], reflect_point(foldLine, params.points[0])),
  		widest_perp(graph, foldLine, line_line_for_arrows(foldLine, params.lines[1]))
  	]);
  const arrow_functions = [null,
  	axiom_1_arrows,
  	axiom_2_arrows,
  	axiom_3_arrows,
  	axiom_4_arrows,
  	axiom_5_arrows,
  	axiom_6_arrows,
  	axiom_7_arrows,
  ];
  delete arrow_functions[0];
  const axiom_arrows = (number, params = {}, ...args) => {
  	const points = params.points
  		? params.points.map(p => math.core.get_vector(p))
  		: undefined;
  	const lines = params.lines
      ? params.lines.map(l => math.core.get_line(l))
  		: undefined;
  	return arrow_functions[number]({ points, lines }, ...args);
  };
  Object.keys(arrow_functions).forEach(number => {
    axiom_arrows[number] = (...args) => axiom_arrows(number, ...args);
  });

  var diagram = Object.assign(Object.create(null),
  	{
  	axiom_arrows
  });

  const get_unassigned_indices = (edges_assignment) => edges_assignment
    .map((_, i) => i)
    .filter(i => edges_assignment[i] === "U" || edges_assignment[i] === "u");
  const maekawa_assignments = (assignments) => {
    const unassigneds = get_unassigned_indices(assignments);
    const permuts = Array.from(Array(2 ** unassigneds.length))
      .map((_, i) => i.toString(2))
      .map(l => Array(unassigneds.length - l.length + 1).join("0") + l)
      .map(str => Array.from(str).map(l => l === "0" ? "V" : "M"));
    const all = permuts.map(perm => {
      const array = assignments.slice();
      unassigneds.forEach((index, i) => { array[index] = perm[i]; });
      return array;
    });
    const count_m = all.map(a => a.filter(l => l === "M" || l === "m").length);
    const count_v = all.map(a => a.filter(l => l === "V" || l === "v").length);
    return all.filter((_, i) => Math.abs(count_m[i] - count_v[i]) === 2);
  };

  const fn_and$1 = (a, b) => a && b;
  const fn_cat$1 = (a, b) => a.concat(b);
  const fn_def = a => a !== undefined;
  const fn_add$1 = (a, b) => a + b;

  const merge_simple_nextmaps = (...maps) => {
    if (maps.length === 0) { return; }
  	const solution = maps[0].map((_, i) => i);
  	maps.forEach(map => solution.forEach((s, i) => { solution[i] = map[s]; }));
  	return solution;
  };
  const merge_nextmaps = (...maps) => {
    if (maps.length === 0) { return; }
  	const solution = maps[0].map((_, i) => [i]);
  	maps.forEach(map => {
  		solution.forEach((s, i) => s.forEach((indx,j) => { solution[i][j] = map[indx]; }));
  		solution.forEach((arr, i) => {
  			solution[i] = arr
  				.reduce((a,b) => a.concat(b), [])
  				.filter(a => a !== undefined);
  		});
  	});
  	return solution;
  };
  const merge_simple_backmaps = (...maps) => {
    if (maps.length === 0) { return; }
  	let solution = maps[0].map((_, i) => i);
  	maps.forEach((map, i) => {
  		const next = map.map(n => solution[n]);
  	  solution = next;
  	});
    return solution;
  };
  const merge_backmaps = (...maps) => {
    if (maps.length === 0) { return; }
    let solution = maps[0].reduce((a, b) => a.concat(b), []).map((_, i) => [i]);
    maps.forEach((map, i) => {
  		let next = [];
  	  map.forEach((el, j) => {
        if (typeof el === "number") { next[j] = solution[el]; }
  			else { next[j] = el.map(n => solution[n]).reduce((a,b) => a.concat(b), []); }
  		});
  		solution = next;
  	});
  	return solution;
  };
  const invert_map = (map) => {
  	const inv = [];
  	map.forEach((n, i) => {
  		if (n == null) { return; }
  		if (typeof n === "number") {
  			if (inv[n] !== undefined) {
  				if (typeof inv[n] === "number") { inv[n] = [inv[n], i]; }
  				else { inv[n].push(i); }
  			}
  			else { inv[n] = i; }
  		}
      if (n.constructor === Array) { n.forEach(m => { inv[m] = i; }); }
  	});
  	return inv;
  };
  const invert_simple_map = (map) => {
  	const inv = [];
  	map.forEach((n, i) => { inv[n] = i; });
  	return inv;
  };

  var maps = /*#__PURE__*/Object.freeze({
    __proto__: null,
    merge_simple_nextmaps: merge_simple_nextmaps,
    merge_nextmaps: merge_nextmaps,
    merge_simple_backmaps: merge_simple_backmaps,
    merge_backmaps: merge_backmaps,
    invert_map: invert_map,
    invert_simple_map: invert_simple_map
  });

  const up_down_map = { V: 1, v: 1, M: -1, m: -1 };
  const upOrDown = (mv, i) => i % 2 === 0 ? up_down_map[mv] : -up_down_map[mv];
  const between = (arr, i, j) => (i < j) ? arr.slice(i + 1, j) : arr.slice(j + 1, i);
  const get_sectors_layer = (sectors, assignments, epsilon = math.core.EPSILON) => {
    let pointer = 0;
    const fold_location = sectors
      .map((sec, i) => i % 2 === 0 ? sec : -sec)
      .map(move => pointer += move);
    const sector_mins = fold_location
      .map((sec, i, arr) => i % 2 === 0 ? arr[(i + arr.length - 1) % arr.length] : sec)
      .map(n => n + epsilon);
    const sector_maxs = fold_location
      .map((sec, i, arr) => i % 2 === 0 ? sec : arr[(i + arr.length - 1) % arr.length])
      .map(n => n - epsilon);
    const test = (layering) => {
      const index_of_index = [];
      layering.forEach((layer, i) => { index_of_index[layer] = i; });
      const max = layering.length + (layering.length === sectors.length ? 0 : -1);
      for (let i = 0; i < max; i += 1) {
        const j = (i + 1) % layering.length;
        const layers_between = between(layering, index_of_index[i], index_of_index[j]);
        const all_below_min = layers_between
          .map(index => fold_location[i] < sector_mins[index])
          .reduce(fn_and$1, true);
        const all_above_max = layers_between
          .map(index => fold_location[i] > sector_maxs[index])
          .reduce(fn_and$1, true);
        if (!all_below_min && !all_above_max) { return false; }
      }
      return true;
    };
    const final_test = (stack) => {
      const inverted_stack = invert_simple_map(stack);
      const res = inverted_stack[0] > inverted_stack[inverted_stack.length - 1]
        ? assignments[0] === "M"
        : assignments[0] === "V";
      return res;
    };
    const recurse = (stack = [], iter = 0, currentLayer = 0) => {
      stack = stack.slice(0, currentLayer).concat(
        [iter],
        stack.slice(currentLayer, stack.length));
      if (!test(stack)) { return []; }
      if (iter >= sectors.length - 1) {
        return final_test(stack) ? [stack] : [];
      }
      const next_dir = upOrDown(assignments[(iter + 1) % sectors.length], iter);
      const spliceIndices = next_dir === 1
        ? Array.from(Array(stack.length - currentLayer)).map((_, i) => currentLayer + i + 1)
        : Array.from(Array(currentLayer + 1)).map((_, i) => i);
      return spliceIndices
        .map(i => recurse(stack, iter + 1, i))
        .reduce((a, b) => a.concat(b), [])
        .map(invert_simple_map);
    };
    return recurse();
  };

  const layer_solver = (sectors, assignments) => {
  	if (assignments == null) {
  		assignments = sectors.map(() => "U");
  	}
  	const possibilities = maekawa_assignments(assignments);
  	const layers = possibilities.map(assigns => get_sectors_layer(sectors, assigns));
  	return possibilities
  		.map((_, i) => i)
  		.filter(i => layers[i].length > 0)
  		.map(i => ({
  			assignment: possibilities[i],
  			layer: layers[i],
  		}));
  };

  const odd_assignment = (assignments) => {
  	let ms = 0;
  	let vs = 0;
  	for (let i = 0; i < assignments.length; i += 1) {
  		if (assignments[i] === "M" || assignments[i] === "m") { ms += 1; }
  		if (assignments[i] === "V" || assignments[i] === "v") { vs += 1; }
  	}
  	for (let i = 0; i < assignments.length; i += 1) {
  		if (ms > vs && (assignments[i] === "V" || assignments[i] === "v")) { return i; }
  		if (vs > ms && (assignments[i] === "M" || assignments[i] === "m")) { return i; }
  	}
  };
  const single_vertex_fold_angles = (sectors, assignments, t = 0) => {
  	const odd = odd_assignment(assignments);
  	if (odd === undefined) { return; }
  	const a = sectors[(odd + 1) % sectors.length];
  	const b = sectors[(odd + 2) % sectors.length];
  	const pbc = Math.PI * t;
  	const cosE = -Math.cos(a)*Math.cos(b) + Math.sin(a)*Math.sin(b)*Math.cos(Math.PI - pbc);
  	const res = Math.cos(Math.PI - pbc) - ((Math.sin(Math.PI - pbc) ** 2) * Math.sin(a) * Math.sin(b))/(1 - cosE);
  	const pab = -Math.acos(res) + Math.PI;
  	return odd % 2 === 0
  		? [pab, pbc, pab, pbc].map((n, i) => odd === i ? -n : n)
  		: [pbc, pab, pbc, pab].map((n, i) => odd === i ? -n : n);
  };

  const alternating_sum = (numbers) => [0, 1]
    .map(even_odd => numbers
      .filter((_, i) => i % 2 === even_odd)
      .reduce(fn_add$1, 0));
  const alternating_sum_difference = (sectors) => {
    const halfsum = sectors.reduce(fn_add$1, 0) / 2;
    return alternating_sum(sectors).map(s => s - halfsum);
  };
  const kawasaki_solutions_radians = (radians) => radians
    .map((v, i, arr) => [v, arr[(i + 1) % arr.length]])
    .map(pair => math.core.counter_clockwise_angle_radians(...pair))
    .map((_, i, arr) => arr.slice(i + 1, arr.length).concat(arr.slice(0, i)))
    .map(opposite_sectors => alternating_sum(opposite_sectors).map(s => Math.PI - s))
    .map((kawasakis, i) => radians[i] + kawasakis[0])
    .map((angle, i) => (math.core.is_counter_clockwise_between(angle,
      radians[i], radians[(i + 1) % radians.length])
      ? angle
      : undefined));
  const kawasaki_solutions = (vectors) => {
    const vectors_radians = vectors.map(v => Math.atan2(v[1], v[0]));
    return kawasaki_solutions_radians(vectors_radians)
      .map(a => (a === undefined
        ? undefined
        : [Math.cos(a), Math.sin(a)]));
  };

  var kawasaki = /*#__PURE__*/Object.freeze({
    __proto__: null,
    alternating_sum: alternating_sum,
    alternating_sum_difference: alternating_sum_difference,
    kawasaki_solutions_radians: kawasaki_solutions_radians,
    kawasaki_solutions: kawasaki_solutions
  });

  var single = Object.assign(Object.create(null), {
  	maekawa_assignments,
  	sectors_layer: get_sectors_layer,
  	layer_solver,
  	fold_angles4: single_vertex_fold_angles,
  },
  	kawasaki,
  );

  const vertex_degree = function (v, i) {
    const graph = this;
    Object.defineProperty(v, "degree", {
      get: () => (graph.vertices_vertices && graph.vertices_vertices[i]
        ? graph.vertices_vertices[i].length
        : null)
    });
  };
  const edge_coords = function (e, i) {
    const graph = this;
    Object.defineProperty(e, "coords", {
      get: () => {
        if (!graph.edges_vertices
          || !graph.edges_vertices[i]
          || !graph.vertices_coords) {
          return undefined;
        }
        return graph.edges_vertices[i].map(v => graph.vertices_coords[v]);
      }
    });
  };
  const face_simple = function (f, i) {
    const graph = this;
    Object.defineProperty(f, "simple", {
      get: () => {
        if (!graph.faces_vertices || !graph.faces_vertices[i]) { return null; }
        for (let j = 0; j < f.length - 1; j += 1) {
          for (let k = j + 1; k < f.length; k += 1) {
            if (graph.faces_vertices[i][j] === graph.faces_vertices[i][k]) {
              return false;
            }
          }
        }
        return true;
      }
    });
  };
  const face_coords = function (f, i) {
    const graph = this;
    Object.defineProperty(f, "coords", {
      get: () => {
        if (!graph.faces_vertices
          || !graph.faces_vertices[i]
          || !graph.vertices_coords) {
          return undefined;
        }
        return graph.faces_vertices[i].map(v => graph.vertices_coords[v]);
      }
    });
  };
  const setup_vertex = function (v, i) {
    vertex_degree.call(this, v, i);
    return v;
  };
  const setup_edge = function (e, i) {
    edge_coords.call(this, e, i);
    return e;
  };
  const setup_face = function (f, i) {
    face_simple.call(this, f, i);
    face_coords.call(this, f, i);
    return f;
  };
  var setup = {
    vertices: setup_vertex,
    edges: setup_edge,
    faces: setup_face,
  };

  const file_spec = 1.1;
  const file_creator = "Rabbit Ear";
  const fold_keys = {
    file: [
      "file_spec",
      "file_creator",
      "file_author",
      "file_title",
      "file_description",
      "file_classes",
      "file_frames"
    ],
    frame: [
      "frame_author",
      "frame_title",
      "frame_description",
      "frame_attributes",
      "frame_classes",
      "frame_unit",
      "frame_parent",
      "frame_inherit",
    ],
    graph: [
      "vertices_coords",
      "vertices_vertices",
      "vertices_faces",
      "edges_vertices",
      "edges_faces",
      "edges_assignment",
      "edges_foldAngle",
      "edges_length",
      "faces_vertices",
      "faces_edges",
      "vertices_edges",
      "edges_edges",
      "faces_faces"
    ],
    orders: [
      "edgeOrders",
      "faceOrders"
    ],
  };
  const keys = Object.freeze([]
    .concat(fold_keys.file)
    .concat(fold_keys.frame)
    .concat(fold_keys.graph)
    .concat(fold_keys.orders));
  const VERTICES = "vertices";
  const EDGES = "edges";
  const FACES = "faces";
  const VERTICES_COORDS = "vertices_coords";
  const EDGES_ASSIGNMENT = "edges_assignment";
  const EDGES_FOLDANGLE = "edges_foldAngle";
  const singularize = {
    vertices: "vertex",
    edges: "edge",
    faces: "face",
  };

  const edges_assignment_degrees = {
    M: -180,
    m: -180,
    V: 180,
    v: 180,
    B: 0,
    b: 0,
    F: 0,
    f: 0,
    U: 0,
    u: 0
  };
  const edges_assignment_names = {
    M: "mountain",
    m: "mountain",
    V: "valley",
    v: "valley",
    B: "boundary",
    b: "boundary",
    F: "mark",
    f: "mark",
    U: "unassigned",
    u: "unassigned"
  };
  const edge_assignment_to_foldAngle = assignment =>
    edges_assignment_degrees[assignment] || 0;
  const edge_foldAngle_to_assignment = (a) => {
    if (a > 0) { return "V"; }
    if (a < 0) { return "M"; }
    return "U";
  };
  const filter_keys_with_suffix = (graph, suffix) => Object
    .keys(graph)
    .map(s => (s.substring(s.length - suffix.length, s.length) === suffix
      ? s : undefined))
    .filter(str => str !== undefined);
  const filter_keys_with_prefix = (graph, prefix) => Object
    .keys(graph)
    .map(str => (str.substring(0, prefix.length) === prefix
      ? str : undefined))
    .filter(str => str !== undefined);
  const get_graph_keys_with_prefix = (graph, key) =>
    filter_keys_with_prefix(graph, `${key}_`);
  const get_graph_keys_with_suffix = (graph, key) =>
    filter_keys_with_suffix(graph, `_${key}`);
  const transpose_graph_arrays = (graph, geometry_key) => {
    const matching_keys = get_graph_keys_with_prefix(graph, geometry_key);
    if (matching_keys.length === 0) { return []; }
    const len = Math.max(...matching_keys.map(arr => graph[arr].length));
    const geometry = Array.from(Array(len))
      .map(() => ({}));
    matching_keys
      .forEach(key => geometry
        .forEach((o, i) => { geometry[i][key] = graph[key][i]; }));
    return geometry;
  };
  const transpose_graph_array_at_index = function (
    graph,
    geometry_key,
    index
  ) {
    const matching_keys = get_graph_keys_with_prefix(graph, geometry_key);
    if (matching_keys.length === 0) { return undefined; }
    const geometry = {};
    matching_keys.forEach((key) => { geometry[key] = graph[key][index]; });
    return geometry;
  };
  const fold_object_certainty = (object) => {
    if (typeof object !== "object" || object === null) { return 0; }
    return keys.filter(key => object[key]).length;
  };

  var fold_object = /*#__PURE__*/Object.freeze({
    __proto__: null,
    edges_assignment_degrees: edges_assignment_degrees,
    edges_assignment_names: edges_assignment_names,
    edge_assignment_to_foldAngle: edge_assignment_to_foldAngle,
    edge_foldAngle_to_assignment: edge_foldAngle_to_assignment,
    filter_keys_with_suffix: filter_keys_with_suffix,
    filter_keys_with_prefix: filter_keys_with_prefix,
    get_graph_keys_with_prefix: get_graph_keys_with_prefix,
    get_graph_keys_with_suffix: get_graph_keys_with_suffix,
    transpose_graph_arrays: transpose_graph_arrays,
    transpose_graph_array_at_index: transpose_graph_array_at_index,
    fold_object_certainty: fold_object_certainty
  });

  const max_arrays_length = (...arrays) => Math.max(0, ...(arrays
    .filter(el => el !== undefined)
    .map(el => el.length)));
  const count = (graph, key) => max_arrays_length(...get_graph_keys_with_prefix(graph, key).map(key => graph[key]));
  count.vertices = ({ vertices_coords, vertices_faces, vertices_vertices }) =>
    max_arrays_length(vertices_coords, vertices_faces, vertices_vertices);
  count.edges = ({ edges_vertices, edges_edges, edges_faces }) =>
    max_arrays_length(edges_vertices, edges_edges, edges_faces);
  count.faces = ({ faces_vertices, faces_edges, faces_faces }) =>
    max_arrays_length(faces_vertices, faces_edges, faces_faces);

  const unique_sorted_integers = (array) => {
    const keys = {};
    array.forEach((int) => { keys[int] = true; });
    return Object.keys(keys).map(n => parseInt(n)).sort((a, b) => a - b);
  };

  const remove_geometry_indices = (graph, key, removeIndices) => {
    const geometry_array_size = count(graph, key);
    const removes = unique_sorted_integers(removeIndices);
    const index_map = [];
    let i, j, walk;
    for (i = 0, j = 0, walk = 0; i < geometry_array_size; i += 1, j += 1) {
      while (i === removes[walk]) {
  			index_map[i] = undefined;
        i += 1;
        walk += 1;
      }
      if (i < geometry_array_size) { index_map[i] = j; }
    }
    get_graph_keys_with_suffix(graph, key)
      .forEach(sKey => graph[sKey]
        .forEach((_, i) => graph[sKey][i]
          .forEach((v, j) => { graph[sKey][i][j] = index_map[v]; })));
    removes.reverse();
    get_graph_keys_with_prefix(graph, key)
      .forEach((prefix_key) => removes
        .forEach(index => graph[prefix_key]
          .splice(index, 1)));
    return index_map;
  };

  const get_edge_isolated_vertices = ({ vertices_coords, edges_vertices }) => {
    let count = vertices_coords.length;
    const seen = Array(count).fill(false);
    edges_vertices.forEach((ev) => {
      ev.filter(v => !seen[v]).forEach((v) => {
        seen[v] = true;
        count -= 1;
      });
    });
    return seen
      .map((s, i) => (s ? undefined : i))
      .filter(a => a !== undefined);
  };
  const get_face_isolated_vertices = ({ vertices_coords, faces_vertices }) => {
    let count = vertices_coords.length;
    const seen = Array(count).fill(false);
    faces_vertices.forEach((fv) => {
      fv.filter(v => !seen[v]).forEach((v) => {
        seen[v] = true;
        count -= 1;
      });
    });
    return seen
      .map((s, i) => (s ? undefined : i))
      .filter(a => a !== undefined);
  };
  const get_isolated_vertices = ({ vertices_coords, edges_vertices, faces_vertices }) => {
    let count = vertices_coords.length;
    const seen = Array(count).fill(false);
    if (edges_vertices) {
      edges_vertices.forEach((ev) => {
        ev.filter(v => !seen[v]).forEach((v) => {
          seen[v] = true;
          count -= 1;
        });
      });
    }
    if (faces_vertices) {
      faces_vertices.forEach((fv) => {
        fv.filter(v => !seen[v]).forEach((v) => {
          seen[v] = true;
          count -= 1;
        });
      });
    }
    return seen
      .map((s, i) => (s ? undefined : i))
      .filter(a => a !== undefined);
  };

  var vertices_isolated = /*#__PURE__*/Object.freeze({
    __proto__: null,
    get_edge_isolated_vertices: get_edge_isolated_vertices,
    get_face_isolated_vertices: get_face_isolated_vertices,
    get_isolated_vertices: get_isolated_vertices
  });

  const get_circular_edges = ({ edges_vertices }) => {
    const circular = [];
    for (let i = 0; i < edges_vertices.length; i += 1) {
      if (edges_vertices[i][0] === edges_vertices[i][1]) {
        circular.push(i);
      }
    }
    return circular;
  };

  const get_duplicate_edges = ({ edges_vertices }) => {
    if (!edges_vertices) { return []; }
    const duplicates = [];
    const map = {};
    for (let i = 0; i < edges_vertices.length; i += 1) {
      const a = `${edges_vertices[i][0]} ${edges_vertices[i][1]}`;
      const b = `${edges_vertices[i][1]} ${edges_vertices[i][0]}`;
      if (map[a] !== undefined) {
        duplicates[i] = map[a];
      } else {
        map[a] = i;
        map[b] = i;
      }
    }
    return duplicates;
  };

  const are_vertices_equivalent = (a, b, epsilon = math.core.EPSILON) => {
    const degree = a.length;
    for (let i = 0; i < degree; i += 1) {
      if (Math.abs(a[i] - b[i]) > epsilon) {
        return false;
      }
    }
    return true;
  };
  const get_duplicate_vertices = ({ vertices_coords }, epsilon = math.core.EPSILON) => {
    const equivalent_matrix = vertices_coords.map(() => []);
    for (let i = 0; i < vertices_coords.length - 1; i += 1) {
      for (let j = i + 1; j < vertices_coords.length; j += 1) {
        equivalent_matrix[i][j] = are_vertices_equivalent(
          vertices_coords[i],
          vertices_coords[j],
          epsilon
        );
      }
    }
    const vertices_equivalent = equivalent_matrix
      .map(equiv => equiv
        .map((el, j) => (el ? j : undefined))
        .filter(a => a !== undefined));
    const clusters = [];
    const visited = Array(vertices_coords.length).fill(false);
    let visitedCount = 0;
    const recurse = (cluster_index, i) => {
      if (visited[i] || visitedCount === vertices_coords.length) { return; }
      visited[i] = true;
      visitedCount += 1;
      if (!clusters[cluster_index]) { clusters[cluster_index] = []; }
      clusters[cluster_index].push(i);
      while (vertices_equivalent[i].length > 0) {
        recurse(cluster_index, vertices_equivalent[i][0]);
        vertices_equivalent[i].splice(0, 1);
      }
    };
    for (let i = 0; i < vertices_coords.length; i += 1) {
      recurse(i, i);
      if (visitedCount === vertices_coords.length) { break; }
    }
    return clusters.filter(a => a.length);
  };

  const remove_isolated_vertices = graph => {
    const remove_indices = get_isolated_vertices(graph);
    return {
      map: remove_geometry_indices(graph, VERTICES, remove_indices),
      remove: remove_indices,
    };
  };
  const remove_circular_edges = graph => {
    const remove_indices = get_circular_edges(graph);
    if (remove_indices.length) {
      const quick_lookup = {};
      remove_indices.forEach(n => { quick_lookup[n] = true; });
      get_graph_keys_with_suffix(graph, EDGES)
        .forEach(sKey => graph[sKey]
          .forEach((elem, i) => {
            for (let j = elem.length - 1; j >= 0; j -= 1) {
              if (quick_lookup[elem[j]] === true) {
                graph[sKey][i].splice(j, 1);
              }
            }
          }));
    }
    return {
      map: remove_geometry_indices(graph, EDGES, remove_indices),
      remove: remove_indices,
    };
  };
  const remove_duplicate_edges = (graph) => {
    const duplicates = get_duplicate_edges(graph);
    const remove_indices = Object.keys(duplicates);
    const map = remove_geometry_indices(graph, EDGES, remove_indices);
    duplicates.forEach((v, i) => { map[i] = v; });
    return {
      map,
      remove: remove_indices,
    };
  };
  const remove_duplicate_vertices = (graph, epsilon = math.core.EPSILON) => {
    const clusters = get_duplicate_vertices(graph, epsilon);
    const map = [];
    clusters.forEach((verts, i) => verts.forEach(v => { map[v] = i; }));
    graph.vertices_coords = clusters
      .map(arr => arr.map(i => graph.vertices_coords[i]))
      .map(arr => math.core.average(...arr));
    get_graph_keys_with_suffix(graph, VERTICES)
      .forEach(sKey => graph[sKey]
        .forEach((_, i) => graph[sKey][i]
          .forEach((v, j) => { graph[sKey][i][j] = map[v]; })));
    get_graph_keys_with_prefix(graph, VERTICES)
      .filter(a => a !== VERTICES_COORDS)
      .forEach(key => delete graph[key]);
    const remove_indices = clusters
      .map(cluster => cluster.length > 1 ? cluster.slice(1, cluster.length) : undefined)
      .filter(a => a !== undefined)
      .reduce((a, b) => a.concat(b), []);
    return {
      map,
      remove: remove_indices,
    };
  };

  var remove_methods = /*#__PURE__*/Object.freeze({
    __proto__: null,
    remove_isolated_vertices: remove_isolated_vertices,
    remove_circular_edges: remove_circular_edges,
    remove_duplicate_edges: remove_duplicate_edges,
    remove_duplicate_vertices: remove_duplicate_vertices
  });

  const clean = (graph, options = {}) => {
    if (typeof options !== "object" || options.edges !== false) {
      remove_circular_edges(graph);
      remove_duplicate_edges(graph);
    }
    if (typeof options === "object" && options.vertices === true) {
      remove_isolated_vertices(graph);
    }
    return graph;
  };

  const max_num_in_array_in_arrays = (arrays) => {
    let max = -1;
    arrays
      .filter(a => a !== undefined)
      .forEach(arr => arr
        .forEach(el => el
          .forEach((e) => {
            if (e > max) { max = e; }
          })));
    return max;
  };
  const max_num_in_orders = (array) => {
    let max = -1;
    array.forEach(el => {
      if (el[0] > max) { max = el[0]; }
      if (el[1] > max) { max = el[1]; }
    });
    return max;
  };
  const implied_count = (graph, key, ordersKey) => Math.max(
    max_num_in_array_in_arrays(
      get_graph_keys_with_suffix(graph, key).map(str => graph[str])
    ),
    graph[ordersKey] ? max_num_in_orders(graph[ordersKey]) : -1,
  ) + 1;
  implied_count.vertices = graph => implied_count(graph, "vertices");
  implied_count.edges = graph => implied_count(graph, "edges", "edgeOrders");
  implied_count.faces = graph => implied_count(graph, "faces", "faceOrders");

  const counter_clockwise_walk = ({ vertices_vertices, vertices_sectors }, v0, v1, walked_edges = {}) => {
    const this_walked_edges = {};
    const face = { vertices: [v0], edges: [], angles: [] };
    let prev_vertex = v0;
    let this_vertex = v1;
    while (true) {
      const v_v = vertices_vertices[this_vertex];
      const from_neighbor_i = v_v.indexOf(prev_vertex);
      const next_neighbor_i = (from_neighbor_i + v_v.length - 1) % v_v.length;
      const next_vertex = v_v[next_neighbor_i];
      const next_edge_vertices = `${this_vertex} ${next_vertex}`;
      if (this_walked_edges[next_edge_vertices]) {
        Object.assign(walked_edges, this_walked_edges);
        face.vertices.pop();
        return face;
      }
      this_walked_edges[next_edge_vertices] = true;
      if (walked_edges[next_edge_vertices]) {
        return undefined;
      }
      face.vertices.push(this_vertex);
      face.edges.push(next_edge_vertices);
      face.angles.push(vertices_sectors[this_vertex][next_neighbor_i]);
      prev_vertex = this_vertex;
      this_vertex = next_vertex;
    }
  };
  const planar_vertex_walk = ({ vertices_vertices, vertices_sectors }) => {
    const graph = { vertices_vertices, vertices_sectors };
    const walked_edges = {};
    return vertices_vertices
      .map((adj_verts, v) => adj_verts
        .map(adj_vert => counter_clockwise_walk(graph, v, adj_vert, walked_edges))
        .filter(a => a !== undefined))
      .reduce((a, b) => a.concat(b), [])
  };

  var walk = /*#__PURE__*/Object.freeze({
    __proto__: null,
    planar_vertex_walk: planar_vertex_walk
  });

  const sort_vertices_counter_clockwise = ({ vertices_coords }, vertices, vertex) =>
    vertices
      .map(v => vertices_coords[v])
      .map(coord => math.core.subtract(coord, vertices_coords[vertex]))
      .map(vec => Math.atan2(vec[1], vec[0]))
      .map(angle => angle > -math.core.EPSILON ? angle : angle + Math.PI * 2)
      .map((a, i) => ({a, i}))
      .sort((a, b) => a.a - b.a)
      .map(el => el.i)
      .map(i => vertices[i]);
  const sort_vertices_along_vector = ({ vertices_coords }, vertices, vector) =>
    vertices
      .map(i => ({ i, d: math.core.dot(vertices_coords[i], vector) }))
      .sort((a, b) => a.d - b.d)
      .map(a => a.i);

  var sort$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    sort_vertices_counter_clockwise: sort_vertices_counter_clockwise,
    sort_vertices_along_vector: sort_vertices_along_vector
  });

  const make_vertices_edges = ({ edges_vertices }) => {
    const vertices_edges = [];
    edges_vertices.forEach((ev, i) => ev
      .forEach((v) => {
        if (vertices_edges[v] === undefined) {
          vertices_edges[v] = [];
        }
        vertices_edges[v].push(i);
      }));
    return vertices_edges;
  };
  const make_vertices_edges_sorted = ({ edges_vertices, vertices_vertices }) => {
    const edge_map = make_vertices_to_edge_bidirectional({ edges_vertices });
    return vertices_vertices
      .map((verts, i) => verts
        .map(v => edge_map[`${i} ${v}`]))
  };
  const make_vertices_vertices = ({ vertices_coords, vertices_edges, edges_vertices }) => {
    if (!vertices_edges) {
      vertices_edges = make_vertices_edges({ edges_vertices });
    }
    const vertices_vertices = vertices_edges
      .map((edges, v) => edges
        .map(edge => edges_vertices[edge]
          .filter(i => i !== v))
        .reduce((a, b) => a.concat(b), []));
    return vertices_coords === undefined
      ? vertices_vertices
      : vertices_vertices
        .map((verts, i) => sort_vertices_counter_clockwise({ vertices_coords }, verts, i));
  };
  const make_vertices_faces = ({ faces_vertices }) => {
    const vertices_faces = Array
      .from(Array(implied_count.vertices({ faces_vertices })))
      .map(() => []);
    faces_vertices.forEach((face, f) => {
      const hash = [];
      face.forEach((vertex) => { hash[vertex] = f; });
      hash.forEach((fa, v) => vertices_faces[v].push(fa));
    });
    return vertices_faces;
  };
  const make_vertices_faces_sorted = ({ vertices_vertices, faces_vertices }) => {
    const face_map = make_vertices_to_face({ faces_vertices });
    return vertices_vertices
      .map((verts, v) => verts
        .map((vert, i, arr) => [arr[(i + 1) % arr.length], v, vert]
          .join(" ")))
      .map(keys => keys
        .map(key => face_map[key])
        .filter(a => a !== undefined));
  };
  const make_vertices_to_edge_bidirectional = ({ edges_vertices }) => {
    const map = {};
    edges_vertices
      .map(ev => ev.join(" "))
      .forEach((key, i) => { map[key] = i; });
    edges_vertices
      .map(ev => `${ev[1]} ${ev[0]}`)
      .forEach((key, i) => { map[key] = i; });
    return map;
  };
  const make_vertices_to_edge = ({ edges_vertices }) => {
    const map = {};
    edges_vertices
      .map(ev => ev.join(" "))
      .forEach((key, i) => { map[key] = i; });
    return map;
  };
  const make_vertices_to_face = ({ faces_vertices }) => {
    const map = {};
    faces_vertices
      .forEach((face, f) => face
        .map((_, i) => [0, 1, 2]
          .map(j => (i + j) % face.length)
          .map(i => face[i])
          .join(" "))
        .forEach(key => { map[key] = f; }));
    return map;
  };
  const make_vertices_vertices_vector = ({ vertices_coords, vertices_vertices, edges_vertices, edges_vector }) => {
    if (!edges_vector) {
      edges_vector = make_edges_vector({ vertices_coords, edges_vertices });
    }
    const edge_map = make_vertices_to_edge({ edges_vertices });
    return vertices_vertices
      .map((_, a) => vertices_vertices[a]
        .map((b) => {
          const edge_a = edge_map[`${a} ${b}`];
          const edge_b = edge_map[`${b} ${a}`];
          if (edge_a !== undefined) { return edges_vector[edge_a]; }
          if (edge_b !== undefined) { return math.core.flip(edges_vector[edge_b]); }
        }));
  };
  const make_vertices_sectors = ({ vertices_coords, vertices_vertices, edges_vertices, edges_vector }) =>
    make_vertices_vertices_vector({ vertices_coords, vertices_vertices, edges_vertices, edges_vector })
      .map(vectors => vectors.length === 1
        ? [math.core.TWO_PI]
        : math.core.counter_clockwise_sectors2(vectors));
  const make_vertices_coords_folded$1 = ({ vertices_coords, vertices_faces, edges_vertices, edges_foldAngle, edges_assignment, faces_vertices, faces_faces, faces_matrix }, root_face) => {
    if (!faces_matrix || root_face !== undefined) {
      faces_matrix = make_faces_matrix({ vertices_coords, edges_vertices, edges_foldAngle, edges_assignment, faces_vertices, faces_faces }, root_face);
    }
    if (!vertices_faces) {
      vertices_faces = make_vertices_faces({ faces_vertices });
    }
    const vertices_matrix = vertices_faces
      .map(faces => faces[0])
      .map(face => face === undefined ? math.core.identity3x4 : faces_matrix[face]);
    return vertices_coords
      .map(coord => math.core.resize(3, coord))
      .map((coord, i) => math.core.multiply_matrix3_vector3(vertices_matrix[i], coord));
  };
  const make_edges_edges = ({ edges_vertices, vertices_edges }) =>
    edges_vertices.map((verts, i) => {
      const side0 = vertices_edges[verts[0]].filter(e => e !== i);
      const side1 = vertices_edges[verts[1]].filter(e => e !== i);
      return side0.concat(side1);
    });
  const make_edges_faces = ({ faces_edges }) => {
    const edges_faces = Array
      .from(Array(implied_count.edges({ faces_edges })))
      .map(() => []);
    faces_edges.forEach((face, f) => {
      const hash = [];
      face.forEach((edge) => { hash[edge] = f; });
      hash.forEach((fa, e) => edges_faces[e].push(fa));
    });
    return edges_faces;
  };
  const assignment_angles = { M: -180, m: -180, V: 180, v: 180 };
  const make_edges_foldAngle = ({ edges_assignment }) => edges_assignment
    .map(a => assignment_angles[a] || 0);
  const make_edges_assignment = ({ edges_foldAngle }) => edges_foldAngle
    .map(a => {
      if (a === 0) { return "F"; }
      return a < 0 ? "M" : "V";
    });
  const make_edges_coords = ({ vertices_coords, edges_vertices }) =>
    edges_vertices
      .map(ev => ev.map(v => vertices_coords[v]));
  const make_edges_vector = ({ vertices_coords, edges_vertices }) =>
    make_edges_coords({ vertices_coords, edges_vertices })
      .map(verts => math.core.subtract(verts[1], verts[0]));
  const make_edges_length = ({ vertices_coords, edges_vertices }) =>
    make_edges_vector({ vertices_coords, edges_vertices })
      .map(vec => math.core.magnitude(vec));
  const make_edges_coords_min_max = ({ vertices_coords, edges_vertices, edges_coords }) => {
    if (!edges_coords) {
      edges_coords = make_edges_coords({ vertices_coords, edges_vertices });
    }
    return edges_coords.map(coords => {
      const mins = coords[0].map(() => Infinity);
      const maxs = coords[0].map(() => -Infinity);
      coords.forEach(coord => coord.forEach((n, i) => {
        if (n < mins[i]) { mins[i] = n; }
        if (n > maxs[i]) { maxs[i] = n; }
      }));
      return [mins, maxs];
    });
  };
  const make_edges_coords_min_max_exclusive = (graph, epsilon = math.core.EPSILON) => {
    const ep = [+epsilon, -epsilon];
    return make_edges_coords_min_max(graph)
      .map(min_max => min_max
        .map((vec, i) => vec
          .map(n => n + ep[i])));
  };
  const make_edges_coords_min_max_inclusive = (graph, epsilon = math.core.EPSILON) => {
    const ep = [-epsilon, +epsilon];
    return make_edges_coords_min_max(graph)
      .map(min_max => min_max
        .map((vec, i) => vec
          .map(n => n + ep[i])));
  };
  const make_planar_faces = ({ vertices_coords, vertices_vertices, vertices_edges, vertices_sectors, edges_vertices, edges_vector }) => {
    if (!vertices_vertices) {
      vertices_vertices = make_vertices_vertices({ vertices_coords, edges_vertices, vertices_edges });
    }
    if (!vertices_sectors) {
      vertices_sectors = make_vertices_sectors({ vertices_coords, vertices_vertices, edges_vertices, edges_vector });
    }
    const vertices_edges_map = make_vertices_to_edge_bidirectional({ edges_vertices });
    return planar_vertex_walk({ vertices_vertices, vertices_sectors })
      .map(f => ({ ...f, edges: f.edges.map(e => vertices_edges_map[e]) }))
      .filter(face => face.angles
        .map(a => Math.PI - a)
        .reduce((a,b) => a + b, 0) > 0);
  };
  const make_faces_vertices = graph => make_planar_faces(graph)
    .map(face => face.vertices);
  const make_faces_edges = graph => make_planar_faces(graph)
    .map(face => face.edges);
  const make_faces_faces = ({ faces_vertices }) => {
    const faces_faces = faces_vertices.map(() => []);
    const edgeMap = {};
    faces_vertices.forEach((vertices_index, idx1) => {
      const n = vertices_index.length;
      vertices_index.forEach((v1, i, vs) => {
        let v2 = vs[(i + 1) % n];
        if (v2 < v1) { [v1, v2] = [v2, v1]; }
        const key = `${v1} ${v2}`;
        if (key in edgeMap) {
          const idx2 = edgeMap[key];
          faces_faces[idx1].push(idx2);
          faces_faces[idx2].push(idx1);
        } else {
          edgeMap[key] = idx1;
        }
      });
    });
    return faces_faces;
  };
  const get_face_face_shared_vertices = (face_a_vertices, face_b_vertices) => {
    const hash = {};
    face_b_vertices.forEach((v) => { hash[v] = true; });
    const match = face_a_vertices.map(v => hash[v] ? true : false);
    const shared_vertices = [];
    const notShared = match.indexOf(false);
    for (let i = notShared + 1; i < match.length; i += 1) {
      if (match[i]) { shared_vertices.push(face_a_vertices[i]); }
    }
    for (let i = 0; i < notShared; i += 1) {
      if (match[i]) { shared_vertices.push(face_a_vertices[i]); }
    }
    return shared_vertices;
  };
  const make_face_spanning_tree = ({ faces_vertices, faces_faces }, root_face = 0) => {
    if (!faces_faces) {
      faces_faces = make_faces_faces({ faces_vertices });
    }
    if (faces_faces.length === 0) { return []; }
    const tree = [[{ face: root_face }]];
    const visited_faces = {};
    visited_faces[root_face] = true;
    do {
      const next_level_with_duplicates = tree[tree.length - 1]
        .map(current => faces_faces[current.face]
          .map(face => ({ face, parent: current.face })))
        .reduce((a, b) => a.concat(b), []);
      const dup_indices = {};
      next_level_with_duplicates.forEach((el, i) => {
        if (visited_faces[el.face]) { dup_indices[i] = true; }
        visited_faces[el.face] = true;
      });
      const next_level = next_level_with_duplicates
        .filter((_, i) => !dup_indices[i]);
      next_level
        .map(el => get_face_face_shared_vertices(
          faces_vertices[el.face],
          faces_vertices[el.parent]
        )).forEach((ev, i) => {
          next_level[i].edge_vertices = ev.slice(0, 2);
        });
      tree[tree.length] = next_level;
    } while (tree[tree.length - 1].length > 0);
    if (tree.length > 0 && tree[tree.length - 1].length === 0) {
      tree.pop();
    }
    return tree;
  };
  const make_faces_matrix = ({ vertices_coords, edges_vertices, edges_foldAngle, edges_assignment, faces_vertices, faces_faces }, root_face = 0) => {
    if (!edges_foldAngle) {
      if (edges_assignment) {
        edges_foldAngle = make_edges_foldAngle({ edges_assignment });
      } else {
        edges_foldAngle = Array(edges_vertices.length).fill(0);
      }
    }
    const edge_map = make_vertices_to_edge_bidirectional({ edges_vertices });
    const faces_matrix = faces_vertices.map(() => math.core.identity3x4);
    make_face_spanning_tree({ faces_vertices, faces_faces }, root_face)
      .slice(1)
      .forEach(level => level
        .forEach((entry) => {
          const verts = entry.edge_vertices.map(v => vertices_coords[v]);
          const edgeKey = entry.edge_vertices.join(" ");
          const edge = edge_map[edgeKey];
          const local_matrix = math.core.make_matrix3_rotate(
            edges_foldAngle[edge] * Math.PI / 180,
            math.core.subtract(...math.core.resize_up(verts[1], verts[0])),
            verts[0],
          );
          faces_matrix[entry.face] = math.core
            .multiply_matrices3(faces_matrix[entry.parent], local_matrix);
        }));
    return faces_matrix;
  };
  const make_faces_center = ({ vertices_coords, faces_vertices }) => faces_vertices
    .map(fv => fv.map(v => vertices_coords[v]))
    .map(coords => math.core.centroid(coords));
  const make_faces_coloring_from_matrix = ({ faces_matrix }) => faces_matrix
    .map(m => m[0] * m[4] - m[1] * m[3])
    .map(c => c >= 0);
  const make_faces_coloring = function ({ faces_vertices, faces_faces }, root_face = 0) {
    const coloring = [];
    coloring[root_face] = true;
    make_face_spanning_tree({ faces_vertices, faces_faces }, root_face)
      .forEach((level, i) => level
        .forEach((entry) => { coloring[entry.face] = (i % 2 === 0); }));
    return coloring;
  };

  var make = /*#__PURE__*/Object.freeze({
    __proto__: null,
    make_vertices_edges: make_vertices_edges,
    make_vertices_edges_sorted: make_vertices_edges_sorted,
    make_vertices_vertices: make_vertices_vertices,
    make_vertices_faces: make_vertices_faces,
    make_vertices_faces_sorted: make_vertices_faces_sorted,
    make_vertices_to_edge_bidirectional: make_vertices_to_edge_bidirectional,
    make_vertices_to_edge: make_vertices_to_edge,
    make_vertices_to_face: make_vertices_to_face,
    make_vertices_vertices_vector: make_vertices_vertices_vector,
    make_vertices_sectors: make_vertices_sectors,
    make_vertices_coords_folded: make_vertices_coords_folded$1,
    make_edges_edges: make_edges_edges,
    make_edges_faces: make_edges_faces,
    make_edges_foldAngle: make_edges_foldAngle,
    make_edges_assignment: make_edges_assignment,
    make_edges_coords: make_edges_coords,
    make_edges_vector: make_edges_vector,
    make_edges_length: make_edges_length,
    make_edges_coords_min_max: make_edges_coords_min_max,
    make_edges_coords_min_max_exclusive: make_edges_coords_min_max_exclusive,
    make_edges_coords_min_max_inclusive: make_edges_coords_min_max_inclusive,
    make_planar_faces: make_planar_faces,
    make_faces_vertices: make_faces_vertices,
    make_faces_edges: make_faces_edges,
    make_faces_faces: make_faces_faces,
    get_face_face_shared_vertices: get_face_face_shared_vertices,
    make_face_spanning_tree: make_face_spanning_tree,
    make_faces_matrix: make_faces_matrix,
    make_faces_center: make_faces_center,
    make_faces_coloring_from_matrix: make_faces_coloring_from_matrix,
    make_faces_coloring: make_faces_coloring
  });

  const set_edges_angles = (graph) => {
    const len = graph.edges_vertices.length;
    if (!graph.edges_assignment) { graph.edges_assignment = []; }
    if (!graph.edges_foldAngle) { graph.edges_foldAngle = []; }
    if (graph.edges_assignment.length > graph.edges_foldAngle.length) {
      for (let i = graph.edges_foldAngle.length; i < graph.edges_assignment.length; i += 1) {
        graph.edges_foldAngle[i] = edge_assignment_to_foldAngle(graph.edges_assignment[i]);
      }
    }
    if (graph.edges_foldAngle.length > graph.edges_assignment.length) {
      for (let i = graph.edges_assignment.length; i < graph.edges_foldAngle.length; i += 1) {
        graph.edges_assignment[i] = edge_foldAngle_to_assignment(graph.edges_foldAngle[i]);
      }
    }
    for (let i = graph.edges_assignment.length; i < len; i += 1) {
      graph.edges_assignment[i] = "U";
      graph.edges_foldAngle[i] = 0;
    }
  };
  const populate = (graph) => {
    if (typeof graph !== "object") { return; }
    if (!graph.edges_vertices) { return; }
    graph.vertices_edges = make_vertices_edges(graph);
    graph.vertices_vertices = make_vertices_vertices(graph);
    graph.vertices_edges = make_vertices_edges_sorted(graph);
    if (graph.vertices_coords) {
      graph.edges_vector = make_edges_vector(graph);
      graph.vertices_sectors = make_vertices_sectors(graph);
    }
    set_edges_angles(graph);
    if (graph.vertices_coords) {
      const faces = make_planar_faces(graph);
      graph.faces_vertices = faces.map(face => face.vertices);
      graph.faces_edges = faces.map(face => face.edges);
      graph.faces_angles = faces.map(face => face.angles);
    } else {
      graph.faces_vertices = [];
      graph.faces_edges = [];
    }
    graph.vertices_faces = graph.vertices_vertices
      ? make_vertices_faces_sorted(graph)
      : make_vertices_faces(graph);
    graph.edges_faces = make_edges_faces(graph);
    graph.faces_faces = make_faces_faces(graph);
    if (graph.vertices_coords) {
      graph.faces_matrix = make_faces_matrix(graph);
    }
    return graph;
  };

  const get_edges_vertices_span = (graph, epsilon = math.core.EPSILON) =>
    make_edges_coords_min_max_inclusive(graph)
      .map((min_max, e) => graph.vertices_coords
        .map((vert, v) => (
          vert[0] > min_max[0][0] - epsilon &&
          vert[1] > min_max[0][1] - epsilon &&
          vert[0] < min_max[1][0] + epsilon &&
          vert[1] < min_max[1][1] + epsilon)));
  const get_edges_edges_span = ({ vertices_coords, edges_vertices, edges_coords }, epsilon = math.core.EPSILON) => {
    const min_max = make_edges_coords_min_max_inclusive({ vertices_coords, edges_vertices, edges_coords }, epsilon);
    const span_overlaps = edges_vertices.map(() => []);
    for (let e0 = 0; e0 < edges_vertices.length - 1; e0 += 1) {
      for (let e1 = e0 + 1; e1 < edges_vertices.length; e1 += 1) {
        const outside_of =
          (min_max[e0][1][0] < min_max[e1][0][0] || min_max[e1][1][0] < min_max[e0][0][0])
        &&(min_max[e0][1][1] < min_max[e1][0][1] || min_max[e1][1][1] < min_max[e0][0][1]);
        span_overlaps[e0][e1] = !outside_of;
        span_overlaps[e1][e0] = !outside_of;
      }
    }
    for (let i = 0; i < edges_vertices.length; i += 1) {
      span_overlaps[i][i] = true;
    }
    return span_overlaps;
  };

  var span = /*#__PURE__*/Object.freeze({
    __proto__: null,
    get_edges_vertices_span: get_edges_vertices_span,
    get_edges_edges_span: get_edges_edges_span
  });

  const get_collinear_vertices = ({ vertices_coords, edges_vertices, edges_coords }, epsilon = math.core.EPSILON) => {
    if (!edges_coords) {
      edges_coords = edges_vertices.map(ev => ev.map(v => vertices_coords[v]));
    }
    const edges_span_vertices = get_edges_vertices_span({
      vertices_coords, edges_vertices, edges_coords
    }, epsilon);
    for (let e = 0; e < edges_coords.length; e += 1) {
      for (let v = 0; v < vertices_coords.length; v += 1) {
        if (!edges_span_vertices[e][v]) { continue; }
        edges_span_vertices[e][v] = math.core.overlap_line_point(
          math.core.subtract(edges_coords[e][1], edges_coords[e][0]),
          edges_coords[e][0],
          vertices_coords[v],
          math.core.exclude_s,
          epsilon
        );
      }
    }
    return edges_span_vertices
      .map(verts => verts
        .map((vert, i) => vert ? i : undefined)
        .filter(i => i !== undefined));
  };

  const get_edges_edges_intersections = function ({
    vertices_coords, edges_vertices, edges_vector, edges_origin
  }, epsilon = math.core.EPSILON) {
    if (!edges_vector) {
      edges_vector = make_edges_vector({ vertices_coords, edges_vertices });
    }
    if (!edges_origin) {
      edges_origin = edges_vertices.map(ev => vertices_coords[ev[0]]);
    }
    const edges_intersections = edges_vector.map(() => []);
    const span = get_edges_edges_span({ vertices_coords, edges_vertices }, epsilon);
    for (let i = 0; i < edges_vector.length - 1; i += 1) {
      for (let j = i + 1; j < edges_vector.length; j += 1) {
        if (span[i][j] !== true) {
          edges_intersections[i][j] = undefined;
          continue;
        }
        edges_intersections[i][j] = math.core.intersect_line_line(
          edges_vector[i],
          edges_origin[i],
          edges_vector[j],
          edges_origin[j],
          math.core.exclude_s,
          math.core.exclude_s,
          epsilon
        );
        edges_intersections[j][i] = edges_intersections[i][j];
      }
    }
    return edges_intersections;
  };

  const fragment_graph = (graph, epsilon = math.core.EPSILON) => {
    const edges_coords = graph.edges_vertices
      .map(ev => ev.map(v => graph.vertices_coords[v]));
    const edges_vector = edges_coords.map(e => math.core.subtract(e[1], e[0]));
    const edges_origin = edges_coords.map(e => e[0]);
    const edges_intersections = get_edges_edges_intersections({
      vertices_coords: graph.vertices_coords,
      edges_vertices: graph.edges_vertices,
      edges_vector,
      edges_origin
    }, 1e-6);
    const edges_collinear_vertices = get_collinear_vertices({
      vertices_coords: graph.vertices_coords,
      edges_vertices: graph.edges_vertices,
      edges_coords
    }, epsilon);
    if (edges_intersections.reduce(fn_cat$1, []).filter(fn_def).length === 0 &&
    edges_collinear_vertices.reduce(fn_cat$1, []).filter(fn_def).length === 0) {
      return;
    }
    const counts = { vertices: graph.vertices_coords.length };
    edges_intersections
      .forEach(edge => edge
        .filter(fn_def)
        .filter(a => a.length === 2)
        .forEach((intersect) => {
          const newIndex = graph.vertices_coords.length;
          graph.vertices_coords.push([...intersect]);
          intersect.splice(0, 2);
          intersect.push(newIndex);
        }));
    edges_intersections.forEach((edge, i) => {
      edge.forEach((intersect, j) => {
        if (intersect) {
          edges_intersections[i][j] = intersect[0];
        }
      });
    });
    const edges_intersections_flat = edges_intersections
      .map(arr => arr.filter(fn_def));
    graph.edges_vertices.forEach((verts, i) => verts
      .push(...edges_intersections_flat[i], ...edges_collinear_vertices[i]));
    graph.edges_vertices.forEach((edge, i) => {
      graph.edges_vertices[i] = sort_vertices_along_vector({
        vertices_coords: graph.vertices_coords
      }, edge, edges_vector[i]);
    });
    const edge_map = graph.edges_vertices
      .map((edge, i) => Array(edge.length - 1).fill(i))
      .reduce(fn_cat$1, []);
    graph.edges_vertices = graph.edges_vertices
      .map(edge => Array.from(Array(edge.length - 1))
        .map((_, i, arr) => [edge[i], edge[i + 1]]))
      .reduce(fn_cat$1, []);
  	if (graph.edges_assignment && graph.edges_foldAngle
  		&& graph.edges_foldAngle.length > graph.edges_assignment.length) {
  		for (let i = graph.edges_assignment.length; i < graph.edges_foldAngle.length; i += 1) {
  			graph.edges_assignment[i] = edge_foldAngle_to_assignment(graph.edges_foldAngle[i]);
  		}
  	}
    if (graph.edges_assignment) {
      graph.edges_assignment = edge_map.map(i => graph.edges_assignment[i] || "U");
    }
    if (graph.edges_foldAngle) {
      graph.edges_foldAngle = edge_map
  			.map(i => graph.edges_foldAngle[i])
  			.map((a, i) => a === undefined
  				? edge_assignment_to_foldAngle(graph.edges_assignment[i])
  				: a);
    }
    return {
      vertices: {
        new: Array.from(Array(graph.vertices_coords.length - counts.vertices))
          .map((_, i) => counts.vertices + i),
      },
      edges: {
        backmap: edge_map
      }
    };
  };
  const fragment_keep_keys = [
    "vertices_coords",
    "edges_vertices",
    "edges_assignment",
    "edges_foldAngle",
  ];
  const fragment = (graph, epsilon = math.core.EPSILON) => {
    graph.vertices_coords = graph.vertices_coords.map(coord => coord.slice(0, 2));
    [VERTICES, EDGES, FACES]
      .map(key => get_graph_keys_with_prefix(graph, key))
      .reduce(fn_cat$1, [])
      .filter(key => !(fragment_keep_keys.includes(key)))
      .forEach(key => delete graph[key]);
    const change = {
  		vertices: {},
  		edges: {},
  	};
  	let i;
  	for (i = 0; i < 20; i++) {
    	const resVert = remove_duplicate_vertices(graph, epsilon / 2);
    	const resEdgeDup = remove_duplicate_edges(graph);
    	const resEdgeCirc = remove_circular_edges(graph);
    	const resFrag = fragment_graph(graph, epsilon);
    	if (resFrag === undefined) {
  			change.vertices.map = (change.vertices.map === undefined
  				? resVert.map
  				: merge_nextmaps(change.vertices.map, resVert.map));
  			change.edges.map = (change.edges.map === undefined
  				? merge_nextmaps(resEdgeDup.map, resEdgeCirc.map)
  				: merge_nextmaps(change.edges.map, resEdgeDup.map, resEdgeCirc.map));
  			break;
  		}
    	const invert_frag = invert_map(resFrag.edges.backmap);
    	const edgemap = merge_nextmaps(resEdgeDup.map, resEdgeCirc.map, invert_frag);
  		change.vertices.map = (change.vertices.map === undefined
  			? resVert.map
  			: merge_nextmaps(change.vertices.map, resVert.map));
  		change.edges.map = (change.edges.map === undefined
  			? edgemap
  			: merge_nextmaps(change.edges.map, edgemap));
  	}
  	if (i === 20) {
      console.warn("debug warning. fragment reached max iterations");
    }
    return change;
  };

  const add_vertices = (graph, vertices_coords, epsilon = math.core.EPSILON) => {
    if (!graph.vertices_coords) { graph.vertices_coords = []; }
    if (typeof vertices_coords[0] === "number") { vertices_coords = [vertices_coords]; }
    const vertices_equivalent_vertices = vertices_coords
      .map(vertex => graph.vertices_coords
        .map(v => math.core.distance(v, vertex) < epsilon)
        .map((on_vertex, i) => on_vertex ? i : undefined)
        .filter(a => a !== undefined)
        .shift());
    let index = graph.vertices_coords.length;
    const unique_vertices = vertices_coords
      .filter((vert, i) => vertices_equivalent_vertices[i] === undefined);
    graph.vertices_coords.push(...unique_vertices);
    return vertices_equivalent_vertices
      .map(el => el === undefined ? index++ : el);
  };

  const vef = ["vertices", "edges", "faces"];
  const make_vertices_map_and_consider_duplicates = (target, source, epsilon = math.core.EPSILON) => {
    let index = target.vertices_coords.length;
    return source.vertices_coords
      .map(vertex => target.vertices_coords
        .map(v => math.core.distance(v, vertex) < epsilon)
        .map((on_vertex, i) => on_vertex ? i : undefined)
        .filter(a => a !== undefined)
        .shift())
      .map(el => el === undefined ? index++ : el);
  };
  const get_edges_duplicate_from_source_in_target = (target, source) => {
    const source_duplicates = {};
    const target_map = {};
    for (let i = 0; i < target.edges_vertices.length; i += 1) {
      target_map[`${target.edges_vertices[i][0]} ${target.edges_vertices[i][1]}`] = i;
      target_map[`${target.edges_vertices[i][1]} ${target.edges_vertices[i][0]}`] = i;
    }
    for (let i = 0; i < source.edges_vertices.length; i += 1) {
      const index = target_map[`${source.edges_vertices[i][0]} ${source.edges_vertices[i][1]}`];
      if (index !== undefined) {
        source_duplicates[i] = index;
      }
    }
    return source_duplicates;
  };
  const update_suffixes = (source, suffixes, keys, maps) => keys
    .forEach(geom => suffixes[geom]
      .forEach(key => source[key]
        .forEach((arr, i) => arr
          .forEach((el, j) => { source[key][i][j] = maps[geom][el]; }))));
  const assign$1 = (target, source, epsilon = math.core.EPSILON) => {
    const prefixes = {};
    const suffixes = {};
    const maps = {};
    vef.forEach(key => {
      prefixes[key] = get_graph_keys_with_prefix(source, key);
      suffixes[key] = get_graph_keys_with_suffix(source, key);
    });
    vef.forEach(geom => prefixes[geom].filter(key => !target[key]).forEach(key => {
      target[key] = [];
    }));
    maps.vertices = make_vertices_map_and_consider_duplicates(target, source, epsilon);
    update_suffixes(source, suffixes, ["vertices"], maps);
    const target_edges_count = count.edges(target);
    maps.edges = Array.from(Array(count.edges(source)))
      .map((_, i) => target_edges_count + i);
    const edge_dups = get_edges_duplicate_from_source_in_target(target, source);
    Object.keys(edge_dups).forEach(i => { maps.edges[i] = edge_dups[i]; });
    const target_faces_count = count.faces(target);
    maps.faces = Array.from(Array(count.faces(source)))
      .map((_, i) => target_faces_count + i);
    update_suffixes(source, suffixes, ["edges", "faces"], maps);
    vef.forEach(geom => prefixes[geom].forEach(key => source[key].forEach((el, i) => {
      const new_index = maps[geom][i];
      target[key][new_index] = el;
    })));
    return maps;
  };

  const subgraph = (graph, components) => {
    const remove_indices = {};
    const sorted_components = {};
    ["faces", "edges", "vertices"].forEach(key => {
      remove_indices[key] = Array.from(Array(count[key](graph))).map((_, i) => i);
      sorted_components[key] = unique_sorted_integers(components[key] || []).reverse();
    });
    Object.keys(sorted_components)
      .forEach(key => sorted_components[key]
        .forEach(i => remove_indices[key].splice(i, 1)));
    Object.keys(remove_indices)
      .forEach(key => remove_geometry_indices(graph, key, remove_indices[key]));
    return graph;
  };

  const get_boundary = ({ vertices_edges, edges_vertices, edges_assignment }) => {
    if (edges_assignment === undefined) {
      return { vertices: [], edges: [] };
    }
    if (!vertices_edges) {
      vertices_edges = make_vertices_edges({ edges_vertices });
    }
    const edges_vertices_b = edges_assignment
      .map(a => a === "B" || a === "b");
    const edge_walk = [];
    const vertex_walk = [];
    let edgeIndex = -1;
    for (let i = 0; i < edges_vertices_b.length; i += 1) {
      if (edges_vertices_b[i]) { edgeIndex = i; break; }
    }
    if (edgeIndex === -1) {
      return { vertices: [], edges: [] };
    }
    edges_vertices_b[edgeIndex] = false;
    edge_walk.push(edgeIndex);
    vertex_walk.push(edges_vertices[edgeIndex][0]);
    let nextVertex = edges_vertices[edgeIndex][1];
    while (vertex_walk[0] !== nextVertex) {
      vertex_walk.push(nextVertex);
      edgeIndex = vertices_edges[nextVertex]
        .filter(v => edges_vertices_b[v])
        .shift();
      if (edgeIndex === undefined) { return { vertices: [], edges: [] }; }
      if (edges_vertices[edgeIndex][0] === nextVertex) {
        [, nextVertex] = edges_vertices[edgeIndex];
      } else {
        [nextVertex] = edges_vertices[edgeIndex];
      }
      edges_vertices_b[edgeIndex] = false;
      edge_walk.push(edgeIndex);
    }
    return {
      vertices: vertex_walk,
      edges: edge_walk,
    };
  };
  const get_planar_boundary = ({ vertices_coords, vertices_edges, vertices_vertices, edges_vertices }) => {
    if (!vertices_vertices) {
      vertices_vertices = make_vertices_vertices({ vertices_coords, vertices_edges, edges_vertices });
    }
    const edge_map = make_vertices_to_edge_bidirectional({ edges_vertices });
    const edge_walk = [];
    const vertex_walk = [];
    const walk = {
      vertices: vertex_walk,
      edges: edge_walk,
    };
    let largestX = -Infinity;
    let first_vertex_i = -1;
    vertices_coords.forEach((v, i) => {
      if (v[0] > largestX) {
        largestX = v[0];
        first_vertex_i = i;
      }
    });
    if (first_vertex_i === -1) { return walk; }
    vertex_walk.push(first_vertex_i);
    const first_vc = vertices_coords[first_vertex_i];
    const first_neighbors = vertices_vertices[first_vertex_i];
    const counter_clock_first_i = first_neighbors
      .map(i => vertices_coords[i])
      .map(vc => [vc[0] - first_vc[0], vc[1] - first_vc[1]])
      .map(vec => Math.atan2(vec[1], vec[0]))
      .map(angle => (angle < 0 ? angle + Math.PI * 2 : angle))
      .map((a, i) => ({ a, i }))
      .sort((a, b) => a.a - b.a)
      .shift()
      .i;
    const second_vertex_i = first_neighbors[counter_clock_first_i];
    const first_edge_lookup = first_vertex_i < second_vertex_i
      ? `${first_vertex_i} ${second_vertex_i}`
      : `${second_vertex_i} ${first_vertex_i}`;
    const first_edge = edge_map[first_edge_lookup];
    edge_walk.push(first_edge);
    let prev_vertex_i = first_vertex_i;
    let this_vertex_i = second_vertex_i;
    let protection = 0;
    while (protection < 10000) {
      const next_neighbors = vertices_vertices[this_vertex_i];
      const from_neighbor_i = next_neighbors.indexOf(prev_vertex_i);
      const next_neighbor_i = (from_neighbor_i + 1) % next_neighbors.length;
      const next_vertex_i = next_neighbors[next_neighbor_i];
      const next_edge_lookup = this_vertex_i < next_vertex_i
        ? `${this_vertex_i} ${next_vertex_i}`
        : `${next_vertex_i} ${this_vertex_i}`;
      const next_edge_i = edge_map[next_edge_lookup];
      if (next_edge_i === edge_walk[0]) {
        return walk;
      }
      vertex_walk.push(this_vertex_i);
      edge_walk.push(next_edge_i);
      prev_vertex_i = this_vertex_i;
      this_vertex_i = next_vertex_i;
      protection += 1;
    }
    console.warn("calculate boundary potentially entered infinite loop");
    return walk;
  };

  var boundary = /*#__PURE__*/Object.freeze({
    __proto__: null,
    get_boundary: get_boundary,
    get_planar_boundary: get_planar_boundary
  });

  const apply_matrix_to_graph = function (graph, matrix) {
    filter_keys_with_suffix(graph, "coords").forEach((key) => {
      graph[key] = graph[key]
        .map(v => math.core.resize(3, v))
        .map(v => math.core.multiply_matrix3_vector3(matrix, v));
    });
    filter_keys_with_suffix(graph, "matrix").forEach((key) => {
      graph[key] = graph[key]
        .map(m => math.core.multiply_matrices3(m, matrix));
    });
    return graph;
  };
  const transform_scale = (graph, scale, ...args) => {
    const vector = math.core.get_vector(...args);
    const vector3 = math.core.resize(3, vector);
    const matrix = math.core.make_matrix3_scale(scale, vector3);
    return apply_matrix_to_graph(graph, matrix);
  };
  const transform_translate = (graph, ...args) => {
    const vector = math.core.get_vector(...args);
    const vector3 = math.core.resize(3, vector);
    const matrix = math.core.make_matrix3_translate(...vector3);
    return apply_matrix_to_graph(graph, matrix);
  };
  const transform_rotateZ = (graph, angle, ...args) => {
    const vector = math.core.get_vector(...args);
    const vector3 = math.core.resize(3, vector);
    const matrix = math.core.make_matrix3_rotateZ(angle, ...vector3);
    return apply_matrix_to_graph(graph, matrix);
  };
  var transform = {
    scale: transform_scale,
    translate: transform_translate,
    rotateZ: transform_rotateZ,
    transform: apply_matrix_to_graph,
  };

  const explode_faces = (graph) => {
    const vertices_coords = graph.faces_vertices
      .map(face => face.map(v => graph.vertices_coords[v]))
      .reduce((a, b) => a.concat(b), []);
    let i = 0;
    const faces_vertices = graph.faces_vertices
      .map(face => face.map(v => i++));
    return {
      vertices_coords: JSON.parse(JSON.stringify(vertices_coords)),
      faces_vertices,
    }
  };

  const nearest_vertex = ({ vertices_coords }, point) => {
    if (!vertices_coords) { return undefined; }
    const p = math.core.resize(vertices_coords[0].length, point);
    const nearest = vertices_coords
      .map((v, i) => ({ d: math.core.distance(p, v), i }))
      .sort((a, b) => a.d - b.d)
      .shift();
    return nearest ? nearest.i : undefined;
  };
  const nearest_edge = ({ vertices_coords, edges_vertices }, point) => {
    if (!vertices_coords || !edges_vertices) { return undefined; }
    const nearest_points = edges_vertices
      .map(e => e.map(ev => vertices_coords[ev]))
      .map(e => math.core.nearest_point_on_line(
        math.core.subtract(e[1], e[0]),
        e[0],
        point,
        math.core.segment_limiter));
    return math.core.smallest_comparison_search(point, nearest_points, math.core.distance);
  };
  const face_containing_point = ({ vertices_coords, faces_vertices }, point) => {
    if (!vertices_coords || !faces_vertices) { return undefined; }
    const face = faces_vertices
      .map((fv, i) => ({ face: fv.map(v => vertices_coords[v]), i }))
      .filter(f => math.core.overlap_convex_polygon_point(f.face, point))
      .shift();
    return (face === undefined ? undefined : face.i);
  };
  const nearest_face = face_containing_point;

  var nearest$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    nearest_vertex: nearest_vertex,
    nearest_edge: nearest_edge,
    face_containing_point: face_containing_point,
    nearest_face: nearest_face
  });

  const clone = function (o) {
    let newO;
    let i;
    if (typeof o !== "object") {
      return o;
    }
    if (!o) {
      return o;
    }
    if (Object.prototype.toString.apply(o) === "[object Array]") {
      newO = [];
      for (i = 0; i < o.length; i += 1) {
        newO[i] = clone(o[i]);
      }
      return newO;
    }
    newO = {};
    for (i in o) {
      if (o.hasOwnProperty(i)) {
        newO[i] = clone(o[i]);
      }
    }
    return newO;
  };

  const vertices = "vertices";
  const edges = "edges";
  const faces = "faces";
  const boundaries = "boundaries";
  const boundary$1 = "boundary";
  const mountain = "mountain";
  const valley = "valley";
  const mark = "mark";
  const unassigned = "unassigned";
  const front = "front";
  const back = "back";
  const _class = "class";
  const index = "index";
  const setAttributeNS = "setAttributeNS";
  const appendChild = "appendChild";
  const vertices_coords = "vertices_coords";
  const edges_vertices = "edges_vertices";
  const faces_vertices = "faces_vertices";
  const faces_edges = "faces_edges";
  const edges_assignment = "edges_assignment";
  const faces_re_layer = "faces_re:layer";
  const frame_classes = "frame_classes";
  const file_classes = "file_classes";

  const keys$1 = [
    "number",
    "object",
    "transform",
    "class",
    "style",
    "function",
    "string",
    "undefined",
    "boolean",
    "path",
    "svg",
    "id",
    "viewBox",
  ];
  const Keys = {};
  keys$1.forEach(key => Keys[key] = key);
  const isBrowser = typeof window !== Keys.undefined
    && typeof window.document !== Keys.undefined;
  const isNode = typeof process !== Keys.undefined
    && process.versions != null
    && process.versions.node != null;
  const isWebWorker = typeof self === Keys.object
    && self.constructor
    && self.constructor.name === "DedicatedWorkerGlobalScope";
  var detect = Object.freeze({
    __proto__: null,
    isBrowser: isBrowser,
    isNode: isNode,
    isWebWorker: isWebWorker
  });
  const htmlString = "<!DOCTYPE html><title>.</title>";
  const win = (function () {
    let w = {};
    if (isNode) {
      const { DOMParser, XMLSerializer } = require("xmldom");
      w.DOMParser = DOMParser;
      w.XMLSerializer = XMLSerializer;
      w.document = new DOMParser().parseFromString(htmlString, "text/html");
    } else if (isBrowser) {
      w = window;
    }
    return w;
  }());
  var NS = "http://www.w3.org/2000/svg";
  var NodeNames = {
    s: [
      "svg",
    ],
    d: [
      "defs",
    ],
    h: [
      "desc",
      "filter",
      "metadata",
      "style",
      "script",
      "title",
      "view",
    ],
    c: [
      "cdata",
    ],
    g: [
      "g",
    ],
    v: [
      "circle",
      "ellipse",
      "line",
      "path",
      "polygon",
      "polyline",
      "rect",
    ],
    t: [
      "text",
    ],
    i: [
      "marker",
      "symbol",
      "clipPath",
      "mask",
    ],
    p: [
      "linearGradient",
      "radialGradient",
      "pattern",
    ],
    cT: [
      "textPath",
      "tspan",
    ],
    cG: [
      "stop",
    ],
    cF: [
      "feBlend",
      "feColorMatrix",
      "feComponentTransfer",
      "feComposite",
      "feConvolveMatrix",
      "feDiffuseLighting",
      "feDisplacementMap",
      "feDistantLight",
      "feDropShadow",
      "feFlood",
      "feFuncA",
      "feFuncB",
      "feFuncG",
      "feFuncR",
      "feGaussianBlur",
      "feImage",
      "feMerge",
      "feMergeNode",
      "feMorphology",
      "feOffset",
      "fePointLight",
      "feSpecularLighting",
      "feSpotLight",
      "feTile",
      "feTurbulence",
    ],
  };
  const vec = (a, d) => [Math.cos(a) * d, Math.sin(a) * d];
  const arcPath = (x, y, radius, startAngle, endAngle, includeCenter = false) => {
    if (endAngle == null) { return ""; }
    const start = vec(startAngle, radius);
    const end = vec(endAngle, radius);
    const arcVec = [end[0] - start[0], end[1] - start[1]];
    const py = start[0] * end[1] - start[1] * end[0];
    const px = start[0] * end[0] + start[1] * end[1];
    const arcdir = (Math.atan2(py, px) > 0 ? 0 : 1);
    let d = (includeCenter
      ? `M ${x},${y} l ${start[0]},${start[1]} `
      : `M ${x+start[0]},${y+start[1]} `);
    d += ["a ", radius, radius, 0, arcdir, 1, arcVec[0], arcVec[1]].join(" ");
    if (includeCenter) { d += " Z"; }
    return d;
  };
  const arcArguments = (a, b, c, d, e) => [arcPath(a, b, c, d, e, false)];
  var Arc = {
    arc: {
      nodeName: "path",
      attributes: ["d"],
      args: arcArguments,
      methods: {
        setArc: (el, ...args) => el.setAttribute("d", arcArguments(...args)),
      }
    }
  };
  const wedgeArguments = (a, b, c, d, e) => [arcPath(a, b, c, d, e, true)];
  var Wedge = {
    wedge: {
      nodeName: "path",
      args: wedgeArguments,
      attributes: ["d"],
      methods: {
        setArc: (el, ...args) => el.setAttribute("d", wedgeArguments(...args)),
      }
    }
  };
  const COUNT = 128;
  const parabolaArguments = (x = -1, y = 0, width = 2, height = 1) => Array
    .from(Array(COUNT + 1))
    .map((_, i) => (i - (COUNT)) / COUNT * 2 + 1)
    .map(i => [
      x + (i + 1) * width * 0.5,
      y + (i ** 2) * height
    ]);
  const parabolaPathString = (a, b, c, d) => [
    parabolaArguments(a, b, c, d).map(n => `${n[0]},${n[1]}`).join(" ")
  ];
  var Parabola = {
    parabola: {
      nodeName: "polyline",
      attributes: ["points"],
      args: parabolaPathString
    }
  };
  const regularPolygonArguments = (sides, cX, cY, radius) => {
    const origin = [cX, cY];
    return Array.from(Array(sides))
      .map((el, i) => 2 * Math.PI * i / sides)
      .map(a => [Math.cos(a), Math.sin(a)])
      .map(pts => origin.map((o, i) => o + radius * pts[i]));
  };
  const polygonPathString = (sides, cX = 0, cY = 0, radius = 1) => [
    regularPolygonArguments(sides, cX, cY, radius)
      .map(a => `${a[0]},${a[1]}`).join(" ")
  ];
  var RegularPolygon = {
    regularPolygon: {
      nodeName: "polygon",
      attributes: ["points"],
      args: polygonPathString
    }
  };
  const roundRectArguments = (x, y, width, height, cornerRadius = 0) => {
    if (cornerRadius > width / 2) { cornerRadius = width / 2; }
    if (cornerRadius > height / 2) { cornerRadius = height / 2; }
    const w = width - cornerRadius * 2;
    const h = height - cornerRadius * 2;
    const s = `A${cornerRadius} ${cornerRadius} 0 0 1`;
    return [`M${x + (width - w) / 2},${y}`, `h${w}`, s, `${x + width},${y + (height - h) / 2}`, `v${h}`, s, `${x + width - cornerRadius},${y + height}`, `h${-w}`, s, `${x},${y + height - cornerRadius}`, `v${-h}`, s, `${x + cornerRadius},${y}`].join(" ");
  };
  var RoundRect = {
    roundRect: {
      nodeName: "path",
      attributes: ["d"],
      args: roundRectArguments
    }
  };
  const is_iterable$1 = (obj) => {
    return obj != null && typeof obj[Symbol.iterator] === Keys.function;
  };
  const flatten_arrays$1 = function () {
    switch (arguments.length) {
      case undefined:
      case 0: return Array.from(arguments);
      case 1: return is_iterable$1(arguments[0]) && typeof arguments[0] !== "string"
        ? flatten_arrays$1(...arguments[0])
        : [arguments[0]];
      default:
        return Array.from(arguments).map(a => (is_iterable$1(a)
          ? [...flatten_arrays$1(a)]
          : a)).reduce((a, b) => a.concat(b), []);
    }
  };
  var coordinates = (...args) => {
    return args.filter(a => typeof a === Keys.number)
      .concat(
        args.filter(a => typeof a === Keys.object && a !== null)
          .map((el) => {
            if (typeof el.x === Keys.number) { return [el.x, el.y]; }
            if (typeof el[0] === Keys.number) { return [el[0], el[1]]; }
            return undefined;
          }).filter(a => a !== undefined)
          .reduce((a, b) => a.concat(b), [])
      );
  };
  const add$1 = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const scale$1 = (a, s) => [a[0] * s, a[1] * s];
  const curveArguments = function (...args) {
    const params = coordinates(...flatten_arrays$1(...args));
    const endpoints = params.slice(0, 4);
    if (!endpoints.length) { return [""]; }
    const o_curve = params[4] || 0;
    const o_pinch = params[5] || 0.5;
    const tailPt = [endpoints[0], endpoints[1]];
    const headPt = [endpoints[2], endpoints[3]];
    const vector = sub(headPt, tailPt);
    const midpoint = add$1(tailPt, scale$1(vector, 0.5));
    const perpendicular = [vector[1], -vector[0]];
    const bezPoint = add$1(midpoint, scale$1(perpendicular, o_curve));
    const tailControl = add$1(tailPt, scale$1(sub(bezPoint, tailPt), o_pinch));
    const headControl = add$1(headPt, scale$1(sub(bezPoint, headPt), o_pinch));
    return [`M${tailPt[0]},${tailPt[1]}C${tailControl[0]},${tailControl[1]} ${headControl[0]},${headControl[1]} ${headPt[0]},${headPt[1]}`];
  };
  const getEndpoints = (element) => {
    const d = element.getAttribute("d");
    if (d == null || d === "") { return []; }
    return [
      d.slice(d.indexOf("M")+1, d.indexOf("C")).split(","),
      d.split(" ").pop().split(",")
    ].map(p => p.map(n => parseFloat(n)));
  };
  const bend = (element, amount) => {
    element.setAttribute("d", curveArguments(...getEndpoints(element), amount));
    return element;
  };
  var methods$2 = {
    bend
  };
  var Curve = {
    curve: {
      nodeName: "path",
      attributes: ["d"],
      args: curveArguments,
      methods: methods$2
    }
  };
  const nodes = {};
  Object.assign(nodes,
    Arc,
    Wedge,
    Parabola,
    RegularPolygon,
    RoundRect,
    Curve
  );
  const customPrimitives = Object.keys(nodes);
  const headerStuff = [NodeNames.h, NodeNames.p, NodeNames.i];
  const drawingShapes = [NodeNames.g, NodeNames.v, NodeNames.t, customPrimitives];
  const folders = {
    svg: [NodeNames.s, NodeNames.d].concat(headerStuff).concat(drawingShapes),
    g: drawingShapes,
    text: [NodeNames.cT],
    linearGradient: [NodeNames.cG],
    radialGradient: [NodeNames.cG],
    defs: headerStuff,
    filter: [NodeNames.cF],
    marker: drawingShapes,
    symbol: drawingShapes,
    clipPath: drawingShapes,
    mask: drawingShapes,
  };
  const nodesAndChildren = Object.create(null);
  Object.keys(folders).forEach((key) => {
    nodesAndChildren[key] = folders[key].reduce((a, b) => a.concat(b), []);
  });
  var Case = {
    toCamel: s => s
      .replace(/([-_][a-z])/ig, $1 => $1
      .toUpperCase()
      .replace("-", "")
      .replace("_", "")),
     toKebab: s => s
       .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
       .replace(/([A-Z])([A-Z])(?=[a-z])/g, "$1-$2")
       .toLowerCase(),
    capitalized: s => s
      .charAt(0).toUpperCase() + s.slice(1)
  };
  const viewBoxValue = function (x, y, width, height, padding = 0) {
    const scale = 1.0;
    const d = (width / scale) - width;
    const X = (x - d) - padding;
    const Y = (y - d) - padding;
    const W = (width + d * 2) + padding * 2;
    const H = (height + d * 2) + padding * 2;
    return [X, Y, W, H].join(" ");
  };
  function viewBox () {
    const numbers = coordinates(...flatten_arrays$1(arguments));
    if (numbers.length === 2) { numbers.unshift(0, 0); }
    return numbers.length === 4 ? viewBoxValue(...numbers) : undefined;
  }
  const cdata = (textContent) => (new win.DOMParser())
    .parseFromString("<root></root>", "text/xml")
    .createCDATASection(`${textContent}`);
  const removeChildren = (element) => {
    while (element.lastChild) {
      element.removeChild(element.lastChild);
    }
    return element;
  };
  const appendTo = (element, parent) => {
    if (parent != null) {
      parent.appendChild(element);
    }
    return element;
  };
  const setAttributes = (element, attrs) => Object.keys(attrs)
    .forEach(key => element.setAttribute(Case.toKebab(key), attrs[key]));
  const moveChildren = (target, source) => {
    while (source.childNodes.length > 0) {
      const node = source.childNodes[0];
      source.removeChild(node);
      target.appendChild(node);
    }
    return target;
  };
  const clearSVG = (element) => {
    Array.from(element.attributes)
      .filter(a => a !== "xmlns")
      .forEach(attr => element.removeAttribute(attr.name));
    return removeChildren(element);
  };
  const assignSVG = (target, source) => {
    Array.from(source.attributes)
      .forEach(attr => target.setAttribute(attr.name, attr.value));
    return moveChildren(target, source);
  };
  var dom = {
    removeChildren,
    appendTo,
    setAttributes,
  };
  const filterWhitespaceNodes = (node) => {
    if (node === null) { return node; }
    for (let i = node.childNodes.length - 1; i >= 0; i -= 1) {
      const child = node.childNodes[i];
      if (child.nodeType === 3 && child.data.match(/^\s*$/)) {
        node.removeChild(child);
      }
      if (child.nodeType === 1) {
        filterWhitespaceNodes(child);
      }
    }
    return node;
  };
  const parse = string => (new win.DOMParser())
    .parseFromString(string, "text/xml");
  const checkParseError = xml => {
    const parserErrors = xml.getElementsByTagName("parsererror");
    if (parserErrors.length > 0) {
      throw new Error(parserErrors[0]);
    }
    return filterWhitespaceNodes(xml.documentElement);
  };
  const async = function (input) {
    return new Promise((resolve, reject) => {
      if (typeof input === Keys.string || input instanceof String) {
        fetch(input)
          .then(response => response.text())
          .then(str => checkParseError(parse(str)))
          .then(xml => xml.nodeName === "svg"
            ? xml
            : xml.getElementsByTagName("svg")[0])
          .then(svg => (svg == null
              ? reject("valid XML found, but no SVG element")
              : resolve(svg)))
          .catch(err => reject(err));
      }
      else if (input instanceof win.Document) {
        return asyncDone(input);
      }
    });
  };
  const sync = function (input) {
    if (typeof input === Keys.string || input instanceof String) {
      try {
        return checkParseError(parse(input));
      } catch (error) {
        return error;
      }
    }
    if (input.childNodes != null) {
      return input;
    }
  };
  const isFilename = input => typeof input === Keys.string
    && /^[\w,\s-]+\.[A-Za-z]{3}$/.test(input)
    && input.length < 10000;
  const Load = input => (isFilename(input)
    && isBrowser
    && typeof win.fetch === Keys.function
    ? async(input)
    : sync(input));
  function vkXML (text, step) {
    const ar = text.replace(/>\s{0,}</g, "><")
      .replace(/</g, "~::~<")
      .replace(/\s*xmlns\:/g, "~::~xmlns:")
      .split("~::~");
    const len = ar.length;
    let inComment = false;
    let deep = 0;
    let str = "";
    const space = (step != null && typeof step === "string" ? step : "\t");
    const shift = ["\n"];
    for (let si = 0; si < 100; si += 1) {
      shift.push(shift[si] + space);
    }
    for (let ix = 0; ix < len; ix += 1) {
      if (ar[ix].search(/<!/) > -1) {
        str += shift[deep] + ar[ix];
        inComment = true;
        if (ar[ix].search(/-->/) > -1 || ar[ix].search(/\]>/) > -1
          || ar[ix].search(/!DOCTYPE/) > -1) {
          inComment = false;
        }
      } else if (ar[ix].search(/-->/) > -1 || ar[ix].search(/\]>/) > -1) {
        str += ar[ix];
        inComment = false;
      } else if (/^<\w/.exec(ar[ix - 1]) && /^<\/\w/.exec(ar[ix])
        && /^<[\w:\-\.\,]+/.exec(ar[ix - 1])
        == /^<\/[\w:\-\.\,]+/.exec(ar[ix])[0].replace("/", "")) {
        str += ar[ix];
        if (!inComment) { deep -= 1; }
      } else if (ar[ix].search(/<\w/) > -1 && ar[ix].search(/<\//) === -1
        && ar[ix].search(/\/>/) === -1) {
        str = !inComment ? str += shift[deep++] + ar[ix] : str += ar[ix];
      } else if (ar[ix].search(/<\w/) > -1 && ar[ix].search(/<\//) > -1) {
        str = !inComment ? str += shift[deep] + ar[ix] : str += ar[ix];
      } else if (ar[ix].search(/<\//) > -1) {
        str = !inComment ? str += shift[--deep] + ar[ix] : str += ar[ix];
      } else if (ar[ix].search(/\/>/) > -1) {
        str = !inComment ? str += shift[deep] + ar[ix] : str += ar[ix];
      } else if (ar[ix].search(/<\?/) > -1) {
        str += shift[deep] + ar[ix];
      } else if (ar[ix].search(/xmlns\:/) > -1 || ar[ix].search(/xmlns\=/) > -1) {
        str += shift[deep] + ar[ix];
      } else {
        str += ar[ix];
      }
    }
    return (str[0] === "\n") ? str.slice(1) : str;
  }
  const SAVE_OPTIONS = () => ({
    download: false,
    output: Keys.string,
    windowStyle: false,
    filename: "image.svg"
  });
  const getWindowStylesheets = function () {
    const css = [];
    if (win.document.styleSheets) {
      for (let s = 0; s < win.document.styleSheets.length; s += 1) {
        const sheet = win.document.styleSheets[s];
        try {
          const rules = ("cssRules" in sheet) ? sheet.cssRules : sheet.rules;
          for (let r = 0; r < rules.length; r += 1) {
            const rule = rules[r];
            if ("cssText" in rule) {
              css.push(rule.cssText);
            } else {
              css.push(`${rule.selectorText} {\n${rule.style.cssText}\n}\n`);
            }
          }
        } catch (error) {
          console.warn(error);
        }
      }
    }
    return css.join("\n");
  };
  const downloadInBrowser = function (filename, contentsAsString) {
    const blob = new win.Blob([contentsAsString], { type: "text/plain" });
    const a = win.document.createElement("a");
    a.setAttribute("href", win.URL.createObjectURL(blob));
    a.setAttribute("download", filename);
    win.document.body.appendChild(a);
    a.click();
    win.document.body.removeChild(a);
  };
  const save = function (svg, options) {
    options = Object.assign(SAVE_OPTIONS(), options);
    if (options.windowStyle) {
      const styleContainer = win.document.createElementNS(NS, Keys.style);
      styleContainer.setAttribute("type", "text/css");
      styleContainer.innerHTML = getWindowStylesheets();
      svg.appendChild(styleContainer);
    }
    const source = (new win.XMLSerializer()).serializeToString(svg);
    const formattedString = vkXML(source);
    if (options.download && isBrowser && !isNode) {
      downloadInBrowser(options.filename, formattedString);
    }
    return (options.output === "svg" ? svg : formattedString);
  };
  const setViewBox = (element, ...args) => {
    const viewBox$1 = args.length === 1 && typeof args[0] === "string"
      ? args[0]
      : viewBox(...args);
    if (viewBox$1) {
      element.setAttribute(Keys.viewBox, viewBox$1);
    }
    return element;
  };
  const getViewBox = function (element) {
    const vb = element.getAttribute(Keys.viewBox);
    return (vb == null
      ? undefined
      : vb.split(" ").map(n => parseFloat(n)));
  };
  const convertToViewBox = function (svg, x, y) {
    const pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [svgPoint.x, svgPoint.y];
  };
  var viewBox$1 = Object.freeze({
    __proto__: null,
    setViewBox: setViewBox,
    getViewBox: getViewBox,
    convertToViewBox: convertToViewBox
  });
  const loadSVG = (target, data) => {
    const result = Load(data);
    if (result == null) { return; }
    return (typeof result.then === Keys.function)
      ? result.then(svg => assignSVG(target, svg))
      : assignSVG(target, result);
  };
  const getFrame = function (element) {
    const viewBox = getViewBox(element);
    if (viewBox !== undefined) {
      return viewBox;
    }
    if (typeof element.getBoundingClientRect === Keys.function) {
      const rr = element.getBoundingClientRect();
      return [rr.x, rr.y, rr.width, rr.height];
    }
    return [];
  };
  const setPadding = function (element, padding) {
    const viewBox = getViewBox(element);
    if (viewBox !== undefined) {
      setViewBox(element, ...[-padding, -padding, padding * 2, padding * 2]
        .map((nudge, i) => viewBox[i] + nudge));
    }
    return element;
  };
  const bgClass = "svg-background-rectangle";
  const background = function (element, color) {
    let backRect = Array.from(element.childNodes)
      .filter(child => child.getAttribute(Keys.class) === bgClass)
      .shift();
    if (backRect == null) {
      backRect = this.Constructor("rect", ...getFrame(element));
      backRect.setAttribute(Keys.class, bgClass);
      backRect.setAttribute("stroke", "none");
  		element.insertBefore(backRect, element.firstChild);
    }
    backRect.setAttribute("fill", color);
    return element;
  };
  const findStyleSheet = function (element) {
    const styles = element.getElementsByTagName(Keys.style);
    return styles.length === 0 ? undefined : styles[0];
  };
  const stylesheet = function (element, textContent) {
    let styleSection = findStyleSheet(element);
    if (styleSection == null) {
      styleSection = this.Constructor(Keys.style);
      element.insertBefore(styleSection, element.firstChild);
    }
    styleSection.textContent = "";
    styleSection.appendChild(cdata(textContent));
    return styleSection;
  };
  var methods$1$1 = {
    clear: clearSVG,
    size: setViewBox,
    setViewBox,
    getViewBox,
    padding: setPadding,
    background,
    getWidth: el => getFrame(el)[2],
    getHeight: el => getFrame(el)[3],
    stylesheet: function (el, text) { return stylesheet.call(this, el, text); },
    load: loadSVG,
    save: save,
  };
  const libraries = {
    math: {
  		vector: (...args) => [...args]
  	}
  };
  const categories = {
    move: ["mousemove", "touchmove"],
    press: ["mousedown", "touchstart"],
    release: ["mouseup", "touchend"]
  };
  const handlerNames = Object.values(categories)
    .reduce((a, b) => a.concat(b), []);
  const off = (element, handlers) => handlerNames.forEach((handlerName) => {
    handlers[handlerName].forEach(func => element.removeEventListener(handlerName, func));
    handlers[handlerName] = [];
  });
  const defineGetter = (obj, prop, value) => Object.defineProperty(obj, prop, {
    get: () => value,
    enumerable: true,
    configurable: true,
  });
  const assignPress = (e, startPoint) => {
  	["pressX", "pressY"].filter(prop => !e.hasOwnProperty(prop))
  		.forEach((prop, i) => defineGetter(e, prop, startPoint[i]));
  	if (!e.hasOwnProperty("press")) {
  		defineGetter(e, "press", libraries.math.vector(...startPoint));
  	}
  };
  const TouchEvents = function (element) {
    let startPoint = [];
    const handlers = [];
    Object.keys(categories).forEach((key) => {
      categories[key].forEach((handler) => {
        handlers[handler] = [];
      });
    });
    const removeHandler = category => categories[category]
      .forEach(handlerName => handlers[handlerName]
        .forEach(func => element.removeEventListener(handlerName, func)));
    const categoryUpdate = {
      press: (e, viewPoint) => {
        startPoint = viewPoint;
  			assignPress(e, startPoint);
  		},
      release: () => {},
      move: (e, viewPoint) => {
        if (e.buttons > 0 && startPoint[0] === undefined) {
          startPoint = viewPoint;
        } else if (e.buttons === 0 && startPoint[0] !== undefined) {
          startPoint = [];
        }
  			assignPress(e, startPoint);
      }
    };
    Object.keys(categories).forEach((category) => {
      const propName = "on" + Case.capitalized(category);
      Object.defineProperty(element, propName, {
        set: (handler) => (handler == null)
          ? removeHandler(category)
          : categories[category].forEach((handlerName) => {
              const handlerFunc = (e) => {
                const pointer = (e.touches != null
                  ? e.touches[0]
                  : e);
                if (pointer !== undefined) {
                  const viewPoint = convertToViewBox(element, pointer.clientX, pointer.clientY)
  									.map(n => isNaN(n) ? undefined : n);
                  ["x", "y"]
                    .filter(prop => !e.hasOwnProperty(prop))
                    .forEach((prop, i) => defineGetter(e, prop, viewPoint[i]));
  								if (!e.hasOwnProperty("position")) {
  									defineGetter(e, "position", libraries.math.vector(...viewPoint));
  								}
                  categoryUpdate[category](e, viewPoint);
                }
                handler(e);
              };
              if (element.addEventListener) {
                handlers[handlerName].push(handlerFunc);
                element.addEventListener(handlerName, handlerFunc);
              }
            }),
        enumerable: true
      });
    });
    Object.defineProperty(element, "off", { value: () => off(element, handlers) });
  };
  var UUID = () => Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .concat("aaaaa")
    .substr(0, 5);
  const Animation = function (element) {
    let start;
    const handlers = {};
    let frame = 0;
    let requestId;
    const removeHandlers = () => {
      if (win.cancelAnimationFrame) {
        win.cancelAnimationFrame(requestId);
      }
      Object.keys(handlers)
        .forEach(uuid => delete handlers[uuid]);
      start = undefined;
      frame = 0;
    };
    Object.defineProperty(element, "play", {
      set: (handler) => {
        removeHandlers();
        if (handler == null) { return; }
        const uuid = UUID();
        const handlerFunc = (e) => {
          if (!start) {
            start = e;
            frame = 0;
          }
          const progress = (e - start) * 0.001;
          handler({ time: progress, frame });
          frame += 1;
          if (handlers[uuid]) {
            requestId = win.requestAnimationFrame(handlers[uuid]);
          }
        };
        handlers[uuid] = handlerFunc;
        if (win.requestAnimationFrame) {
          requestId = win.requestAnimationFrame(handlers[uuid]);
        }
      },
      enumerable: true
    });
    Object.defineProperty(element, "stop", { value: removeHandlers, enumerable: true });
  };
  const distanceSq2 = (a, b) => ((a[0] - b[0]) ** 2) + ((a[1] - b[1]) ** 2);
  const distance2$1 = (a, b) => Math.sqrt(distanceSq2(a, b));
  var math$1 = Object.freeze({
    __proto__: null,
    distanceSq2: distanceSq2,
    distance2: distance2$1
  });
  const removeFromParent = svg => (svg && svg.parentNode
    ? svg.parentNode.removeChild(svg)
    : undefined);
  const possiblePositionAttributes = [["cx", "cy"], ["x", "y"]];
  const controlPoint = function (parent, options = {}) {
    const position = [0, 0];
    const cp = {
      selected: false,
      svg: undefined,
      updatePosition: input => input,
    };
    const updateSVG = () => {
      if (!cp.svg) { return; }
      if (!cp.svg.parentNode) {
        parent.appendChild(cp.svg);
      }
      possiblePositionAttributes
        .filter(coords => cp.svg[coords[0]] != null)
        .forEach(coords => coords.forEach((attr, i) => {
          cp.svg.setAttribute(attr, position[i]);
        }));
    };
    const proxy = new Proxy(position, {
      set: (target, property, value) => {
        target[property] = value;
        updateSVG();
        return true;
      }
    });
    const setPosition = function (...args) {
      coordinates(...flatten_arrays$1(...args))
        .forEach((n, i) => { position[i] = n; });
      updateSVG();
      if (typeof position.delegate === "function") {
        position.delegate.apply(position.pointsContainer, [proxy, position.pointsContainer]);
      }
    };
    position.delegate = undefined;
    position.setPosition = setPosition;
    position.onMouseMove = mouse => (cp.selected
      ? setPosition(cp.updatePosition(mouse))
      : undefined);
    position.onMouseUp = () => { cp.selected = false; };
    position.distance = mouse => Math.sqrt(distanceSq2(mouse, position));
    ["x", "y"].forEach((prop, i) => Object.defineProperty(position, prop, {
      get: () => position[i],
      set: (v) => { position[i] = v; }
    }));
    ["svg", "updatePosition", "selected"].forEach(key => Object
      .defineProperty(position, key, {
        get: () => cp[key],
        set: (v) => { cp[key] = v; }
      }));
    Object.defineProperty(position, "remove", {
      value: () => {
        removeFromParent(cp.svg);
        position.delegate = undefined;
      }
    });
    return proxy;
  };
  const controls = function (svg, number, options) {
    let selected;
    let delegate;
    const points = Array.from(Array(number))
      .map(() => controlPoint(svg, options));
    const protocol = point => (typeof delegate === "function"
      ? delegate.call(points, point, selected, points)
      : undefined);
    points.forEach((p) => {
      p.delegate = protocol;
      p.pointsContainer = points;
    });
    const mousePressedHandler = function (mouse) {
      if (!(points.length > 0)) { return; }
      selected = points
        .map((p, i) => ({ i, d: distanceSq2(p, [mouse.x, mouse.y]) }))
        .sort((a, b) => a.d - b.d)
        .shift()
        .i;
      points[selected].selected = true;
    };
    const mouseMovedHandler = function (mouse) {
      points.forEach(p => p.onMouseMove(mouse));
    };
    const mouseReleasedHandler = function () {
      points.forEach(p => p.onMouseUp());
      selected = undefined;
    };
    svg.onPress = mousePressedHandler;
    svg.onMove = mouseMovedHandler;
    svg.onRelease = mouseReleasedHandler;
    Object.defineProperty(points, "selectedIndex", { get: () => selected });
    Object.defineProperty(points, "selected", { get: () => points[selected] });
    Object.defineProperty(points, "add", {
      value: (opt) => {
        points.push(controlPoint(svg, opt));
      },
    });
    points.removeAll = () => {
      while (points.length > 0) {
        points.pop().remove();
      }
    };
    const functionalMethods = {
      onChange: (func, runOnceAtStart) => {
        delegate = func;
        if (runOnceAtStart === true) {
          const index = points.length - 1;
          func.call(points, points[index], index, points);
        }
      },
      position: func => points.forEach((p, i) => p.setPosition(func.call(points, p, i, points))),
      svg: func => points.forEach((p, i) => { p.svg = func.call(points, p, i, points); }),
    };
    Object.keys(functionalMethods).forEach((key) => {
      points[key] = function () {
        if (typeof arguments[0] === "function") {
          functionalMethods[key](...arguments);
        }
        return points;
      };
    });
    points.parent = function (parent) {
      if (parent != null && parent.appendChild != null) {
        points.forEach((p) => { parent.appendChild(p.svg); });
      }
      return points;
    };
    return points;
  };
  const applyControlsToSVG = (svg) => {
    svg.controls = (...args) => controls.call(svg, svg, ...args);
  };
  const ElementConstructor = (new win.DOMParser())
    .parseFromString("<div />", "text/xml").documentElement.constructor;
  var svg = {
    svg: {
      args: (...args) => [viewBox(coordinates(...args))].filter(a => a != null),
      methods: methods$1$1,
      init: (element, ...args) => {
        args.filter(a => typeof a === Keys.string)
          .forEach(string => loadSVG(element, string));
        args.filter(a => a != null)
          .filter(arg => arg instanceof ElementConstructor)
          .filter(el => typeof el.appendChild === Keys.function)
          .forEach(parent => parent.appendChild(element));
        TouchEvents(element);
        Animation(element);
        applyControlsToSVG(element);
      }
    }
  };
  const loadGroup = (group, ...sources) => {
    const elements = sources.map(source => sync(source))
      .filter(a => a !== undefined);
    elements.filter(element => element.tagName === Keys.svg)
      .forEach(element => moveChildren(group, element));
    elements.filter(element => element.tagName !== Keys.svg)
      .forEach(element => group.appendChild(element));
    return group;
  };
  var g = {
    g: {
      init: loadGroup,
      methods: {
        load: loadGroup,
      }
    }
  };
  var attributes = Object.assign(Object.create(null), {
    svg: ["viewBox"],
    line: ["x1", "y1", "x2", "y2"],
    rect: ["x", "y", "width", "height"],
    circle: ["cx", "cy", "r"],
    ellipse: ["cx", "cy", "rx", "ry"],
    polygon: ["points"],
    polyline: ["points"],
    path: ["d"],
    text: ["x", "y"],
    mask: ["id"],
    symbol: ["id"],
    clipPath: [
      "id",
      "clip-rule",
    ],
    marker: [
      "id",
      "markerHeight",
      "markerUnits",
      "markerWidth",
      "orient",
      "refX",
      "refY",
    ],
    linearGradient: [
      "x1",
      "x2",
      "y1",
      "y2",
    ],
    radialGradient: [
      "cx",
      "cy",
      "r",
      "fr",
      "fx",
      "fy",
    ],
    stop: [
      "offset",
      "stop-color",
      "stop-opacity",
    ],
    pattern: [
      "patternContentUnits",
      "patternTransform",
      "patternUnits",
    ],
  });
  const setRadius = (el, r) => {
    el.setAttribute(attributes.circle[2], r);
    return el;
  };
  const setOrigin = (el, a, b) => {
    [...coordinates(...flatten_arrays$1(a, b)).slice(0, 2)]
      .forEach((value, i) => el.setAttribute(attributes.circle[i], value));
    return el;
  };
  const fromPoints = (a, b, c, d) => [a, b, distance2$1([a, b], [c, d])];
  var circle$1 = {
    circle: {
      args: (a, b, c, d) => {
        const coords = coordinates(...flatten_arrays$1(a, b, c, d));
        switch (coords.length) {
          case 0: case 1: return [, , ...coords]
          case 2: case 3: return coords;
          default: return fromPoints(...coords);
        }
      },
      methods: {
        radius: setRadius,
        setRadius,
        origin: setOrigin,
        setOrigin,
        center: setOrigin,
        setCenter: setOrigin,
        position: setOrigin,
        setPosition: setOrigin,
      }
    }
  };
  const setRadii = (el, rx, ry) => {
    [, , rx, ry].forEach((value, i) => el.setAttribute(attributes.ellipse[i], value));
    return el;
  };
  const setCenter = (el, a, b) => {
    [...coordinates(...flatten_arrays$1(a, b)).slice(0, 2)]
      .forEach((value, i) => el.setAttribute(attributes.ellipse[i], value));
    return el;
  };
  var ellipse$1 = {
    ellipse: {
      args: (a, b, c, d) => {
        const coords = coordinates(...flatten_arrays$1(a, b, c, d)).slice(0, 4);
        switch (coords.length) {
          case 0: case 1: case 2: return [, , ...coords]
          default: return coords;
        }
      },
      methods: {
        radius: setRadii,
        setRadius: setRadii,
        origin: setCenter,
        setOrigin: setCenter,
        center: setCenter,
        setCenter,
        position: setCenter,
        setPosition: setCenter,
      }
    }
  };
  const Args = (a, b, c, d) => coordinates(...flatten_arrays$1(a, b, c, d)).slice(0, 4);
  const setPoints = (element, a, b, c, d) => { Args(a, b, c, d)
    .forEach((value, i) => element.setAttribute(attributes.line[i], value)); return element; };
  var line$1 = {
    line: {
      args: Args,
      methods: {
        setPoints,
      }
    }
  };
  const markerRegEx = /[MmLlSsQqLlHhVvCcSsQqTtAaZz]/g;
  const digitRegEx = /-?[0-9]*\.?\d+/g;
  const pathCommands = {
    m: "move",
    l: "line",
    v: "vertical",
    h: "horizontal",
    a: "ellipse",
    c: "curve",
    s: "smoothCurve",
    q: "quadCurve",
    t: "smoothQuadCurve",
    z: "close"
  };
  Object.keys(pathCommands).forEach((key) => {
    const s = pathCommands[key];
    pathCommands[key.toUpperCase()] = s.charAt(0).toUpperCase() + s.slice(1);
  });
  const parsePathCommands = function (str) {
    const results = [];
    let match;
    while ((match = markerRegEx.exec(str)) !== null) {
      results.push(match);
    }
    return results.map(match => ({
      command: str[match.index],
      index: match.index
    }))
    .reduceRight((all, cur) => {
      const chunk = str.substring(cur.index, all.length ? all[all.length - 1].index : str.length);
      return all.concat([
         { command: cur.command,
         index: cur.index,
         chunk: (chunk.length > 0) ? chunk.substr(1, chunk.length - 1) : chunk }
      ]);
    }, [])
    .reverse()
    .map((el) => {
      const values = el.chunk.match(digitRegEx);
      el.en = pathCommands[el.command];
      el.values = values ? values.map(parseFloat) : [];
      delete el.chunk;
      return el;
    });
  };
  const getD = (el) => {
    const attr = el.getAttribute("d");
    return (attr == null) ? "" : attr;
  };
  const clear = element => {
    element.removeAttribute("d");
    return element;
  };
  const appendPathCommand = (el, command, ...args) => {
    el.setAttribute("d", `${getD(el)}${command}${flatten_arrays$1(...args).join(" ")}`);
    return el;
  };
  const getCommands = element => parsePathCommands(getD(element));
  const methods$2$1 = {
    addCommand: appendPathCommand,
    appendCommand: appendPathCommand,
    clear,
    getCommands: getCommands,
    get: getCommands,
    getD: el => el.getAttribute("d"),
  };
  Object.keys(pathCommands).forEach((key) => {
    methods$2$1[pathCommands[key]] = (el, ...args) => appendPathCommand(el, key, ...args);
  });
  var path = {
    path: {
      methods: methods$2$1
    }
  };
  const setRectSize = (el, rx, ry) => {
    [, , rx, ry]
      .forEach((value, i) => el.setAttribute(attributes.rect[i], value));
    return el;
  };
  const setRectOrigin = (el, a, b) => {
    [...coordinates(...flatten_arrays$1(a, b)).slice(0, 2)]
      .forEach((value, i) => el.setAttribute(attributes.rect[i], value));
    return el;
  };
  const fixNegatives = function (arr) {
    [0, 1].forEach(i => {
      if (arr[2 + i] < 0) {
        if (arr[0 + i] === undefined) { arr[0 + i] = 0; }
        arr[0 + i] += arr[2 + i];
        arr[2 + i] = -arr[2 + i];
      }
    });
    return arr;
  };
  var rect$1 = {
    rect: {
      args: (a, b, c, d) => {
        const coords = coordinates(...flatten_arrays$1(a, b, c, d)).slice(0, 4);
        switch (coords.length) {
          case 0: case 1: case 2: case 3: return fixNegatives([, , ...coords]);
          default: return fixNegatives(coords);
        }
      },
      methods: {
        origin: setRectOrigin,
        setOrigin: setRectOrigin,
        center: setRectOrigin,
        setCenter: setRectOrigin,
        size: setRectSize,
        setSize: setRectSize,
      }
    }
  };
  var style = {
    style: {
      init: (el, text) => {
          el.textContent = "";
          el.appendChild(cdata(text));
      },
      methods: {
        setTextContent: (el, text) => {
          el.textContent = "";
          el.appendChild(cdata(text));
          return el;
        }
      }
    }
  };
  var text = {
    text: {
      args: (a, b, c) => coordinates(...flatten_arrays$1(a, b, c)).slice(0, 2),
      init: (element, a, b, c, d) => {
        const text = [a,b,c,d].filter(a => typeof a === Keys.string).shift();
        if (text) {
          element.appendChild(win.document.createTextNode(text));
        }
      }
    }
  };
  const makeIDString = function () {
    return Array.from(arguments)
      .filter(a => typeof a === Keys.string || a instanceof String)
      .shift() || UUID();
  };
  const args = (...args) => [makeIDString(...args)];
  var maskTypes = {
    mask: { args: args },
    clipPath: { args: args },
    symbol: { args: args },
    marker: {
      args: args,
      methods: {
        size: setViewBox,
        setViewBox: setViewBox
      }
    },
  };
  const getPoints = (el) => {
    const attr = el.getAttribute("points");
    return (attr == null) ? "" : attr;
  };
  const polyString = function () {
    return Array
      .from(Array(Math.floor(arguments.length / 2)))
      .map((_, i) => `${arguments[i * 2 + 0]},${arguments[i * 2 + 1]}`)
      .join(" ");
  };
  const stringifyArgs = (...args) => [polyString(...coordinates(...flatten_arrays$1(...args)))];
  const setPoints$1 = (element, ...args) => {
    element.setAttribute("points", stringifyArgs(...args)[0]);
    return element;
  };
  const addPoint = (element, ...args) => {
    element.setAttribute("points", [getPoints(element), stringifyArgs(...args)[0]]
      .filter(a => a !== "")
      .join(" "));
    return element;
  };
  const Args$1 = function (...args) {
    return args.length === 1 && typeof args[0] === Keys.string
      ? [args[0]]
      : stringifyArgs(...args);
  };
  var polys = {
    polyline: {
      args: Args$1,
      methods: {
        setPoints: setPoints$1,
        addPoint
      }
    },
    polygon: {
      args: Args$1,
      methods: {
        setPoints: setPoints$1,
        addPoint
      }
    }
  };
  var Spec = Object.assign({},
    svg,
    g,
    circle$1,
    ellipse$1,
    line$1,
    path,
    rect$1,
    style,
    text,
    maskTypes,
    polys,
  );
  var ManyElements = {
    presentation: [
      "color",
      "color-interpolation",
      "cursor",
      "direction",
      "display",
      "fill",
      "fill-opacity",
      "fill-rule",
      "font-family",
      "font-size",
      "font-size-adjust",
      "font-stretch",
      "font-style",
      "font-variant",
      "font-weight",
      "image-rendering",
      "letter-spacing",
      "opacity",
      "overflow",
      "paint-order",
      "pointer-events",
      "preserveAspectRatio",
      "shape-rendering",
      "stroke",
      "stroke-dasharray",
      "stroke-dashoffset",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-miterlimit",
      "stroke-opacity",
      "stroke-width",
      "tabindex",
      "transform-origin",
      "user-select",
      "vector-effect",
      "visibility"
    ],
    animation: [
      "accumulate",
      "additive",
      "attributeName",
      "begin",
      "by",
      "calcMode",
      "dur",
      "end",
      "from",
      "keyPoints",
      "keySplines",
      "keyTimes",
      "max",
      "min",
      "repeatCount",
      "repeatDur",
      "restart",
      "to",
      "values",
    ],
    effects: [
      "azimuth",
      "baseFrequency",
      "bias",
      "color-interpolation-filters",
      "diffuseConstant",
      "divisor",
      "edgeMode",
      "elevation",
      "exponent",
      "filter",
      "filterRes",
      "filterUnits",
      "flood-color",
      "flood-opacity",
      "in",
      "in2",
      "intercept",
      "k1",
      "k2",
      "k3",
      "k4",
      "kernelMatrix",
      "lighting-color",
      "limitingConeAngle",
      "mode",
      "numOctaves",
      "operator",
      "order",
      "pointsAtX",
      "pointsAtY",
      "pointsAtZ",
      "preserveAlpha",
      "primitiveUnits",
      "radius",
      "result",
      "seed",
      "specularConstant",
      "specularExponent",
      "stdDeviation",
      "stitchTiles",
      "surfaceScale",
      "targetX",
      "targetY",
      "type",
      "xChannelSelector",
      "yChannelSelector",
    ],
    text: [
      "dx",
      "dy",
      "alignment-baseline",
      "baseline-shift",
      "dominant-baseline",
      "lengthAdjust",
      "method",
      "overline-position",
      "overline-thickness",
      "rotate",
      "spacing",
      "startOffset",
      "strikethrough-position",
      "strikethrough-thickness",
      "text-anchor",
      "text-decoration",
      "text-rendering",
      "textLength",
      "underline-position",
      "underline-thickness",
      "word-spacing",
      "writing-mode",
    ],
    gradient: [
      "gradientTransform",
      "gradientUnits",
      "spreadMethod",
    ],
  };
  Object.values(NodeNames)
    .reduce((a,b) => a.concat(b), [])
    .filter(nodeName => attributes[nodeName] === undefined)
    .forEach(nodeName => { attributes[nodeName] = []; });
  [ [["svg", "defs", "g"].concat(NodeNames.v, NodeNames.t), ManyElements.presentation],
    [["filter"], ManyElements.effects],
    [NodeNames.cT.concat("text"), ManyElements.text],
    [NodeNames.cF, ManyElements.effects],
    [NodeNames.cG, ManyElements.gradient],
  ].forEach(pair => pair[0].forEach(key => {
    attributes[key] = attributes[key].concat(pair[1]);
  }));
  const getClassList = (element) => {
    if (element == null) { return []; }
    const currentClass = element.getAttribute(Keys.class);
    return (currentClass == null
      ? []
      : currentClass.split(" ").filter(s => s !== ""));
  };
  var classMethods = {
    addClass: (element, newClass) => {
      const classes = getClassList(element)
        .filter(c => c !== newClass);
      classes.push(newClass);
      element.setAttributeNS(null, Keys.class, classes.join(" "));
    },
    removeClass: (element, removedClass) => {
      const classes = getClassList(element)
        .filter(c => c !== removedClass);
      element.setAttributeNS(null, Keys.class, classes.join(" "));
    },
    setClass: (element, className) => {
      element.setAttributeNS(null, Keys.class, className);
    },
    setId: (element, idName) => {
      element.setAttributeNS(null, Keys.id, idName);
    }
  };
  const getAttr = (element) => {
    const t = element.getAttribute(Keys.transform);
    return (t == null || t === "") ? undefined : t;
  };
  const methods$3 = {
    clearTransform: (el) => { el.removeAttribute(Keys.transform); return el; }
  };
  ["translate", "rotate", "scale", "matrix"].forEach(key => {
    methods$3[key] = (element, ...args) => element.setAttribute(
      Keys.transform,
      [getAttr(element), `${key}(${args.join(" ")})`]
        .filter(a => a !== undefined)
        .join(" "));
  });
  const findIdURL = function (arg) {
    if (arg == null) { return ""; }
    if (typeof arg === Keys.string) {
      return arg.slice(0, 3) === "url"
        ? arg
        : `url(#${arg})`;
    }
    if (arg.getAttribute != null) {
      const idString = arg.getAttribute(Keys.id);
      return `url(#${idString})`;
    }
    return "";
  };
  const methods$4 = {};
  ["clip-path",
    "mask",
    "symbol",
    "marker-end",
    "marker-mid",
    "marker-start",
  ].forEach(attr => {
    methods$4[Case.toCamel(attr)] = (element, parent) => element.setAttribute(attr, findIdURL(parent));
  });
  const Nodes = {};
  NodeNames.v.push(...Object.keys(nodes));
  Object.keys(nodes).forEach((node) => {
    nodes[node].attributes = (nodes[node].attributes === undefined
      ? [...ManyElements.presentation]
      : nodes[node].attributes.concat(ManyElements.presentation));
  });
  Object.assign(Nodes, Spec, nodes);
  Object.keys(NodeNames)
    .forEach(key => NodeNames[key]
      .filter(nodeName => Nodes[nodeName] === undefined)
      .forEach((nodeName) => {
        Nodes[nodeName] = {};
      }));
  const passthrough = function () { return Array.from(arguments); };
  Object.keys(Nodes).forEach((key) => {
    if (!Nodes[key].nodeName) { Nodes[key].nodeName = key; }
    if (!Nodes[key].init) { Nodes[key].init = passthrough; }
    if (!Nodes[key].args) { Nodes[key].args = passthrough; }
    if (!Nodes[key].methods) { Nodes[key].methods = {}; }
    if (!Nodes[key].attributes) {
      Nodes[key].attributes = attributes[key] || [];
    }
  });
  const assign$2 = (groups, Methods) => {
    groups.forEach(n =>
      Object.keys(Methods).forEach((method) => {
        Nodes[n].methods[method] = function () {
          Methods[method](...arguments);
          return arguments[0];
        };
      }));
  };
  assign$2(flatten_arrays$1(NodeNames.t, NodeNames.v, NodeNames.g, NodeNames.s, NodeNames.p, NodeNames.i, NodeNames.h, NodeNames.d), classMethods);
  assign$2(flatten_arrays$1(NodeNames.t, NodeNames.v, NodeNames.g, NodeNames.s, NodeNames.p, NodeNames.i, NodeNames.h, NodeNames.d), dom);
  assign$2(flatten_arrays$1(NodeNames.v, NodeNames.g, NodeNames.s), methods$3);
  assign$2(flatten_arrays$1(NodeNames.t, NodeNames.v, NodeNames.g), methods$4);
  const RequiredAttrMap = {
    svg: {
      version: "1.1",
      xmlns: NS,
    },
    style: {
      type: "text/css"
    }
  };
  const RequiredAttributes = (element, nodeName) => {
    if (RequiredAttrMap[nodeName]) {
      Object.keys(RequiredAttrMap[nodeName])
        .forEach(key => element.setAttribute(key, RequiredAttrMap[nodeName][key]));
    }
  };
  const bound = {};
  const constructor = (nodeName, ...args) => {
    const element = win.document.createElementNS(NS, Nodes[nodeName].nodeName);
    RequiredAttributes(element, nodeName);
    Nodes[nodeName].init(element, ...args);
    Nodes[nodeName].args(...args).forEach((v, i) => {
      if (Nodes[nodeName].attributes[i] != null) {
        element.setAttribute(Nodes[nodeName].attributes[i], v);
      }
    });
    Nodes[nodeName].attributes.forEach((attribute) => {
      Object.defineProperty(element, Case.toCamel(attribute), {
        value: function () {
          element.setAttribute(attribute, ...arguments);
          return element;
        }
      });
    });
    Object.keys(Nodes[nodeName].methods).forEach(methodName =>
      Object.defineProperty(element, methodName, {
        value: function () {
          return Nodes[nodeName].methods[methodName].call(bound, element, ...arguments);
        }
      }));
    if (nodesAndChildren[nodeName]) {
      nodesAndChildren[nodeName].forEach((childNode) => {
        Object.defineProperty(element, childNode, {
          value: function () {
            const childElement = constructor(childNode, ...arguments);
            element.appendChild(childElement);
            return childElement;
          }
        });
      });
    }
    return element;
  };
  bound.Constructor = constructor;
  const elements = {};
  Object.keys(NodeNames).forEach(key => NodeNames[key]
    .forEach((nodeName) => {
      elements[nodeName] = (...args) => constructor(nodeName, ...args);
    }));
  const link_rabbitear = (svg, ear) => {
    ear.svg = svg;
    const keys = [
      "segment",
      "circle",
      "ellipse",
      "rect",
      "polygon",
    ];
    keys.filter(key => ear[key] && ear[key].prototype)
      .forEach((key) => {
        ear[key].prototype.svg = function () { return svg.path(this.svgPath()); };
      });
  	Nodes.graph = {
    	nodeName: "g",
    	init: function (element, graph, options = {}) {
  			ear.graph.svg(graph, { ...options, parent: element });
  			return element;
  		},
    	args: () => [],
    	methods: Nodes.g.methods,
    	attributes: Nodes.g.attributes,
  	};
  	nodesAndChildren.graph = [...nodesAndChildren.g];
  	nodesAndChildren.svg.push("graph");
  	nodesAndChildren.g.push("graph");
  };
  const Linker = function (lib) {
  	if (lib.graph && lib.origami) {
  		link_rabbitear(this, lib);
  	}
  };
  const bindRabbitEar = (_this, library) => {
  	libraries.math.vector = library.vector;
  };
  const possibleFoldObject = (object) => {
    if (typeof object !== "object") { return false; }
    const foldKeys = ["vertices_coords", "edges_vertices", "faces_vertices", "faces_edges"];
    return Object.keys(object)
      .map(key => foldKeys.includes(key))
      .reduce((a, b) => a || b, false);
  };
  const getFoldObject = (array) => array
    .filter(a => possibleFoldObject(a))
    .shift();
  const bindFoldToSvg = (_this, library) => {
    const oldInit = Nodes.svg.init;
    Nodes.svg.init = function (element, ...args) {
      const fold_object = getFoldObject(args);
      if (fold_object) {
        const options = library.options(...args);
        library.render_into_svg(element, fold_object, options);
      }
      return oldInit(element, ...args);
    };
  };
  const use$1 = function (library) {
  	if (library.origami) {
  		bindRabbitEar(this, library);
  	}
  	if (library.render_into_svg) {
  		bindFoldToSvg(this, library);
  	}
  };
  const initialize = function (svg, ...args) {
    args.filter(arg => typeof arg === Keys.function)
      .forEach(func => func.call(svg, svg));
  };
  const SVG = function () {
    const svg = constructor(Keys.svg, ...arguments);
    if (win.document.readyState === "loading") {
      win.document.addEventListener("DOMContentLoaded", () => initialize(svg, ...arguments));
    } else {
      initialize(svg, ...arguments);
    }
    return svg;
  };
  Object.assign(SVG, elements);
  SVG.NS = NS;
  SVG.linker = Linker.bind(SVG);
  SVG.use = use$1.bind(SVG);
  SVG.core = Object.assign(Object.create(null), {
    load: Load,
    save,
    coordinates,
    flatten: flatten_arrays$1,
    attributes,
    children: nodesAndChildren,
    cdata,
    detect,
  }, Case, classMethods, dom, math$1, methods$3, viewBox$1);

  const Libraries = { SVG };
  const vertices_circle = ({ vertices_coords }, attributes = {}) => {
  	const g = Libraries.SVG.g();
  	if (!vertices_coords) { return g; }
    const svg_vertices = vertices_coords
      .map(v => Libraries.SVG.circle(v[0], v[1], 0.01))
  		.forEach(v => g[appendChild](v));
  	g[setAttributeNS](null, "fill", "none");
  	Object.keys(attributes)
  		.forEach(attr => g[setAttributeNS](null, attr, attributes[attr]));
    return g;
  };

  const is_folded_form = (graph) => {
  	return (graph.frame_classes && graph.frame_classes.includes("foldedForm"))
  	 	|| (graph.file_classes && graph.file_classes.includes("foldedForm"));
  };

  var query = /*#__PURE__*/Object.freeze({
    __proto__: null,
    is_folded_form: is_folded_form
  });

  const Libraries$1 = { SVG };
  const GROUP_FOLDED = {};
  const GROUP_FLAT = {
  	stroke: "black",
  };
  const STYLE_FOLDED = {};
  const STYLE_FLAT = {
  	m: { stroke: "red" },
  	v: { stroke: "blue" },
  	f: { stroke: "lightgray" },
  };
  const edges_assignment_names$1 = {
    B: boundary$1,
    b: boundary$1,
    M: mountain,
    m: mountain,
    V: valley,
    v: valley,
    F: mark,
    f: mark,
    U: unassigned,
    u: unassigned
  };
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
  const edges_assignment_indices = (graph) => {
    const assignment_indices = { u:[], f:[], v:[], m:[], b:[] };
    const lowercase_assignment = graph[edges_assignment]
  		.map(a => edges_assignment_to_lowercase[a]);
    graph[edges_vertices]
  		.map((_, i) => lowercase_assignment[i] || "u")
  		.forEach((a, i) => assignment_indices[a].push(i));
    return assignment_indices;
  };
  const edges_coords = ({ vertices_coords, edges_vertices }) => {
  	if (!vertices_coords || !edges_vertices) { return []; }
  	return edges_vertices.map(ev => ev.map(v => vertices_coords[v]));
  };
  const segment_to_path = s => `M${s[0][0]} ${s[0][1]}L${s[1][0]} ${s[1][1]}`;
  const edges_path_data = (graph) => edges_coords(graph)
  	.map(segment => segment_to_path(segment)).join("");
  const edges_path_data_assign = ({ vertices_coords, edges_vertices, edges_assignment }) => {
  	if (!vertices_coords || !edges_vertices) { return {}; }
  	if (!edges_assignment) {
  		return ({ u: edges_path_data({ vertices_coords, edges_vertices }) });
  	}
    const data = edges_assignment_indices({ vertices_coords, edges_vertices, edges_assignment });
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
  const edges_paths_assign = ({ vertices_coords, edges_vertices, edges_assignment }) => {
  	const data = edges_path_data_assign({ vertices_coords, edges_vertices, edges_assignment });
    Object.keys(data).forEach(assignment => {
      const path = Libraries$1.SVG.path(data[assignment]);
      path[setAttributeNS](null, _class, edges_assignment_names$1[assignment]);
      data[assignment] = path;
    });
  	return data;
  };
  const apply_style = (el, attributes = {}) => Object.keys(attributes)
  	.forEach(key => el[setAttributeNS](null, key, attributes[key]));
  const edges_paths = (graph, attributes = {}) => {
  	const isFolded = is_folded_form(graph);
  	const paths = edges_paths_assign(graph);
  	const group = Libraries$1.SVG.g();
  	Object.keys(paths).forEach(key => {
  		paths[key][setAttributeNS](null, _class, edges_assignment_names$1[key]);
  		apply_style(paths[key], isFolded ? STYLE_FOLDED[key] : STYLE_FLAT[key]);
  		apply_style(paths[key], attributes[key]);
  		apply_style(paths[key], attributes[edges_assignment_names$1[key]]);
  		group[appendChild](paths[key]);
  		Object.defineProperty(group, edges_assignment_names$1[key], { get: () => paths[key] });
  	});
  	apply_style(group, isFolded ? GROUP_FOLDED : GROUP_FLAT);
  	apply_style(group, attributes.stroke ? { stroke: attributes.stroke } : {});
  	return group;
  };

  const Libraries$2 = { SVG };
  const FACE_STYLE_FOLDED = {
  	back: { fill: "white" },
  	front: { fill: "#ddd" }
  };
  const FACE_STYLE_FLAT = {
  };
  const GROUP_STYLE_FOLDED = {
  	stroke: "black",
  	"stroke-linejoin": "bevel"
  };
  const GROUP_STYLE_FLAT = {
  	fill: "none"
  };
  const get_faces_winding = (graph) => graph
    .faces_vertices
    .map(fv => fv.map(v => graph.vertices_coords[v])
      .map((c, i, arr) => [c, arr[(i + 1) % arr.length], arr[(i + 2) % arr.length]])
      .map(tri => math.core.cross2(
        math.core.subtract(tri[1], tri[0]),
        math.core.subtract(tri[2], tri[1]),
      )).reduce((a, b) => a + b, 0));
  const faces_sorted_by_layer = function (faces_layer) {
    return faces_layer.map((layer, i) => ({ layer, i }))
      .sort((a, b) => a.layer - b.layer)
      .map(el => el.i);
  };
  const apply_style$1 = (el, attributes = {}) => Object.keys(attributes)
  	.forEach(key => el[setAttributeNS](null, key, attributes[key]));
  const finalize_faces = (graph, svg_faces, group, attributes) => {
  	const isFolded = is_folded_form(graph);
    const orderIsCertain = graph[faces_re_layer] != null
      && graph[faces_re_layer].length === graph[faces_vertices].length;
    const classNames = [ [front], [back] ];
    const faceDir = get_faces_winding(graph).map(c => c < 0);
    faceDir.map(w => (w ? classNames[0] : classNames[1]))
      .forEach((className, i) => {
  			svg_faces[i][setAttributeNS](null, _class, className);
  			apply_style$1(svg_faces[i], isFolded
  				? FACE_STYLE_FOLDED[className]
  				: FACE_STYLE_FLAT[className]);
  			apply_style$1(svg_faces[i], attributes[className]);
  		});
    const facesInOrder = (orderIsCertain
      ? faces_sorted_by_layer(graph[faces_re_layer]).map(i => svg_faces[i])
      : svg_faces);
  	facesInOrder.forEach(face => group[appendChild](face));
  	Object.defineProperty(group, "front", {
  		get: () => svg_faces.filter((_, i) => faceDir[i]),
  	});
  	Object.defineProperty(group, "back", {
  		get: () => svg_faces.filter((_, i) => !faceDir[i]),
  	});
  	apply_style$1(group, isFolded ? GROUP_STYLE_FOLDED : GROUP_STYLE_FLAT);
  	return group;
  };
  const faces_vertices_polygon = (graph, attributes = {}) => {
  	const g = Libraries$2.SVG.g();
  	if (!graph.vertices_coords || !graph.faces_vertices) { return g; }
    const svg_faces = graph.faces_vertices
      .map(fv => fv.map(v => [0, 1].map(i => graph.vertices_coords[v][i])))
      .map(face => Libraries$2.SVG.polygon(face));
    svg_faces.forEach((face, i) => face[setAttributeNS](null, index, i));
  	g[setAttributeNS](null, "fill", "white");
    return finalize_faces(graph, svg_faces, g, attributes);
  };
  const faces_edges_polygon = function (graph, attributes = {}) {
  	const g = Libraries$2.SVG.g();
    if (faces_edges in graph === false
      || edges_vertices in graph === false
      || vertices_coords in graph === false) {
      return g;
    }
    const svg_faces = graph[faces_edges]
      .map(face_edges => face_edges
        .map(edge => graph[edges_vertices][edge])
        .map((vi, i, arr) => {
          const next = arr[(i + 1) % arr.length];
          return (vi[1] === next[0] || vi[1] === next[1] ? vi[0] : vi[1]);
        }).map(v => [0, 1].map(i => graph[vertices_coords][v][i])))
      .map(face => Libraries$2.SVG.polygon(face));
    svg_faces.forEach((face, i) => face[setAttributeNS](null, index, i));
  	g[setAttributeNS](null, "fill", "white");
    return finalize_faces(graph, svg_faces, g, attributes);
  };

  const Libraries$3 = { SVG };
  const FOLDED = {
  	fill: "none",
  };
  const FLAT = {
  	stroke: "black",
  	fill: "white",
  };
  const apply_style$2 = (el, attributes = {}) => Object.keys(attributes)
  	.forEach(key => el[setAttributeNS](null, key, attributes[key]));
  const boundaries_polygon = (graph, attributes = {}) => {
  	const g = Libraries$3.SVG.g();
  	if (!graph.vertices_coords || !graph.edges_vertices || !graph.edges_assignment) { return g; }
    const boundary = get_boundary(graph)
  		.vertices
      .map(v => [0, 1].map(i => graph.vertices_coords[v][i]));
    if (boundary.length === 0) { return g; }
    const poly = Libraries$3.SVG.polygon(boundary);
    poly[setAttributeNS](null, _class, boundary$1);
  	g[appendChild](poly);
  	apply_style$2(g, is_folded_form(graph) ? FOLDED : FLAT);
  	Object.keys(attributes)
  		.forEach(attr => g[setAttributeNS](null, attr, attributes[attr]));
    return g;
  };

  const graph_classes = graph => [
  	(graph[file_classes] ? graph[file_classes] : []),
  	(graph[frame_classes] ? graph[frame_classes] : []),
  ].reduce((a, b) => a.concat(b));

  const Libraries$4 = { SVG };
  const faces_draw_function = (graph, options) => (graph[faces_vertices] != null
    ? faces_vertices_polygon(graph, options)
    : faces_edges_polygon(graph, options));
  const draw_func = {
    vertices: vertices_circle,
    edges: edges_paths,
    faces: faces_draw_function,
    boundaries: boundaries_polygon
  };
  const draw_groups = (graph, options = {}) => {
  	const parent = options.parent
  		? options.parent
  		: Libraries$4.SVG.g();
    const classValue = ["graph"].concat(graph_classes(graph)).join(" ");
    parent[setAttributeNS](null, _class, classValue);
    [boundaries, faces, edges, vertices]
    	.map(key => {
  			const attributes = options[key] || {};
    	  const group = draw_func[key](graph, attributes);
    	  group[setAttributeNS](null, _class, key);
  			Object.defineProperty(parent, key, { get: () => group });
    	  return group;
    	})
    	.filter(group => group.childNodes.length > 0)
  		.forEach(group => parent[appendChild](group));
  	return parent;
  };
  [boundaries, faces, edges, vertices].forEach(key => {
  	draw_groups[key] = function () {
  		const group = draw_func[key](...arguments);
  		group[setAttributeNS](null, _class, key);
  		return group;
  	};
  });

  const find_adjacent_faces_to_edge = ({ vertices_faces, edges_vertices, edges_faces, faces_edges, faces_vertices }, edge) => {
    if (edges_faces && edges_faces[edge]) {
      return edges_faces[edge];
    }
    const vertices = edges_vertices[edge];
    if (vertices_faces !== undefined) {
      const faces = [];
      for (let i = 0; i < vertices_faces[vertices[0]].length; i += 1) {
        for (let j = 0; j < vertices_faces[vertices[1]].length; j += 1) {
          if (vertices_faces[vertices[0]][i] === vertices_faces[vertices[1]][j]) {
            faces.push(vertices_faces[vertices[0]][i]);
          }
        }
      }
      return faces;
    }
    if (faces_edges) {
      let faces = [];
      for (let i = 0; i < faces_edges.length; i += 1) {
        for (let e = 0; e < faces_edges[i].length; e += 1) {
          if (faces_edges[i][e] === edge) { faces.push(i); }
        }
      }
      return faces;
    }
  };

  const update_vertices_vertices = ({ vertices_vertices }, vertex, incident_vertices) => {
    if (!vertices_vertices) { return; }
    vertices_vertices[vertex] = [...incident_vertices];
    incident_vertices.forEach((v, i, arr) => {
      const otherV = arr[(i + 1) % arr.length];
      const otherI = vertices_vertices[v].indexOf(otherV);
      vertices_vertices[v][otherI] = vertex;
    });
  };
  const update_vertices_edges = ({ vertices_edges }, vertices, old_edge, new_vertex, new_edges) => {
    if (!vertices_edges) { return; }
    vertices_edges[new_vertex] = [...new_edges];
    vertices
      .map(v => vertices_edges[v].indexOf(old_edge))
      .forEach((index, i) => {
        vertices_edges[vertices[i]][index] = new_edges[i];
      });
  };
  const update_vertices_faces = ({ vertices_faces }, vertex, faces) => {
    if (!vertices_faces) { return; }
    vertices_faces[vertex] = [...faces];
  };
  const update_faces_vertices = ({ faces_vertices }, faces, new_vertex, incident_vertices) => {
    if (!faces_vertices) { return; }
    faces
      .map(i => faces_vertices[i])
        .forEach(face => face
          .map((fv, i, arr) => {
            const nextI = (i + 1) % arr.length;
            return (fv === incident_vertices[0]
                    && arr[nextI] === incident_vertices[1])
                    || (fv === incident_vertices[1]
                    && arr[nextI] === incident_vertices[0])
              ? nextI : undefined;
          }).filter(el => el !== undefined)
          .sort((a, b) => b - a)
          .forEach(i => face.splice(i, 0, new_vertex)));
  };
  const update_faces_edges = ({ edges_vertices, faces_edges }, faces, new_vertex, new_edges, old_edge) => {
    if (!faces_edges) { return; }
    faces
      .map(i => faces_edges[i])
      .forEach((face) => {
        const edgeIndex = face.indexOf(old_edge);
        const prevEdge = face[(edgeIndex + face.length - 1) % face.length];
        const nextEdge = face[(edgeIndex + 1) % face.length];
        const vertices = [
          [prevEdge, old_edge],
          [old_edge, nextEdge],
        ].map((pairs) => {
          const verts = pairs.map(e => edges_vertices[e]);
          return verts[0][0] === verts[1][0] || verts[0][0] === verts[1][1]
            ? verts[0][0] : verts[0][1];
        }).reduce((a, b) => a.concat(b), []);
        const edges = [
          [vertices[0], new_vertex],
          [new_vertex, vertices[1]],
        ].map((verts) => {
          const in0 = verts.map(v => edges_vertices[new_edges[0]].indexOf(v) !== -1)
            .reduce((a, b) => a && b, true);
          const in1 = verts.map(v => edges_vertices[new_edges[1]].indexOf(v) !== -1)
            .reduce((a, b) => a && b, true);
          if (in0) { return new_edges[0]; }
          if (in1) { return new_edges[1]; }
          throw new Error("split_edge() bad faces_edges");
        });
        if (edgeIndex === face.length - 1) {
          face.splice(edgeIndex, 1, edges[0]);
          face.unshift(edges[1]);
        } else {
          face.splice(edgeIndex, 1, ...edges);
        }
        return edges;
      });
  };
  const split_edge_into_two = (graph, edge_index, new_vertex) => {
    const edge_vertices = graph.edges_vertices[edge_index];
    const new_edges = [
      { edges_vertices: [edge_vertices[0], new_vertex] },
      { edges_vertices: [new_vertex, edge_vertices[1]] },
    ];
    new_edges.forEach((edge, i) => {
      [EDGES_ASSIGNMENT, EDGES_FOLDANGLE]
        .filter(key => graph[key] !== undefined && graph[key][edge_index] !== undefined)
        .forEach(key => edge[key] = graph[key][edge_index]);
      if (graph.edges_faces && graph.edges_faces[edge_index] !== undefined) {
        edge.edges_faces = [...graph.edges_faces[edge_index]];
      }
      if (graph.edges_vector) {
        const verts = edge.edges_vertices.map(v => graph.vertices_coords[v]);
        edge.edges_vector = math.core.subtract(verts[1], verts[0]);
      }
      if (graph.edges_length) {
        const verts = edge.edges_vertices.map(v => graph.vertices_coords[v]);
        edge.edges_length = math.core.distance2(...verts);
      }
    });
    return new_edges;
  };
  const split_edge = function (graph, old_edge, coords) {
    if (graph.edges_vertices.length < old_edge) { return undefined; }
    const incident_vertices = graph.edges_vertices[old_edge];
    if (!coords) {
      coords = math.core.midpoint(...incident_vertices);
    }
    const similar = incident_vertices.map(v => graph.vertices_coords[v])
  	  .map(vert => math.core.distance(vert, coords) < math.core.EPSILON);
  	if (similar[0]) { return { vertex: incident_vertices[0], edges: {} }; }
  	if (similar[1]) { return { vertex: incident_vertices[1], edges: {} }; }
  	const vertex = graph.vertices_coords.length;
  	graph.vertices_coords[vertex] = coords;
  	const new_edges = [0, 1].map(i => i + graph.edges_vertices.length);
    split_edge_into_two(graph, old_edge, vertex)
      .forEach((edge, i) => Object.keys(edge)
        .forEach((key) => { graph[key][new_edges[i]] = edge[key]; }));
    update_vertices_vertices(graph, vertex, incident_vertices);
    update_vertices_edges(graph, incident_vertices, old_edge, vertex, new_edges);
    const incident_faces = find_adjacent_faces_to_edge(graph, old_edge);
    if (incident_faces) {
      update_vertices_faces(graph, vertex, incident_vertices);
      update_faces_vertices(graph, incident_faces, vertex, incident_vertices);
      update_faces_edges(graph, incident_faces, vertex, new_edges, old_edge);
    }
    const edge_map = remove_geometry_indices(graph, EDGES, [ old_edge ]);
    new_edges.forEach((_, i) => { new_edges[i] = edge_map[new_edges[i]]; });
  	edge_map.splice(-2);
  	edge_map[old_edge] = new_edges;
  	return {
      vertex,
      edges: {
        map: edge_map,
        remove: old_edge,
      },
    };
  };

  const intersect_face_with_line = ({ vertices_coords, edges_vertices, faces_vertices, faces_edges }, face, vector, origin) => {
    const face_vertices_indices = faces_vertices[face]
      .map(v => vertices_coords[v])
      .map(coord => math.core.overlap_line_point(vector, origin, coord))
      .map((collinear, i) => collinear ? i : undefined)
      .filter(i => i !== undefined)
      .slice(0, 2);
    const vertices = face_vertices_indices.map(face_vertex_index => ({
      vertex: faces_vertices[face][face_vertex_index],
      face_vertex_index,
    }));
    if (vertices.length > 1) {
      const non_loop_distance = face_vertices_indices[1] - face_vertices_indices[0];
      const index_distance = non_loop_distance < 0
        ? non_loop_distance + faces_vertices[face].length
        : non_loop_distance;
      if (index_distance === 1) { return undefined; }
      return { vertices, edges: [] };
    }
    const edges = faces_edges[face]
      .map(edge => edges_vertices[edge]
        .map(v => vertices_coords[v]))
      .map(seg => [math.core.subtract(seg[1], seg[0]), seg[0]])
      .map(vec_origin => math.core.intersect_line_line(
        vector, origin, ...vec_origin, math.core.include_l, math.core.exclude_s
      )).map((coords, face_edge_index) => ({
        coords,
        face_edge_index,
        edge: faces_edges[face][face_edge_index],
      }))
      .filter(el => el.coords !== undefined)
      .slice(0, 2);
    if (vertices.length > 0 && edges.length > 0) {
      return { vertices, edges };
    }
    if (edges.length > 1) {
      return { vertices: [], edges };
    }
    return undefined;
  };

  const update_vertices_vertices$1 = ({ vertices_coords, vertices_vertices, edges_vertices }, edge) => {
    const v0 = edges_vertices[edge][0];
    const v1 = edges_vertices[edge][1];
    vertices_vertices[v0] = sort_vertices_counter_clockwise({ vertices_coords }, vertices_vertices[v0].concat(v1), v0);
    vertices_vertices[v1] = sort_vertices_counter_clockwise({ vertices_coords }, vertices_vertices[v1].concat(v0), v1);
  };
  const make_edge = ({ vertices_coords }, vertices, faces) => {
    const new_edge_coords = vertices
      .map(v => vertices_coords[v])
      .reverse();
    return {
      edges_vertices: [...vertices],
      edges_foldAngle: 0,
      edges_assignment: "U",
      edges_length: math.core.distance2(...new_edge_coords),
      edges_vector: math.core.subtract(...new_edge_coords),
      edges_faces: [...faces],
    };
  };
  const split_circular_array = (array, indices) => {
    indices.sort((a, b) => a - b);
    return [
      array.slice(indices[1]).concat(array.slice(0, indices[0] + 1)),
      array.slice(indices[0], indices[1] + 1)
    ];
  };
  const make_faces = ({ edges_vertices, faces_vertices }, face, vertices) => {
    const vertices_to_edge = make_vertices_to_edge_bidirectional({ edges_vertices });
    const indices = vertices
      .map(el => faces_vertices[face].indexOf(el));
    return split_circular_array(faces_vertices[face], indices)
      .map(face_vertices => ({
        faces_vertices: face_vertices,
        faces_edges: face_vertices
          .map((fv, i, arr) => `${fv} ${arr[(i + 1) % arr.length]}`)
          .map(key => vertices_to_edge[key])
      }));
  };
  const split_convex_face = (graph, face, vector, origin) => {
    const intersect = intersect_face_with_line(graph, face, vector, origin);
    if (intersect === undefined) { return undefined; }
    const vertices = intersect.vertices.map(el => el.vertex);
    const changes = [];
    intersect.edges.map((el, i, arr) => {
  		el.edge = changes.length ? changes[0].edges.map[el.edge] : el.edge;
  		changes.push(split_edge(graph, el.edge, el.coords));
    });
    vertices.push(...changes.map(result => result.vertex));
    const edge = graph.edges_vertices.length;
    const faces = [0, 1].map(i => graph.faces_vertices.length + i - 1);
    const new_edge = make_edge(graph, vertices, faces);
    Object.keys(new_edge)
      .filter(key => graph[key] !== undefined)
      .forEach((key) => { graph[key][edge] = new_edge[key]; });
    update_vertices_vertices$1(graph, edge);
    const new_faces = make_faces(graph, face, vertices);
  	const faces_map = remove_geometry_indices(graph, "faces", [face]);
    new_faces.forEach((new_face, i) => Object.keys(new_face)
      .filter(key => graph[key] !== undefined)
      .forEach((key) => { graph[key][faces[i]] = new_face[key]; }));
    graph.vertices_faces = make_vertices_faces(graph);
    graph.edges_faces = make_edges_faces(graph);
    graph.faces_faces = make_faces_faces(graph);
  	if (changes.length === 2) {
  	  const inverse_map = invert_simple_map(changes[0].edges.map);
  		changes[1].edges.remove = inverse_map[changes[1].edges.remove];
  	}
  	faces_map[face] = faces;
    return {
      vertices,
      faces: {
        map: faces_map,
        remove: face,
      },
      edges: {
        map: merge_nextmaps(...changes.map(res => res.edges.map)),
        new: edge,
  			remove: changes.map(el => el.edges.remove),
      }
    };
  };

  const Graph = {};
  Graph.prototype = Object.create(Object.prototype);
  Graph.prototype.constructor = Graph;
  const graphMethods = Object.assign({
    clean,
    populate,
    fragment,
    subgraph,
    assign: assign$1,
    svg: draw_groups,
  },
    transform,
  );
  Object.keys(graphMethods).forEach(key => {
    Graph.prototype[key] = function () {
      return graphMethods[key](this, ...arguments);
    };
  });
  const graphMethodsRenamed = {
    addVertices: add_vertices,
    splitEdge: split_edge,
    faceSpanningTree: make_face_spanning_tree,
    explodeFaces: explode_faces,
  };
  Object.keys(graphMethodsRenamed).forEach(key => {
    Graph.prototype[key] = function () {
      return graphMethodsRenamed[key](this, ...arguments);
    };
  });
  Graph.prototype.splitFace = function (face, ...args) {
    const line = math.core.get_line(...args);
    return split_convex_face(this, face, line.vector, line.origin);
  };
  Graph.prototype.copy = function () {
    return Object.assign(Object.create(Graph.prototype), clone(this));
  };
  Graph.prototype.load = function (object, options = {}) {
    if (typeof object !== "object") { return; }
    if (options.append !== true) {
      keys.forEach(key => delete this[key]);
    }
    Object.assign(this, { file_spec, file_creator }, clone(object));
  };
  Graph.prototype.clear = function () {
    fold_keys.graph.forEach(key => delete this[key]);
    fold_keys.orders.forEach(key => delete this[key]);
    delete this.file_frames;
  };
  Graph.prototype.folded = function () {
    const vertices_coords = make_vertices_coords_folded$1(this, ...arguments);
    return Object.assign(
      Object.create(Graph.prototype),
      Object.assign(clone(this), { vertices_coords }, { frame_classes: ["foldedForm"] }));
  };
  const shortenKeys = function (el, i, arr) {
    const object = Object.create(null);
    Object.keys(el).forEach((k) => {
      object[k.substring(this.length + 1)] = el[k];
    });
    return object;
  };
  const getComponent = function (key) {
    return transpose_graph_arrays(this, key)
      .map(shortenKeys.bind(key))
      .map(setup[key].bind(this));
  };
  ["vertices", "edges", "faces"]
    .forEach(key => Object.defineProperty(Graph.prototype, key, {
      get: function () { return getComponent.call(this, key); }
    }));
  Object.defineProperty(Graph.prototype, "boundary", {
    get: function () {
      const boundary = get_boundary(this);
      const poly = math.polygon(boundary.vertices.map(v => this.vertices_coords[v]));
      Object.keys(boundary).forEach(key => { poly[key] = boundary[key]; });
      return Object.assign(poly, boundary);
    }
  });
  const nearestMethods = {
    vertices: nearest_vertex,
    edges: nearest_edge,
    faces: face_containing_point,
  };
  Graph.prototype.nearest = function () {
    const point = math.core.get_vector(arguments);
    const nears = Object.create(null);
    const cache = {};
    ["vertices", "edges", "faces"].forEach(key => {
      Object.defineProperty(nears, singularize[key], {
        get: () => {
          if (cache[key] !== undefined) { return cache[key]; }
          cache[key] = nearestMethods[key](this, point);
          return cache[key];
        }
      });
      filter_keys_with_prefix(this, key).forEach(fold_key =>
        Object.defineProperty(nears, fold_key, {
          get: () => this[fold_key][nears[singularize[key]]]
        }));
    });
    return nears;
  };
  var GraphProto = Graph.prototype;

  const clip = function (
    {vertices_coords, vertices_edges, edges_vertices, edges_assignment, boundaries_vertices},
    line) {
    if (!boundaries_vertices) {
      boundaries_vertices = get_boundary({
        vertices_edges, edges_vertices, edges_assignment
      }).vertices;
    }
    const polygon = math.polygon(boundaries_vertices.map(v => vertices_coords[v]));
    return polygon.clip(line);
  };

  const add_edges = (graph, edges_vertices) => {
    if (!graph.edges_vertices) {
      graph.edges_vertices = [];
    }
    if (typeof edges_vertices[0] === "number") { edges_vertices = [edges_vertices]; }
    const indices = edges_vertices.map((_, i) => graph.edges_vertices.length + i);
    graph.edges_vertices.push(...edges_vertices);
    const index_map = remove_duplicate_edges(graph).map;
    return indices.map(i => index_map[i]);
  };

  const CreasePattern = {};
  CreasePattern.prototype = Object.create(GraphProto);
  CreasePattern.prototype.constructor = CreasePattern;
  const arcResolution = 96;
  CreasePattern.prototype.copy = function () {
    return Object.assign(Object.create(CreasePattern.prototype), clone(this));
  };
  CreasePattern.prototype.folded = function () {
    const vertices_coords = make_vertices_coords_folded(this, ...arguments);
    return Object.assign(
      Object.create(GraphProto),
      Object.assign(clone(this), { vertices_coords }, { frame_classes: ["foldedForm"] }));
  };
  const edges_array = function (array) {
    array.mountain = (degrees = -180) => {
      array.forEach(i => {
        this.edges_assignment[i] = "M";
        this.edges_foldAngle[i] = degrees;
      });
      return array;
    };
    array.valley = (degrees = 180) => {
      array.forEach(i => {
        this.edges_assignment[i] = "V";
        this.edges_foldAngle[i] = degrees;
      });
      return array;
    };
    array.flat = () => {
      array.forEach(i => {
        this.edges_assignment[i] = "F";
        this.edges_foldAngle[i] = 0;
      });
      return array;
    };
    return array;
  };
  ["line", "ray", "segment"].forEach(type => {
    CreasePattern.prototype[type] = function () {
      const primitive = math[type](...arguments);
      if (!primitive) { return; }
      const segment = clip(this, primitive);
      if (!segment) { return; }
      const vertices = add_vertices(this, segment);
      const edges = add_edges(this, vertices);
      const map = fragment(this).edges.map;
      populate(this);
      return edges_array.call(this, edges.map(e => map[e])
        .reduce((a, b) => a.concat(b), []));
    };
  });
  ["circle", "ellipse", "rect", "polygon"].forEach((fName) => {
    CreasePattern.prototype[fName] = function () {
      const primitive = math[fName](...arguments);
      if (!primitive) { return; }
      const segments = primitive.segments(arcResolution)
        .map(segment => math.segment(segment))
        .map(segment => clip(this, segment))
        .filter(a => a !== undefined);
      if (!segments) { return; }
      const edges = [];
      segments.forEach(segment => {
        const verts = add_vertices(this, segment);
        edges.push(...add_edges(this, verts));
      });
      const map = fragment(this).edges.map;
      populate(this);
      return edges_array.call(this, edges.map(e => map[e])
        .reduce((a, b) => a.concat(b), []));
    };
  });
  var CreasePatternProto = CreasePattern.prototype;

  const fold_faces_layer = (faces_layer, faces_folding) => {
    const new_faces_layer = [];
    const arr = faces_layer.map((_, i) => i);
    const folding = arr.filter(i => faces_folding[i]);
    const not_folding = arr.filter(i => !faces_folding[i]);
    not_folding
      .sort((a, b) => faces_layer[a] - faces_layer[b])
      .forEach((face, i) => { new_faces_layer[face] = i; });
    folding
      .sort((a, b) => faces_layer[b] - faces_layer[a])
      .forEach((face, i) => { new_faces_layer[face] = not_folding.length + i; });
    return new_faces_layer;
  };

  const get_face_sidedness = (vector, origin, face_center, face_color) => {
    const vec2 = [face_center[0] - origin[0], face_center[1] - origin[1]];
    const det = vector[0] * vec2[1] - vector[1] * vec2[0];
    return face_color ? det > 0 : det < 0;
  };
  const make_face_center_fast = (graph, face_index) => {
    if (!graph.faces_vertices[face_index]) { return [0, 0]; }
    return graph
      .faces_vertices[face_index]
      .map(v => graph.vertices_coords[v])
      .reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0])
      .map(el => el / graph.faces_vertices[face_index].length);
  };
  const prepare_graph_crease = (graph, vector, point, face_index) => {
    const faceCount = count.faces(graph);
    const faceCountArray = Array.from(Array(faceCount));
    if (!graph["faces_re:layer"]) {
      graph["faces_re:layer"] = Array(faceCount).fill(0);
    }
    graph["faces_re:preindex"] = faceCountArray.map((_, i) => i);
    if (!graph.faces_matrix) {
      graph.faces_matrix = make_faces_matrix(graph, face_index);
    }
    graph.faces_coloring = make_faces_coloring_from_matrix(graph);
    graph["faces_re:creases"] = graph.faces_matrix
      .map(mat => math.core.invert_matrix3(mat))
      .map(mat => math.core.multiply_matrix3_line3(mat, vector, point));
    graph.faces_center = faceCountArray
      .map((_, i) => make_face_center_fast(graph, i));
    graph["faces_re:sidedness"] = faceCountArray
      .map((_, i) => get_face_sidedness(
        graph["faces_re:creases"][i].vector,
        graph["faces_re:creases"][i].origin,
        graph.faces_center[i],
        graph.faces_coloring[i]
      ));
  };
  const two_furthest_points = function (points) {
    let top = [0, -Infinity];
    let left = [Infinity, 0];
    let right = [-Infinity, 0];
    let bottom = [0, Infinity];
    points.forEach((p) => {
      if (p[0] < left[0]) { left = p; }
      if (p[0] > right[0]) { right = p; }
      if (p[1] < bottom[1]) { bottom = p; }
      if (p[1] > top[1]) { top = p; }
    });
    const t_to_b = Math.abs(top[1] - bottom[1]);
    const l_to_r = Math.abs(right[0] - left[0]);
    return t_to_b > l_to_r ? [bottom, top] : [left, right];
  };
  const opposite_assignment = { "M":"V", "m":"V", "V":"M", "v":"M" };
  const opposingCrease = assign => opposite_assignment[assign] || assign;
  const flat_fold = function (
    graph,
    vector,
    point,
    face_index,
    assignment = "V"
  ) {
    const opposite_crease = opposingCrease(assignment);
    if (face_index == null) {
      const containing_point = face_containing_point(graph, point);
      face_index = (containing_point === undefined) ? 0 : containing_point;
    }
    vector = math.core.resize(3, vector);
    point = math.core.resize(3, point);
    prepare_graph_crease(graph, vector, point, face_index);
    const folded = clone(graph);
    folded.vertices_coords.forEach(coord => coord.splice(2));
    const faces_split = Array.from(Array(count.faces(graph)))
      .map((_, i) => i)
      .reverse()
      .map((i) => {
        const face_color = folded.faces_coloring[i];
        const change = split_convex_face(
          folded,
  				i,
          folded["faces_re:creases"][i].vector,
          folded["faces_re:creases"][i].origin,
        );
        if (change === undefined) { return undefined; }
        folded.edges_assignment[change.edges.new] = face_color
          ? assignment
          : opposite_crease;
        folded.edges_foldAngle[change.edges.new] = face_color
          ? edges_assignment_degrees[assignment] || 0
          : edges_assignment_degrees[opposite_crease] || 0;
  			const new_faces = change.faces.map[change.faces.remove];
  			new_faces.forEach((f) => {
  				folded.faces_center[f] = make_face_center_fast(folded, f);
  				folded["faces_re:sidedness"][f] = get_face_sidedness(
  				  graph["faces_re:creases"][change.faces.remove].vector,
  					graph["faces_re:creases"][change.faces.remove].origin,
  					folded.faces_center[f],
  					graph.faces_coloring[change.faces.remove]
  				);
  				folded["faces_re:layer"][f] = graph["faces_re:layer"][change.faces.remove];
  				folded["faces_re:preindex"][f] = graph["faces_re:preindex"][change.faces.remove];
  			});
  			return change;
      })
      .reverse();
    folded["faces_re:layer"] = fold_faces_layer(
      folded["faces_re:layer"],
      folded["faces_re:sidedness"]
    );
    const face_0_newIndex = (faces_split[0] === undefined
      ? 0
      : folded["faces_re:preindex"]
        .map((pre, i) => ({ pre, new: i }))
        .filter(obj => obj.pre === 0)
        .filter(obj => folded["faces_re:sidedness"][obj.new])
        .shift().new);
    let face_0_preMatrix = graph.faces_matrix[0];
    if (assignment === "M" || assignment === "m"
      || assignment === "V" || assignment === "v") {
      face_0_preMatrix = (faces_split[0] === undefined
        && !graph["faces_re:sidedness"][0]
        ? graph.faces_matrix[0]
        : math.core.multiply_matrices3(
          graph.faces_matrix[0],
          math.core.make_matrix3_reflectZ(
            graph["faces_re:creases"][0].vector,
            graph["faces_re:creases"][0].origin
          )
        )
      );
    }
    const folded_faces_matrix = make_faces_matrix(folded, face_0_newIndex)
      .map(m => math.core.multiply_matrices3(face_0_preMatrix, m));
    folded.faces_coloring = make_faces_coloring_from_matrix(
      { faces_matrix: folded_faces_matrix }
    );
    const crease_0 = math.core.multiply_matrix3_line3(
      face_0_preMatrix,
      graph["faces_re:creases"][0].vector,
      graph["faces_re:creases"][0].origin,
    );
    const fold_direction = math.core.normalize(math.core.rotate270(crease_0.vector));
    const split_points = faces_split
      .map((change, i) => (change === undefined
  		  ? undefined
  			: folded.edges_vertices[change.edges.new]
  				.map(v => folded.vertices_coords[v])
  				.map(p => math.core.multiply_matrix3_vector3(graph.faces_matrix[i], p))))
      .filter(a => a !== undefined)
      .reduce((a, b) => a.concat(b), []);
    folded["re:construction"] = (split_points.length === 0
      ? {
          type: "flip",
          direction: fold_direction
        }
      : {
          type: "fold",
          assignment,
          direction: fold_direction,
          edge: two_furthest_points(split_points)
        });
    folded.faces_matrix = folded_faces_matrix;
    folded["vertices_re:foldedCoords"] = make_vertices_coords_folded$1(
      folded,
      face_0_newIndex);
    folded.faces_matrix = folded_faces_matrix;
    delete graph["faces_re:creases"];
    delete folded["faces_re:creases"];
    delete graph["faces_re:sidedness"];
    delete folded["faces_re:sidedness"];
    delete graph["faces_re:preindex"];
    delete folded["faces_re:preindex"];
    delete graph.faces_coloring;
    delete folded.faces_coloring;
    delete graph.faces_center;
    delete folded.faces_center;
    return folded;
  };

  const Origami = {};
  Origami.prototype = Object.create(GraphProto);
  Origami.prototype.constructor = Origami;
  Origami.prototype.flatFold = function () {
    const line = math.core.get_line(arguments);
    const graph = flat_fold(this, line.vector, line.origin);
    [VERTICES, EDGES, FACES]
      .map(key => get_graph_keys_with_prefix(this, key))
      .reduce(fn_cat$1, [])
      .forEach(key => delete this[key]);
    Object.assign(this, graph);
    return this;
  };
  Origami.prototype.copy = function () {
    return Object.assign(Object.create(Origami.prototype), clone(this));
  };
  Origami.prototype.folded = function () {
    const vertices_coords = make_vertices_coords_folded$1(this, ...arguments);
    return Object.assign(
      Object.create(Origami.prototype),
      Object.assign(clone(this), { vertices_coords }, { frame_classes: ["foldedForm"] }));
  };
  var OrigamiProto = Origami.prototype;

  const add_vertices_split_edges = (graph, vertices_coords) => {
    const new_indices = add_vertices(graph, vertices_coords);
    const edges_coords = make_edges_coords(graph);
    const vertices_edge_collinear = vertices_coords
      .map(v => edges_coords
        .map(edge => math.core.overlap_line_point(
          math.core.subtract(edge[1], edge[0]),
          edge[0],
          v,
          math.core.exclude_s))
        .map((on_edge, i) => (on_edge ? i : undefined))
        .filter(a => a !== undefined)
        .shift());
    const remove_indices = vertices_edge_collinear
      .filter(vert_edge => vert_edge !== undefined);
    const new_edges = vertices_edge_collinear
      .map((e, i) => ({ e, i }))
      .filter(el => el.e !== undefined)
      .map(el => {
        const edge = transpose_graph_array_at_index(graph, "edges", el.e);
        return [edge, clone(edge)]
          .map((obj, i) => Object.assign(obj, {
            edges_vertices: [ graph.edges_vertices[el.e][i], new_indices[el.i] ]
          }));
      })
      .reduce((a,b) => a.concat(b), []);
    const edges_length = count.edges(graph);
    const diff = { new: { edges: [] } };
    new_edges.forEach((new_edge, i) => Object.keys(new_edge)
      .forEach((key) => {
        if (graph[key] === undefined) { graph[key] = []; }
        graph[key][edges_length + i] = new_edge[key];
        diff.new.edges[i] = edges_length + i;
      }));
    remove_geometry_indices(graph, "edges", remove_indices);
    return new_indices;
  };

  var graph_methods = Object.assign(Object.create(null), {
  	assign: assign$1,
  	add_vertices,
  	add_vertices_split_edges,
  	add_edges,
  	split_edge,
  	split_face: split_convex_face,
  	flat_fold,
  	clean,
  	get_circular_edges,
  	get_duplicate_edges,
  	get_duplicate_vertices,
  	get_collinear_vertices,
  	count,
  	implied: implied_count,
  	fragment,
  	remove: remove_geometry_indices,
  	populate,
  	subgraph,
  	explode_faces,
  	clip,
  	svg: draw_groups,
  },
  	make,
  	transform,
  	boundary,
  	walk,
  	nearest$1,
  	fold_object,
  	sort$1,
  	span,
  	maps,
  	query,
  	remove_methods,
  	vertices_isolated,
  );

  const make_polygon_vertices = i => (i === 4
    ? [[0, 0], [1, 0], [1, 1], [0, 1]]
    : math.core.make_regular_polygon(i, 0.5 / Math.sin(Math.PI / i)));
  const Create = {};
  const polygon_names = [ null, null, null, "triangle", "square", "pentagon", "hexagon", "heptagon", "octogon", "nonagon", "decagon", "hendecagon", "dodecagon"];
  [0, 1, 2].forEach(i => { delete polygon_names[i]; });
  const create_init = graph => populate(graph);
  polygon_names.forEach((name, i) => {
    const arr = Array.from(Array(i));
    Create[name] = () => create_init({
      vertices_coords: make_polygon_vertices(i),
      edges_vertices: arr.map((_, i) => [i, (i + 1) % arr.length]),
      edges_assignment: arr.map(() => "B"),
    });
  });
  Create.rectangle = (width = 1, height = 1) => create_init({
  	vertices_coords: [[0, 0], [0, width], [width, height], [0, height]],
  	edges_vertices: Array.from(Array(4)).map((_, i, arr) => [i, (i + 1) % arr.length]),
  	edges_assignment: Array.from(Array(4)).map(() => "B"),
  });
  Create.circle = (edge_count = 90) => create_init({
  	vertices_coords: math.core.make_regular_polygon(edge_count, 1),
  	edges_vertices: Array.from(Array(edge_count)).map((_, i, arr) => [i, (i + 1) % arr.length]),
  	edges_assignment: Array.from(Array(edge_count)).map(() => "B"),
  });
  Create.kite = () => create_init({
    vertices_coords: [[0,0], [Math.sqrt(2)-1,0], [1,0], [1,1-(Math.sqrt(2)-1)], [1,1], [0,1]],
    edges_vertices: [[0,1], [1,2], [2,3], [3,4], [4,5], [5,0], [5,1], [3,5], [5,2]],
    edges_assignment: ["B","B","B","B","B","B","V","V","F"],
  });

  const Constructors$1 = Object.create(null);
  const ConstructorPrototypes = {
    graph: GraphProto,
    cp: CreasePatternProto,
    origami: OrigamiProto,
  };
  const default_graph = {
    graph: () => ({}),
    cp: Create.square,
    origami: Create.square,
  };
  Object.keys(ConstructorPrototypes).forEach(name => {
    Constructors$1[name] = function () {
      const argFolds = Array.from(arguments)
        .filter(a => fold_object_certainty(a))
        .map(obj => JSON.parse(JSON.stringify(obj)));
      return Object.assign(
        Object.create(ConstructorPrototypes[name]),
        (argFolds.length ? {} : default_graph[name]()),
        ...argFolds,
        { file_spec, file_creator }
      );
    };
    Constructors$1[name].prototype = ConstructorPrototypes[name];
    Constructors$1[name].prototype.constructor = Constructors$1[name];
    Object.keys(Create).forEach(funcName => {
      Constructors$1[name][funcName] = function () {
        return Constructors$1[name](Create[funcName](...arguments));
      };
    });
  });
  Object.assign(Constructors$1.graph, graph_methods);

  const reflect_point$1 = (foldLine, point) => {
  	const matrix = math.core.make_matrix2_reflect(foldLine.vector, foldLine.origin);
    return math.core.multiply_matrix2_vector2(matrix, point);
  };
  const test_axiom1_2 = (params, poly) => [params.points
  	.map(p => math.core.overlap_convex_polygon_point(poly, p, ear.math.include))
  	.reduce((a, b) => a && b, true)];
  const test_axiom3 = (params, poly) => {
  	const segments = params.lines.map(line => math.core
  		.clip_line_in_convex_polygon(poly,
        line.vector,
        line.origin,
        math.core.include,
        math.core.include_l));
  	if (segments[0] === undefined || segments[1] === undefined) {
  		return [false, false];
  	}
  	const results = math.core.axiom3(
  		params.lines[0].vector, params.lines[0].origin,
  		params.lines[1].vector, params.lines[1].origin);
    const results_clip = results.map(line => line === undefined ? undefined : math.core
        .intersect_convex_polygon_line(
          poly,
          line.vector,
          line.origin,
          ear.math.include_s,
          ear.math.exclude_l));
    const results_inside = [0, 1].map((i) => results_clip[i] !== undefined);
  	const seg0Reflect = results
  		.map((foldLine, i) => foldLine === undefined ? undefined : [
  			reflect_point$1(foldLine, segments[0][0]),
  			reflect_point$1(foldLine, segments[0][1])
  		]);
    const reflectMatch = seg0Reflect
      .map((seg, i) => seg === undefined ? false : (
  		  math.core.overlap_line_point(math.core.subtract(segments[1][1], segments[1][0]),
          segments[1][0], seg[0]) ||
  		  math.core.overlap_line_point(math.core.subtract(segments[1][1], segments[1][0]),
          segments[1][0], seg[1]) ||
  		  math.core.overlap_line_point(math.core.subtract(seg[1], seg[0]), seg[0],
          segments[1][0]) ||
  		  math.core.overlap_line_point(math.core.subtract(seg[1], seg[0]), seg[0],
          segments[1][1])
  	  ));
    return [0, 1].map(i => reflectMatch[i] === true && results_inside[i] === true);
  };
  const test_axiom4 = (params, poly) => {
  	const intersect = math.core.intersect_line_line(
  		params.lines[0].vector, params.lines[0].origin,
  		math.core.rotate90(params.lines[0].vector), params.points[0],
  		math.core.include_l, math.core.include_l);
  	return [
  		[params.points[0], intersect]
  			.map(p => math.core.overlap_convex_polygon_point(poly, p, math.core.include))
  			.reduce((a, b) => a && b, true)
  	];
  };
  const test_axiom5 = (params, poly) => {
  	const result = math.core.axiom5(
  		params.lines[0].vector, params.lines[0].origin,
  		params.points[0], params.points[1]);
  	if (result.length === 0) { return []; }
  	const testParamPoints = params.points
  		.map(point => math.core.overlap_convex_polygon_point(poly, point, math.core.include))
  		.reduce((a, b) => a && b, true);
  	const testReflections = result
  		.map(foldLine => reflect_point$1(foldLine, params.points[1]))
  		.map(point => math.core.overlap_convex_polygon_point(poly, point, math.core.include));
  	return testReflections.map(ref => ref && testParamPoints);
  };
  const test_axiom6 = function (params, poly) {
  	const results = math.core.axiom6(
  		params.lines[0].vector, params.lines[0].origin,
  		params.lines[1].vector, params.lines[1].origin,
  		params.points[0], params.points[1]);
  	if (results.length === 0) { return []; }
  	const testParamPoints = params.points
  		.map(point => math.core.overlap_convex_polygon_point(poly, point, math.core.include))
  		.reduce((a, b) => a && b, true);
  	if (!testParamPoints) { return results.map(() => false); }
  	const testReflect0 = results
  		.map(foldLine => reflect_point$1(foldLine, params.points[0]))
  		.map(point => math.core.overlap_convex_polygon_point(poly, point, math.core.include));
  	const testReflect1 = results
  		.map(foldLine => reflect_point$1(foldLine, params.points[1]))
  		.map(point => math.core.overlap_convex_polygon_point(poly, point, math.core.include));
  	return results.map((_, i) => testReflect0[i] && testReflect1[i]);
  };
  const test_axiom7 = (params, poly) => {
  	const paramPointTest = math.core
  		.overlap_convex_polygon_point(poly, params.points[0], math.core.include);
  	const foldLine = math.core.axiom7(
  		params.lines[0].vector, params.lines[0].origin,
  		params.lines[1].vector, params.points[0]);
    if (foldLine === undefined) { return [false]; }
  	const reflected = reflect_point$1(foldLine, params.points[0]);
  	const reflectTest = math.core.overlap_convex_polygon_point(poly, reflected, math.core.include);
  	const paramLineTest = (math.core.intersect_convex_polygon_line(poly,
  		params.lines[1].vector,
  		params.lines[1].origin,
      math.core.include_s,
      math.core.include_l) !== undefined);
  	return [paramPointTest && reflectTest && paramLineTest];
  };
  const test_axiom_funcs = [null,
    test_axiom1_2,
    test_axiom1_2,
    test_axiom3,
    test_axiom4,
    test_axiom5,
    test_axiom6,
    test_axiom7,
  ];
  delete test_axiom_funcs[0];
  const test_axiom = (number, params, obj) => {
  	const boundary = (typeof obj === "object" && obj.vertices_coords)
  		? get_boundary(obj).vertices.map(v => obj.vertices_coords[v])
  		: obj;
  	return test_axiom_funcs[number](params, boundary);
  };
  Object.keys(test_axiom_funcs).forEach(number => {
  	test_axiom[number] = (...args) => test_axiom(number, ...args);
  });

  var ar = [
  	null,
  	"اصنع خطاً يمر بنقطتين",
  	"اصنع خطاً عن طريق طي نقطة واحدة إلى أخرى",
  	"اصنع خطاً عن طريق طي خط واحد على آخر",
  	"اصنع خطاً يمر عبر نقطة واحدة ويجعل خطاً واحداً فوق نفسه",
  	"اصنع خطاً يمر بالنقطة الأولى ويجعل النقطة الثانية على الخط",
  	"اصنع خطاً يجلب النقطة الأولى إلى الخط الأول والنقطة الثانية إلى الخط الثاني",
  	"اصنع خطاً يجلب نقطة إلى خط ويجعل خط ثاني فوق نفسه"
  ];
  var de = [
  	null,
  	"Falte eine Linie durch zwei Punkte",
  	"Falte zwei Punkte aufeinander",
  	"Falte zwei Linien aufeinander",
  	"Falte eine Linie auf sich selbst, falte dabei durch einen Punkt",
  	"Falte einen Punkt auf eine Linie, falte dabei durch einen anderen Punkt",
  	"Falte einen Punkt auf eine Linie und einen weiteren Punkt auf eine weitere Linie",
  	"Falte einen Punkt auf eine Linie und eine weitere Linie in sich selbst zusammen"
  ];
  var en = [
  	null,
  	"fold a line through two points",
  	"fold two points together",
  	"fold two lines together",
  	"fold a line on top of itself, creasing through a point",
  	"fold a point to a line, creasing through another point",
  	"fold a point to a line and another point to another line",
  	"fold a point to a line and another line onto itself"
  ];
  var es = [
  	null,
  	"dobla una línea entre dos puntos",
  	"dobla dos puntos juntos",
  	"dobla y une dos líneas",
  	"dobla una línea sobre sí misma, doblándola hacia un punto",
  	"dobla un punto hasta una línea, doblándola a través de otro punto",
  	"dobla un punto hacia una línea y otro punto hacia otra línea",
  	"dobla un punto hacia una línea y otra línea sobre sí misma"
  ];
  var fr = [
  	null,
  	"créez un pli passant par deux points",
  	"pliez pour superposer deux points",
  	"pliez pour superposer deux lignes",
  	"rabattez une ligne sur elle-même à l'aide d'un pli qui passe par un point",
  	"rabattez un point sur une ligne à l'aide d'un pli qui passe par un autre point",
  	"rabattez un point sur une ligne et un autre point sur une autre ligne",
  	"rabattez un point sur une ligne et une autre ligne sur elle-même"
  ];
  var hi = [
  	null,
  	"एक क्रीज़ बनाएँ जो दो स्थानों से गुजरता है",
  	"एक स्थान को दूसरे स्थान पर मोड़कर एक क्रीज़ बनाएँ",
  	"एक रेखा पर दूसरी रेखा को मोड़कर क्रीज़ बनाएँ",
  	"एक क्रीज़ बनाएँ जो एक स्थान से गुजरता है और एक रेखा को स्वयं के ऊपर ले आता है",
  	"एक क्रीज़ बनाएँ जो पहले स्थान से गुजरता है और दूसरे स्थान को रेखा पर ले आता है",
  	"एक क्रीज़ बनाएँ जो पहले स्थान को पहली रेखा पर और दूसरे स्थान को दूसरी रेखा पर ले आता है",
  	"एक क्रीज़ बनाएँ जो एक स्थान को एक रेखा पर ले आता है और दूसरी रेखा को स्वयं के ऊपर ले आता है"
  ];
  var jp = [
  	null,
  	"2点に沿って折り目を付けます",
  	"2点を合わせて折ります",
  	"2つの線を合わせて折ります",
  	"点を通過させ、既にある線に沿って折ります",
  	"点を線沿いに合わせ別の点を通過させ折ります",
  	"線に向かって点を折り、同時にもう一方の線に向かってもう一方の点を折ります",
  	"線に向かって点を折り、同時に別の線をその上に折ります"
  ];
  var ko = [
  	null,
  	"두 점을 통과하는 선으로 접으세요",
  	"두 점을 함께 접으세요",
  	"두 선을 함께 접으세요",
  	"그 위에 선을 접으면서 점을 통과하게 접으세요",
  	"점을 선으로 접으면서, 다른 점을 지나게 접으세요",
  	"점을 선으로 접고 다른 점을 다른 선으로 접으세요",
  	"점을 선으로 접고 다른 선을 그 위에 접으세요"
  ];
  var ms = [
  	null,
  	"lipat garisan melalui dua titik",
  	"lipat dua titik bersama",
  	"lipat dua garisan bersama",
  	"lipat satu garisan di atasnya sendiri, melipat melalui satu titik",
  	"lipat satu titik ke garisan, melipat melalui titik lain",
  	"lipat satu titik ke garisan dan satu lagi titik ke garisan lain",
  	"lipat satu titik ke garisan dan satu lagi garisan di atasnya sendiri"
  ];
  var pt = [
  	null,
  	"dobre uma linha entre dois pontos",
  	"dobre os dois pontos para uni-los",
  	"dobre as duas linhas para uni-las",
  	"dobre uma linha sobre si mesma, criando uma dobra ao longo de um ponto",
  	"dobre um ponto até uma linha, criando uma dobra ao longo de outro ponto",
  	"dobre um ponto até uma linha e outro ponto até outra linha",
  	"dobre um ponto até uma linha e outra linha sobre si mesma"
  ];
  var ru = [
  	null,
  	"сложите линию через две точки",
  	"сложите две точки вместе",
  	"сложите две линии вместе",
  	"сверните линию сверху себя, сгибая через точку",
  	"сложите точку в линию, сгибая через другую точку",
  	"сложите точку в линию и другую точку в другую линию",
  	"сложите точку в линию и другую линию на себя"
  ];
  var tr = [
  	null,
  	"iki noktadan geçen bir çizgi boyunca katla",
  	"iki noktayı birbirine katla",
  	"iki çizgiyi birbirine katla",
  	"bir noktadan kıvırarak kendi üzerindeki bir çizgi boyunca katla",
  	"başka bir noktadan kıvırarak bir noktayı bir çizgiye katla",
  	"bir noktayı bir çizgiye ve başka bir noktayı başka bir çizgiye katla",
  	"bir noktayı bir çizgiye ve başka bir çizgiyi kendi üzerine katla"
  ];
  var vi = [
  	null,
  	"tạo một nếp gấp đi qua hai điểm",
  	"tạo nếp gấp bằng cách gấp một điểm này sang điểm khác",
  	"tạo nếp gấp bằng cách gấp một đường lên một đường khác",
  	"tạo một nếp gấp đi qua một điểm và đưa một đường lên trên chính nó",
  	"tạo một nếp gấp đi qua điểm đầu tiên và đưa điểm thứ hai lên đường thẳng",
  	"tạo một nếp gấp mang điểm đầu tiên đến đường đầu tiên và điểm thứ hai cho đường thứ hai",
  	"tạo một nếp gấp mang lại một điểm cho một đường và đưa một đường thứ hai lên trên chính nó"
  ];
  var zh = [
  	null,
  	"通過兩點折一條線",
  	"將兩點折疊起來",
  	"將兩條線折疊在一起",
  	"通過一個點折疊一條線在自身上面",
  	"將一個點，通過另一個點折疊成一條線，",
  	"將一個點折疊為一條線，再將另一個點折疊到另一條線",
  	"將一個點折疊成一條線，另一條線折疊到它自身上"
  ];
  var axioms$2 = {
  	ar: ar,
  	de: de,
  	en: en,
  	es: es,
  	fr: fr,
  	hi: hi,
  	jp: jp,
  	ko: ko,
  	ms: ms,
  	pt: pt,
  	ru: ru,
  	tr: tr,
  	vi: vi,
  	zh: zh
  };

  var es$1 = {
  	fold: {
  		verb: "",
  		noun: "doblez"
  	},
  	valley: "doblez de valle",
  	mountain: "doblez de montaña",
  	inside: "",
  	outside: "",
  	open: "",
  	closed: "",
  	rabbit: "",
  	rabbit2: "",
  	petal: "",
  	squash: "",
  	flip: "dale la vuelta a tu papel"
  };
  var en$1 = {
  	fold: {
  		verb: "fold",
  		noun: "crease"
  	},
  	valley: "valley fold",
  	mountain: "mountain fold",
  	inside: "inside reverse fold",
  	outside: "outside reverse fold",
  	open: "open sink",
  	closed: "closed sink",
  	rabbit: "rabbit ear fold",
  	rabbit2: "double rabbit ear fold",
  	petal: "petal fold",
  	squash: "squash fold",
  	flip: "flip over"
  };
  var zh$1 = {
  	fold: {
  		verb: "",
  		noun: ""
  	},
  	valley: "谷摺",
  	mountain: "山摺",
  	inside: "內中割摺",
  	outside: "外中割摺",
  	open: "開放式沉壓摺",
  	closed: "封閉式沉壓摺",
  	rabbit: "兔耳摺",
  	rabbit2: "雙兔耳摺",
  	petal: "花瓣摺",
  	blintz: "坐墊基",
  	squash: "壓摺",
  	flip: ""
  };
  var folds = {
  	es: es$1,
  	en: en$1,
  	zh: zh$1
  };

  var text$1 = {
    axioms: axioms$2,
    folds,
  };

  const isBrowser$1 = typeof window !== "undefined"
    && typeof window.document !== "undefined";
  const isNode$1 = typeof process !== "undefined"
    && process.versions != null
    && process.versions.node != null;

  const htmlString$1 = "<!DOCTYPE html><title>.</title>";
  const win$1 = (function () {
    let w = {};
    if (isNode$1) {
      const { DOMParser, XMLSerializer } = require("xmldom");
      w.DOMParser = DOMParser;
      w.XMLSerializer = XMLSerializer;
      w.document = new DOMParser().parseFromString(htmlString$1, "text/html");
    } else if (isBrowser$1) {
      w = window;
    }
    return w;
  }());

  const make_faces_geometry = (graph) => {
  	const { THREE } = win$1;
    const vertices = graph.vertices_coords
      .map(v => [v[0], v[1], v[2] || 0])
      .reduce(fn_cat$1, []);
    const normals = graph.vertices_coords
      .map(v => [0, 0, 1])
      .reduce(fn_cat$1, []);
    const colors = graph.vertices_coords
      .map(v => [1, 1, 1])
      .reduce(fn_cat$1, []);
    const faces = graph.faces_vertices
      .map(fv => fv
        .map((v, i, arr) => [arr[0], arr[i+1], arr[i+2]])
        .slice(0, fv.length - 2))
      .reduce(fn_cat$1, [])
      .reduce(fn_cat$1, []);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(faces);
    return geometry;
  };
  const make_edge_cylinder = (edge_coords, edge_vector, radius, end_pad = 0) => {
    if (math.core.mag_squared(edge_vector) < math.core.EPSILON) {
  		return [];
  	}
    const normalized = math.core.normalize(edge_vector);
    const perp = [ [1,0,0], [0,1,0], [0,0,1] ]
      .map(vec => math.core.cross3(vec, normalized))
  		.sort((a, b) => math.core.magnitude(b) - math.core.magnitude(a))
  		.shift();
    const rotated = [ math.core.normalize(perp) ];
  	for (let i = 1; i < 4; i += 1) {
  		rotated.push(math.core.cross3(rotated[i - 1], normalized));
  	}
    const dirs = rotated.map(v => math.core.scale(v, radius));
  	const nudge = [-end_pad, end_pad].map(n => math.core.scale(normalized, n));
  	const coords = end_pad === 0
  		? edge_coords
  		: edge_coords.map((coord, i) => math.core.add(coord, nudge[i]));
    return coords
      .map(v => dirs.map(dir => math.core.add(v, dir)))
      .reduce(fn_cat$1, []);
  };
  const make_edges_geometry = function ({
    vertices_coords, edges_vertices, edges_assignment, edges_coords, edges_vector
  }, scale=0.002, end_pad = 0) {
  	const { THREE } = win$1;
    if (!edges_coords) {
      edges_coords = edges_vertices.map(edge => edge.map(v => vertices_coords[v]));
    }
    if (!edges_vector) {
      edges_vector = edges_coords.map(edge => math.core.subtract(edge[1], edge[0]));
    }
    edges_coords = edges_coords
      .map(edge => edge
        .map(coord => math.core.resize(3, coord)));
  	edges_vector = edges_vector
  		.map(vec => math.core.resize(3, vec));
    const colorAssignments = {
      "B": [0.0,0.0,0.0],
      "M": [0.0,0.0,0.0],
      "F": [0.0,0.0,0.0],
      "V": [0.0,0.0,0.0],
    };
    const colors = edges_assignment.map(e =>
      [colorAssignments[e], colorAssignments[e], colorAssignments[e], colorAssignments[e],
      colorAssignments[e], colorAssignments[e], colorAssignments[e], colorAssignments[e]]
    ).reduce(fn_cat$1, [])
     .reduce(fn_cat$1, [])
     .reduce(fn_cat$1, []);
    const vertices = edges_coords
      .map((coords, i) => make_edge_cylinder(coords, edges_vector[i], scale, end_pad))
      .reduce(fn_cat$1, [])
      .reduce(fn_cat$1, []);
  	const normals = edges_vector.map(vector => {
      if (math.core.mag_squared(vector) < math.core.EPSILON) { throw "degenerate edge"; }
      let normalized = math.core.normalize(vector);
      const scaled = math.core.scale(normalized, scale);
      const c0 = math.core.scale(math.core.normalize(math.core.cross3(vector, [0,0,-1])), scale);
      const c1 = math.core.scale(math.core.normalize(math.core.cross3(vector, [0,0,1])), scale);
      return [
        c0, [-c0[2], c0[1], c0[0]],
        c1, [-c1[2], c1[1], c1[0]],
        c0, [-c0[2], c0[1], c0[0]],
        c1, [-c1[2], c1[1], c1[0]]
      ]
    }).reduce(fn_cat$1, [])
      .reduce(fn_cat$1, []);
    let faces = edges_coords.map((e,i) => [
      i*8+0, i*8+4, i*8+1,
      i*8+1, i*8+4, i*8+5,
      i*8+1, i*8+5, i*8+2,
      i*8+2, i*8+5, i*8+6,
      i*8+2, i*8+6, i*8+3,
      i*8+3, i*8+6, i*8+7,
      i*8+3, i*8+7, i*8+0,
      i*8+0, i*8+7, i*8+4,
      i*8+0, i*8+1, i*8+3,
      i*8+1, i*8+2, i*8+3,
      i*8+5, i*8+4, i*8+7,
      i*8+7, i*8+6, i*8+5,
    ]).reduce(fn_cat$1, []);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(faces);
    geometry.computeVertexNormals();
    return geometry;
  };

  var foldToThree = /*#__PURE__*/Object.freeze({
    __proto__: null,
    make_faces_geometry: make_faces_geometry,
    make_edges_geometry: make_edges_geometry
  });

  axiom.test = test_axiom;
  const Ear = Object.assign(root, Constructors$1, {
  	math: math.core,
  	axiom,
  	diagram,
  	single,
  	text: text$1,
  	webgl: foldToThree,
  });
  Object.defineProperty(Ear, "use", {
  	enumerable: false,
  	value: use.bind(Ear),
  });
  Object.keys(math)
  	.filter(key => key !== "core")
  	.forEach((key) => { Ear[key] = math[key]; });
  SVG.use(Ear);
  Ear.use(SVG);

  return Ear;

})));
