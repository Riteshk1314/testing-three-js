import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/DRACOLoader.js";

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 15);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
document.getElementById("container3D").appendChild(renderer.domElement);

// Text rendering setup
const textCanvas = document.createElement('canvas');
const textCtx = textCanvas.getContext('2d');
textCanvas.width = window.innerWidth;
textCanvas.height = window.innerHeight;

// Create a plane for the text
const textTexture = new THREE.CanvasTexture(textCanvas);
const textGeometry = new THREE.PlaneGeometry(20, 20 * (window.innerHeight / window.innerWidth));
const textMaterial = new THREE.MeshBasicMaterial({ map: textTexture, transparent: true });
const textPlane = new THREE.Mesh(textGeometry, textMaterial);
textPlane.position.z = -5;
scene.add(textPlane);

// Custom shader for diffusion effect
const customVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;



const customFragmentShader = `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform vec2 uResolution;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  float blurSize = 0.01;

  vec4 blur13(sampler2D image, vec2 uv, vec2 resolution) {
    vec4 color = vec4(0.0);
    vec2 off1 = vec2(1.411764705882353) * blurSize;
    vec2 off2 = vec2(3.294117647058823) * blurSize;
    vec2 off3 = vec2(5.176470588235294) * blurSize;
    color += texture2D(image, uv) * 0.1964825501511404;
    color += texture2D(image, uv + (off1 / resolution)) * 0.2969069646728344;
    color += texture2D(image, uv - (off1 / resolution)) * 0.2969069646728344;
    color += texture2D(image, uv + (off2 / resolution)) * 0.09447039785044732;
    color += texture2D(image, uv - (off2 / resolution)) * 0.09447039785044732;
    color += texture2D(image, uv + (off3 / resolution)) * 0.010381362401148057;
    color += texture2D(image, uv - (off3 / resolution)) * 0.010381362401148057;
    return color;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    float fresnelTerm = pow(1.0 - abs(dot(normal, viewDir)), 2.0);
    
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec4 blurredColor = blur13(tDiffuse, uv, uResolution);
    
    vec4 finalColor = mix(blurredColor, vec4(1.0), fresnelTerm * 0.9);
    finalColor.rgb += vec3(0.1, 0.1, 0.3) * fresnelTerm; // Add a subtle blue tint
    finalColor.a = 0.5 + fresnelTerm * 0.3; // Adjust transparency
    
    gl_FragColor = finalColor;
  }

`;

const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
// Create custom material
const createCustomMaterial = () => {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: textTexture },
      uTime: { value: 0 }
    },
    vertexShader: customVertexShader,
    fragmentShader: customFragmentShader,
    transparent: true,
    side: THREE.DoubleSide
  });
};

// Load 3D model
let object;
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
loader.setDRACOLoader(dracoLoader);

loader.load('models/eye/scene.gltf', (gltf) => {
  object = gltf.scene;
  object.scale.set(2, 2, 2);
  
  const customMaterial = createCustomMaterial();
  object.traverse((child) => {
    if (child.isMesh) {
      child.material = customMaterial;
    }
  });
  object.rotation.x = Math.PI / 2;
  scene.add(object);
});

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Scroll animation
let scrollY = window.scrollY;
let currentSection = 0;

window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
  currentSection = Math.floor(scrollY / window.innerHeight);
  updatePointsUI();
});

function updatePointsUI() {
  document.querySelectorAll('.point').forEach((point, index) => {
    point.classList.toggle('active', index === currentSection);
  });
}

function animateOnScroll() {
  if (object) {
    const scrollPercentage = scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    
    // Dynamic rotation starting from the initial 90-degree position
    object.rotation.y = scrollPercentage * Math.PI * 8;
    object.rotation.x = scrollPercentage * Math.PI * 4;
    
    // Create a zig-zag pattern
    const zigZagAmplitude = 5;
    const zigZagFrequency = 4;
    
    object.position.y = Math.sin(scrollPercentage * Math.PI * 2) * 3;
    object.position.x = Math.sin(scrollPercentage * Math.PI * zigZagFrequency) * zigZagAmplitude;
    
    // Adjust scale for a more dynamic effect
    const scale = 1.5 + Math.sin(scrollPercentage * Math.PI * 4) * 0.5;
    object.scale.set(scale, scale, scale);
  }
}

// Render text
function renderText() {
  textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height);
  textCtx.fillStyle = 'white';
  textCtx.font = '48px Arial';
  textCtx.textAlign = 'center';
  textCtx.textBaseline = 'middle';
  
  const sections = document.querySelectorAll('section');
  sections.forEach((section, index) => {
    const yPos = index * textCanvas.height / sections.length + textCanvas.height / (2 * sections.length) - scrollY;
    textCtx.fillText(section.querySelector('h2').textContent, textCanvas.width / 2, yPos);
  });
  
  textTexture.needsUpdate = true;
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  animateOnScroll();
  
  // First render: Render the scene without the 3D model
  scene.remove(object);
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);
  
  // Update the shader uniform with the rendered texture
  object.traverse((child) => {
    if (child.isMesh && child.material.uniforms) {
      child.material.uniforms.tDiffuse.value = renderTarget.texture;
      child.material.uniforms.uTime.value += 0.01;
    }
  });
  
  // Second render: Render the full scene with the 3D model
  scene.add(object);
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}
animate();

// Handle window resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderTarget.setSize(window.innerWidth, window.innerHeight);
  
  // Update resolution uniform
  object.traverse((child) => {
    if (child.isMesh && child.material.uniforms) {
      child.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    }
  });
});