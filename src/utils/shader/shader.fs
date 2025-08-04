#version 300 es
precision highp float;

in mat2 v_cov2D;
in float v_opacity;
in vec4 v_viewDir;
in vec3 v_sh[9];
in vec3 v_color;

out vec4 outColor;

// 球谐光照计算（优化版）
vec3 evaluateSH(vec4 viewDir) {
    float x = viewDir.x, y = viewDir.y, z = viewDir.z;

    // 预计算基函数
    float basis[9];
    basis[0] = 0.282095;               // Y00
    basis[1] = 0.488603 * y;           // Y1-1
    basis[2] = 0.488603 * z;           // Y10
    basis[3] = 0.488603 * x;           // Y11
    basis[4] = 1.092548 * x * y;       // Y2-2
    basis[5] = 1.092548 * y * z;       // Y2-1
    basis[6] = 0.315392 * (3.0 * z * z - 1.0); // Y20
    basis[7] = 1.092548 * x * z;       // Y21
    basis[8] = 0.546274 * (x * x - y * y); // Y22

    // 累加SH贡献
    vec3 color = vec3(0.0);
    for (int i = 0; i < 9; i++) {
        color += v_sh[i] * basis[i];
    }
    return max(color, vec3(0.0)); // 避免负值
}

void main() {
    // 稳定求逆协方差矩阵
    mat2 invCov = inverse(v_cov2D + mat2(1e-6));
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(p, invCov * p);
    float alpha = exp(-40.0 * r2);

    outColor = vec4(v_color, alpha * v_opacity);
    //    outColor = vec4(v_color, 1.0);
}