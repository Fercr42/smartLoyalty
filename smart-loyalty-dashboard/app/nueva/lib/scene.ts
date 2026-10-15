import * as THREE from "three";
import qrcode from "qrcode-generator";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { stage } from "./stage";
import type { NvCopy } from "../copy";

// Escena del hero: una tarjeta de lealtad de cristal y miles de partículas ("visitas")
// que cambian de figura según la sección: galaxia, sellos, ondas de aviso, estrella de reseña y esfera.

const INK = 0x04140f;
// Tarjeta vertical con proporción de pase de Apple Wallet.
const CARD_W = 2.3;
const CARD_H = 3.04;
const FACE_W = 2.2;
const FACE_H = 2.94;

// Sellos de la tarjeta (coordenadas de la tarjeta). Los usan el dibujo de la cara y la figura "sellos".
const STAMP_R = 0.135;
export const STAMPS = [0.66, 0.3].flatMap((y) => [-0.76, -0.38, 0, 0.38, 0.76].map((x) => ({ x, y })));

type CardText = NvCopy["card"];
type Options = { mobile: boolean; reduced: boolean; card: CardText };

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

// Logo inventado de "Café Luna": una luna creciente ámbar que abraza un grano de café.
export function drawCafeLunaLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const off = document.createElement("canvas");
  off.width = off.height = Math.ceil(r * 2 + 4);
  const o = off.getContext("2d")!;
  const c = off.width / 2;
  o.fillStyle = "#f2b134";
  o.beginPath();
  o.arc(c, c, r, 0, Math.PI * 2);
  o.fill();
  o.globalCompositeOperation = "destination-out";
  o.beginPath();
  o.arc(c + r * 0.42, c - r * 0.3, r * 0.82, 0, Math.PI * 2);
  o.fill();
  o.globalCompositeOperation = "source-over";
  // grano de café
  o.save();
  o.translate(c + r * 0.18, c + r * 0.12);
  o.rotate(-0.55);
  o.fillStyle = "#f6ead8";
  o.beginPath();
  o.ellipse(0, 0, r * 0.3, r * 0.42, 0, 0, Math.PI * 2);
  o.fill();
  o.strokeStyle = "#5b3a24";
  o.lineWidth = Math.max(1.5, r * 0.07);
  o.lineCap = "round";
  o.beginPath();
  o.moveTo(0, -r * 0.36);
  o.bezierCurveTo(-r * 0.14, -r * 0.1, r * 0.14, r * 0.1, 0, r * 0.36);
  o.stroke();
  o.restore();
  ctx.drawImage(off, cx - c, cy - c);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// QR real y escaneable: lleva a smartloyalty.app.
const QR = (() => {
  const q = qrcode(0, "M");
  q.addData("https://smartloyalty.app");
  q.make();
  return q;
})();
function drawQr(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const n = QR.getModuleCount();
  const cell = size / n;
  ctx.fillStyle = "#1b120d";
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (QR.isDark(r, c)) ctx.fillRect(x + c * cell, y + r * cell, Math.ceil(cell), Math.ceil(cell));
}

// Cara de la tarjeta: un pase de Apple Wallet de "Café Luna" con 10 sellos, datos y código.
function drawFace(ctx: CanvasRenderingContext2D, lit: number, t: CardText) {
  const { width: w, height: h } = ctx.canvas;
  const X = (x: number) => (x / FACE_W + 0.5) * w;
  const Y = (y: number) => (0.5 - y / FACE_H) * h;
  const sans = "'Geist Variable', 'Geist', -apple-system, 'Helvetica Neue', 'Noto Sans Thai Variable', system-ui, sans-serif";
  const cream = "#f6ead8";
  const label = "#d9b98f";
  ctx.clearRect(0, 0, w, h);

  // Fondo del pase: espresso con un brillo cálido arriba.
  roundRect(ctx, 0, 0, w, h, 46);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#3a261b");
  bg.addColorStop(1, "#1f140e");
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.save();
  ctx.clip();

  // Encabezado: logo + nombre a la izquierda, sellos a la derecha.
  drawCafeLunaLogo(ctx, 74, 78, 36);
  ctx.fillStyle = cream;
  ctx.font = `600 46px ${sans}`;
  ctx.fillText("Café Luna", 124, 94);
  ctx.textAlign = "right";
  ctx.fillStyle = label;
  ctx.font = `600 22px ${sans}`;
  ctx.fillText(t.stamps, w - 40, 60);
  ctx.fillStyle = cream;
  ctx.font = `500 58px ${sans}`;
  ctx.fillText(t.of(lit), w - 40, 108);
  ctx.textAlign = "left";

  // Franja (strip) con los sellos.
  const sTop = Y(0.9);
  const sBot = Y(0.06);
  const strip = ctx.createLinearGradient(0, sTop, w, sBot);
  strip.addColorStop(0, "#c98a3d");
  strip.addColorStop(0.55, "#8a5530");
  strip.addColorStop(1, "#4a2d1c");
  ctx.fillStyle = strip;
  ctx.fillRect(0, sTop, w, sBot - sTop);
  // ondas de "latte art" muy suaves
  ctx.strokeStyle = "rgba(246,234,216,0.12)";
  ctx.lineWidth = 3;
  for (let k = 0; k < 6; k++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 12) {
      const yy = sTop + 30 + k * 40 + Math.sin(x / 70 + k) * 10;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  const sr = (STAMP_R / FACE_W) * w;
  STAMPS.forEach((st, k) => {
    const cx = X(st.x);
    const cy = Y(st.y);
    ctx.beginPath();
    ctx.arc(cx, cy, sr, 0, Math.PI * 2);
    if (k < lit) {
      ctx.fillStyle = k === 9 ? "#f2b134" : cream;
      ctx.fill();
      // tacita dentro del sello
      ctx.fillStyle = "#5b3a24";
      ctx.fillRect(cx - sr * 0.38, cy - sr * 0.22, sr * 0.62, sr * 0.5);
      ctx.beginPath();
      ctx.arc(cx + sr * 0.3, cy + sr * 0.02, sr * 0.16, -Math.PI / 2, Math.PI / 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#5b3a24";
      ctx.stroke();
    } else {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(246,234,216,0.6)";
      ctx.setLineDash([8, 7]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  // Campos secundarios.
  const fields = [
    { l: t.member, v: "Ana Solís", x: 40 },
    { l: t.left, v: lit >= 10 ? t.done : t.leftValue(10 - lit), x: w * 0.42 },
    { l: t.reward, v: t.rewardValue, x: w * 0.66 },
  ];
  fields.forEach((f) => {
    ctx.fillStyle = label;
    ctx.font = `600 22px ${sans}`;
    ctx.fillText(f.l, f.x, Y(-0.12));
    ctx.fillStyle = cream;
    ctx.font = `500 34px ${sans}`;
    ctx.fillText(f.v, f.x, Y(-0.12) + 44);
  });

  // Código para mostrar en caja.
  const qs = 0.66 / FACE_W * w;
  const qx = w / 2 - qs / 2;
  const qy = Y(-0.6);
  roundRect(ctx, qx - 18, qy - 18, qs + 36, qs + 36, 16);
  ctx.fillStyle = "#efe7da"; // blanco cálido: no se "quema" con el brillo
  ctx.fill();
  drawQr(ctx, qx, qy, qs);
  ctx.textAlign = "center";
  ctx.fillStyle = label;
  ctx.font = `500 23px ${sans}`;
  ctx.fillText(t.showCode, w / 2, qy + qs + 58);
  ctx.textAlign = "left";
  ctx.restore();
}

function roundedCard() {
  const shape = new THREE.Shape();
  const w = CARD_W / 2;
  const h = CARD_H / 2;
  const r = 0.2;
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

export function createScene(canvas: HTMLCanvasElement, { mobile, reduced, card: cardText }: Options) {
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
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
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
        emissiveIntensity: 0.08,
        metalness: 0,
        transmission: 1,
        thickness: 0.9,
        ior: 1.42,
        attenuationColor: new THREE.Color(0x19c58a),
        attenuationDistance: 3,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
        iridescence: 0.4,
        iridescenceIOR: 1.25,
        envMapIntensity: 1.2,
      });
  const cardGeo = roundedCard();
  card.add(new THREE.Mesh(cardGeo, glass));

  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = 768;
  faceCanvas.height = Math.round((768 * FACE_H) / FACE_W);
  const faceCtx = faceCanvas.getContext("2d")!;
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  faceTex.anisotropy = 4;
  const faceGeo = new THREE.PlaneGeometry(FACE_W, FACE_H);
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.z = 0.062;
  card.add(face);

  let shown = -1;
  const redrawFace = () => {
    drawFace(faceCtx, Math.round(stage.stamps), cardText);
    faceTex.needsUpdate = true;
    shown = Math.round(stage.stamps);
  };
  document.fonts?.ready.then(redrawFace).catch(() => {});
  redrawFace();


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
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.5, 0.9); // umbral alto: brillan las partículas, no la tarjeta
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
    card.rotation.set(cur.rx - my * 0.2, cur.ry + mx * 0.2 + stage.spin, cur.rz + Math.sin(time * 0.6) * 0.02);
    card.scale.setScalar(Math.max(cur.s, 0.0001));
    card.visible = cur.s > 0.02;
    uniforms.uCenter.value.set(cur.x, cur.y, cur.z);

    // Cara: solo se vuelve a dibujar cuando cambian los sellos.
    if (Math.round(stage.stamps) !== shown) redrawFace();

    // Cursor en el plano z = 0.
    if (!reduced) {
      ndc.set(stage.mouse.x, stage.mouse.y);
      ray.setFromCamera(ndc, camera);
      const hit = ray.ray.intersectPlane(plane, new THREE.Vector3());
      if (hit) mouseWorld.lerp(hit, 1 - Math.exp(-dt * 10));
      uniforms.uMouse.value.copy(mouseWorld);
      // La luz se mueve poco con el cursor: así el reflejo nunca apunta de lleno a la cámara.
      key.position.set(3 + mx * 1.2, 4 + my * 0.8, 6);
    }
    camera.position.x += (mx * 0.35 - camera.position.x) * k;
    camera.position.y += (my * 0.25 - camera.position.y) * k;
    camera.lookAt(0, 0, 0);

    // Con movimiento reducido solo se dibuja cuando algo cambió.
    if (reduced) {
      const sig = JSON.stringify([stage.shape, stage.card, stage.stamps, stage.fade, camera.aspect]);
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
      env.dispose();
      pmrem.dispose();
      composer?.dispose();
      renderer.dispose();
    },
  };
}
