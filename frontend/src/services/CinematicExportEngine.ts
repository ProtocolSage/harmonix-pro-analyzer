import { AudioAnalysisResult } from '../types/audio';

/**
 * CinematicExportEngine.ts
 * 
 * Generates standalone "Mind-Blow" workstation HTML files from analysis data.
 * These files are self-contained interactive 3D visualizations.
 */

// Placeholder for inlined libraries (in a real build system these would be injected)
// For this workstation, we'll fetch them or read them from node_modules if possible.
const LIBS = {
  three: 'https://unpkg.com/three@0.160.0/build/three.module.js',
  addons: 'https://unpkg.com/three@0.160.0/examples/jsm/',
  gsap: 'https://unpkg.com/gsap@3.12.5/index.js',
  d3: 'https://cdn.jsdelivr.net/npm/d3@7/+esm'
};

export const CinematicExportEngine = {
  /**
   * Reduces the resolution of the spectrogram for efficient 3D rendering.
   * Target: [timeSteps x freqBins]
   */
  downsampleSpectrogram(data: Float32Array, originalTimeSteps: number, originalFreqBins: number, targetTimeSteps = 256, targetFreqBins = 64): number[] {
    if (!data || data.length === 0) return [];

    const result = new Array(targetTimeSteps * targetFreqBins).fill(0);
    const timeRatio = originalTimeSteps / targetTimeSteps;
    const freqRatio = originalFreqBins / targetFreqBins;

    for (let t = 0; t < targetTimeSteps; t++) {
      for (let f = 0; f < targetFreqBins; f++) {
        // Simple averaging kernel
        const startT = Math.floor(t * timeRatio);
        const endT = Math.floor((t + 1) * timeRatio);
        const startF = Math.floor(f * freqRatio);
        const endF = Math.floor((f + 1) * freqRatio);
        
        let sum = 0;
        let count = 0;

        for (let it = startT; it < endT; it++) {
          for (let ifq = startF; ifq < endF; ifq++) {
            const idx = it * originalFreqBins + ifq;
            if (idx < data.length) {
              sum += data[idx];
              count++;
            }
          }
        }
        
        result[t * targetFreqBins + f] = count > 0 ? sum / count : 0;
      }
    }
    return result;
  },

  /**
   * Generates the full HTML source for a cinematic report.
   */
  async generateExport(data: AudioAnalysisResult, filename: string): Promise<string> {
    // 1. Prepare Optimized Data
    const MEL_BINS = 96; // Assuming standard mel count from our engine
    const timeSteps = data.melSpectrogram ? Math.floor(data.melSpectrogram.length / MEL_BINS) : 0;
    
    const key = data.key?.key || 'C';
    const genre = data.genre?.genre || 'Unknown';
    
    // Map Key to Hue (Circle of Fifths based)
    const keyHues: Record<string, number> = {
      'C': 0, 'G': 0.1, 'D': 0.2, 'A': 0.3, 'E': 0.4, 'B': 0.5,
      'F#': 0.6, 'Gb': 0.6, 'Db': 0.7, 'C#': 0.7, 'Ab': 0.8, 'Eb': 0.9, 'Bb': 0.95, 'F': 0.05
    };
    const primaryHue = keyHues[key] || 0.6; // Default to Blue-ish
    
    const optimizedData = {
      metadata: {
        filename: filename,
        bpm: data.tempo?.bpm || 120,
        key: data.key?.key ? `${data.key.key} ${data.key.scale}` : 'Unknown',
        duration: data.duration,
        energy: data.spectral?.energy?.mean || 0.5,
        genre: genre,
        genrePredictions: data.genre?.predictions || [],
        colors: {
          primary: primaryHue,
          secondary: (primaryHue + 0.3) % 1.0,
          accent: (primaryHue + 0.5) % 1.0
        }
      },
      spectral: {
        spectrogram: data.melSpectrogram 
          ? this.downsampleSpectrogram(data.melSpectrogram, timeSteps, MEL_BINS, 256, 64)
          : [],
        dimensions: { time: 256, freq: 64 }
      },
      harmonic: {
        chords: data.harmonic?.chords || []
      }
    };

    const serializedData = JSON.stringify(optimizedData);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Harmonix Cinematic: ${filename}</title>
    <style>
        body { margin: 0; background: #020617; color: white; font-family: 'Inter', sans-serif; overflow: hidden; }
        #app { width: 100vw; height: 100vh; }
        
        /* UI Overlay */
        .ui-overlay { 
            position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;
            background: radial-gradient(circle at center, transparent 0%, #020617 120%);
        }
        
        .header { position: absolute; top: 40px; left: 40px; pointer-events: auto; }
        .title { 
            font-size: 48px; font-weight: 900; letter-spacing: -1px; margin: 0; line-height: 1;
            background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            text-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .subtitle { 
            font-size: 14px; font-weight: 500; color: #60a5fa; letter-spacing: 2px; text-transform: uppercase; 
            margin-bottom: 8px; display: block;
        }
        .stats { 
            display: flex; gap: 20px; margin-top: 20px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #94a3b8; 
        }
        .stat-item b { color: #fff; }

        /* Controls */
        .controls { 
            position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); 
            display: flex; gap: 12px; padding: 8px; background: rgba(15, 23, 42, 0.6); 
            backdrop-filter: blur(12px); border-radius: 99px; border: 1px solid rgba(255,255,255,0.1);
            pointer-events: auto;
        }
        .btn { 
            background: transparent; border: none; color: #94a3b8; padding: 10px 24px; border-radius: 99px; 
            cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .btn.active { background: #fff; color: #020617; box-shadow: 0 0 20px rgba(255,255,255,0.3); }

        /* Loader */
        #loader {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #020617; z-index: 100;
            display: flex; align-items: center; justify-content: center; font-family: monospace; letter-spacing: 4px;
            transition: opacity 1s ease;
        }
    </style>
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;900&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
</head>
<body>
    <div id="loader">INITIALIZING NEURAL ENGINE...</div>
    <div id="app"></div>
    
    <div class="ui-overlay">
        <div class="header">
            <span class="subtitle">Harmonix Cinematic Export</span>
            <h1 class="title">${filename}</h1>
            <div class="stats">
                <div class="stat-item">BPM: <b>${Math.round(optimizedData.metadata.bpm)}</b></div>
                <div class="stat-item">KEY: <b>${optimizedData.metadata.key}</b></div>
                <div class="stat-item">GENRE: <b>${optimizedData.metadata.genre}</b></div>
            </div>
        </div>
    </div>

    <div class="controls">
        <button class="btn active" onclick="switchView('terrain')">Spectral Terrain</button>
        <button class="btn" onclick="switchView('galaxy')">Audio Galaxy</button>
        <button class="btn" onclick="switchView('constellation')">Harmonic Constellation</button>
        <button class="btn" onclick="switchView('dna')">Genre DNA</button>
    </div>

    <script type="importmap">
    {
        "imports": {
            "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
            "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
            "gsap": "https://unpkg.com/gsap@3.12.5/index.js",
            "d3": "https://cdn.jsdelivr.net/npm/d3@7/+esm"
        }
    }
    </script>

    <script type="module">
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
        import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
        import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
        import gsap from 'gsap';
        import * as d3 from 'd3';

        const data = ${serializedData};
        
        // --- SETUP ---
        const scene = new THREE.Scene();
        // Fog for depth
        scene.fog = new THREE.FogExp2(0x020617, 0.02);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
        document.getElementById('app').appendChild(renderer.domElement);

        // --- POST PROCESSING (BLOOM) ---
        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0.2;
        bloomPass.strength = 1.2; // Intense bloom
        bloomPass.radius = 0.5;

        const composer = new EffectComposer(renderer);
        composer.addPass(renderScene);
        composer.addPass(bloomPass);

        // --- CAMERA CONTROLS ---
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
        camera.position.set(0, 20, 40);

        // --- GROUP CONTAINERS ---
        const terrainGroup = new THREE.Group();
        const galaxyGroup = new THREE.Group();
        const constellationGroup = new THREE.Group();
        const dnaGroup = new THREE.Group();
        
        scene.add(terrainGroup);
        scene.add(galaxyGroup);
        scene.add(constellationGroup);
        scene.add(dnaGroup);

        // --- 1. SPECTRAL TERRAIN MESH ---
        const terrainShader = {
            vertex: \`
                varying float vHeight;
                varying vec3 vColor;
                attribute vec3 color;
                void main() {
                    vHeight = position.z;
                    vColor = color;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            \`,
            fragment: \`
                varying float vHeight;
                varying vec3 vColor;
                void main() {
                    float glow = vHeight * 0.1;
                    vec3 finalColor = vColor + vec3(0.0, glow, glow * 0.5);
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            \`
        };

        function createTerrain() {
            const { time, freq } = data.spectral.dimensions;
            const values = data.spectral.spectrogram;
            
            const geometry = new THREE.PlaneGeometry(60, 30, time - 1, freq - 1);
            const positionAttribute = geometry.attributes.position;
            const colors = [];
            const colorObj = new THREE.Color();

            for (let i = 0; i < positionAttribute.count; i++) {
                const x = i % time;
                const y = Math.floor(i / time);
                const specIndex = x * freq + y;
                const value = values[specIndex] || 0;
                
                positionAttribute.setZ(i, value * 10);
                colorObj.setHSL(data.metadata.colors.primary + (value * 0.2), 1.0, 0.2 + value * 0.6);
                colors.push(colorObj.r, colorObj.g, colorObj.b);
            }

            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.computeVertexNormals();

            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 }
                },
                vertexShader: terrainShader.vertex,
                fragmentShader: terrainShader.fragment,
                wireframe: true,
                transparent: true
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2;
            terrainGroup.add(mesh);

            const grid = new THREE.GridHelper(100, 50, 0x1e293b, 0x0f172a);
            grid.position.y = -5;
            terrainGroup.add(grid);
        }

        // --- 2. AUDIO GALAXY (Refined) ---
        const galaxyShader = {
            vertex: \`
                varying vec3 vColor;
                attribute vec3 color;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = 4.0 * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            \`,
            fragment: \`
                varying vec3 vColor;
                void main() {
                    float dist = distance(gl_PointCoord, vec2(0.5));
                    if (dist > 0.5) discard;
                    float glow = pow(1.0 - dist * 2.0, 3.0);
                    gl_FragColor = vec4(vColor, glow);
                }
            \`
        };

        function createGalaxy() {
            const count = data.spectral.spectrogram.length;
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            const colorObj = new THREE.Color();

            const { time, freq } = data.spectral.dimensions;

            for (let t = 0; t < time; t++) {
                for (let f = 0; f < freq; f++) {
                    const val = data.spectral.spectrogram[t * freq + f];
                    if (val < 0.1) continue;

                    const angle = (t / time) * Math.PI * 8;
                    const radius = 10 + (f / freq) * 20;
                    
                    const x = Math.cos(angle) * radius;
                    const z = Math.sin(angle) * radius;
                    const y = (Math.random() - 0.5) * 5 * val;

                    positions.push(x, y, z);
                    colorObj.setHSL(data.metadata.colors.secondary + (f/freq) * 0.2, 1.0, val);
                    colors.push(colorObj.r, colorObj.g, colorObj.b);
                }
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

            const material = new THREE.ShaderMaterial({
                vertexShader: galaxyShader.vertex,
                fragmentShader: galaxyShader.fragment,
                blending: THREE.AdditiveBlending,
                depthTest: false,
                transparent: true
            });

            const points = new THREE.Points(geometry, material);
            galaxyGroup.add(points);
            galaxyGroup.visible = false;
        }

        // --- 3. HARMONIC CONSTELLATION (D3 + Three.js) ---
        function createConstellation() {
            if (!data.harmonic?.chords || data.harmonic.chords.length === 0) return;

            // 1. Process Chords into unique nodes and links
            const nodes = [];
            const links = [];
            const chordMap = new Map();

            data.harmonic.chords.forEach((c, i) => {
                if (!chordMap.has(c.chord)) {
                    const node = { id: c.chord, count: 1, firstSeen: c.start };
                    nodes.push(node);
                    chordMap.set(c.chord, node);
                } else {
                    chordMap.get(c.chord).count++;
                }

                // Link to previous chord (Chronological connection)
                if (i > 0) {
                    links.push({ source: data.harmonic.chords[i-1].chord, target: c.chord, type: 'flow' });
                }
            });

            // 2. D3 Force Simulation (2D projected to 3D)
            const simulation = d3.forceSimulation(nodes)
                .force("link", d3.forceLink(links).id(d => d.id).distance(20))
                .force("charge", d3.forceManyBody().strength(-50))
                .force("center", d3.forceCenter(0, 0))
                .stop();

            // Run simulation for a few ticks
            for (let i = 0; i < 100; i++) simulation.tick();

            // 3. Render Stars (Points)
            const starGeo = new THREE.SphereGeometry(0.5, 16, 16);
            const colorObj = new THREE.Color().setHSL(data.metadata.colors.accent, 1.0, 0.5);
            const starMat = new THREE.MeshStandardMaterial({ 
                color: colorObj, 
                emissive: colorObj,
                emissiveIntensity: 2
            });

            nodes.forEach(node => {
                const mesh = new THREE.Mesh(starGeo, starMat);
                // Map 2D D3 positions to 3D sphere or plane
                mesh.position.set(node.x, node.y, (Math.random() - 0.5) * 10);
                mesh.scale.setScalar(0.5 + (node.count / nodes.length) * 2);
                
                // Add Label (Sprite)
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 256; canvas.height = 64;
                ctx.fillStyle = 'white'; ctx.font = 'bold 40px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(node.id, 128, 45);
                
                const tex = new THREE.CanvasTexture(canvas);
                const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
                const sprite = new THREE.Sprite(spriteMat);
                sprite.position.y = 2;
                sprite.scale.set(4, 1, 1);
                mesh.add(sprite);

                constellationGroup.add(mesh);
            });

            // 4. Render Lines
            const lineMat = new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.3 });
            links.forEach(link => {
                if (link.source.id === link.target.id) return; // Skip self-loops
                
                const geometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(link.source.x, link.source.y, link.source.z || 0),
                    new THREE.Vector3(link.target.x, link.target.y, link.target.z || 0)
                ]);
                const line = new THREE.Line(geometry, lineMat);
                constellationGroup.add(line);
            });

            constellationGroup.visible = false;
        }

        // --- 4. GENRE DNA HELIX (3D TubeGeometry) ---
        function createDNA() {
            if (!data.metadata.genrePredictions || data.metadata.genrePredictions.length === 0) return;

            const predictions = data.metadata.genrePredictions.slice(0, 5); // Top 5
            const tubeRadius = 0.5;
            const helixRadius = 10;
            const height = 100;
            const turns = 5;

            predictions.forEach((p, idx) => {
                const points = [];
                const colorObj = new THREE.Color().setHSL((data.metadata.colors.primary + idx * 0.1) % 1.0, 0.8, 0.5);
                
                // Offset angle for each strand
                const startAngle = (idx / predictions.length) * Math.PI * 2;

                for (let i = 0; i <= 100; i++) {
                    const t = i / 100;
                    const angle = startAngle + t * Math.PI * 2 * turns;
                    const x = Math.cos(angle) * helixRadius;
                    const z = Math.sin(angle) * helixRadius;
                    const y = (t - 0.5) * height;
                    points.push(new THREE.Vector3(x, y, z));
                }

                const curve = new THREE.CatmullRomCurve3(points);
                // Thickness based on confidence
                const radius = 0.1 + p.confidence * 1.5;
                const geometry = new THREE.TubeGeometry(curve, 100, radius, 8, false);
                const material = new THREE.MeshStandardMaterial({ 
                    color: colorObj,
                    emissive: colorObj,
                    emissiveIntensity: 0.5,
                    metalness: 0.9,
                    roughness: 0.1
                });

                const mesh = new THREE.Mesh(geometry, material);
                dnaGroup.add(mesh);

                // Add Label at start of strand
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 256; canvas.height = 64;
                ctx.fillStyle = colorObj.getStyle(); ctx.font = 'bold 32px Inter';
                ctx.fillText(p.genre + ' (' + Math.round(p.confidence * 100) + '%)', 0, 45);
                
                const tex = new THREE.CanvasTexture(canvas);
                const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
                const sprite = new THREE.Sprite(spriteMat);
                sprite.position.copy(points[0]).multiplyScalar(1.2);
                sprite.scale.set(8, 2, 1);
                dnaGroup.add(sprite);
            });

            dnaGroup.visible = false;
        }

        // --- INIT ---
        createTerrain();
        createGalaxy();
        createConstellation();
        createDNA();

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0x60a5fa, 2, 100);
        pointLight.position.set(10, 20, 10);
        scene.add(pointLight);

        // Hide Loader
        function startIntro() {
            const tl = gsap.timeline();
            
            // 1. Initial State
            camera.position.set(0, 500, 1000);
            camera.lookAt(0, 0, 0);
            galaxyGroup.visible = true;
            galaxyGroup.scale.setScalar(0.1);
            
            // 2. Hide Loader
            tl.to("#loader", { opacity: 0, duration: 1, onComplete: () => document.getElementById('loader').remove() });
            
            // 3. Zoom In
            tl.to(camera.position, { z: 40, y: 20, duration: 3, ease: "expo.out" }, "-=0.5");
            tl.to(galaxyGroup.scale, { x: 1, y: 1, z: 1, duration: 3, ease: "power4.out" }, "-=3");
            
            // 4. Reveal UI
            tl.from(".header", { x: -100, opacity: 0, duration: 1, ease: "power2.out" }, "-=1");
            tl.from(".controls", { y: 100, opacity: 0, duration: 1, ease: "power2.out" }, "-=1");
            
            // 5. Initial View Set
            tl.add(() => switchView('terrain'), "-=0.5");
        }

        setTimeout(startIntro, 1000);

        // --- ANIMATION LOOP ---
        function animate() {
            requestAnimationFrame(animate);
            
            // Subtle movement
            const time = Date.now() * 0.001;
            terrainGroup.position.y = Math.sin(time * 0.5) * 0.5;
            
            controls.update();
            composer.render();
        }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        });

        // --- VIEW SWITCHING (GSAP) ---
        window.switchView = (mode) => {
            // Update UI buttons
            document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
            event.target.classList.add('active');

            // Transitions
            if (mode === 'terrain') {
                galaxyGroup.visible = false;
                constellationGroup.visible = false;
                terrainGroup.visible = true;
                
                gsap.to(camera.position, { x: 0, y: 20, z: 40, duration: 1.5, ease: "power2.inOut" });
                gsap.to(terrainGroup.scale, { x: 1, y: 1, z: 1, duration: 1 });
                controls.autoRotateSpeed = 0.5;
            } 
            else if (mode === 'galaxy') {
                galaxyGroup.visible = true;
                constellationGroup.visible = false;
                terrainGroup.visible = false;

                gsap.to(camera.position, { x: 0, y: 40, z: 0, duration: 1.5, ease: "power2.inOut" }); // Top down-ish
                controls.autoRotateSpeed = 2.0;
            }
            else if (mode === 'constellation') {
                galaxyGroup.visible = false;
                constellationGroup.visible = true;
                dnaGroup.visible = false;
                terrainGroup.visible = false;

                gsap.to(camera.position, { x: 30, y: 30, z: 30, duration: 1.5, ease: "power2.inOut" });
                controls.autoRotateSpeed = 1.0;
            }
            else if (mode === 'dna') {
                galaxyGroup.visible = false;
                constellationGroup.visible = false;
                dnaGroup.visible = true;
                terrainGroup.visible = false;

                gsap.to(camera.position, { x: 40, y: 0, z: 40, duration: 1.5, ease: "power2.inOut" });
                controls.autoRotateSpeed = 3.0;
            }
        };
    </script>
</body>
</html>
    `;
  }
};
