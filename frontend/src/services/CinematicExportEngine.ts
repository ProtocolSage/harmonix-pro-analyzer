import { AudioAnalysisResult } from '../types/audio';

/**
 * CinematicExportEngine.ts
 * 
 * Generates standalone "Mind-Blow" workstation HTML files from analysis data.
 * These files are self-contained interactive 3D visualizations.
 */

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
    
    const optimizedData = {
      metadata: {
        filename: filename,
        bpm: data.tempo?.bpm || 120,
        key: data.key?.key ? `${data.key.key} ${data.key.scale}` : 'Unknown',
        duration: data.duration,
        energy: data.spectral?.energy?.mean || 0.5,
        genre: data.genre?.genre || 'Unknown'
      },
      spectral: {
        // Downsample to 256x64 for the 3D mesh
        spectrogram: data.melSpectrogram 
          ? this.downsampleSpectrogram(data.melSpectrogram, timeSteps, MEL_BINS, 256, 64)
          : [],
        dimensions: { time: 256, freq: 64 }
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
        <button class="btn" onclick="switchView('dna')">Genre DNA</button>
    </div>

    <script type="importmap">
    {
        "imports": {
            "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
            "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
            "gsap": "https://unpkg.com/gsap@3.12.5/index.js"
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
        const dnaGroup = new THREE.Group();
        
        scene.add(terrainGroup);
        scene.add(galaxyGroup);
        scene.add(dnaGroup);

        // --- 1. SPECTRAL TERRAIN MESH ---
        function createTerrain() {
            const { time, freq } = data.spectral.dimensions;
            const values = data.spectral.spectrogram;
            
            // Create a plane geometry: Width = Time, Depth = Freq
            const geometry = new THREE.PlaneGeometry(60, 30, time - 1, freq - 1);
            
            // Displace vertices based on spectrogram value
            const positionAttribute = geometry.attributes.position;
            const colors = [];
            const colorObj = new THREE.Color();

            for (let i = 0; i < positionAttribute.count; i++) {
                // Map linear index to 2D grid
                const x = i % time; // time step
                const y = Math.floor(i / time); // freq bin
                
                // Get spectral value (normalized 0-1 usually, but logarithmic)
                // data.spectral.spectrogram is flattened [time * freq]
                const specIndex = x * freq + y; // Incorrect indexing for standard PlaneGeo? 
                // PlaneGeo order is row-by-row.
                
                const value = values[specIndex] || 0;
                
                // Set Z height (which is Y in world space after rotation)
                positionAttribute.setZ(i, value * 10); // Scale height

                // Color map: Low (Purple) -> High (Cyan/White)
                colorObj.setHSL(0.6 + (value * 0.4), 1.0, value * 0.8);
                colors.push(colorObj.r, colorObj.g, colorObj.b);
            }

            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.computeVertexNormals();

            const material = new THREE.MeshStandardMaterial({ 
                vertexColors: true, 
                wireframe: true, // Tech aesthetic
                roughness: 0.2,
                metalness: 0.8
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2; // Lay flat
            terrainGroup.add(mesh);

            // Add "Floor" reflection
            const grid = new THREE.GridHelper(100, 50, 0x1e293b, 0x0f172a);
            grid.position.y = -5;
            terrainGroup.add(grid);
        }

        // --- 2. AUDIO GALAXY (Refined) ---
        function createGalaxy() {
            // Using same data but as particles
            const count = data.spectral.spectrogram.length;
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            const colorObj = new THREE.Color();

            const { time, freq } = data.spectral.dimensions;

            for (let t = 0; t < time; t++) {
                for (let f = 0; f < freq; f++) {
                    const val = data.spectral.spectrogram[t * freq + f];
                    if (val < 0.1) continue; // Skip silence

                    // Spiral coordinate system
                    const angle = (t / time) * Math.PI * 8; // 4 full turns
                    const radius = 10 + (f / freq) * 20;    // Freq maps to width
                    
                    const x = Math.cos(angle) * radius;
                    const z = Math.sin(angle) * radius;
                    const y = (Math.random() - 0.5) * 5 * val; // Scatter height by intensity

                    positions.push(x, y, z);

                    colorObj.setHSL(0.5 + (f/freq) * 0.5, 1.0, val);
                    colors.push(colorObj.r, colorObj.g, colorObj.b);
                }
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

            const material = new THREE.PointsMaterial({ 
                size: 0.15, 
                vertexColors: true, 
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.8
            });

            const points = new THREE.Points(geometry, material);
            galaxyGroup.add(points);
            galaxyGroup.visible = false; // Start hidden
        }

        // --- INIT ---
        createTerrain();
        createGalaxy();

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0x60a5fa, 2, 100);
        pointLight.position.set(10, 20, 10);
        scene.add(pointLight);

        // Hide Loader
        setTimeout(() => {
            document.getElementById('loader').style.opacity = 0;
            setTimeout(() => document.getElementById('loader').remove(), 1000);
        }, 1500);

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
                terrainGroup.visible = true;
                
                gsap.to(camera.position, { x: 0, y: 20, z: 40, duration: 1.5, ease: "power2.inOut" });
                gsap.to(terrainGroup.scale, { x: 1, y: 1, z: 1, duration: 1 });
                controls.autoRotateSpeed = 0.5;
            } 
            else if (mode === 'galaxy') {
                galaxyGroup.visible = true;
                terrainGroup.visible = false;

                gsap.to(camera.position, { x: 0, y: 40, z: 0, duration: 1.5, ease: "power2.inOut" }); // Top down-ish
                controls.autoRotateSpeed = 2.0;
            }
        };
    </script>
</body>
</html>
    `;
  }
};
