import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { stage } from "./stage";

// Escena del hero: una tarjeta de lealtad de cristal y miles de partículas ("visitas")
// que cambian de figura según la sección: galaxia, sellos, ondas de aviso, estrella de reseña y esfera.

const INK = 0x04140f;
const CARD_W = 3.4;
const CARD_H = 2.14;
const FACE_W = 3.3;
const FACE_H = 2.04;

// Sellos de la tarjeta (coordenadas de la tarjeta). Los usan el dibujo de la cara y la figura "sellos".
const STAMP_R = 0.19;
export const STAMPS = [-0.12, -0.64].flatMap((y) => [-1.2, -0.6, 0, 0.6, 1.2].map((x) => ({ x, y })));

type Options = { mobile: boolean; reduced: boolean };

// ---------------------------------------------------------------------------
// Figuras de las partículas. Cada partícula tiene una posición en cada figura y la escena mezcla
// entre dos de ellas en el shader. "group" sirve para encender sellos o desfasar las ondas.
// ---------------------------------------------------------------------------
function buildShapes(count: number) {
  const P = [0, 1, 2, 3, 4].map(() => new Float32Array(count * 3));
  const rand = new Float32Array(count);
  const scale = new Float32Array(count);
  const group = new Float32Array(count);
  const groupRing = new Float32Array(count);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const set = (a: Float32Array, i: number, x: number, y: number, z: number) => {
    a[i * 3] = x;
    a[i * 3 + 1] = y;
    a[i * 3 + 2] = z;
  };

  // Estrella de 5 puntas: contorno + relleno.
  const R = 3.3;
  const r = 1.35;
  const star = Array.from({ length: 10 }, (_, k) => {
    const a = Math.PI / 2 + (k * Math.PI) / 5;
    const rad = k % 2 === 0 ? R : r;
    return new THREE.Vector2(Math.cos(a) * rad, Math.sin(a) * rad);
  });

  for (let i = 0; i < count; i++) {
    const u = Math.random();
    rand[i] = u;
    scale[i] = 0.35 + Math.pow(Math.random(), 3) * 1.9;

    // 0 · galaxia de tres brazos (sin inclinar; el shader la gira e inclina)
    const rad = 2.4 + Math.pow(Math.random(), 1.4) * 7.2;
    const arm = i % 3;
    const ang = (arm * Math.PI * 2) / 3 + rad * 0.55 + gauss() * (0.25 + rad * 0.03);
    set(P[0], i, Math.cos(ang) * rad, gauss() * (0.12 + rad * 0.03), Math.sin(ang) * rad);

    // 1 · sellos: 70% forma 10 discos sobre la tarjeta, el resto queda como polvo alrededor
    if (Math.random() < 0.72) {
      const k = i % 10;
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * STAMP_R;
      set(P[1], i, STAMPS[k].x + Math.cos(a) * d, STAMPS[k].y + Math.sin(a) * d, 0.16 + Math.random() * 0.05);
      group[i] = k;
    } else {
      const a = Math.random() * Math.PI * 2;
      const d = 2.4 + Math.random() * 2.2;
      set(P[1], i, Math.cos(a) * d * 1.25, Math.sin(a) * d * 0.8, gauss() * 0.8 - 0.6);
      group[i] = 20;
    }

    // 2 · ondas de aviso: tres anillos que se expanden (el shader los anima)
    const ring = i % 3;
    const ra = Math.random() * Math.PI * 2;
    const rr = 2.0 + ring * 0.75 + gauss() * 0.05;
    set(P[2], i, Math.cos(ra) * rr, Math.sin(ra) * rr, gauss() * 0.08 - 0.2);
    groupRing[i] = ring;

    // 3 · estrella de reseña detrás de la tarjeta
    if (Math.random() < 0.62) {
      const k = Math.floor(Math.random() * 10);
      const a = star[k];
      const b = star[(k + 1) % 10];
      const t = Math.random();
      set(P[3], i, a.x + (b.x - a.x) * t + gauss() * 0.04, a.y + (b.y - a.y) * t + gauss() * 0.04, -0.7 + gauss() * 0.06);
    } else {
      const k = Math.floor(Math.random() * 10);
      const a = star[k];
      const b = star[(k + 1) % 10];
      let s = Math.random();
      let t = Math.random();
      if (s + t > 1) {
        s = 1 - s;
        t = 1 - t;
      }
      set(P[3], i, a.x * s + b.x * t, a.y * s + b.y * t, -0.7 + gauss() * 0.15);
    }

    // 4 · esfera (cierre), repartida con la espiral de Fibonacci
    const y = 1 - (i / (count - 1)) * 2;
    const rr4 = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    const sr = 5.4 + gauss() * 0.25;
    set(P[4], i, Math.cos(th) * rr4 * sr, y * sr, Math.sin(th) * rr4 * sr);
  }
  return { P, rand, scale, group, groupRing };
}

const vertex = /* glsl */ `
  attribute vec3 aP0; attribute vec3 aP1; attribute vec3 aP2; attribute vec3 aP3; attribute vec3 aP4;
  attribute float aRand; attribute float aScale; attribute float aGroup; attribute float aRing;
  uniform float uFrom, uTo, uMix, uTime, uSize, uPixel, uLit, uIntro, uFade;
  uniform vec3 uMouse, uCenter;
  varying float vAlpha;
  varying vec3 vColor;

  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

  vec3 shapePos(float id) {
    if (id < 0.5) {
      vec3 p = aP0;
      float r = length(p.xz);
      p.xz = rot(uTime * 0.25 / (1.0 + r * 0.3)) * p.xz;
      p.yz = rot(-0.48) * p.yz;
      p.xy = rot(0.18) * p.xy;
      return p;
    } else if (id < 1.5) {
      return aP1;
    } else if (id < 2.5) {
      vec3 p = aP2;
      float f = fract(uTime * 0.3 + aRing / 3.0);
      p.xy *= 0.7 + 0.75 * f;
      return p;
    } else if (id < 3.5) {
      vec3 p = aP3;
      p.xy *= 1.0 + 0.025 * sin(uTime * 2.2 + aRand * 6.28);
      return p;
    }
    vec3 p = aP4;
    p.xz = rot(uTime * 0.1) * p.xz;
    p.xy = rot(0.25) * p.xy;
    return p;
  }

  float shapeAlpha(float id) {
    if (id > 0.5 && id < 1.5) return aGroup < 9.5 ? (aGroup < uLit ? 1.0 : 0.13) : 0.45;
    if (id > 1.5 && id < 2.5) { float f = fract(uTime * 0.3 + aRing / 3.0); return smoothstep(0.0, 0.18, f) * (1.0 - f) * 1.6; }
    return 1.0;
  }

  void main() {
    // Cada partícula empieza su viaje un poco después que otra: la transformación se ve orgánica.
    float t = clamp((uMix - aRand * 0.4) / 0.6, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec3 p = mix(shapePos(uFrom), shapePos(uTo), t);
    float arc = sin(t * 3.14159);
    p += vec3((aScale - 1.0) * 0.6, (aRand - 0.5) * 2.4, (aRand - 0.3) * 3.0) * arc;
    p += 0.05 * vec3(sin(uTime * 0.9 + aRand * 40.0), cos(uTime * 0.7 + aRand * 31.0), sin(uTime * 0.8 + aRand * 23.0));
    p *= uIntro;

    vec3 world = p + uCenter;
    // El cursor aparta las partículas cercanas.
    vec2 d = world.xy - uMouse.xy;
    float dist = length(d);
    world.xy += normalize(d + 1e-4) * smoothstep(1.9, 0.0, dist) * 0.85;

    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aScale * uPixel / -mv.z;

    vAlpha = mix(shapeAlpha(uFrom), shapeAlpha(uTo), t) * uFade * smoothstep(0.0, 0.4, uIntro);

    vec3 mint = vec3(0.10, 0.80, 0.56);
    vec3 glass = vec3(0.80, 0.97, 0.91);
    vec3 amber = vec3(1.0, 0.70, 0.22);
    float starW = mix(float(uFrom > 2.5 && uFrom < 3.5), float(uTo > 2.5 && uTo < 3.5), t);
    vec3 c = mix(mint, glass, step(0.62, fract(aRand * 7.31)) * 0.75);
    vColor = mix(c, amber, clamp(starW * 0.85 + step(0.9, aRand) * 0.85, 0.0, 1.0));
  }
`;

const fragment = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 1.7) * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor * 1.35, a);
  }
`;

// Cara de la tarjeta dibujada en un canvas: negocio, puntos y los 10 sellos.
function drawFace(ctx: CanvasRenderingContext2D, points: number, lit: number, mark: HTMLImageElement | null) {
  const { width: w, height: h } = ctx.canvas;
  const X = (x: number) => (x / FACE_W + 0.5) * w;
  const Y = (y: number) => (0.5 - y / FACE_H) * h;
  ctx.clearRect(0, 0, w, h);
  const display = "'Bricolage Grotesque Variable', 'Bricolage Grotesque', system-ui, sans-serif";

  if (mark?.complete) ctx.drawImage(mark, X(-1.48), Y(0.86), 74, 74 * (mark.naturalHeight / mark.naturalWidth || 1));
  ctx.shadowColor = "rgba(4,20,15,0.55)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(244,255,250,0.97)";
  ctx.font = `700 60px ${display}`;
  ctx.fillText("Café Luna", X(-1.48) + 94, Y(0.86) + 52);
  ctx.font = `500 30px ${display}`;
  ctx.fillStyle = "rgba(232,250,242,0.72)";
  ctx.fillText("Cliente frecuente", X(-1.48) + 96, Y(0.86) + 94);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(244,255,250,0.97)";
  ctx.font = `800 76px ${display}`;
  ctx.fillText(points.toLocaleString("es-CR"), X(1.46), Y(0.86) + 62);
  ctx.font = `500 28px ${display}`;
  ctx.fillStyle = "rgba(232,250,242,0.72)";
  ctx.fillText("puntos", X(1.46), Y(0.86) + 98);
  ctx.textAlign = "left";
  ctx.shadowBlur = 0;

  STAMPS.forEach((s, k) => {
    ctx.beginPath();
    ctx.arc(X(s.x), Y(s.y), (STAMP_R / FACE_W) * w, 0, Math.PI * 2);
    if (k < lit) {
      ctx.fillStyle = k === 9 ? "#f2b134" : "#19c58a";
      ctx.fill();
    } else {
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(232,250,242,0.45)";
      ctx.setLineDash([10, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
}

function roundedCard() {
  const shape = new THREE.Shape();
  const w = CARD_W / 2;
  const h = CARD_H / 2;
  const r = 0.22;
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 5,
    curveSegments: 24,
  });
  geo.center();
  return geo;
}

export function createScene(canvas: HTMLCanvasElement, { mobile, reduced }: Options) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: "high-performance" });
  } catch {
    return null; // sin WebGL: queda el fondo en CSS
  }
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  // Luces: una principal que sigue al cursor, un relleno menta y un contraluz ámbar.
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 6);
  scene.add(key);
  const mintLight = new THREE.PointLight(0x19c58a, 40, 20);
  mintLight.position.set(-4, -2, 3);
  scene.add(mintLight);
  const amberLight = new THREE.PointLight(0xf2b134, 28, 20);
  amberLight.position.set(4, -3, -2);
  scene.add(amberLight);

  // --- Tarjeta de cristal ---------------------------------------------------
  const card = new THREE.Group();
  scene.add(card);
  // Computadora: cristal con transmisión e iridiscencia. Celular: un material mucho más liviano.
  const glass: THREE.Material = mobile
    ? new THREE.MeshStandardMaterial({
        color: 0xa8ead2,
        roughness: 0.16,
        metalness: 0.25,
        emissive: new THREE.Color(0x0e7c66),
        emissiveIntensity: 0.5,
        envMapIntensity: 2,
        transparent: true,
        opacity: 0.66,
      })
    : new THREE.MeshPhysicalMaterial({
        color: 0xe6fbf3,
        roughness: 0.2,
        emissive: new THREE.Color(0x0e7c66),
        emissiveIntensity: 0.18,
        metalness: 0,
        transmission: 1,
        thickness: 0.9,
        ior: 1.42,
        attenuationColor: new THREE.Color(0x19c58a),
        attenuationDistance: 3,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        iridescence: 0.4,
        iridescenceIOR: 1.25,
        envMapIntensity: 2.1,
      });
  const cardGeo = roundedCard();
  card.add(new THREE.Mesh(cardGeo, glass));

  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = 1024;
  faceCanvas.height = Math.round((1024 * FACE_H) / FACE_W);
  const faceCtx = faceCanvas.getContext("2d")!;
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  faceTex.anisotropy = 4;
  const faceGeo = new THREE.PlaneGeometry(FACE_W, FACE_H);
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, toneMapped: false });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.z = 0.062;
  card.add(face);

  const mark = new Image();
  mark.src = "/brand/mark.png";
  let shown = { points: -1, lit: -1 };
  const redrawFace = () => {
    drawFace(faceCtx, Math.round(stage.points), Math.round(stage.stamps), mark);
    faceTex.needsUpdate = true;
    shown = { points: Math.round(stage.points), lit: Math.round(stage.stamps) };
  };
  mark.onload = redrawFace;
  document.fonts?.ready.then(redrawFace).catch(() => {});
  redrawFace();

  // Esferitas de luz detrás de la tarjeta: se ven refractadas a través del cristal.
  const orbGeo = new THREE.SphereGeometry(0.11, 24, 24);
  const orbs = [0x19c58a, 0xf2b134, 0xbff3df].map((c, i) => {
    const m = new THREE.Mesh(orbGeo, new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
    m.userData.phase = (i * Math.PI * 2) / 3;
    card.add(m);
    return m;
  });

  // --- Partículas -------------------------------------------------------------
  const count = mobile ? 4200 : 12000;
  const shapes = buildShapes(count);
  const pGeo = new THREE.BufferGeometry();
  shapes.P.forEach((arr, i) => pGeo.setAttribute(`aP${i}`, new THREE.BufferAttribute(arr, 3)));
  pGeo.setAttribute("position", new THREE.BufferAttribute(shapes.P[0], 3));
  pGeo.setAttribute("aRand", new THREE.BufferAttribute(shapes.rand, 1));
  pGeo.setAttribute("aScale", new THREE.BufferAttribute(shapes.scale, 1));
  pGeo.setAttribute("aGroup", new THREE.BufferAttribute(shapes.group, 1));
  pGeo.setAttribute("aRing", new THREE.BufferAttribute(shapes.groupRing, 1));
  pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
  const uniforms = {
    uFrom: { value: 0 },
    uTo: { value: 0 },
    uMix: { value: 1 },
    uTime: { value: 0 },
    uSize: { value: mobile ? 46 : 36 },
    uPixel: { value: dpr },
    uLit: { value: 0 },
    uIntro: { value: reduced ? 1 : 0.001 },
    uFade: { value: 1 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uCenter: { value: new THREE.Vector3() },
  };
  const pMat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);

  // --- Post-procesado (solo computadora): un brillo suave sobre lo más luminoso ----------
  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.65, 0.55, 0.18);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    // En vertical se aleja la cámara para que la tarjeta quepa a lo ancho.
    camera.position.z = Math.max(12, 8.6 / camera.aspect);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  // --- Bucle -----------------------------------------------------------------
  const clock = new THREE.Clock();
  const cur = { ...stage.card, fade: 1, lit: 0 };
  const ray = new THREE.Raycaster();
  const mouseWorld = new THREE.Vector3(99, 99, 0);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const ndc = new THREE.Vector2();
  let time = 0;
  let raf = 0;
  let lastSig = "";

  // Calidad adaptativa: si el equipo no llega a ~45 fps se baja la resolución y luego se quita el brillo.
  let pixelRatio = dpr;
  let slowFrames = 0;
  let sampled = 0;
  const adapt = (raw: number) => {
    if (reduced || sampled > 600) return;
    sampled++;
    slowFrames = raw > 1 / 45 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames < 40) return;
    slowFrames = 0;
    if (pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.5);
      renderer.setPixelRatio(pixelRatio);
      composer?.setPixelRatio(pixelRatio);
      uniforms.uPixel.value = pixelRatio;
      resize();
    } else if (composer) {
      composer.dispose();
      composer = null;
    }
  };

  const frame = () => {
    raf = requestAnimationFrame(frame);
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    if (stage.paused) return;
    if (stage.intro > 0.5) adapt(raw);
    if (!reduced) time += dt;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3.2);

    // Figura: al cambiar de objetivo empieza una nueva mezcla desde la figura que más se ve.
    if (stage.shape !== uniforms.uTo.value) {
      uniforms.uFrom.value = uniforms.uMix.value > 0.5 ? uniforms.uTo.value : uniforms.uFrom.value;
      uniforms.uTo.value = stage.shape;
      uniforms.uMix.value = 0;
    }
    uniforms.uMix.value = reduced ? 1 : Math.min(1, uniforms.uMix.value + dt / 1.6);
    uniforms.uTime.value = time;
    uniforms.uIntro.value = reduced ? 1 : Math.max(0.001, stage.intro);
    cur.fade += (stage.fade - cur.fade) * k;
    uniforms.uFade.value = cur.fade;
    cur.lit += (stage.stamps - cur.lit) * (reduced ? 1 : 1 - Math.exp(-dt * 8));
    uniforms.uLit.value = cur.lit;

    // Tarjeta: se acerca a su objetivo, flota y se inclina hacia el cursor.
    (["x", "y", "z", "rx", "ry", "rz", "s"] as const).forEach((p) => (cur[p] += (stage.card[p] - cur[p]) * k));
    const mx = reduced ? 0 : stage.mouse.x;
    const my = reduced ? 0 : stage.mouse.y;
    card.position.set(cur.x, cur.y + Math.sin(time * 0.8) * 0.07, cur.z);
    card.rotation.set(cur.rx - my * 0.2, cur.ry + mx * 0.3 + stage.spin, cur.rz + Math.sin(time * 0.6) * 0.02);
    card.scale.setScalar(Math.max(cur.s, 0.0001));
    card.visible = cur.s > 0.02;
    uniforms.uCenter.value.set(cur.x, cur.y, cur.z);
    orbs.forEach((o) => {
      const a = time * 0.7 + o.userData.phase;
      o.position.set(Math.cos(a) * 1.25, Math.sin(a * 1.3) * 0.55, -0.9 + Math.sin(a) * 0.3);
    });

    // Cara: solo se vuelve a dibujar cuando cambian los puntos o los sellos.
    if (Math.round(stage.points) !== shown.points || Math.round(stage.stamps) !== shown.lit) redrawFace();

    // Cursor en el plano z = 0.
    if (!reduced) {
      ndc.set(stage.mouse.x, stage.mouse.y);
      ray.setFromCamera(ndc, camera);
      const hit = ray.ray.intersectPlane(plane, new THREE.Vector3());
      if (hit) mouseWorld.lerp(hit, 1 - Math.exp(-dt * 10));
      uniforms.uMouse.value.copy(mouseWorld);
      key.position.set(3 + mx * 4, 4 + my * 3, 6);
    }
    camera.position.x += (mx * 0.35 - camera.position.x) * k;
    camera.position.y += (my * 0.25 - camera.position.y) * k;
    camera.lookAt(0, 0, 0);

    // Con movimiento reducido solo se dibuja cuando algo cambió.
    if (reduced) {
      const sig = JSON.stringify([stage.shape, stage.card, stage.points, stage.stamps, stage.fade, camera.aspect]);
      if (sig === lastSig) return;
      lastSig = sig;
    }
    if (composer) composer.render();
    else renderer.render(scene, camera);
  };
  let disposed = false;
  // Se compilan los sombreadores antes del primer cuadro para que la intro no se trabe.
  renderer
    .compileAsync(scene, camera)
    .catch(() => {})
    .finally(() => {
      if (!disposed) frame();
    });

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      pGeo.dispose();
      pMat.dispose();
      cardGeo.dispose();
      glass.dispose();
      faceGeo.dispose();
      faceMat.dispose();
      faceTex.dispose();
      orbGeo.dispose();
      orbs.forEach((o) => (o.material as THREE.Material).dispose());
      env.dispose();
      pmrem.dispose();
      composer?.dispose();
      renderer.dispose();
    },
  };
}
