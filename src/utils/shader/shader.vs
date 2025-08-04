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
out vec4 v_viewDir;
out vec3 v_color;

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
    v_viewDir = -posView;
    mat3 Sigma3D_view = W * Sigma3D * transpose(W);

    float near = 0.1; // 应与u_proj的near平面一致

    // 3. 构建透视投影的雅可比矩阵（3x3版本）
    float z = max(abs(posView.z), near); // 避免除零
    float focal = u_proj[1][1];         // = 1/tan(fov/2)
    float aspect = u_canvasSize.x / u_canvasSize.y;

    mat3 J = mat3(
        focal/z,     0,     -focal*posView.x/(z*z),  // ∂x'/∂x, ∂x'/∂z
        0,     -focal/(z*aspect), focal*posView.y/(z*z*aspect), // ∂y'/∂y, ∂y'/∂z
        0,           0,           0                   // 无z'分量
    );

    // 4. 计算2D协方差矩阵
    mat3 T = transpose(mat3(u_view)) * J;
    mat3 cov2d = transpose(T) * Sigma3D_view * T;

    // 5. 转换到像素空间（基于视口分辨率）
    float pixelScale = 0.5 * min(u_canvasSize.x, u_canvasSize.y);
    v_cov2D = mat2(cov2d) * (pixelScale * pixelScale); // 协方差需要平方缩放

    // 6. 计算点大小（基于特征值）
    float mid = (v_cov2D[0][0] + v_cov2D[1][1]) * 0.5;
    float radius = length(vec2(v_cov2D[0][0] - mid, v_cov2D[0][1]));
    float lambda1 = mid + radius;
    gl_PointSize = 3.0 * sqrt(lambda1); // 3σ原则
//    gl_PointSize = 3.0;

    // 7. 投影变换
    gl_Position = u_proj * posView;
}