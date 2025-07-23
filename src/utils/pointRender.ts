export function renderPointCloud(
  canvas: HTMLCanvasElement,
  positions: Float32Array,
  colors: Uint8Array
) {
  const gl = canvas.getContext("webgl");
  if (!gl) throw new Error("WebGL not supported");

  // 着色器源码
  const vsSource = `
    attribute vec3 a_position;
    attribute vec3 a_color;
    varying vec3 v_color;
    void main() {
      gl_PointSize = 2.0; // 控制点大小
      gl_Position = vec4(a_position, 1.0);
      v_color = a_color / 255.0;
    }
  `;
  const fsSource = `
    precision mediump float;
    varying vec3 v_color;
    void main() {
      gl_FragColor = vec4(v_color, 1.0);
    }
  `;

  // 编译 & 连接
  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vsSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fsSource));
  gl.linkProgram(program);
  gl.useProgram(program);

  // === 上传顶点 ===
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

  // === 上传颜色 ===
  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
  const aColor = gl.getAttribLocation(program, "a_color");
  gl.enableVertexAttribArray(aColor);
  gl.vertexAttribPointer(aColor, 3, gl.UNSIGNED_BYTE, false, 0, 0);

  // 清屏 & 绘制
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.POINTS, 0, positions.length / 3);
}
