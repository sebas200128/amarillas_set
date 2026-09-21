/**
 * Árbol de Flores Amarillas / Girasoles en forma de Corazón
 * JavaScript Vanilla - Animación Orgánica y Efectos Visuales
 */

(function () {
  'use strict';

  // --- Elementos del DOM ---
  const startScreen = document.getElementById('start-screen');
  const startBtn = document.getElementById('start-btn');
  const canvas = document.getElementById('tree-canvas');
  const ctx = canvas.getContext('2d');
  const cardContainer = document.getElementById('card-container');
  const typewriterEl = document.getElementById('typewriter-text');
  const cardFooter = document.getElementById('card-footer');
  const soundBtn = document.getElementById('sound-btn');
  const soundIcon = document.getElementById('sound-icon');
  const replayBtn = document.getElementById('replay-btn');

  // --- Estado de la Animación ---
  let state = 'IDLE'; // 'IDLE', 'GROUND', 'GROWING_TRUNK', 'GROWING_BRANCHES', 'BLOOMING', 'SHIFTING', 'CARD_APPEARING', 'COMPLETED'
  let animationTime = 0;
  let lastTimestamp = 0;
  let animationFrameId = null;

  // --- Dimensiones y Retracción Retina ---
  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  // --- Desplazamiento del Árbol (para moverlo a la derecha) ---
  let treeShiftX = 0;
  let treeShiftY = 0;
  let targetShiftX = 0;
  let targetShiftY = 0;
  let shiftProgress = 0;

  // --- Parámetros de la Geometría del Árbol ---
  let groundY = 0;
  let trunkProgress = 0;
  let branchesProgress = 0;
  let groundLineProgress = 0;
  let currentHeartScale = 16;
  let currentHeartCenterY = 0;

  // Estructuras de datos
  let branches = [];
  let leaves = [];
  let flowers = [];
  let petals = [];

  // --- Sonido Ambiental Sintetizado (Web Audio API nativo) ---
  let audioCtx = null;
  let soundEnabled = true;
  const PENTATONIC_CHIMES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51]; // C5 to E6

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playChime(freq, volume = 0.04) {
    if (!soundEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const now = audioCtx.currentTime;

      // Forma de onda sinusoidal pura y cálida
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // Envolvente tipo campana / xilófono suave
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 1.2);
    } catch (e) {
      // Audio ignorado silenciosamente si no está disponible
    }
  }

  // --- Curva Paramétrica del Corazón ---
  // Ecuación matemática clásica del corazón en Canvas (Y invertido)
  function heartPoint(t, scale) {
    // t va de 0 a 2*PI
    const x = 16 * Math.pow(Math.sin(t), 3) * scale;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale;
    return { x, y };
  }

  // --- Ajuste de Tamaño de Pantalla ---
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    groundY = height * 0.88;

    // Calcular desplazamiento objetivo del árbol según el tamaño de la pantalla
    if (width > 900) {
      targetShiftX = width * 0.20; // Se mueve hacia la derecha en pantallas medianas/grandes
      targetShiftY = 0;
    } else {
      targetShiftX = 0; // Se mantiene centrado en móvil
      targetShiftY = -height * 0.12; // Se eleva ligeramente para dejar espacio al texto
    }

    if (state === 'SHIFTING' || state === 'CARD_APPEARING' || state === 'COMPLETED') {
      treeShiftX = targetShiftX;
      treeShiftY = targetShiftY;
    }
  }

  // --- Generación de la Estructura del Árbol y Ramas ---
  function generateTreeModel() {
    branches = [];
    leaves = [];
    flowers = [];

    const isMobile = width <= 900;
    // Escala del corazón proporcional al tamaño de pantalla
    const heartScale = Math.min(width * 0.016, height * 0.018, isMobile ? 11 : 16);

    // Centro del corazón (en coordenadas relativas al centro de la pantalla)
    const heartCenterY = groundY - 26 * heartScale;
    const heartTipY = heartCenterY + 17 * heartScale; // Punto inferior del corazón
    currentHeartScale = heartScale;
    currentHeartCenterY = heartCenterY;

    // 1. Tronco Principal (de groundY hasta cerca del tip inferior del corazón)
    const trunkBase = { x: 0, y: groundY };
    const trunkTop = { x: 0, y: heartTipY + 8 };

    branches.push({
      p0: trunkBase,
      p1: { x: -4, y: groundY - (groundY - trunkTop.y) * 0.4 },
      p2: { x: 4, y: groundY - (groundY - trunkTop.y) * 0.75 },
      p3: trunkTop,
      widthStart: isMobile ? 18 : 24,
      widthEnd: isMobile ? 9 : 12,
      startProgress: 0.0,
      endProgress: 0.28,
      color: '#2e4423'
    });

    // 2. Ramas Principales que se abren hacia los lóbulos izquierdo y derecho
    const forkY = trunkTop.y;

    // Rama Lóbulo Izquierdo
    branches.push({
      p0: { x: 0, y: forkY },
      p1: { x: -6 * heartScale, y: forkY - 4 * heartScale },
      p2: { x: -11 * heartScale, y: heartCenterY + 4 * heartScale },
      p3: { x: -8 * heartScale, y: heartCenterY - 3 * heartScale },
      widthStart: 11,
      widthEnd: 4,
      startProgress: 0.25,
      endProgress: 0.65,
      color: '#344e27'
    });

    // Rama Lóbulo Derecho
    branches.push({
      p0: { x: 0, y: forkY },
      p1: { x: 6 * heartScale, y: forkY - 4 * heartScale },
      p2: { x: 11 * heartScale, y: heartCenterY + 4 * heartScale },
      p3: { x: 8 * heartScale, y: heartCenterY - 3 * heartScale },
      widthStart: 11,
      widthEnd: 4,
      startProgress: 0.25,
      endProgress: 0.65,
      color: '#344e27'
    });

    // Rama Central Inferior
    branches.push({
      p0: { x: 0, y: forkY },
      p1: { x: -2 * heartScale, y: forkY - 5 * heartScale },
      p2: { x: 2 * heartScale, y: heartCenterY + 2 * heartScale },
      p3: { x: 0, y: heartCenterY - 1 * heartScale },
      widthStart: 8,
      widthEnd: 3,
      startProgress: 0.3,
      endProgress: 0.7,
      color: '#38572b'
    });

    // Sub-ramas secundarias para llenar los lóbulos
    const subBranchDefs = [
      // Lóbulo izquierdo superior
      { p0: { x: -8 * heartScale, y: heartCenterY - 3 * heartScale }, p1: { x: -10 * heartScale, y: heartCenterY - 8 * heartScale }, p2: { x: -7 * heartScale, y: heartCenterY - 10 * heartScale }, p3: { x: -4 * heartScale, y: heartCenterY - 7 * heartScale }, wS: 4, wE: 2, sP: 0.55, eP: 0.95 },
      // Lóbulo izquierdo exterior
      { p0: { x: -6 * heartScale, y: forkY - 4 * heartScale }, p1: { x: -12 * heartScale, y: forkY - 7 * heartScale }, p2: { x: -14 * heartScale, y: heartCenterY + 3 * heartScale }, p3: { x: -12 * heartScale, y: heartCenterY }, wS: 5, wE: 2, sP: 0.45, eP: 0.85 },
      // Lóbulo derecho superior
      { p0: { x: 8 * heartScale, y: heartCenterY - 3 * heartScale }, p1: { x: 10 * heartScale, y: heartCenterY - 8 * heartScale }, p2: { x: 7 * heartScale, y: heartCenterY - 10 * heartScale }, p3: { x: 4 * heartScale, y: heartCenterY - 7 * heartScale }, wS: 4, wE: 2, sP: 0.55, eP: 0.95 },
      // Lóbulo derecho exterior
      { p0: { x: 6 * heartScale, y: forkY - 4 * heartScale }, p1: { x: 12 * heartScale, y: forkY - 7 * heartScale }, p2: { x: 14 * heartScale, y: heartCenterY + 3 * heartScale }, p3: { x: 12 * heartScale, y: heartCenterY }, wS: 5, wE: 2, sP: 0.45, eP: 0.85 },
      // Ramitas hacia la hendidura central superior
      { p0: { x: 0, y: heartCenterY - 1 * heartScale }, p1: { x: -2 * heartScale, y: heartCenterY - 4 * heartScale }, p2: { x: -1 * heartScale, y: heartCenterY - 6 * heartScale }, p3: { x: 0, y: heartCenterY - 5 * heartScale }, wS: 3, wE: 1.5, sP: 0.65, eP: 0.98 }
    ];

    subBranchDefs.forEach(b => {
      branches.push({
        p0: b.p0, p1: b.p1, p2: b.p2, p3: b.p3,
        widthStart: b.wS, widthEnd: b.wE,
        startProgress: b.sP, endProgress: b.eP,
        color: '#3e632f'
      });
    });

    // 3. Hojas verdes a lo largo de las ramas
    const leafCount = isMobile ? 55 : 85;
    for (let i = 0; i < leafCount; i++) {
      const bIndex = Math.floor(Math.random() * branches.length);
      const b = branches[bIndex];
      const t = 0.2 + Math.random() * 0.75;
      const pt = getCubicBezierPoint(b.p0, b.p1, b.p2, b.p3, t);

      leaves.push({
        x: pt.x + (Math.random() - 0.5) * 12,
        y: pt.y + (Math.random() - 0.5) * 12,
        size: 5 + Math.random() * 7,
        angle: Math.random() * Math.PI * 2,
        color: Math.random() > 0.4 ? '#4a7534' : '#395c27',
        bloomProgress: 0,
        appearTime: b.startProgress + (b.endProgress - b.startProgress) * t
      });
    }

    // 4. GENERACIÓN DENSA, UNIFORME Y COMPACTA DE LOS GIRASOLES
    // Cobertura del 100% de la silueta del corazón sin huecos vacíos

    // Polígono de referencia de alta resolución para test punto-en-polígono exacto
    const POLY_STEPS = 360;
    const heartPoly = [];
    for (let i = 0; i < POLY_STEPS; i++) {
      const t = (Math.PI * 2 * i) / POLY_STEPS;
      heartPoly.push(heartPoint(t, 1.0));
    }

    function isInsideHeart(nx, ny) {
      let inside = false;
      const n = heartPoly.length;
      let p1 = heartPoly[0];
      for (let i = 0; i <= n; i++) {
        const p2 = heartPoly[i % n];
        if (ny > Math.min(p1.y, p2.y)) {
          if (ny <= Math.max(p1.y, p2.y)) {
            if (nx <= Math.max(p1.x, p2.x)) {
              if (p1.y !== p2.y) {
                const xinters = (ny - p1.y) * (p2.x - p1.x) / (p2.y - p1.y) + p1.x;
                if (p1.x === p2.x || nx <= xinters) {
                  inside = !inside;
                }
              }
            }
          }
        }
        p1 = p2;
      }
      return inside;
    }

    // A) Malla hexagonal compacta que cubre el 100% del interior
    const spacing = heartScale * 1.15;
    const dy = spacing * Math.sqrt(3) / 2;
    const dx = spacing;

    let row = 0;
    const minY = -12.5 * heartScale;
    const maxY = 17.5 * heartScale;
    const minX = -16.5 * heartScale;
    const maxX = 16.5 * heartScale;

    for (let y = minY; y <= maxY; y += dy) {
      const rowOffset = (row % 2 === 1) ? (dx * 0.5) : 0;
      for (let x = minX + rowOffset; x <= maxX; x += dx) {
        // Jitter suave para aspecto botánico natural (sin perder solapamiento)
        const jx = x + (Math.random() - 0.5) * 0.22 * dx;
        const jy = y + (Math.random() - 0.5) * 0.22 * dy;
        const nx = jx / heartScale;
        const ny = jy / heartScale;

        if (isInsideHeart(nx, ny)) {
          const heightFactor = (jy + 12 * heartScale) / (29 * heartScale);
          const delay = (1 - heightFactor) * 0.65 + Math.random() * 0.2;
          // Radio amplio que sobrepasa el espaciado para garantizar solapamiento total
          const radius = spacing * (1.10 + Math.random() * 0.35);

          flowers.push({
            x: jx,
            y: heartCenterY + jy,
            targetSize: radius,
            currentSize: 0,
            rotation: Math.random() * Math.PI * 2,
            bloomDelay: delay,
            bloomDuration: 0.32 + Math.random() * 0.22,
            bloomProgress: 0,
            petalHueVariation: (Math.random() - 0.5) * 8,
            swayPhase: Math.random() * Math.PI * 2,
            type: 'base'
          });
        }
      }
      row++;
    }

    // B) Capa de borde perimetral que define con nitidez la silueta del corazón
    const boundaryCount = Math.floor(130 * (heartScale / 16));
    for (let i = 0; i < boundaryCount; i++) {
      const t = (Math.PI * 2 * i) / boundaryCount;
      const bp = heartPoint(t, heartScale);
      const rJitter = 0.96 + Math.random() * 0.05;
      const heightFactor = (bp.y + 12 * heartScale) / (29 * heartScale);
      const delay = (1 - heightFactor) * 0.65 + Math.random() * 0.2;
      const radius = spacing * (0.85 + Math.random() * 0.28);

      flowers.push({
        x: bp.x * rJitter,
        y: heartCenterY + bp.y * rJitter,
        targetSize: radius,
        currentSize: 0,
        rotation: Math.random() * Math.PI * 2,
        bloomDelay: delay,
        bloomDuration: 0.32 + Math.random() * 0.22,
        bloomProgress: 0,
        petalHueVariation: (Math.random() - 0.5) * 8,
        swayPhase: Math.random() * Math.PI * 2,
        type: 'boundary'
      });
    }

    // C) Capa de girasoles "Hero" más grandes superpuestos para volumen 3D y variedad
    const heroCount = Math.floor(75 * (heartScale / 16));
    const starCenter = { x: 0, y: 2.5 * heartScale };
    for (let i = 0; i < heroCount; i++) {
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(0.04 + Math.random() * 0.82);
      const bp = heartPoint(t, heartScale);
      const px = starCenter.x + r * (bp.x - starCenter.x) + (Math.random() - 0.5) * 8;
      const py = starCenter.y + r * (bp.y - starCenter.y) + (Math.random() - 0.5) * 8;

      if (isInsideHeart(px / heartScale, py / heartScale)) {
        const heightFactor = (py + 12 * heartScale) / (29 * heartScale);
        const delay = (1 - heightFactor) * 0.65 + Math.random() * 0.25;
        const radius = spacing * (1.30 + Math.random() * 0.45);

        flowers.push({
          x: px,
          y: heartCenterY + py,
          targetSize: radius,
          currentSize: 0,
          rotation: Math.random() * Math.PI * 2,
          bloomDelay: delay,
          bloomDuration: 0.36 + Math.random() * 0.22,
          bloomProgress: 0,
          petalHueVariation: (Math.random() - 0.5) * 8,
          swayPhase: Math.random() * Math.PI * 2,
          type: 'hero'
        });
      }
    }

    // Ordenar flores por bloomDelay para un progreso secuencial natural
    flowers.sort((a, b) => a.bloomDelay - b.bloomDelay);
  }

  // --- Partículas: Pétalos y Mini Girasoles Flotantes ---
  function initPetals() {
    petals = [];
    const count = width <= 900 ? 28 : 46;
    for (let i = 0; i < count; i++) {
      petals.push(createPetal(true));
    }
  }

  function createPetal(randomY = false) {
    const isSunflower = Math.random() < 0.25; // 25% mini girasoles completos, 75% pétalos individuales
    return {
      x: Math.random() * (width * 1.2),
      y: randomY ? Math.random() * height : -20 - Math.random() * 40,
      size: isSunflower ? 6 + Math.random() * 5 : 5 + Math.random() * 6,
      vx: -(0.5 + Math.random() * 1.1), // Viento soplando hacia la izquierda (hacia la carta)
      vy: 0.7 + Math.random() * 1.2,    // Caída hacia abajo
      rotation: Math.random() * Math.PI * 2,
      vRotation: (Math.random() - 0.5) * 0.04,
      oscillationSpeed: 0.02 + Math.random() * 0.03,
      oscillationPhase: Math.random() * Math.PI * 2,
      oscillationAmp: 0.8 + Math.random() * 1.2,
      isSunflower: isSunflower,
      color: Math.random() > 0.3 ? '#ffca28' : '#f57f17',
      opacity: 0.65 + Math.random() * 0.35
    };
  }

  // --- Utilidades Matemáticas de Curvas de Bézier ---
  function getCubicBezierPoint(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
    };
  }

  // Easing elástico suave para la apertura de flores
  function easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  // --- DIBUJO EN CANVAS ---

  // 1. Dibujar Línea del Suelo
  function drawGround(centerX) {
    if (groundLineProgress <= 0) return;

    ctx.save();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#2b2723';
    ctx.lineCap = 'round';

    const maxHalfWidth = width * 0.45;
    const currentHalfWidth = maxHalfWidth * easeOutCubic(groundLineProgress);

    ctx.beginPath();
    ctx.moveTo(centerX - currentHalfWidth, groundY);
    ctx.lineTo(centerX + currentHalfWidth, groundY);
    ctx.stroke();

    // Pequeño sombreado difuminado bajo la línea
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(43, 39, 35, 0.08)';
    ctx.beginPath();
    ctx.moveTo(centerX - currentHalfWidth * 0.85, groundY + 2);
    ctx.lineTo(centerX + currentHalfWidth * 0.85, groundY + 2);
    ctx.stroke();

    ctx.restore();
  }

  // 2. Dibujar Ramas Orgánicas
  function drawBranches(centerX) {
    ctx.save();
    ctx.translate(centerX, 0);

    branches.forEach(b => {
      // Progreso relativo de esta rama
      if (branchesProgress <= b.startProgress) return;

      const localProgress = Math.min(1, (branchesProgress - b.startProgress) / (b.endProgress - b.startProgress));
      if (localProgress <= 0) return;

      const segments = 24;
      const maxSegment = Math.floor(segments * localProgress);

      ctx.strokeStyle = b.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let prevPt = b.p0;

      for (let i = 1; i <= maxSegment; i++) {
        const t = i / segments;
        const pt = getCubicBezierPoint(b.p0, b.p1, b.p2, b.p3, t);
        const w = b.widthStart + (b.widthEnd - b.widthStart) * t;

        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(prevPt.x, prevPt.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();

        prevPt = pt;
      }
    });

    // Dibujar hojas que brotan de las ramas
    leaves.forEach(leaf => {
      if (branchesProgress >= leaf.appearTime) {
        const leafGrowth = Math.min(1, (branchesProgress - leaf.appearTime) / 0.15);
        if (leafGrowth > 0) {
          drawLeaf(leaf.x, leaf.y, leaf.size * easeOutBack(leafGrowth), leaf.angle, leaf.color);
        }
      }
    });

    ctx.restore();
  }

  function drawLeaf(x, y, size, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.7, -size * 0.5, size, 0);
    ctx.quadraticCurveTo(size * 0.7, size * 0.5, 0, 0);
    ctx.fill();

    ctx.restore();
  }

  // 3. Dibujar Girasol Estilizado con Pétalos y Semillas
  function drawSunflower(x, y, radius, rotation, hueVar, isHero = false) {
    if (radius <= 0.8) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Cáliz / Sépalos verdes detrás de los pétalos
    ctx.fillStyle = '#3a5828';
    const sepalCount = 8;
    for (let i = 0; i < sepalCount; i++) {
      const a = (i * Math.PI * 2) / sepalCount;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius * 0.7, -radius * 0.16);
      ctx.lineTo(radius * 0.95, 0);
      ctx.lineTo(radius * 0.7, radius * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Anillo Exterior de Pétalos (13 a 16 pétalos dorados según importancia)
    const petalCount = isHero ? 16 : 13;
    const petalLength = radius * 0.95;
    const petalWidth = radius * 0.28;

    for (let i = 0; i < petalCount; i++) {
      const a = (i * Math.PI * 2) / petalCount;
      ctx.save();
      ctx.rotate(a);

      // Gradiente suave para cada pétalo
      const grad = ctx.createLinearGradient(0, 0, petalLength, 0);
      grad.addColorStop(0, '#f57f17'); // Base ámbar oscuro
      grad.addColorStop(0.5, '#fbc02d'); // Amarillo dorado vibrante
      grad.addColorStop(1, '#fff176'); // Punta brillante

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(radius * 0.2, 0);
      ctx.quadraticCurveTo(petalLength * 0.55, -petalWidth * 0.9, petalLength, 0);
      ctx.quadraticCurveTo(petalLength * 0.55, petalWidth * 0.9, radius * 0.2, 0);
      ctx.fill();
      ctx.restore();
    }

    // Anillo Interior de Pétalos intercalados (más brillantes)
    const innerPetalCount = isHero ? 13 : 10;
    const innerLength = radius * 0.75;
    const innerWidth = radius * 0.24;
    const offsetAngle = Math.PI / innerPetalCount;

    for (let i = 0; i < innerPetalCount; i++) {
      const a = (i * Math.PI * 2) / innerPetalCount + offsetAngle;
      ctx.save();
      ctx.rotate(a);

      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.moveTo(radius * 0.2, 0);
      ctx.quadraticCurveTo(innerLength * 0.5, -innerWidth * 0.85, innerLength, 0);
      ctx.quadraticCurveTo(innerLength * 0.5, innerWidth * 0.85, radius * 0.2, 0);
      ctx.fill();
      ctx.restore();
    }

    // Centro del Girasol (semillero marrón chocolate oscuro aterciopelado)
    const centerR = radius * 0.38;
    const centerGrad = ctx.createRadialGradient(
      -centerR * 0.15, -centerR * 0.15, centerR * 0.1,
      0, 0, centerR
    );
    centerGrad.addColorStop(0, '#5d4037');
    centerGrad.addColorStop(0.65, '#3e2723');
    centerGrad.addColorStop(1, '#1a0d00');

    ctx.beginPath();
    ctx.arc(0, 0, centerR, 0, Math.PI * 2);
    ctx.fillStyle = centerGrad;
    ctx.fill();

    // Anillo de polen / estambres dorados en el borde del centro
    ctx.beginPath();
    ctx.arc(0, 0, centerR * 0.85, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 179, 0, 0.45)';
    ctx.lineWidth = Math.max(1, centerR * 0.15);
    ctx.stroke();

    // Puntos de semillas para flores medianas y hero
    if (radius > 11 && (isHero || radius > 14)) {
      ctx.fillStyle = '#b8860b';
      const seedCount = 12;
      for (let s = 0; s < seedCount; s++) {
        const sa = (s * Math.PI * 2) / seedCount;
        const sr = centerR * 0.55;
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // 4. Dibujar Todas las Flores del Corazón de manera Densa y Superpuesta
  function drawHeartBackdrop(centerX, scale, centerY, progress) {
    if (progress <= 0) return;
    ctx.save();
    ctx.translate(centerX, centerY);

    ctx.beginPath();
    const steps = 180;
    for (let i = 0; i <= steps; i++) {
      const t = (Math.PI * 2 * i) / steps;
      const pt = heartPoint(t, scale);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();

    // Fondo botánico denso en verde oliva y ámbar cálido
    const grad = ctx.createRadialGradient(0, 2.5 * scale, scale, 0, 2.5 * scale, 17 * scale);
    grad.addColorStop(0, 'rgba(42, 68, 28, ' + (0.95 * progress) + ')');
    grad.addColorStop(0.75, 'rgba(34, 54, 23, ' + (0.92 * progress) + ')');
    grad.addColorStop(1, 'rgba(196, 139, 24, ' + (0.85 * progress) + ')');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();
  }

  function drawHeartFlowers(centerX) {
    // Cojín de fondo botánico que garantiza cero espacios en blanco
    const backdropProgress = Math.max(0, Math.min(1, (branchesProgress - 0.35) / 0.35));
    drawHeartBackdrop(centerX, currentHeartScale, currentHeartCenterY, backdropProgress);

    ctx.save();
    ctx.translate(centerX, 0);

    const time = animationTime * 0.002;

    // Pasada 1: Flores base hexagonales (relleno denso de fondo)
    for (let i = 0; i < flowers.length; i++) {
      const f = flowers[i];
      if (f.bloomProgress <= 0 || f.type !== 'base') continue;
      const sway = Math.sin(time + f.swayPhase) * 0.035;
      drawSunflower(f.x, f.y, f.currentSize, f.rotation + sway, f.petalHueVariation, false);
    }

    // Pasada 2: Flores de silueta perimetral
    for (let i = 0; i < flowers.length; i++) {
      const f = flowers[i];
      if (f.bloomProgress <= 0 || f.type !== 'boundary') continue;
      const sway = Math.sin(time + f.swayPhase) * 0.035;
      drawSunflower(f.x, f.y, f.currentSize, f.rotation + sway, f.petalHueVariation, false);
    }

    // Pasada 3: Flores Hero destacadas en primer plano
    for (let i = 0; i < flowers.length; i++) {
      const f = flowers[i];
      if (f.bloomProgress <= 0 || f.type !== 'hero') continue;
      const sway = Math.sin(time + f.swayPhase) * 0.035;
      drawSunflower(f.x, f.y, f.currentSize, f.rotation + sway, f.petalHueVariation, true);
    }

    ctx.restore();
  }

  // 5. Dibujar Pétalos y Flores Flotantes en el Viento
  function drawFallingPetals() {
    ctx.save();

    petals.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;

      if (p.isSunflower) {
        // Mini girasol completo flotando
        drawSunflower(0, 0, p.size, 0, 0);
      } else {
        // Pétalo individual alargado
        const grad = ctx.createLinearGradient(0, 0, p.size * 1.6, 0);
        grad.addColorStop(0, '#f57f17');
        grad.addColorStop(0.6, p.color);
        grad.addColorStop(1, '#fff9c4');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(p.size * 0.8, -p.size * 0.45, p.size * 1.6, 0);
        ctx.quadraticCurveTo(p.size * 0.8, p.size * 0.45, 0, 0);
        ctx.fill();
      }

      ctx.restore();
    });

    ctx.restore();
  }

  // --- Actualización de Física y Animación ---
  function update(dt) {
    animationTime += dt;

    // FASE 1: Dibujo de la línea del suelo
    if (state === 'GROUND') {
      groundLineProgress += dt * 0.0016; // ~0.65s
      if (groundLineProgress >= 1) {
        groundLineProgress = 1;
        state = 'GROWING_TRUNK';
      }
    }

    // FASE 2 & 3: Crecimiento del Tronco y Ramas
    if (state === 'GROWING_TRUNK' || state === 'GROWING_BRANCHES') {
      branchesProgress += dt * 0.00075; // Crecimiento suave (~1.3s)

      if (branchesProgress > 0.35 && state === 'GROWING_TRUNK') {
        state = 'GROWING_BRANCHES';
      }

      if (branchesProgress >= 0.7) {
        // Empezar a florecer cuando las ramas alcancen el 70%
        if (state !== 'BLOOMING' && state !== 'SHIFTING' && state !== 'CARD_APPEARING' && state !== 'COMPLETED') {
          state = 'BLOOMING';
        }
      }

      if (branchesProgress > 1) {
        branchesProgress = 1;
      }
    }

    // FASE 4: Florecimiento de Girasoles
    if (state === 'BLOOMING' || state === 'SHIFTING' || state === 'CARD_APPEARING' || state === 'COMPLETED') {
      let bloomedCount = 0;

      flowers.forEach((f, idx) => {
        // El florecimiento avanza según el tiempo transcurrido
        const flowerTime = (animationTime - 1800) * 0.0006;
        if (flowerTime > f.bloomDelay) {
          if (f.bloomProgress === 0) {
            // Reproducir tenue campanilla armónica ocasionalmente
            if (idx % 24 === 0 && (state === 'BLOOMING' || state === 'SHIFTING')) {
              const chimeFreq = PENTATONIC_CHIMES[idx % PENTATONIC_CHIMES.length];
              playChime(chimeFreq, 0.035);
            }
          }

          f.bloomProgress = Math.min(1, f.bloomProgress + (dt / 1000) / f.bloomDuration);
          f.currentSize = f.targetSize * easeOutBack(f.bloomProgress);
        }

        if (f.bloomProgress >= 1) {
          bloomedCount++;
        }
      });

      // Cuando florecen al menos el 60%, iniciar el desplazamiento del árbol hacia la derecha
      const bloomRatio = bloomedCount / flowers.length;
      if (bloomRatio >= 0.60 && state === 'BLOOMING') {
        state = 'SHIFTING';
      }
    }

    // FASE 5: Desplazamiento del Árbol hacia la Derecha
    if (state === 'SHIFTING') {
      shiftProgress += dt * 0.00055; // Desplazamiento majestuoso en ~1.8s
      const ease = easeInOutCubic(Math.min(1, shiftProgress));

      treeShiftX = targetShiftX * ease;
      treeShiftY = targetShiftY * ease;

      if (shiftProgress >= 1) {
        shiftProgress = 1;
        treeShiftX = targetShiftX;
        treeShiftY = targetShiftY;
        state = 'CARD_APPEARING';
        onTreeShiftComplete();
      }
    }

    // FASE 6 & Viento continuo: Actualizar pétalos cayendo
    const windTime = animationTime * 0.0015;
    petals.forEach(p => {
      p.y += p.vy;
      p.x += p.vx + Math.sin(windTime + p.oscillationPhase) * p.oscillationAmp;
      p.rotation += p.vRotation;

      // Si sale de pantalla por la izquierda o por abajo, reaparecer por la derecha o arriba
      if (p.y > height + 30 || p.x < -40) {
        p.y = -20 - Math.random() * 30;
        p.x = Math.random() * (width * 1.15);
      }
    });
  }

  // --- Bucle Principal de Renderizado ---
  function render() {
    ctx.clearRect(0, 0, width, height);

    const currentCenterX = width * 0.5 + treeShiftX;

    // 1. Línea del suelo
    drawGround(currentCenterX);

    // 2. Tronco y ramas
    drawBranches(currentCenterX);

    // 3. Girasoles en forma de corazón
    drawHeartFlowers(currentCenterX);

    // 4. Pétalos y flores flotando
    drawFallingPetals();
  }

  function loop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.min(timestamp - lastTimestamp, 50); // Clamped a 50ms para evitar saltos
    lastTimestamp = timestamp;

    update(dt);
    render();

    animationFrameId = requestAnimationFrame(loop);
  }

  // --- Transición: Aparición de la Carta de Amor y Máquina de Escribir ---
  function onTreeShiftComplete() {
    // Mostrar la tarjeta en el lado izquierdo
    cardContainer.classList.add('visible');

    // Reproducir acorde cálido de apertura
    setTimeout(() => {
      playChime(523.25, 0.06); // C5
      setTimeout(() => playChime(659.25, 0.05), 120); // E5
      setTimeout(() => playChime(783.99, 0.06), 240); // G5
      startTypewriterEffect();
    }, 600);
  }

  // Mensaje solicitado por el usuario
  const messageData = [
    { text: "CADA GIRASOL QUE VES AQUÍ ES UN LATIDO DE MI CORAZÓN.", isStrong: false },
    { text: "ASÍ COMO EL SOL ILUMINA LOS CAMPOS, TÚ ILUMINAS MI VIDA.", isStrong: false },
    { text: "QUE ESTAS FLORES TE RECUERDEN LO ESPECIAL QUE ERES PARA MÍ.", isStrong: false },
    { text: "- ¡TE AMO!", isStrong: true }
  ];

  function startTypewriterEffect() {
    typewriterEl.innerHTML = '';
    let lineIdx = 0;
    let charIdx = 0;

    // Crear elemento contenedor para la primera línea
    let currentLineEl = document.createElement('div');
    currentLineEl.className = 'message-line';
    typewriterEl.appendChild(currentLineEl);

    // Cursor parpadeante
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    currentLineEl.appendChild(cursor);

    function typeChar() {
      if (lineIdx >= messageData.length) {
        // Terminado: remover cursor y mostrar pie de página
        if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
        onTypewriterComplete();
        return;
      }

      const currentItem = messageData[lineIdx];
      const targetText = currentItem.text;

      if (charIdx < targetText.length) {
        const char = targetText.charAt(charIdx);
        // Insertar caracter antes del cursor
        const charNode = document.createTextNode(char);
        currentLineEl.insertBefore(charNode, cursor);
        charIdx++;

        // Sonido tenue de tecleo suave ocasional
        if (char !== ' ' && charIdx % 5 === 0) {
          playChime(880.0, 0.015);
        }

        // Velocidad de tecleo natural con variación orgánica
        const typingDelay = 32 + Math.random() * 28;
        setTimeout(typeChar, typingDelay);
      } else {
        // Línea completa: pasar a la siguiente línea tras una breve pausa
        lineIdx++;
        charIdx = 0;

        if (lineIdx < messageData.length) {
          setTimeout(() => {
            currentLineEl = document.createElement('div');
            currentLineEl.className = 'message-line' + (messageData[lineIdx].isStrong ? ' highlight-strong' : '');
            typewriterEl.appendChild(currentLineEl);
            currentLineEl.appendChild(cursor);
            typeChar();
          }, 380);
        } else {
          setTimeout(() => {
            if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
            onTypewriterComplete();
          }, 400);
        }
      }
    }

    typeChar();
  }

  function onTypewriterComplete() {
    state = 'COMPLETED';

    // Mostrar pie de página con frase cursiva y mini girasol
    cardFooter.classList.add('visible');

    // Reproducir campana final
    setTimeout(() => {
      playChime(1046.5, 0.07);
    }, 300);

    // Mostrar botón de reinicio
    setTimeout(() => {
      replayBtn.classList.remove('hidden');
    }, 1200);
  }

  // --- Inicio de la Animación al Hacer Clic ---
  function startExperience() {
    initAudio();

    // 1. Ocultar botón inicial con efecto de encogimiento y desvanecimiento
    startScreen.classList.add('hidden');

    // 2. Inicializar modelo del árbol y pétalos
    generateTreeModel();
    initPetals();

    // 3. Comenzar ciclo de animación
    animationTime = 0;
    state = 'GROUND';

    if (!animationFrameId) {
      lastTimestamp = performance.now();
      animationFrameId = requestAnimationFrame(loop);
    }
  }

  // --- Reinicio Completo de la Experiencia ---
  function resetExperience() {
    // Ocultar controles y tarjeta
    replayBtn.classList.add('hidden');
    cardContainer.classList.remove('visible');
    cardFooter.classList.remove('visible');
    typewriterEl.innerHTML = '';

    // Restablecer variables
    treeShiftX = 0;
    treeShiftY = 0;
    shiftProgress = 0;
    groundLineProgress = 0;
    trunkProgress = 0;
    branchesProgress = 0;

    // Mostrar pantalla de inicio nuevamente
    startScreen.classList.remove('hidden');
    state = 'IDLE';

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);
  }

  // --- Event Listeners ---

  // Clic en el botón inicial
  startBtn.addEventListener('click', () => {
    if (state === 'IDLE') {
      startExperience();
    }
  });

  // Soporte para accesibilidad con teclado (Enter / Espacio)
  startBtn.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && state === 'IDLE') {
      e.preventDefault();
      startExperience();
    }
  });

  // Botón de sonido (Silenciar / Activar)
  soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundIcon.textContent = soundEnabled ? '🔈' : '🔇';
    if (soundEnabled) {
      initAudio();
      playChime(659.25, 0.04);
    }
  });

  // Botón de reinicio
  replayBtn.addEventListener('click', resetExperience);

  // Interacción táctil o clic en canvas para generar una brisa de pétalos extra
  canvas.addEventListener('pointerdown', (e) => {
    if (state !== 'IDLE') {
      // Crear ráfaga de 6 pétalos en el punto de clic
      for (let i = 0; i < 6; i++) {
        petals.push({
          x: e.clientX + (Math.random() - 0.5) * 30,
          y: e.clientY + (Math.random() - 0.5) * 30,
          size: 6 + Math.random() * 6,
          vx: -(1.2 + Math.random() * 2.0),
          vy: (Math.random() - 0.3) * 2,
          rotation: Math.random() * Math.PI * 2,
          vRotation: (Math.random() - 0.5) * 0.08,
          oscillationSpeed: 0.03,
          oscillationPhase: Math.random() * Math.PI * 2,
          oscillationAmp: 1.5,
          isSunflower: Math.random() < 0.35,
          color: '#ffc107',
          opacity: 0.9
        });
      }
      playChime(880.0, 0.02);
    }
  });

  // Redimensionamiento de ventana
  window.addEventListener('resize', () => {
    resize();
    if (state !== 'IDLE') {
      generateTreeModel();
    }
  });

  // Inicialización inicial
  resize();

})();
