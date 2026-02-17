import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

const statusEl = document.getElementById("status");
const setStatus = (t) => { if (statusEl) statusEl.textContent = t; console.log(t); };

setStatus("Inicializando escena…");

const canvas = document.querySelector("#c");
if (!canvas) {
  setStatus("❌ No existe <canvas id='c'>");
  throw new Error("Canvas #c no encontrado");
}

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c18);
scene.fog = new THREE.Fog(0x0b0c18, 6, 18);
let fogEnabled = true;

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 2000);
camera.position.set(0, 1.6, 4);

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);

// sombras
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ---------- Controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 1.0, 0);
controls.update();

// ---------- Lights (cohesivas) ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.30));

const key = new THREE.DirectionalLight(0xffffff, 1.15);
key.position.set(3, 6, 2);
scene.add(key);

const fill = new THREE.DirectionalLight(0xffffff, 0.40);
fill.position.set(-3, 2, 1);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffffff, 0.35);
rim.position.set(-2, 3, -3);
scene.add(rim);

// Spotlight teatral
const spot = new THREE.SpotLight(0xffffff, 2.15, 30, Math.PI / 7, 0.55, 1);
spot.position.set(0, 6.2, 2.2);
spot.castShadow = true;
spot.shadow.mapSize.set(1024, 1024);
scene.add(spot);
scene.add(spot.target);

// ---------- Stage / Floor ----------
const GROUND_Y = 0.20; // ⬅️ súbelo/bájalo a gusto (0.20–0.45)
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({ color: 0x0f1030, roughness: 1, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = GROUND_Y;
floor.receiveShadow = true;
scene.add(floor);

// Plataforma (subida)
const stageHeight = 0.18;
const stageY = GROUND_Y + 0.06; // altura visual del centro
const stageTopY = stageY + stageHeight / 2;

const stage = new THREE.Mesh(
  new THREE.CylinderGeometry(0.92, 1.08, stageHeight, 72),
  new THREE.MeshStandardMaterial({ color: 0x1f214d, roughness: 0.55, metalness: 0.18 })
);
stage.position.set(0, stageY, 0);
stage.receiveShadow = true;
scene.add(stage);

// Anillo brillante
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(1.05, 0.02, 16, 160),
  new THREE.MeshStandardMaterial({
    color: 0x9b7bff,
    roughness: 0.22,
    metalness: 0.65,
    emissive: 0x2a1b5a,
    emissiveIntensity: 0.9
  })
);
ring.rotation.x = Math.PI / 2;
ring.position.set(0, stageTopY + 0.02, 0);
scene.add(ring);

// ---------- Subtle particles (muy ligeras) ----------
const particlesCount = 350;
const particlesGeo = new THREE.BufferGeometry();
const particlesPos = new Float32Array(particlesCount * 3);
for (let i = 0; i < particlesCount; i++) {
  particlesPos[i * 3 + 0] = (Math.random() - 0.5) * 8;
  particlesPos[i * 3 + 1] = Math.random() * 4 + 0.2;
  particlesPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
}
particlesGeo.setAttribute("position", new THREE.BufferAttribute(particlesPos, 3));
const particlesMat = new THREE.PointsMaterial({ size: 0.02, opacity: 0.6, transparent: true });
const particles = new THREE.Points(particlesGeo, particlesMat);
scene.add(particles);

// ---------- Assets ----------
const assetUrl = (name) => new URL(`../assets/${name}`, import.meta.url).href;
const PATHS = {
  character: assetUrl("character.fbx"),
  idle: assetUrl("idle.fbx"),
  wave: assetUrl("wave.fbx"),
  dance: assetUrl("dance.fbx"),
};

// ---------- Animation ----------
let mixer = null;
const actions = {};
let activeAction = null;

let modelRoot = null;
let autoRotate = true;

function setActiveButton(name) {
  document.querySelectorAll("[data-anim]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.anim === name);
  });
}

function play(name, fade = 0.22) {
  const next = actions[name];
  if (!next) {
    setStatus(`⚠️ Animación no disponible: ${name}`);
    return;
  }
  if (activeAction && activeAction !== next) activeAction.fadeOut(fade);
  next.reset().fadeIn(fade).play();
  activeAction = next;

  setActiveButton(name);
  setStatus(`Animación: ${name}`);
}

function placeOnStage(object3D) {
  // Centrar el modelo
  const centerBox = new THREE.Box3().setFromObject(object3D);
  const center = centerBox.getCenter(new THREE.Vector3());
  object3D.position.sub(center);

  // Bounding box fiable (solo meshes)
  const bbox = new THREE.Box3();
  object3D.traverse((c) => {
    if (c.isMesh) bbox.expandByObject(c);
  });

  // Pies a "0" local
  object3D.position.y -= bbox.min.y;

  // Ajuste: bajar un poco para que no flote (tuneable)
  const FOOT_SINK = 1.00; // prueba 0.05–0.12
  object3D.position.y += (stageTopY - FOOT_SINK);
}


function frameCamera(object3D) {
  const box = new THREE.Box3().setFromObject(object3D);
  const size = box.getSize(new THREE.Vector3());
  const max = Math.max(size.x, size.y, size.z);
  const targetY = max * 0.55;

  camera.position.set(0, max * 0.75, max * 2.05);
  camera.updateProjectionMatrix();

  controls.target.set(0, targetY, 0);
  controls.update();

  spot.target.position.set(0, targetY, 0);
}

function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ---------- UI hooks (robustos) ----------
document.querySelectorAll("[data-anim]").forEach((btn) => {
  btn.addEventListener("click", () => play(btn.dataset.anim));
});

const toggleAutoBtn = document.getElementById("toggleAuto");
if (toggleAutoBtn) {
  toggleAutoBtn.addEventListener("click", (e) => {
    autoRotate = !autoRotate;
    e.target.textContent = `Auto-rotación: ${autoRotate ? "ON" : "OFF"}`;
  });
}

const toggleFogBtn = document.getElementById("toggleFog");
if (toggleFogBtn) {
  toggleFogBtn.addEventListener("click", (e) => {
    fogEnabled = !fogEnabled;
    scene.fog = fogEnabled ? new THREE.Fog(0x0b0c18, 6, 18) : null;
    e.target.textContent = `Niebla: ${fogEnabled ? "ON" : "OFF"}`;
  });
}

const resetCamBtn = document.getElementById("resetCam");
if (resetCamBtn) {
  resetCamBtn.addEventListener("click", () => {
    if (modelRoot) frameCamera(modelRoot);
  });
}

// teclado 1/2/3
window.addEventListener("keydown", (e) => {
  if (e.key === "1") play("idle");
  if (e.key === "2") play("wave");
  if (e.key === "3") play("dance");
});

// click en personaje = wave (raycasting)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener("pointerdown", (e) => {
  if (!modelRoot) return;
  const r = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  raycaster.setFromCamera(mouse, camera);
  if (raycaster.intersectObject(modelRoot, true).length) play("wave");
});

// ---------- Load FBX Character + Animations ----------
const loader = new FBXLoader();
setStatus("Cargando character.fbx…");

loader.load(
  PATHS.character,
  (character) => {
    character.scale.setScalar(0.01);

    character.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.frustumCulled = false;
        // si Mixamo deja materiales raros, esto evita invisibles
        if (c.material) {
          c.material.transparent = false;
          c.material.opacity = 1;
          c.material.needsUpdate = true;
        }
      }
    });

    scene.add(character);
    modelRoot = character;

    mixer = new THREE.AnimationMixer(character);
    mixer.addEventListener("finished", () => play("idle"));

    setStatus("Character OK. Cargando animaciones…");

    const anims = [
      ["idle", PATHS.idle],
      ["wave", PATHS.wave],
      ["dance", PATHS.dance],
    ];

    let loaded = 0;
    anims.forEach(([name, url]) => {
      loader.load(
        url,
        (a) => {
          const clip = a.animations?.[0];
          if (!clip) {
            setStatus(`❌ Sin clip: ${name}`);
            return;
          }

          clip.name = name;
          actions[name] = mixer.clipAction(clip);

          if (name !== "idle") {
            actions[name].setLoop(THREE.LoopOnce, 1);
            actions[name].clampWhenFinished = true;
          }

          loaded++;
          if (loaded === anims.length) {
            // colocar encima del escenario y encuadrar
            placeOnStage(character);
            frameCamera(character);

            // evitar flash inicial
            Object.values(actions).forEach(a => a.stop());
            play("idle");

            setStatus("✅ Todo OK: Idle activo · Click en el mago = Wave · Teclas 1/2/3");
          }
        },
        undefined,
        () => setStatus(`❌ Error cargando animación: ${name}`)
      );
    });
  },
  undefined,
  () => setStatus(`❌ Error cargando ${PATHS.character} (revisa nombre y ruta)`)
);

// ---------- Resize ----------
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- Loop ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  controls.update();

  // partículas: flotación suave
  particles.rotation.y += 0.0008;
  particles.position.y = 0.15 + Math.sin(performance.now() * 0.0004) * 0.05;

  // aro con micro pulso
  ring.material.emissiveIntensity = 0.75 + Math.sin(performance.now() * 0.002) * 0.15;

  if (mixer) mixer.update(dt);
  if (modelRoot && autoRotate) modelRoot.rotation.y += 0.004;

  renderer.render(scene, camera);
}
animate();
