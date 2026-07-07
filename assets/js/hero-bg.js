/* ============================================================
   Site background — WebGL flowing charcoal gradient.
   A fixed, full-viewport fragment shader behind all content: domain-warped
   fractal noise mapped to a dark palette (near-black voids + soft charcoal
   glows) that drifts like liquid. Float precision + 1-bit dither = no banding.
   Falls back to the flat page background if WebGL is unavailable.
   Respects prefers-reduced-motion; pauses while the tab is hidden.
   Tunables: SPEED, and the dark/mid/light colours in the shader.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.querySelector('.site-bg');
  if (!canvas) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var gl = canvas.getContext('webgl', { antialias: false, depth: false, alpha: false, powerPreference: 'low-power' })
        || canvas.getContext('experimental-webgl');
  if (!gl) { canvas.style.display = 'none'; return; }   // graceful: flat dark bg shows

  var SPEED = 1.0;   // drift-speed multiplier

  var VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  var FRAG = [
    'precision highp float;',
    'uniform vec2 u_res;',
    'uniform float u_time;',
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 345.45)); p += dot(p, p + 34.345); return fract(p.x * p.y); }',
    'float noise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v = 0.0, a = 0.5;',
    '  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }',
    '  return v;',
    '}',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / u_res;',
    '  vec2 p = uv * 2.1;',
    '  p.x *= u_res.x / u_res.y;',
    '  float t = u_time * 0.05;',
    '  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3 - t)));',
    '  vec2 r = vec2(fbm(p + 1.6 * q + vec2(1.7, 9.2) + 0.15 * t), fbm(p + 1.6 * q + vec2(8.3, 2.8) - 0.126 * t));',
    '  float f = clamp(fbm(p + 1.8 * r), 0.0, 1.0);',
    '  vec3 dark  = vec3(0.028, 0.028, 0.032);',
    '  vec3 mid   = vec3(0.060, 0.060, 0.068);',
    '  vec3 light = vec3(0.205, 0.205, 0.235);',
    '  vec3 col = mix(dark, mid, smoothstep(0.22, 0.56, f));',
    '  col = mix(col, light, smoothstep(0.56, 0.95, f));',
    '  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;',   // dither -> no banding
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.style.display = 'none'; return; }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.style.display = 'none'; return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uRes = gl.getUniformLocation(prog, 'u_res');
  var uTime = gl.getUniformLocation(prog, 'u_time');

  var DPR = Math.min(window.devicePixelRatio || 1, 1.0);   // soft bg -> 1x is plenty, saves battery
  function resize() {
    var w = Math.max(1, Math.round(window.innerWidth * DPR));
    var h = Math.max(1, Math.round(window.innerHeight * DPR));
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
    if (reduce) render(0);
  }
  function render(tm) {
    gl.uniform1f(uTime, tm);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  if (reduce) { render(0); return; }   // one still frame, no motion

  var running = true;
  function frame(now) {
    if (!running) return;
    render(now * 0.001 * SPEED);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // pause while the tab is hidden (battery)
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { running = false; }
    else if (!running) { running = true; requestAnimationFrame(frame); }
  });
})();
