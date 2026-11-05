import * as THREE from 'three';
import { HOTSPOTS, ZoneId, ZONES } from '../data/worldData';

export interface ProjectedHotspot {
  id: string;
  screenX: number;
  screenY: number;
  visible: boolean;
}

export interface HighwayCallbacks {
  onStarCollected: (newTotal: number) => void;
  onObstacleHit: () => void;
  onHighwayComplete: () => void;
}

export class CyberWorld3D {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();

  private currentZone: ZoneId = 'garage';
  private zoneGroup: THREE.Group = new THREE.Group();
  private hotspotMeshes: Map<string, THREE.Object3D> = new Map();
  private clickableObjects: THREE.Object3D[] = [];
  private groundMesh!: THREE.Mesh;

  // Characters
  private rexGroup: THREE.Group = new THREE.Group();
  private bultenGroup: THREE.Group = new THREE.Group();
  private rexPos: THREE.Vector3 = new THREE.Vector3(-1.2, 0, 2.2);
  private rexTarget: THREE.Vector3 = new THREE.Vector3(-1.2, 0, 2.2);
  private bultenPos: THREE.Vector3 = new THREE.Vector3(-2.3, 0, 2.4);
  private walkRing!: THREE.Mesh;
  private walkRingTimer: number = 0;
  private pendingHotspotId: string | null = null;
  private onHotspotReached?: (hotspotId: string) => void;
  private onProjectionUpdate?: (projections: ProjectedHotspot[]) => void;

  // Camera choreography
  private camLookAt: THREE.Vector3 = new THREE.Vector3(0, 1.4, 0);
  private camTargetLookAt: THREE.Vector3 = new THREE.Vector3(0, 1.4, 0);
  private camBasePos: THREE.Vector3 = new THREE.Vector3(0, 5.8, 10.6);
  private camTargetPos: THREE.Vector3 = new THREE.Vector3(0, 5.8, 10.6);
  private focusTimer: number = 0;

  // World puzzle visual state
  private solvedState: Record<string, boolean> = {};
  private scannerActiveTimer: number = 0;
  private celebrationMode: boolean = false;

  // Animated references in scenes
  private hoverBikeMesh: THREE.Group | null = null;
  private holoWhaleMesh: THREE.Group | null = null;
  private iceCreamConeMesh: THREE.Group | null = null;
  private craneArmMesh: THREE.Group | null = null;
  private pixelDogMesh: THREE.Group | null = null;
  private clockHandsMesh: THREE.Group | null = null;
  private bgTrafficGroup: THREE.Group = new THREE.Group();
  private particles!: THREE.Points;

  // 3D Hover-Bike Highway Mini-Game state
  private highwayMode: boolean = false;
  private highwayGroup: THREE.Group = new THREE.Group();
  private highwayBike: THREE.Group = new THREE.Group();
  private highwayLane: number = 0; // -1, 0, +1
  private highwayBikeX: number = 0;
  private highwayJumpY: number = 0;
  private highwayJumpVel: number = 0;
  private highwayStarsCount: number = 0;
  private highwayItems: { mesh: THREE.Group; type: 'star' | 'barrier'; lane: number; z: number; collected: boolean }[] = [];
  private highwayGridLines: THREE.Mesh[] = [];
  private highwayCallbacks?: HighwayCallbacks;

  private animFrameId: number = 0;
  private clock: THREE.Clock = new THREE.Clock();

  constructor(
    container: HTMLElement,
    onHotspotReached: (hotspotId: string) => void,
    onProjectionUpdate: (projections: ProjectedHotspot[]) => void
  ) {
    this.container = container;
    this.onHotspotReached = onHotspotReached;
    this.onProjectionUpdate = onProjectionUpdate;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#090d24');
    this.scene.fog = new THREE.FogExp2('#111938', 0.032);

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 120);
    this.camera.position.copy(this.camBasePos);
    this.camera.lookAt(this.camLookAt);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupGroundAndSky();
    this.buildRexAndBulten();
    this.buildHighwayScene();

    this.scene.add(this.zoneGroup);
    this.loadZone('garage');

    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);

    this.animate();
  }

  private setupLights() {
    const hemi = new THREE.HemisphereLight('#7dd3fc', '#1e1b4b', 1.35);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight('#f8fafc', 1.4);
    dir.position.set(8, 16, 10);
    this.scene.add(dir);

    const rimCyan = new THREE.DirectionalLight('#22d3ee', 0.9);
    rimCyan.position.set(-10, 6, -6);
    this.scene.add(rimCyan);

    const rimPink = new THREE.DirectionalLight('#f472b6', 0.8);
    rimPink.position.set(10, 5, -6);
    this.scene.add(rimPink);
  }

  private setupGroundAndSky() {
    // Interactive ground plane with cyberpunk hex/grid lines
    const groundGeo = new THREE.PlaneGeometry(36, 24);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.7,
      metalness: 0.25,
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = 0;
    this.scene.add(this.groundMesh);

    // Subtle neon floor grid
    const grid = new THREE.GridHelper(32, 32, '#22d3ee', '#1e293b');
    grid.position.y = 0.01;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.32;
    this.scene.add(grid);

    // Target walk ring on the floor
    const ringGeo = new THREE.RingGeometry(0.32, 0.48, 28);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#22d3ee',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    this.walkRing = new THREE.Mesh(ringGeo, ringMat);
    this.walkRing.rotation.x = -Math.PI / 2;
    this.walkRing.position.y = 0.04;
    this.scene.add(this.walkRing);

    // Floating neon dust particles
    const count = 90;
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [new THREE.Color('#22d3ee'), new THREE.Color('#f472b6'), new THREE.Color('#facc15'), new THREE.Color('#a855f7')];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = Math.random() * 8 + 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16 - 2;
      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    partGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const partMat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });
    this.particles = new THREE.Points(partGeo, partMat);
    this.scene.add(this.particles);

    // Distant flying hover-cars in the cyberpunk skyline
    this.scene.add(this.bgTrafficGroup);
    for (let i = 0; i < 6; i++) {
      const car = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.28, 0.5),
        new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.7, roughness: 0.3 })
      );
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.1, 0.54),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? '#22d3ee' : '#f43f5e' })
      );
      car.add(body, tail);
      car.position.set((Math.random() - 0.5) * 30, 5 + (i % 3) * 1.8, -11 - (i % 2) * 3);
      car.userData = { speed: (i % 2 === 0 ? 1 : -1) * (2.5 + i * 0.4) };
      this.bgTrafficGroup.add(car);
    }
  }

  private buildRexAndBulten() {
    // 1. REX (Cool 6yo Cyber-Explorer with glowing jacket & hover-boots)
    this.rexGroup = new THREE.Group();

    // Hover-boots & cyan levitation rings
    const bootMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.3 });
    const glowCyan = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
    const glowPink = new THREE.MeshBasicMaterial({ color: '#f43f5e' });

    [-0.22, 0.22].forEach((lx) => {
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.13, 0.42, 6, 10),
        new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6 })
      );
      leg.position.set(lx, 0.42, 0);
      this.rexGroup.add(leg);

      const bootRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 16), glowCyan);
      bootRing.rotation.x = Math.PI / 2;
      bootRing.position.set(lx, 0.08, 0);
      this.rexGroup.add(bootRing);
      bootMat.color.set('#0f172a');
    });

    // Cyber Biker Jacket torso (Full Throttle homage!)
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.28, 0.72, 12),
      new THREE.MeshStandardMaterial({ color: '#e11d48', roughness: 0.35, metalness: 0.2 })
    );
    torso.position.y = 0.96;
    this.rexGroup.add(torso);

    // Glowing cyan collar & back emblem
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.055, 8, 18), glowCyan);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.28;
    this.rexGroup.add(collar);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 16),
      new THREE.MeshStandardMaterial({ color: '#fde68a', roughness: 0.45 })
    );
    head.position.y = 1.62;
    this.rexGroup.add(head);

    // Spiky hair
    const hairMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.6 });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat);
    hair.position.set(0, 1.66, -0.03);
    this.rexGroup.add(hair);

    // Glowing Cyber-Goggles on forehead
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.24), glowCyan);
    visor.position.set(0, 1.74, 0.24);
    this.rexGroup.add(visor);

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#0f172a' });
    [-0.12, 0.12].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
      eye.position.set(ex, 1.58, 0.31);
      this.rexGroup.add(eye);
    });

    this.rexGroup.position.copy(this.rexPos);
    this.scene.add(this.rexGroup);

    // 2. BULTEN (Expressive Orange & Chrome Mechanic Droid Sidekick — Grim Fandango / Glottis vibe!)
    this.bultenGroup = new THREE.Group();

    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.08, 10, 20),
      glowCyan
    );
    wheel.rotation.x = Math.PI / 2;
    wheel.position.y = 0.1;
    this.bultenGroup.add(wheel);

    const droidBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.32, 0.68, 16),
      new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.25, metalness: 0.45 })
    );
    droidBody.position.y = 0.58;
    this.bultenGroup.add(droidBody);

    const bellyScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.28, 0.1),
      new THREE.MeshBasicMaterial({ color: '#38bdf8' })
    );
    bellyScreen.position.set(0, 0.58, 0.33);
    this.bultenGroup.add(bellyScreen);

    const droidHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.65),
      new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.2, metalness: 0.75 })
    );
    droidHead.position.y = 0.92;
    this.bultenGroup.add(droidHead);

    // Expressive glowing LED eyes
    [-0.13, 0.13].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), glowCyan);
      eye.position.set(ex, 1.08, 0.31);
      this.bultenGroup.add(eye);
    });

    // Antenna with glowing pink bulb
    const antStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.32, 8),
      new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8 })
    );
    antStem.position.y = 1.42;
    const antBulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), glowPink);
    antBulb.position.y = 1.6;
    this.bultenGroup.add(antStem, antBulb);

    this.bultenGroup.position.copy(this.bultenPos);
    this.scene.add(this.bultenGroup);
  }

  public updateWorldState(solved: Record<string, boolean>, celebration: boolean = false) {
    this.solvedState = { ...solved };
    this.celebrationMode = celebration;
    this.loadZone(this.currentZone);
  }

  public triggerScannerPulse() {
    this.scannerActiveTimer = 4.0;
  }

  public loadZone(zoneId: ZoneId) {
    this.currentZone = zoneId;
    const zoneDef = ZONES[zoneId];
    this.scene.background = new THREE.Color(zoneDef.skyColor);
    this.scene.fog = new THREE.FogExp2(zoneDef.fogColor, 0.03);

    // Clear previous zone meshes
    while (this.zoneGroup.children.length > 0) {
      this.zoneGroup.remove(this.zoneGroup.children[0]);
    }
    this.hotspotMeshes.clear();
    this.clickableObjects = [this.groundMesh];
    this.hoverBikeMesh = null;
    this.holoWhaleMesh = null;
    this.iceCreamConeMesh = null;
    this.craneArmMesh = null;
    this.pixelDogMesh = null;
    this.clockHandsMesh = null;

    // Reset Rex & Bulten position to center-front of the stage
    this.rexPos.set(-1.0, 0, 2.3);
    this.rexTarget.copy(this.rexPos);
    this.rexGroup.position.copy(this.rexPos);
    this.bultenPos.set(-2.2, 0, 2.5);
    this.bultenGroup.position.copy(this.bultenPos);
    this.pendingHotspotId = null;

    // Reset camera to stage overview
    this.camTargetPos.copy(this.camBasePos);
    this.camTargetLookAt.set(0, 1.4, 0);
    this.focusTimer = 0;

    // Build cyberpunk backdrop buildings common to all zones
    this.buildCyberBackdrop(zoneDef.themeColor);

    if (zoneId === 'garage') {
      this.buildGarageZone();
    } else if (zoneId === 'plaza') {
      this.buildPlazaZone();
    } else if (zoneId === 'park') {
      this.buildParkZone();
    } else if (zoneId === 'tower') {
      this.buildTowerZone();
    }
  }

  private buildCyberBackdrop(accentHex: string) {
    const bldgPositions = [
      { x: -10, z: -7, w: 3.8, h: 9.5, d: 3.5, c: '#0f172a', neon: '#22d3ee' },
      { x: -5.5, z: -8, w: 4.2, h: 12.0, d: 3.8, c: '#1e1b4b', neon: '#f472b6' },
      { x: 0, z: -8.5, w: 5.2, h: 10.5, d: 3.8, c: '#0f172a', neon: accentHex },
      { x: 5.5, z: -8, w: 4.2, h: 13.0, d: 3.8, c: '#172554', neon: '#a855f7' },
      { x: 10, z: -7, w: 3.8, h: 9.0, d: 3.5, c: '#0f172a', neon: '#facc15' },
    ];

    bldgPositions.forEach((b) => {
      const grp = new THREE.Group();
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, b.h, b.d),
        new THREE.MeshStandardMaterial({ color: b.c, roughness: 0.6, metalness: 0.3 })
      );
      tower.position.y = b.h / 2;
      grp.add(tower);

      // Neon trim strips on buildings
      for (let y = 2.2; y < b.h - 1; y += 2.2) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(b.w + 0.12, 0.14, b.d + 0.12),
          new THREE.MeshBasicMaterial({ color: b.neon })
        );
        strip.position.y = y;
        grp.add(strip);
      }

      grp.position.set(b.x, 0, b.z);
      this.zoneGroup.add(grp);
    });
  }

  private registerHotspot(id: string, group: THREE.Group, x: number, z: number) {
    group.position.set(x, 0, z);
    group.userData = { hotspotId: id };
    group.traverse((child) => {
      child.userData = { hotspotId: id };
      if ((child as THREE.Mesh).isMesh) {
        this.clickableObjects.push(child);
      }
    });
    // Invisible generous hit-cylinder so 5-year-old taps always register cleanly
    const hitCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.15, 3.2, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitCyl.position.y = 1.5;
    hitCyl.userData = { hotspotId: id };
    group.add(hitCyl);
    this.clickableObjects.push(hitCyl);

    // Glowing floor pad under interactive hotspot
    const spotDef = HOTSPOTS.find((h) => h.id === id);
    const padColor = spotDef?.accentColor || '#22d3ee';
    const padRing = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.02, 28),
      new THREE.MeshBasicMaterial({ color: padColor, side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
    );
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.y = 0.03;
    group.add(padRing);

    this.zoneGroup.add(group);
    this.hotspotMeshes.set(id, group);
  }

  // Helper to build a stylized 3D Hover-Bike (Full Throttle inspired!)
  private createHoverBikeMesh(repaired: boolean): THREE.Group {
    const bike = new THREE.Group();
    const redMat = new THREE.MeshStandardMaterial({ color: '#e11d48', roughness: 0.25, metalness: 0.55 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.15, metalness: 0.85 });
    const glowMat = new THREE.MeshBasicMaterial({ color: repaired ? '#22d3ee' : '#fb923c' });

    // Main sleek chassis
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 1.4, 8, 16), redMat);
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.72;
    bike.add(body);

    // Front twin-fork turbine nose
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 1.1, 12), chromeMat);
    nose.rotation.z = Math.PI / 2;
    nose.position.set(1.0, 0.75, 0);
    bike.add(nose);

    // Glowing front hover-turbine ring
    const frontTurbine = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.09, 10, 24), glowMat);
    frontTurbine.rotation.x = Math.PI / 2;
    frontTurbine.position.set(1.3, 0.42, 0);
    bike.add(frontTurbine);

    // Rear hover-turbine ring
    const rearTurbine = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.1, 10, 24), glowMat);
    rearTurbine.rotation.x = Math.PI / 2;
    rearTurbine.position.set(-1.05, 0.42, 0);
    bike.add(rearTurbine);

    // Handlebars & windshield
    const shield = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.45, 0.65),
      new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.65 })
    );
    shield.rotation.z = -0.35;
    shield.position.set(0.45, 1.15, 0);
    bike.add(shield);

    // Rear dual plasma exhaust pipes
    [-0.25, 0.25].forEach((z) => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.8, 10), chromeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(-1.1, 0.8, z);
      bike.add(pipe);
    });

    return bike;
  }

  private createNpcHumanoid(bodyColor: string, visorColor: string, hatColor?: string): THREE.Group {
    const npc = new THREE.Group();
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.34, 1.1, 14),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.35, metalness: 0.3 })
    );
    torso.position.y = 0.75;
    npc.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 16, 16),
      new THREE.MeshStandardMaterial({ color: '#fde68a', roughness: 0.4 })
    );
    head.position.y = 1.58;
    npc.add(head);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.16, 0.26),
      new THREE.MeshBasicMaterial({ color: visorColor })
    );
    visor.position.set(0, 1.6, 0.22);
    npc.add(visor);

    if (hatColor) {
      const hat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.32, 0.35, 14),
        new THREE.MeshStandardMaterial({ color: hatColor })
      );
      hat.position.y = 1.98;
      npc.add(hat);
    }

    return npc;
  }

  // ZONE 1: SVIFF-GARAGET
  private buildGarageZone() {
    const engineFixed = !!this.solvedState['core_garage'];

    // 1. Mekaniker-Maja
    const maja = this.createNpcHumanoid('#0284c7', '#22d3ee', '#facc15');
    this.registerHotspot('maja', maja, -4.2, -1.8);

    // 2. Rex's Hover-Bike on lift platform
    const bikeSpot = new THREE.Group();
    const liftPad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.85, 0.26, 24),
      new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.6, roughness: 0.3 })
    );
    liftPad.position.y = 0.13;
    bikeSpot.add(liftPad);

    const bike = this.createHoverBikeMesh(engineFixed);
    bike.position.y = engineFixed ? 0.55 : 0.18;
    bikeSpot.add(bike);
    this.hoverBikeMesh = bike;
    this.registerHotspot('hoverbike', bikeSpot, 0.2, -1.5);

    // 3. Red Toolbox
    const toolbox = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.85, 0.8),
      new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.3, metalness: 0.4 })
    );
    box.position.y = 0.45;
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.14, 0.2),
      new THREE.MeshBasicMaterial({ color: '#facc15' })
    );
    handle.position.y = 0.94;
    toolbox.add(box, handle);
    this.registerHotspot('toolbox', toolbox, -6.2, 1.4);

    // 4. Giant Magnetic Crane
    const crane = new THREE.Group();
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.38, 3.8, 12),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.4, metalness: 0.5 })
    );
    pillar.position.y = 1.9;
    crane.add(pillar);

    const armGroup = new THREE.Group();
    armGroup.position.set(0, 3.6, 0);
    const boom = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.28, 0.32),
      new THREE.MeshStandardMaterial({ color: '#f59e0b' })
    );
    boom.position.x = -0.9;
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8),
      new THREE.MeshBasicMaterial({ color: '#94a3b8' })
    );
    cable.position.set(-1.7, -0.8, 0);
    const magnet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.25, 16),
      new THREE.MeshBasicMaterial({ color: '#f43f5e' })
    );
    magnet.position.set(-1.7, -1.55, 0);
    armGroup.add(boom, cable, magnet);
    crane.add(armGroup);
    this.craneArmMesh = armGroup;
    this.registerHotspot('crane', crane, 5.2, -1.4);

    // 5. Cyber-Jukebox
    const jukebox = new THREE.Group();
    const jbBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.7, 0.75),
      new THREE.MeshStandardMaterial({ color: '#3b0764', roughness: 0.3, metalness: 0.5 })
    );
    jbBody.position.y = 0.85;
    const jbArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.09, 10, 20, Math.PI),
      new THREE.MeshBasicMaterial({ color: '#c084fc' })
    );
    jbArch.position.set(0, 1.65, 0.38);
    jukebox.add(jbBody, jbArch);
    this.registerHotspot('jukebox', jukebox, 6.2, 2.0);

    // 6. Cute Scrap-Bot
    const scrapbot = new THREE.Group();
    const sbCube = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.75, 0.85),
      new THREE.MeshStandardMaterial({ color: '#fb923c', roughness: 0.4, metalness: 0.5 })
    );
    sbCube.position.y = 0.45;
    const sbEyes = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.18, 0.1),
      new THREE.MeshBasicMaterial({ color: '#22d3ee' })
    );
    sbEyes.position.set(0, 0.55, 0.44);
    scrapbot.add(sbCube, sbEyes);
    this.registerHotspot('scrapbot', scrapbot, -2.5, 2.8);
  }

  // ZONE 2: NEON-TORGET
  private buildPlazaZone() {
    const signFixed = !!this.solvedState['core_plaza'];

    // 1. Kocken Glasse
    const glasse = this.createNpcHumanoid('#ec4899', '#facc15', '#ffffff');
    this.registerHotspot('glasse', glasse, -3.8, -1.8);

    // 2. Neon Sign & Ice-Cream Kiosk
    const kiosk = new THREE.Group();
    const booth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 1.8, 16),
      new THREE.MeshStandardMaterial({ color: '#311042', roughness: 0.3, metalness: 0.4 })
    );
    booth.position.y = 0.9;
    kiosk.add(booth);

    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.2, 0.28),
      new THREE.MeshBasicMaterial({ color: signFixed ? '#22d3ee' : '#334155' })
    );
    signBoard.position.y = 2.6;
    kiosk.add(signBoard);

    // Giant Spinning 3D Neon Ice-Cream Cone on roof!
    const coneGrp = new THREE.Group();
    coneGrp.position.y = 3.9;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.48, 1.0, 14),
      new THREE.MeshStandardMaterial({ color: '#f59e0b' })
    );
    cone.rotation.x = Math.PI;
    const scoop = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: signFixed ? '#f472b6' : '#64748b' })
    );
    scoop.position.y = 0.55;
    coneGrp.add(cone, scoop);
    kiosk.add(coneGrp);
    this.iceCreamConeMesh = coneGrp;
    this.registerHotspot('neonsign', kiosk, 0.2, -2.4);

    // 3. Glowing Street Drain
    const drain = new THREE.Group();
    const grate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.14, 20),
      new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.8, roughness: 0.2 })
    );
    grate.position.y = 0.08;
    const goldGlimmer = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 12),
      new THREE.MeshBasicMaterial({ color: '#facc15' })
    );
    goldGlimmer.position.y = 0.26;
    drain.add(grate, goldGlimmer);
    this.registerHotspot('drain', drain, -5.4, 2.2);

    // 4. Holo-Automat Vending Machine
    const vending = new THREE.Group();
    const vBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.3, 1.0),
      new THREE.MeshStandardMaterial({ color: '#581c87', roughness: 0.25, metalness: 0.5 })
    );
    vBox.position.y = 1.15;
    const vScreen = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 1.2, 0.08),
      new THREE.MeshBasicMaterial({ color: '#a855f7' })
    );
    vScreen.position.set(0, 1.35, 0.51);
    vending.add(vBox, vScreen);
    this.registerHotspot('vending', vending, 5.2, -1.4);

    // 5. Floating Hologram Whale!
    const whale = new THREE.Group();
    const wMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.72,
    });
    const wBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.6, 8, 16), wMat);
    wBody.rotation.z = Math.PI / 2;
    wBody.position.y = 2.8;
    const wTail = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.9, 6), wMat);
    wTail.rotation.z = -Math.PI / 2;
    wTail.position.set(-1.35, 2.8, 0);
    whale.add(wBody, wTail);
    this.holoWhaleMesh = whale;
    this.registerHotspot('holowhale', whale, 3.5, 1.8);
  }

  // ZONE 3: CYBER-PARKEN
  private buildParkZone() {
    const bridgeFixed = !!this.solvedState['core_park'];

    // Glowing Cyber-Trees in background
    [-6.5, -2.0, 6.5].forEach((tx, idx) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.35, 2.2, 10),
        new THREE.MeshStandardMaterial({ color: '#1e293b' })
      );
      trunk.position.y = 1.1;
      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(1.25, 16, 16),
        new THREE.MeshBasicMaterial({
          color: idx % 2 === 0 ? '#34d399' : '#a855f7',
          transparent: true,
          opacity: 0.78,
        })
      );
      foliage.position.y = 2.6;
      tree.add(trunk, foliage);
      tree.position.set(tx, 0, -3.2);
      this.zoneGroup.add(tree);
    });

    // 1. Växt-Droiden Flora
    const flora = this.createNpcHumanoid('#059669', '#34d399', '#10b981');
    this.registerHotspot('flora', flora, -4.2, -1.6);

    // 2. Robo-Hunden Pixel
    const dog = new THREE.Group();
    const dogBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: '#f472b6', roughness: 0.3, metalness: 0.5 })
    );
    dogBody.position.y = 0.5;
    const dogHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.48, 0.48),
      new THREE.MeshStandardMaterial({ color: '#fbcfe8', roughness: 0.3 })
    );
    dogHead.position.set(0.45, 0.82, 0);
    const dogVisor = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.18, 0.42),
      new THREE.MeshBasicMaterial({ color: '#22d3ee' })
    );
    dogVisor.position.set(0.7, 0.86, 0);
    dog.add(dogBody, dogHead, dogVisor);
    this.pixelDogMesh = dog;
    this.registerHotspot('pixel_dog', dog, -1.2, 1.8);

    // 3. Rainbow Laser-Bridge
    const bridge = new THREE.Group();
    const colors = ['#22d3ee', '#f472b6', '#facc15', '#34d399'];
    colors.forEach((col, i) => {
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.16, 2.2),
        new THREE.MeshBasicMaterial({
          color: bridgeFixed ? col : '#334155',
          transparent: true,
          opacity: bridgeFixed ? 0.92 : 0.45,
        })
      );
      plank.position.set((i - 1.5) * 0.95, 0.35, 0);
      bridge.add(plank);
    });
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.12, 12, 28, Math.PI),
      new THREE.MeshBasicMaterial({ color: bridgeFixed ? '#34d399' : '#64748b' })
    );
    arch.position.y = 0.35;
    bridge.add(arch);
    this.registerHotspot('laserbridge', bridge, 3.4, -1.2);

    // 4. Cyber-Ugglan Nova
    const owl = new THREE.Group();
    const perch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 1.8, 10),
      new THREE.MeshStandardMaterial({ color: '#334155' })
    );
    perch.position.y = 0.9;
    const owlBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 14, 14),
      new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.6, roughness: 0.25 })
    );
    owlBody.position.y = 2.05;
    owl.add(perch, owlBody);
    this.registerHotspot('cyberowl', owl, 5.5, 1.8);
  }

  // ZONE 4: KLOCKTORNET & NEON-MOTORVÄGEN
  private buildTowerZone() {
    // 1. DJ Blip
    const dj = this.createNpcHumanoid('#7e22ce', '#facc15', '#c084fc');
    this.registerHotspot('dj_blip', dj, -3.8, -1.6);

    // 2. Neon Highway Gate + Hover-Bike ready to race!
    const gate = new THREE.Group();
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.18, 12, 32, Math.PI),
      new THREE.MeshBasicMaterial({ color: '#facc15' })
    );
    arch.position.y = 0.2;
    gate.add(arch);

    const bike = this.createHoverBikeMesh(true);
    bike.position.y = 0.5;
    gate.add(bike);
    this.hoverBikeMesh = bike;
    this.registerHotspot('highway_gate', gate, 1.2, -1.5);

    // 3. Grand Clocktower Power Core Terminal
    const towerSpot = new THREE.Group();
    const spire = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 4.2, 1.8),
      new THREE.MeshStandardMaterial({ color: '#1e1b4b', metalness: 0.5, roughness: 0.3 })
    );
    spire.position.y = 2.1;
    towerSpot.add(spire);

    const clockFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.16, 24),
      new THREE.MeshBasicMaterial({ color: '#22d3ee' })
    );
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(0, 3.1, 0.92);
    towerSpot.add(clockFace);

    const hands = new THREE.Group();
    hands.position.set(0, 3.1, 1.02);
    const hand1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.06), new THREE.MeshBasicMaterial({ color: '#0f172a' }));
    hand1.position.y = 0.25;
    hands.add(hand1);
    towerSpot.add(hands);
    this.clockHandsMesh = hands;

    this.registerHotspot('clocktower_core', towerSpot, 5.2, 1.4);
  }

  // MINI-GAME 4: 3D HOVER-BIKE HIGHWAY SCENE
  private buildHighwayScene() {
    this.highwayGroup = new THREE.Group();
    this.highwayGroup.visible = false;
    this.scene.add(this.highwayGroup);

    // Highway road deck
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(9.5, 90),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4, metalness: 0.5 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.05, -35);
    this.highwayGroup.add(road);

    // Glowing neon side rails
    [-4.8, 4.8].forEach((rx) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.4, 90),
        new THREE.MeshBasicMaterial({ color: '#f472b6' })
      );
      rail.position.set(rx, 0.25, -35);
      this.highwayGroup.add(rail);
    });

    // Scrolling speed lines
    for (let i = 0; i < 16; i++) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(8.8, 0.35),
        new THREE.MeshBasicMaterial({ color: '#22d3ee', side: THREE.DoubleSide })
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.08, -i * 5.5);
      this.highwayGroup.add(line);
      this.highwayGridLines.push(line);
    }

    // Hover-Bike with Rex riding it!
    this.highwayBike = this.createHoverBikeMesh(true);
    this.highwayBike.rotation.y = Math.PI / 2;
    this.highwayBike.position.set(0, 0.55, 2.0);
    this.highwayGroup.add(this.highwayBike);
  }

  public startHighwayGame(callbacks: HighwayCallbacks) {
    this.highwayCallbacks = callbacks;
    this.highwayMode = true;
    this.zoneGroup.visible = false;
    this.rexGroup.visible = false;
    this.bultenGroup.visible = false;
    this.highwayGroup.visible = true;

    this.highwayLane = 0;
    this.highwayBikeX = 0;
    this.highwayJumpY = 0;
    this.highwayJumpVel = 0;
    this.highwayStarsCount = 0;

    // Clear old highway stars/barriers
    this.highwayItems.forEach((it) => this.highwayGroup.remove(it.mesh));
    this.highwayItems = [];

    // Spawn a steady stream of glowing Energy Stars and jumpable holo-barriers
    const lanes = [-2.6, 0, 2.6];
    for (let i = 0; i < 24; i++) {
      const isStar = i % 3 !== 2; // 2 stars for every 1 low barrier
      const laneIdx = Math.floor(Math.random() * 3);
      const laneX = lanes[laneIdx];
      const z = -12 - i * 8.5;

      const itemGrp = new THREE.Group();
      if (isStar) {
        const starMesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.68, 0),
          new THREE.MeshBasicMaterial({ color: '#facc15' })
        );
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(0.85, 0.07, 8, 20),
          new THREE.MeshBasicMaterial({ color: '#22d3ee' })
        );
        itemGrp.add(starMesh, halo);
        itemGrp.position.set(laneX, 1.1, z);
      } else {
        const barMesh = new THREE.Mesh(
          new THREE.BoxGeometry(2.1, 0.75, 0.35),
          new THREE.MeshBasicMaterial({ color: '#f43f5e', transparent: true, opacity: 0.85 })
        );
        itemGrp.add(barMesh);
        itemGrp.position.set(laneX, 0.5, z);
      }

      this.highwayGroup.add(itemGrp);
      this.highwayItems.push({
        mesh: itemGrp,
        type: isStar ? 'star' : 'barrier',
        lane: laneIdx - 1,
        z,
        collected: false,
      });
    }
  }

  public stopHighwayGame() {
    this.highwayMode = false;
    this.highwayGroup.visible = false;
    this.zoneGroup.visible = true;
    this.rexGroup.visible = true;
    this.bultenGroup.visible = true;
    this.camTargetPos.copy(this.camBasePos);
    this.camTargetLookAt.set(0, 1.4, 0);
  }

  public steerHighway(dir: -1 | 1) {
    if (!this.highwayMode) return;
    this.highwayLane = Math.max(-1, Math.min(1, this.highwayLane + dir));
  }

  public jumpHighway() {
    if (!this.highwayMode) return;
    if (this.highwayJumpY <= 0.05) {
      this.highwayJumpVel = 7.8;
    }
  }

  // Triggered when clicking a floating UI badge or 3D hotspot directly
  public walkToHotspot(hotspotId: string) {
    if (this.highwayMode) return;
    const spot = HOTSPOTS.find((h) => h.id === hotspotId && h.zone === this.currentZone);
    if (!spot) return;

    this.rexTarget.set(spot.walkX, 0, spot.walkZ);
    this.pendingHotspotId = hotspotId;
    this.showWalkRing(spot.walkX, spot.walkZ, spot.accentColor);

    // Smoothly frame camera toward the hotspot
    this.camTargetPos.set(spot.x * 0.35, 4.8, 8.8);
    this.camTargetLookAt.set(spot.x * 0.5, 1.5, spot.z * 0.5);
    this.focusTimer = 4.5;
  }

  private showWalkRing(x: number, z: number, colorHex: string = '#22d3ee') {
    this.walkRing.position.set(x, 0.04, z);
    (this.walkRing.material as THREE.MeshBasicMaterial).color.set(colorHex);
    (this.walkRing.material as THREE.MeshBasicMaterial).opacity = 0.9;
    this.walkRingTimer = 1.2;
  }

  private handlePointerDown = (e: PointerEvent) => {
    if (this.highwayMode) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.clickableObjects, true);
    if (hits.length === 0) return;

    // Prioritize hotspot hits over ground plane
    const hotspotHit = hits.find((h) => h.object.userData?.hotspotId);
    if (hotspotHit) {
      const hid = hotspotHit.object.userData.hotspotId as string;
      this.walkToHotspot(hid);
      return;
    }

    // Ground walk
    const groundHit = hits.find((h) => h.object === this.groundMesh);
    if (groundHit) {
      const pt = groundHit.point;
      const clampedX = Math.max(-6.8, Math.min(6.8, pt.x));
      const clampedZ = Math.max(-1.0, Math.min(3.5, pt.z));
      this.rexTarget.set(clampedX, 0, clampedZ);
      this.pendingHotspotId = null;
      this.showWalkRing(clampedX, clampedZ, '#22d3ee');
      this.camTargetPos.copy(this.camBasePos);
      this.camTargetLookAt.set(clampedX * 0.25, 1.4, 0);
    }
  };

  private handleResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    if (this.highwayMode) {
      this.updateHighwayMode(dt, elapsed);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // 1. Move Rex smoothly toward target
    const toTarget = new THREE.Vector3().subVectors(this.rexTarget, this.rexPos);
    const dist = toTarget.length();
    if (dist > 0.08) {
      const step = Math.min(dist, 5.2 * dt);
      toTarget.normalize();
      this.rexPos.addScaledVector(toTarget, step);
      const targetAngle = Math.atan2(toTarget.x, toTarget.z);
      this.rexGroup.rotation.y = targetAngle;
      // Hover-boot bobbing while walking
      this.rexGroup.position.set(this.rexPos.x, Math.abs(Math.sin(elapsed * 11)) * 0.14, this.rexPos.z);
    } else {
      this.rexGroup.position.set(this.rexPos.x, Math.sin(elapsed * 3) * 0.04, this.rexPos.z);
      // Face camera slightly when idle
      this.rexGroup.rotation.y = THREE.MathUtils.lerp(this.rexGroup.rotation.y, 0, dt * 4);
      if (this.pendingHotspotId) {
        const reachedId = this.pendingHotspotId;
        this.pendingHotspotId = null;
        this.onHotspotReached?.(reachedId);
      }
    }

    // 2. Bulten follows Rex with bouncy droid physics!
    const followOffset = new THREE.Vector3(-1.15, 0, 0.25);
    const desiredBulten = this.rexPos.clone().add(followOffset);
    this.bultenPos.lerp(desiredBulten, dt * 3.8);
    const bultenBounce = this.celebrationMode
      ? Math.abs(Math.sin(elapsed * 9)) * 0.45
      : Math.sin(elapsed * 4.5) * 0.08;
    this.bultenGroup.position.set(this.bultenPos.x, Math.max(0, bultenBounce), this.bultenPos.z);
    if (this.celebrationMode) {
      this.bultenGroup.rotation.y += dt * 4.5;
    } else {
      this.bultenGroup.rotation.y = Math.sin(elapsed * 2.0) * 0.35;
    }

    // 3. Walk ring fade
    if (this.walkRingTimer > 0) {
      this.walkRingTimer -= dt;
      const scale = 1 + (1.2 - this.walkRingTimer) * 0.7;
      this.walkRing.scale.set(scale, scale, 1);
      (this.walkRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, this.walkRingTimer * 0.75);
    }

    // 4. Scanner pulse animation on hotspots
    if (this.scannerActiveTimer > 0) {
      this.scannerActiveTimer -= dt;
      const s = 1 + Math.sin(elapsed * 10) * 0.09;
      this.hotspotMeshes.forEach((grp) => grp.scale.set(s, s, s));
    } else {
      this.hotspotMeshes.forEach((grp) => grp.scale.set(1, 1, 1));
    }

    // 5. Scene prop animations
    if (this.hoverBikeMesh) {
      this.hoverBikeMesh.position.y = 0.45 + Math.sin(elapsed * 3.6) * 0.1;
    }
    if (this.holoWhaleMesh) {
      this.holoWhaleMesh.position.y = Math.sin(elapsed * 1.8) * 0.35;
      this.holoWhaleMesh.rotation.y = Math.sin(elapsed * 0.9) * 0.3;
    }
    if (this.iceCreamConeMesh) {
      this.iceCreamConeMesh.rotation.y = elapsed * 1.6;
    }
    if (this.craneArmMesh) {
      this.craneArmMesh.rotation.y = Math.sin(elapsed * 1.2) * 0.35;
    }
    if (this.pixelDogMesh) {
      const dogHappy = !!this.solvedState['pixel_fed'];
      this.pixelDogMesh.position.y = dogHappy ? Math.abs(Math.sin(elapsed * 7)) * 0.3 : 0;
    }
    if (this.clockHandsMesh) {
      this.clockHandsMesh.rotation.z = -elapsed * 1.2;
    }

    // Background flying traffic
    this.bgTrafficGroup.children.forEach((car) => {
      car.position.x += car.userData.speed * dt;
      if (car.position.x > 18) car.position.x = -18;
      if (car.position.x < -18) car.position.x = 18;
    });

    // Camera choreography
    if (this.focusTimer > 0) {
      this.focusTimer -= dt;
      if (this.focusTimer <= 0) {
        this.camTargetPos.copy(this.camBasePos);
        this.camTargetLookAt.set(0, 1.4, 0);
      }
    }
    this.camera.position.lerp(this.camTargetPos, dt * 3.5);
    this.camLookAt.lerp(this.camTargetLookAt, dt * 4.0);
    this.camera.lookAt(this.camLookAt);

    // Project 3D hotspot coordinates to 2D screen badges
    this.projectHotspotsToScreen();

    this.renderer.render(this.scene, this.camera);
  };

  private updateHighwayMode(dt: number, elapsed: number) {
    // Camera locked behind the Hover-Bike
    const targetX = this.highwayLane * 2.6;
    this.highwayBikeX = THREE.MathUtils.lerp(this.highwayBikeX, targetX, dt * 8);

    // Jump physics
    if (this.highwayJumpY > 0 || this.highwayJumpVel > 0) {
      this.highwayJumpY += this.highwayJumpVel * dt;
      this.highwayJumpVel -= 18.5 * dt;
      if (this.highwayJumpY <= 0) {
        this.highwayJumpY = 0;
        this.highwayJumpVel = 0;
      }
    }

    const hoverBob = Math.sin(elapsed * 10) * 0.08;
    this.highwayBike.position.set(this.highwayBikeX, 0.55 + this.highwayJumpY + hoverBob, 2.0);
    this.highwayBike.rotation.x = (targetX - this.highwayBikeX) * 0.15;

    this.camera.position.lerp(new THREE.Vector3(this.highwayBikeX * 0.45, 3.8, 7.8), dt * 6);
    this.camera.lookAt(this.highwayBikeX * 0.3, 1.2, -6);

    // Scroll road grid lines
    const speed = 15.5;
    this.highwayGridLines.forEach((line) => {
      line.position.z += speed * dt;
      if (line.position.z > 6) {
        line.position.z -= 16 * 5.5;
      }
    });

    // Move & check stars and barriers
    const lanes = [-2.6, 0, 2.6];
    this.highwayItems.forEach((item) => {
      item.z += speed * dt;
      item.mesh.position.z = item.z;
      item.mesh.rotation.y += dt * 2.5;

      // Check collision near bike (z == 2.0)
      if (!item.collected && Math.abs(item.z - 2.0) < 1.1) {
        const itemX = lanes[item.lane + 1];
        if (Math.abs(this.highwayBikeX - itemX) < 1.15) {
          if (item.type === 'star') {
            item.collected = true;
            item.mesh.visible = false;
            this.highwayStarsCount = Math.min(10, this.highwayStarsCount + 1);
            this.highwayCallbacks?.onStarCollected(this.highwayStarsCount);
            if (this.highwayStarsCount >= 10) {
              this.highwayCallbacks?.onHighwayComplete();
            }
          } else if (item.type === 'barrier' && this.highwayJumpY < 0.65) {
            item.collected = true;
            this.highwayCallbacks?.onObstacleHit();
          }
        }
      }

      // Recycle items behind the camera so the player never runs out of stars
      if (item.z > 8) {
        item.z -= 24 * 8.5;
        item.collected = false;
        item.mesh.visible = true;
        item.mesh.position.z = item.z;
      }
    });
  }

  private projectHotspotsToScreen() {
    if (!this.onProjectionUpdate) return;
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    const list: ProjectedHotspot[] = [];

    const spots = HOTSPOTS.filter((s) => s.zone === this.currentZone);
    spots.forEach((s) => {
      const vec = new THREE.Vector3(s.x, s.y + 0.85, s.z);
      vec.project(this.camera);
      const sx = (vec.x * 0.5 + 0.5) * w;
      const sy = (-(vec.y * 0.5) + 0.5) * h;
      list.push({
        id: s.id,
        screenX: sx,
        screenY: sy,
        visible: vec.z < 1,
      });
    });

    this.onProjectionUpdate(list);
  }

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.dispose();
  }
}
