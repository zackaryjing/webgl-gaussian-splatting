#version 300 es
precision highp float;

in mat2 v_cov2D;
in float v_opacity;
in vec4 v_viewDir;
in vec3 v_sh[9];
in vec3 v_color;

out vec4 outColor;

// Evaluate spherical harmonics lighting given view direction
vec3 evaluateSH(vec4 viewDir) {
    float x = viewDir.x;
    float y = viewDir.y;
    float z = viewDir.z;

    float shBasis[9];
    shBasis[0] = 0.282095;            // Y00
    shBasis[1] = 0.488603 * y;        // Y1-1
    shBasis[2] = 0.488603 * z;        // Y10
    shBasis[3] = 0.488603 * x;        // Y11
    shBasis[4] = 1.092548 * x * y;    // Y2-2
    shBasis[5] = 1.092548 * y * z;    // Y2-1
    shBasis[6] = 0.315392 * (3.0 * z * z - 1.0); // Y20
    shBasis[7] = 1.092548 * x * z;    // Y21
    shBasis[8] = 0.546274 * (x * x - y * y); // Y22

    vec3 color = vec3(0.0);
    for (int i = 0; i < 9; i++) {
        color += v_sh[i] * shBasis[i];
    }
    return color;
}


void main() {
    // Point sprite coord in [-1, 1]
    vec2 p = gl_PointCoord * 2.0 - 1.0;

    // Gaussian alpha from 2D projected covariance matrix
    mat2 invCov = inverse(v_cov2D + 1e-6 * mat2(1.0));
    float r2 = dot(p, invCov * p);
    float alpha = exp(-1000000000.0 * r2);

    if (alpha < 1.0 / 255.0) discard; // discard if fully transparent

    vec3 lighting = evaluateSH(normalize(v_viewDir));
    vec3 finalColor = v_color * lighting;

    outColor = vec4(v_color,alpha * v_opacity);
    // outColor = vec4(finalColor, alpha * v_opacity);
}