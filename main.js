import * as THREE from 'three'

let scene
let camera
let renderer

const root = document.querySelector('#root')

const init = () => {
  scene = new THREE.Scene()
  const width = window.innerWidth
  const height = window.innerHeight
  camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000)
  camera.position.z = 2

  renderer = new THREE.WebGLRenderer()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor(0x000000, 1)
  root.appendChild(renderer.domElement)
}
init()

let bufferScene
let textureA
let textureB
let bufferMaterial
let plane
let bufferObject
let finalMaterial
let quad

const bufferTexture = () => {
  bufferScene = new THREE.Scene()
  textureA = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, samples: 8 })
  textureB = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, samples: 8 })
  bufferMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: textureA },
      uRes: { value: { x: window.innerWidth, y: window.innerHeight } },
      uMouse: { value: { x: window.innerWidth * .5, y: window.innerHeight * .5 } },
      uTime: { value: 0 },
      uCol: { value: 0 },
      uSpeed: { value: 0 }
    },
    fragmentShader: /* glsl */`
      float hue2rgb(float f1, float f2, float hue) {
        if (hue < 0.0)
          hue += 1.0;
        else if (hue > 1.0)
          hue -= 1.0;
        float res;
        if ((6.0 * hue) < 1.0)
          res = f1 + (f2 - f1) * 6.0 * hue;
        else if ((2.0 * hue) < 1.0)
          res = f2;
        else if ((3.0 * hue) < 2.0)
          res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
        else
          res = f1;
        return res;
      }

      vec3 hsl2rgb(vec3 hsl) {
        vec3 rgb;

        if (hsl.y == 0.0) {
          rgb = vec3(hsl.z); // Luminance
        } else {
          float f2;

          if (hsl.z < 0.5)
            f2 = hsl.z * (1.0 + hsl.y);
          else
            f2 = hsl.z + hsl.y - hsl.y * hsl.z;

          float f1 = 2.0 * hsl.z - f2;

          rgb.r = hue2rgb(f1, f2, hsl.x + (1.0/3.0));
          rgb.g = hue2rgb(f1, f2, hsl.x);
          rgb.b = hue2rgb(f1, f2, hsl.x - (1.0/3.0));
          }   
        return rgb;
      }
      
      //	Classic Perlin 3D Noise 
      //	by Stefan Gustavson
      //
      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
      vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

      float cnoise(vec3 P){
        vec3 Pi0 = floor(P); // Integer part for indexing
        vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
        Pi0 = mod(Pi0, 289.0);
        Pi1 = mod(Pi1, 289.0);
        vec3 Pf0 = fract(P); // Fractional part for interpolation
        vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
        vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
        vec4 iy = vec4(Pi0.yy, Pi1.yy);
        vec4 iz0 = Pi0.zzzz;
        vec4 iz1 = Pi1.zzzz;

        vec4 ixy = permute(permute(ix) + iy);
        vec4 ixy0 = permute(ixy + iz0);
        vec4 ixy1 = permute(ixy + iz1);

        vec4 gx0 = ixy0 / 7.0;
        vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
        gx0 = fract(gx0);
        vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
        vec4 sz0 = step(gz0, vec4(0.0));
        gx0 -= sz0 * (step(0.0, gx0) - 0.5);
        gy0 -= sz0 * (step(0.0, gy0) - 0.5);

        vec4 gx1 = ixy1 / 7.0;
        vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
        gx1 = fract(gx1);
        vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
        vec4 sz1 = step(gz1, vec4(0.0));
        gx1 -= sz1 * (step(0.0, gx1) - 0.5);
        gy1 -= sz1 * (step(0.0, gy1) - 0.5);

        vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
        vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
        vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
        vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
        vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
        vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
        vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
        vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

        vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
        g000 *= norm0.x;
        g010 *= norm0.y;
        g100 *= norm0.z;
        g110 *= norm0.w;
        vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
        g001 *= norm1.x;
        g011 *= norm1.y;
        g101 *= norm1.z;
        g111 *= norm1.w;

        float n000 = dot(g000, Pf0);
        float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
        float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
        float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
        float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
        float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
        float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
        float n111 = dot(g111, Pf1);

        vec3 fade_xyz = fade(Pf0);
        vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
        vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
        float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
        return 2.2 * n_xyz;
      }

      mat2 rot (float a) {
        return mat2(cos(a), sin(-a), sin(a), cos(a));
      }

      uniform vec2 uRes;
      uniform sampler2D uTexture;
      uniform vec2 uMouse;
      uniform float uTime;
      uniform float uCol;
      uniform float uSpeed;
      
      void main() {
        vec2 st = gl_FragCoord.xy / uRes.xy;
        vec2 uv = st - .5;
        vec2 m = uMouse / uRes.xy - .5;

        float aspectRatio = uRes.y / uRes.x;
        if (aspectRatio < 1.) { 
          uv.y *= aspectRatio;
          m.y *= aspectRatio;
        } else if (aspectRatio > 1.) { 
          uv.x /= aspectRatio;
          m.x /= aspectRatio;
        }

        float c = smoothstep(.1, 0., length(uv - m) - .01);

        vec2 m2 = uMouse / uRes.xy;
        vec2 uv2 = st - m2;
        
        float n = cnoise(vec3(st * 6., uTime * .1));
        
        uv2 *= .99 + (c * 1.6);
        uv2 *= rot(n * .03);
        uv2 += m2;
        vec3 buffer = texture2D(uTexture, uv2).rgb;
        
        vec3 rgb = c * hsl2rgb(vec3(sin(uCol) * .5 + .5, .5, .5));
        vec3 col = rgb + buffer * .94;
        
        gl_FragColor = vec4(col, 1.);
      }
    `,
  })
  plane = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight)
  bufferObject = new THREE.Mesh(plane, bufferMaterial)
  bufferScene.add(bufferObject)

  finalMaterial = new THREE.MeshBasicMaterial({ map: textureB.texture })
  quad = new THREE.Mesh(plane, finalMaterial)
  scene.add(quad)
}
bufferTexture()

let col = 0
let speed = 0
let mouseX = 0
let mouseY = 0
let prevX = 0
let prevY = 0
const handleMouseMove = (e) => {
  mouseX = e.touches ? e.touches[0].clientX : e.clientX
  mouseY = e.touches ? e.touches[0].clientY : e.clientY
  bufferMaterial.uniforms.uMouse.value.x = mouseX
  bufferMaterial.uniforms.uMouse.value.y = window.innerHeight - mouseY
  col += .02
  bufferMaterial.uniforms.uCol.value = col
}
window.onmousemove = handleMouseMove
window.ontouchmove = handleMouseMove
window.ontouchstart = handleMouseMove

const handleResize = () => {
  bufferMaterial.uniforms.uRes.value = new THREE.Vector2(window.innerWidth, window.innerHeight)
  renderer.setSize(window.innerWidth, window.innerHeight)
  textureA.setSize(window.innerWidth, window.innerHeight)
  textureB.setSize(window.innerWidth, window.innerHeight)
  plane = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight)
}
window.onresize = handleResize

function render(a) {
  requestAnimationFrame(render)
  
  // Codepen preview
  /*
  if (a < 3000) {
    col += .02
    bufferMaterial.uniforms.uCol.value = col
    bufferMaterial.uniforms.uMouse.value.x = window.innerWidth * .5 + Math.cos(a * .5) * 100
    bufferMaterial.uniforms.uMouse.value.y = window.innerHeight * .5 + Math.sin(a * .5) * 100
  }
*/
  
  // Mouse speed
  speed = THREE.MathUtils.lerp(speed, Math.max(Math.abs(prevX - mouseX), Math.abs(prevY - mouseY)), .05)
  bufferMaterial.uniforms.uSpeed.value = speed * .1
  prevX = mouseX
  prevY = mouseY

  renderer.setRenderTarget(textureB)
  renderer.render(bufferScene, camera)

  // Swap textures
  const t = textureA
  textureA = textureB
  textureB = t
  quad.material.map = textureB.texture
  bufferMaterial.uniforms.uTexture.value = textureA.texture
  bufferMaterial.uniforms.uTime.value = a/1000

  renderer.setRenderTarget(null)
  renderer.render(scene, camera)
}
render()
