#version 300 es
precision highp float;

layout (location = 0) in vec3 a_position;
layout (location = 1) in float a_opacity;
layout (location = 2) in vec3 a_scale;
layout (location = 3) in vec4 a_quat;

// SH 系数输入
layout (location = 4) in vec3 a_dc;
layout (location = 5) in vec3 a_sh0;
layout (location = 6) in vec3 a_sh1;
layout (location = 7) in vec3 a_sh2;
layout (location = 8) in vec3 a_sh3;
layout (location = 9) in vec3 a_sh4;
layout (location = 10) in vec3 a_sh5;
layout (location = 11) in vec3 a_sh6;
layout (location = 12) in vec3 a_sh7;
layout (location = 13) in vec3 a_sh8;

uniform mat4 u_view;
uniform mat4 u_proj;
uniform vec2 u_canvasSize;

out float v_opacity;
out mat2 v_cov2D;
out vec3 v_sh[9];
out vec3 v_viewDir;
out vec3 v_color;
out float v_halfSize;

mat3 quatToMat3(vec4 q) {
    float x = q.x, y = q.y, z = q.z, w = q.w;
    return mat3(
    1.0 - 2.0 * y * y - 2.0 * z * z, 2.0 * x * y - 2.0 * z * w, 2.0 * x * z + 2.0 * y * w,
    2.0 * x * y + 2.0 * z * w, 1.0 - 2.0 * x * x - 2.0 * z * z, 2.0 * y * z - 2.0 * x * w,
    2.0 * x * z - 2.0 * y * w, 2.0 * y * z + 2.0 * x * w, 1.0 - 2.0 * x * x - 2.0 * y * y
    );
}

void main() {
    // 传递其他数据
    v_opacity = a_opacity;
    v_color = a_dc;
    v_sh[0] = a_sh0;
    v_sh[1] = a_sh1;
    v_sh[2] = a_sh2;
    v_sh[3] = a_sh3;
    v_sh[4] = a_sh4;
    v_sh[5] = a_sh5;
    v_sh[6] = a_sh6;
    v_sh[7] = a_sh7;
    v_sh[8] = a_sh8;

    // 1. 计算世界空间中的3D协方差矩阵
    mat3 R = quatToMat3(normalize(a_quat));
    mat3 S = mat3(a_scale.x, 0, 0, 0, a_scale.y, 0, 0, 0, a_scale.z);
    mat3 Sigma3D = R * S * S * transpose(R);

    // 2. 转换到视图空间
    mat3 W = mat3(u_view);
    vec4 posView = u_view * vec4(a_position, 1.0);
    v_viewDir = -posView.xyz;
    mat3 Sigma3D_view = W * Sigma3D * transpose(W);

    float near = 0.1; // 应与u_proj的near平面一致

    // 3. 透视投影的雅可比矩阵
    float z = max(abs(posView.z), near);
    float focal = u_proj[1][1];
    float aspect = u_canvasSize.x / u_canvasSize.y;

    // x' = focal * x / (aspect * (-z)),  y' = focal * y / (-z)
    mat3 J = mat3(
        focal / (z * aspect), 0, 0,
        0, focal / z, 0,
        focal * posView.x / (z * z * aspect), focal * posView.y / (z * z), 0
    );

    // 4. Σ_2D = J * Σ_view * J^T
    mat3 cov2d = J * Sigma3D_view * transpose(J);

    // 5. 转换到像素空间
    float sx = 0.5 * u_canvasSize.x;
    float sy = 0.5 * u_canvasSize.y;
    v_cov2D = mat2(
        cov2d[0][0] * sx * sx, cov2d[0][1] * sx * sy,
        cov2d[1][0] * sy * sx, cov2d[1][1] * sy * sy
    );

    // 6. 计算点大小（3σ）
    float mid = (v_cov2D[0][0] + v_cov2D[1][1]) * 0.5;
    float radius = length(vec2(v_cov2D[0][0] - mid, v_cov2D[0][1]));
    float lambda1 = mid + radius;
    gl_PointSize = max(1.0, 3.0 * sqrt(lambda1));

    // 7. 传递归一化协方差到fragment shader
    float halfSize = gl_PointSize * 0.5;
    v_halfSize = halfSize;
    v_cov2D = v_cov2D / (halfSize * halfSize);

    // 8. 投影变换
    gl_Position = u_proj * posView;
}