import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Euler,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  Points,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  ShadowMaterial,
  SRGBColorSpace,
  Texture,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { loadCelloScene } from './cello-preload';

type CelloCover = 'dots' | 'teal' | 'glass' | 'wood';

@Component({
  selector: 'app-violin-particles',
  standalone: true,
  template: `
    <div class="wrap" #wrap [class.is-ready]="!loading">
      <canvas #canvas></canvas>
      @if (loading) {
        <div class="loading" aria-hidden="true"></div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .wrap,
      canvas {
        width: 100%;
        height: 100%;
        display: block;
        touch-action: pan-y;
        cursor: default;
      }
      .wrap {
        position: relative;
      }
      canvas {
        opacity: 0;
        transition: opacity 0.45s ease;
      }
      .wrap.is-ready canvas {
        opacity: 1;
      }
      .loading {
        position: absolute;
        inset: 42% 44%;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(14, 164, 155, 0.45), transparent 70%);
        animation: pulse 1.1s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 0.35;
          transform: scale(0.85);
        }
        50% {
          opacity: 0.9;
          transform: scale(1.05);
        }
      }
    `,
  ],
})
export class ViolinParticlesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('wrap', { static: true }) wrapRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly cover: CelloCover = 'teal';
  loading = true;

  private renderer?: WebGLRenderer;
  private scene?: Scene;
  private camera?: PerspectiveCamera;
  private root?: Group;
  private cello?: Object3D;
  private ground?: Mesh;
  private dots?: Points;
  private keyLight?: DirectionalLight;
  private pmrem?: PMREMGenerator;
  private disposed = false;

  private readonly baseRot = new Euler(0.1, -0.45, -0.06);

  private readonly dotVertex = `
    attribute float aSize;
    attribute float aBright;
    varying float vBright;
    uniform float uPixelRatio;
    void main() {
      vBright = aBright;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      float atten = 280.0 / max(-mv.z, 40.0);
      gl_PointSize = clamp(aSize * atten * uPixelRatio, 1.2, 14.0);
    }
  `;
  private readonly dotFragment = `
    varying float vBright;
    uniform vec3 uColor;
    uniform vec3 uHi;
    void main() {
      vec2 p = gl_PointCoord - vec2(0.5);
      float d = length(p);
      float core = smoothstep(0.48, 0.18, d);
      if (smoothstep(0.5, 0.35, d) < 0.01) discard;
      vec3 col = mix(uColor, uHi, vBright);
      col = mix(vec3(0.0), col, core);
      gl_FragColor = vec4(col, mix(1.0, core, 0.15));
    }
  `;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    this.zone.runOutsideAngular(() => this.init());
  }

  ngOnDestroy(): void {
    this.disposed = true;
    window.removeEventListener('resize', this.onResize);
    this.disposeObject(this.cello);
    this.dots?.geometry.dispose();
    (this.dots?.material as Material | undefined)?.dispose();
    this.pmrem?.dispose();
    this.renderer?.dispose();
  }

  private onResize = (): void => {
    this.resize();
    if (this.cello && this.camera) {
      this.frameObject(this.cello);
    }
  };

  private init(): void {
    const canvas = this.canvasRef.nativeElement;

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(35, 1, 0.1, 200);
    this.camera.position.set(0.4, 0.2, 12);

    this.scene.add(new AmbientLight(0x0a1e1c, 0.28));
    this.scene.add(new HemisphereLight(0x8ee8d4, 0x020806, 0.4));

    this.keyLight = new DirectionalLight(0xfff1e0, 2.2);
    this.keyLight.position.set(1.8, 7.2, 2.4);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 0.2;
    this.keyLight.shadow.camera.far = 25;
    this.keyLight.shadow.bias = -0.0002;
    this.keyLight.shadow.normalBias = 0.012;
    this.scene.add(this.keyLight);

    const fill = new DirectionalLight(0x5ecfc4, 0.42);
    fill.position.set(-4.5, 3.2, 3.5);
    this.scene.add(fill);

    const bounce = new DirectionalLight(0x134e48, 0.28);
    bounce.position.set(0.5, -2.5, 2);
    this.scene.add(bounce);

    const rim = new DirectionalLight(0xa8ffe0, 0.55);
    rim.position.set(-2.2, 2.5, -5.5);
    this.scene.add(rim);

    this.root = new Group();
    this.root.rotation.copy(this.baseRot);
    this.scene.add(this.root);

    this.ground = new Mesh(
      new BoxGeometry(2.4, 0.02, 2.4),
      new ShadowMaterial({ opacity: 0.32 }),
    );
    this.ground.position.y = -0.55;
    this.ground.receiveShadow = true;
    this.root.add(this.ground);

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;

    window.addEventListener('resize', this.onResize);
    this.resize();

    this.renderer.setAnimationLoop(() => {
      if (!this.disposed) this.render();
    });

    // Carga automática (usa cache/preload si ya arrancó)
    void loadCelloScene()
      .then((gltf) => {
        if (this.disposed) return;
        this.cello = gltf.scene;
        this.applyCover(this.cello, this.cover);
        this.root?.add(this.cello);
        this.frameObject(this.cello);
        this.zone.run(() => {
          this.loading = false;
        });
        // Entorno IBL después del primer frame visible
        queueMicrotask(() => this.attachEnvironment());
      })
      .catch((err) => {
        console.error('No se pudo cargar cello.glb', err);
        this.zone.run(() => {
          this.loading = false;
        });
      });
  }

  private attachEnvironment(): void {
    if (this.disposed || !this.renderer || !this.scene || this.pmrem) return;
    this.pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  }

  private applyCover(root: Object3D, cover: CelloCover): void {
    if (cover === 'dots') {
      root.traverse((obj) => {
        const mesh = obj as Mesh;
        if (!mesh.isMesh) return;
        const olds = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of olds) {
          const anyM = m as MeshPhysicalMaterial & {
            map?: { dispose: () => void };
            normalMap?: { dispose: () => void };
            aoMap?: { dispose: () => void };
          };
          anyM.map?.dispose?.();
          anyM.normalMap?.dispose?.();
          anyM.aoMap?.dispose?.();
          anyM.dispose?.();
        }
      });
      this.applyDotsCover(root);
      return;
    }

    root.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;

      const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshPhysicalMaterial;
      const maps = {
        map: src.map ?? null,
        normalMap: src.normalMap ?? null,
        aoMap: src.aoMap ?? null,
        roughnessMap: src.roughnessMap ?? null,
        metalnessMap: src.metalnessMap ?? null,
      };

      if (mesh.geometry.getAttribute('uv') && !mesh.geometry.getAttribute('uv2')) {
        mesh.geometry.setAttribute('uv2', mesh.geometry.getAttribute('uv'));
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const isBody = /mat01/i.test(mesh.name) || /mat01/i.test(src.name ?? '');
      const mat = this.materialFor(cover);

      if (cover === 'glass') {
        mat.normalMap = maps.normalMap;
        mat.aoMap = maps.aoMap;
        mat.aoMapIntensity = isBody ? 1.7 : 1.2;
        mat.normalScale?.set(1.05, 1.05);
        mat.envMapIntensity = isBody ? 1.55 : 1.1;
        mat.map = null;
        mat.roughnessMap = null;
        mat.metalnessMap = null;

        if (isBody) {
          mat.color.set(0xc8fff6);
          mat.transmission = 0.78;
          mat.thickness = 1.35;
          mat.ior = 1.48;
          mat.roughness = 0.08;
          mat.metalness = 0;
          mat.clearcoat = 1;
          mat.clearcoatRoughness = 0.06;
          mat.transparent = true;
          mat.opacity = 1;
          mat.attenuationColor = new Color(0x0ea49b);
          mat.attenuationDistance = 0.65;
          mat.sheen = 0.15;
          mat.sheenColor = new Color(0x7dffc8);
          if (maps.aoMap) mat.aoMapIntensity = 2.1;
        } else {
          mat.map = maps.map;
          mat.color.set(0xe8fffb);
          mat.transmission = 0.15;
          mat.thickness = 0.35;
          mat.roughness = 0.22;
          mat.metalness = 0.35;
          mat.clearcoat = 0.95;
          mat.clearcoatRoughness = 0.12;
          mat.transparent = true;
          mat.opacity = 0.96;
        }
      } else if (cover === 'teal') {
        if (isBody) {
          mat.map = maps.map ? this.makeHoleMask(maps.map) : null;
          mat.roughnessMap = null;
          mat.metalnessMap = null;
          mat.aoMap = null;
          mat.normalMap = maps.normalMap;
          mat.normalScale?.set(0.35, 0.35);
          mat.color.set(0x0b8f88);
          mat.roughness = 0.3;
          mat.metalness = 0.05;
          mat.clearcoat = 0.55;
          mat.clearcoatRoughness = 0.2;
          mat.sheen = 0.1;
          mat.sheenColor = new Color(0x9dffd8);
          mat.sheenRoughness = 0.55;
          mat.envMapIntensity = 0.7;
        } else {
          mat.map = maps.map;
          mat.roughnessMap = null;
          mat.metalnessMap = null;
          mat.normalMap = maps.normalMap;
          mat.aoMap = maps.aoMap;
          mat.normalScale?.set(0.6, 0.6);
          mat.color.set(0xffffff);
          mat.roughness = 0.45;
          mat.metalness = 0.2;
          mat.clearcoat = 0.55;
          mat.clearcoatRoughness = 0.25;
          mat.aoMapIntensity = 1.15;
          mat.envMapIntensity = 0.45;
        }
      } else {
        mat.map = maps.map;
        mat.normalMap = maps.normalMap;
        mat.aoMap = maps.aoMap;
        mat.roughnessMap = maps.roughnessMap;
        mat.metalnessMap = maps.metalnessMap;
        mat.aoMapIntensity = isBody ? 1.85 : 1.35;
        mat.envMapIntensity = 0.35;
        mat.normalScale?.set(1.1, 1.1);
      }

      mat.needsUpdate = true;
      if (src !== mat) src.dispose();
      mesh.material = mat;
    });
  }

  /** Máscara limpia: blanco en el cuerpo, negro solo en f-holes. */
  private makeHoleMask(src: Texture): Texture {
    const img = src.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined;
    if (!img || typeof document === 'undefined') return src;

    const w = ('width' in img ? img.width : 0) || 0;
    const h = ('height' in img ? img.height : 0) || 0;
    if (!w || !h) return src;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;

    ctx.drawImage(img as CanvasImageSource, 0, 0);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const lum = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
      if (lum < 0.14) {
        const t = lum / 0.14;
        const v = Math.floor(t * t * 18);
        px[i] = v;
        px[i + 1] = Math.floor(v * 1.1);
        px[i + 2] = Math.floor(v * 1.05);
      } else {
        px[i] = 245;
        px[i + 1] = 248;
        px[i + 2] = 247;
      }
    }
    ctx.putImageData(data, 0, 0);

    const out = new CanvasTexture(canvas);
    out.colorSpace = SRGBColorSpace;
    out.flipY = src.flipY;
    out.wrapS = src.wrapS;
    out.wrapT = src.wrapT;
    out.needsUpdate = true;
    return out;
  }

  private materialFor(cover: Exclude<CelloCover, 'dots'>): MeshPhysicalMaterial {
    if (cover === 'teal') {
      return new MeshPhysicalMaterial({
        color: 0x0b8f88,
        metalness: 0.05,
        roughness: 0.3,
        clearcoat: 0.55,
        clearcoatRoughness: 0.2,
        sheen: 0.1,
        sheenColor: new Color(0x9dffd8),
        sheenRoughness: 0.55,
        envMapIntensity: 0.7,
      });
    }
    if (cover === 'glass') {
      return new MeshPhysicalMaterial({
        color: 0xc8fff6,
        metalness: 0,
        roughness: 0.1,
        transmission: 0.75,
        thickness: 1.2,
        ior: 1.48,
        transparent: true,
        opacity: 1,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        attenuationColor: new Color(0x0ea49b),
        attenuationDistance: 0.7,
        envMapIntensity: 1.4,
      });
    }
    return new MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.05,
      roughness: 0.45,
      clearcoat: 0.7,
      clearcoatRoughness: 0.25,
      envMapIntensity: 0.45,
    });
  }

  private applyDotsCover(root: Object3D): void {
    const shellMat = new MeshStandardMaterial({ color: 0x010805, roughness: 1 });
    const parts: Mesh[] = [];
    root.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      parts.push(mesh);
      mesh.material = shellMat.clone();
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    const count = 36000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const bright = new Float32Array(count);
    const tmp = new Vector3();
    const nrm = new Vector3();
    const light = new Vector3(0.55, 0.45, 0.7).normalize();
    let written = 0;

    for (const mesh of parts) {
      try {
        const sampler = new MeshSurfaceSampler(mesh).build();
        const n = Math.min(8000, count - written);
        for (let i = 0; i < n; i++) {
          sampler.sample(tmp, nrm);
          positions[written * 3] = tmp.x;
          positions[written * 3 + 1] = tmp.y;
          positions[written * 3 + 2] = tmp.z;
          sizes[written] = 1.2 + Math.random() * 1.8;
          bright[written] = Math.max(0, nrm.dot(light)) * 0.85 + Math.random() * 0.15;
          written++;
        }
      } catch {
        /* skip */
      }
      if (written >= count) break;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions.subarray(0, written * 3), 3));
    geo.setAttribute('aSize', new BufferAttribute(sizes.subarray(0, written), 1));
    geo.setAttribute('aBright', new BufferAttribute(bright.subarray(0, written), 1));
    const mat = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(0x1faa3c) },
        uHi: { value: new Color(0xb8ff4a) },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      vertexShader: this.dotVertex,
      fragmentShader: this.dotFragment,
      transparent: true,
      depthWrite: true,
      blending: NormalBlending,
    });
    this.dots = new Points(geo, mat);
    root.add(this.dots);
  }

  private frameObject(object: Object3D): void {
    if (!this.camera || !this.root) return;

    object.position.set(0, 0, 0);
    object.scale.setScalar(1);
    this.root.rotation.copy(this.baseRot);
    this.root.updateMatrixWorld(true);

    let box = new Box3().setFromObject(object);
    const size0 = new Vector3();
    const center0 = new Vector3();
    box.getSize(size0);
    box.getCenter(center0);
    const max0 = Math.max(size0.x, size0.y, size0.z) || 1;
    const scale = 1 / max0;
    object.scale.setScalar(scale);
    object.position.copy(center0).multiplyScalar(-scale);
    this.root.updateMatrixWorld(true);

    box = new Box3().setFromObject(object);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    if (this.ground) {
      this.ground.position.set(center.x, box.min.y - 0.02, center.z);
    }

    const fov = (this.camera.fov * Math.PI) / 180;
    const aspect = Math.max(this.camera.aspect, 0.01);
    // Encaje completo: el cello entero cabe en el canvas, lo más grande posible
    const fill = 0.93;
    const distH = size.y / (2 * Math.tan(fov / 2) * fill);
    const distW = size.x / (2 * Math.tan(fov / 2) * aspect * fill);
    const dist = Math.max(distH, distW, size.z * 1.15);

    this.camera.position.set(center.x - dist * 0.02, center.y + dist * 0.01, center.z + dist);
    this.camera.lookAt(center.x, center.y, center.z);
    this.camera.updateProjectionMatrix();

    if (this.keyLight) {
      this.keyLight.target.position.copy(center);
      this.scene?.add(this.keyLight.target);
      const half = Math.max(size.x, size.y, size.z) * 0.72;
      const cam = this.keyLight.shadow.camera;
      cam.left = -half;
      cam.right = half;
      cam.top = half;
      cam.bottom = -half;
      cam.near = 0.15;
      cam.far = half * 8;
      cam.updateProjectionMatrix();
      this.keyLight.position.set(center.x + half * 1.4, center.y + half * 3.6, center.z + half * 1.1);
      this.keyLight.shadow.radius = 5.5;
      this.keyLight.updateMatrixWorld();
    }
  }

  private resize(): void {
    if (!this.renderer || !this.camera) return;
    const wrap = this.wrapRef.nativeElement;
    const w = Math.max(wrap.clientWidth, 1);
    const h = Math.max(wrap.clientHeight, 1);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    if (this.dots) {
      (this.dots.material as ShaderMaterial).uniforms['uPixelRatio'].value = Math.min(
        window.devicePixelRatio || 1,
        2,
      );
    }
  }

  private render(): void {
    if (!this.root || !this.renderer || !this.scene || !this.camera) return;
    this.root.rotation.copy(this.baseRot);
    this.renderer.render(this.scene, this.camera);
  }

  private disposeObject(obj?: Object3D): void {
    if (!obj) return;
    obj.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) (m as Material | undefined)?.dispose?.();
    });
  }
}
