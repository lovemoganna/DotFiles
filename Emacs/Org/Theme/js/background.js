/* =====================================================
   Org Mode Three.js 固定粒子背景 - 完整优化版
   ===================================================== */

class OrgParticlesBackground {
  constructor(config = {}) {
    // 默认配置
    this.config = {
      // Canvas 选择器
      canvasSelector: '.webgl-particles-bg',
      
      // 调试模式
      debug: false,
      
      // 粒子参数
      count: this.isMobile() ? 50000 : 200000,
      branches: 2,
      radius: 5,
      innerColor: '#86ffbd',
      outerColor: '#1b3984',
      randomness: 0.777,
      randomnessPow: 2,
      
      // 相机参数
      cameraPosition: { x: 3.95, y: 4.86, z: -0.46 },
      fov: 75,
      near: 0.01,
      far: 100,
      
      // 控制参数
      enableOrbitControls: false,
      autoRotate: true,
      autoRotateSpeed: 0.1,
      
      // 性能参数
      enableAntiAlias: !this.isMobile(),
      maxPixelRatio: 2,
      
      // 颜色动画速度
      colorAnimationSpeed: 0.04,
      
      // 渲染参数
      forceContinuousRender: true, // 强制持续渲染
      renderOnDemand: false, // 按需渲染（节能模式）
      
      // 覆盖默认配置
      ...config
    };

    // 状态管理
    this.isInitialized = false;
    this.isAnimating = false;
    this.animationId = null;
    
    this.log('初始化配置:', this.config);
    this.init();
  }

  // 日志输出
  log(...args) {
    if (this.config.debug) {
      console.log('[OrgParticles]', ...args);
    }
  }

  // 检测是否为移动设备
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;
  }

  // 初始化
  async init() {
    try {
      this.log('开始初始化...');
      
      // 显示加载提示
      this.showLoading();
      
      await this.loadThreeJS();
      this.setupCanvas();
      this.setupScene();
      this.setupCamera();
      this.setupRenderer();
      await this.setupControls();
      this.createParticles();
      this.setupEventListeners();
      this.ensureCanvasVisible(); // 确保 Canvas 可见
      
      this.isInitialized = true;
      this.hideLoading();
      
      this.startAnimation();
      
      this.log('初始化完成！');
    } catch (error) {
      console.error('粒子背景初始化失败:', error);
      this.hideLoading();
    }
  }

  // 显示加载提示
  showLoading() {
    const loader = document.createElement('div');
    loader.className = 'particles-loading';
    // loader.textContent = '加载粒子背景';
    loader.id = 'particles-loader';
    document.body.appendChild(loader);
  }

  // 隐藏加载提示
  hideLoading() {
    const loader = document.getElementById('particles-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
    }
  }

  // 动态加载 Three.js
  async loadThreeJS() {
    if (window.THREE) {
      this.log('Three.js 已加载');
      return;
    }

    this.log('加载 Three.js...');
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/three@0.117.1/build/three.min.js';
      script.onload = () => {
        this.log('Three.js 加载成功');
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // 设置 Canvas
  setupCanvas() {
    let canvas = document.querySelector(this.config.canvasSelector);
    
    if (!canvas) {
      this.log('Canvas 不存在，自动创建...');
      canvas = document.createElement('canvas');
      canvas.className = this.config.canvasSelector.replace('.', '');
      document.body.insertBefore(canvas, document.body.firstChild);
    }
    
    this.canvas = canvas;
    this.log('Canvas 设置完成:', canvas);
  }

  // 设置场景
  setupScene() {
    this.scene = new THREE.Scene();
    
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(window.devicePixelRatio, this.config.maxPixelRatio),
    };
    
    this.log('场景设置完成:', this.sizes);
  }

  // 设置相机
  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      this.config.fov,
      this.sizes.width / this.sizes.height,
      this.config.near,
      this.config.far
    );
    
    const { x, y, z } = this.config.cameraPosition;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(new THREE.Vector3());
    
    this.log('相机设置完成:', this.camera.position);
  }

  // 设置渲染器
  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: this.config.enableAntiAlias,
      powerPreference: 'high-performance',
    });
    
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(this.sizes.pixelRatio);
    this.renderer.setClearColor(0x000000, 0);
    
    this.log('渲染器设置完成');
  }

  // 设置控制器
  async setupControls() {
    if (!this.config.enableOrbitControls) {
      this.log('OrbitControls 已禁用');
      return;
    }

    try {
      const { OrbitControls } = await import(
        'https://unpkg.com/three@0.117.1/examples/jsm/controls/OrbitControls.js'
      );
      
      this.controls = new OrbitControls(this.camera, this.canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.autoRotate = this.config.autoRotate;
      this.controls.autoRotateSpeed = this.config.autoRotateSpeed;
      
      this.log('OrbitControls 设置完成');
    } catch (error) {
      console.warn('OrbitControls 加载失败:', error);
    }
  }

  // 创建粒子
  createParticles() {
    this.log('创建粒子系统...');
    
    this.particleGeometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(this.config.count * 3);
    const colors = new Float32Array(this.config.count * 3);
    const randomness = new Float32Array(this.config.count * 3);
    const scales = new Float32Array(this.config.count);

    const innerColor = new THREE.Color(this.config.innerColor);
    const outerColor = new THREE.Color(this.config.outerColor);

    for (let i = 0; i < this.config.count; i++) {
      const i3 = i * 3;
      const t = ((i % this.config.branches) / this.config.branches) * Math.PI * 2;
      const radius = Math.random() * this.config.radius;

      positions[i3] = Math.cos(t + Math.PI * 0.5) * radius;
      positions[i3 + 1] = Math.sin(t + Math.PI * 0.5) * radius;
      positions[i3 + 2] = 0;

      const randomFactor = Math.pow(Math.random(), this.config.randomnessPow) *
        (Math.random() < 0.5 ? -1 : 1) *
        this.config.randomness *
        radius;
      
      randomness[i3] = randomFactor;
      randomness[i3 + 1] = randomFactor;
      randomness[i3 + 2] = randomFactor;

      const color = innerColor.clone().lerp(outerColor, radius / this.config.radius);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      scales[i] = Math.random();
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('aRandom', new THREE.BufferAttribute(randomness, 3));
    this.particleGeometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    this.particleMaterial = new THREE.ShaderMaterial({
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uCamPos: { value: this.camera.position },
      },
      vertexShader: `
        uniform float uTime;
        uniform vec3 uCamPos;
        attribute vec3 aRandom;
        attribute float aScale;
        varying vec3 vColor;

        void main() {
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          float angle = atan(modelPosition.y, modelPosition.x);
          float vecLength = length(modelPosition.xy);
          float angleOffset = (1.0 / vecLength) * uTime;
          angle += angleOffset;
          modelPosition.x = cos(angle) * vecLength;
          modelPosition.z = sin(angle) * vecLength;
          modelPosition.y += tan(angle) * dot(normalize(uCamPos), vec3(0.0, 0.0, 1.0));
          modelPosition.xyz += aRandom;
          vec4 mvPosition = viewMatrix * modelPosition;
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = 8.0 * aScale;
          gl_PointSize *= (1.0 / -mvPosition.z);
          vColor = color;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vColor;
        
        vec3 convertHsvToRgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        void main() {
          float strength = 1.0 - distance(gl_PointCoord, vec2(0.5));
          strength = step(0.5, strength);
          vec3 timedColor = convertHsvToRgb(vec3(vColor.x + uTime * ${this.config.colorAnimationSpeed}, 0.6, 0.8));
          vec3 color = mix(vec3(0.0), timedColor, strength);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particles);
    
    this.log('粒子系统创建完成，粒子数:', this.config.count);
  }

  // 确保 Canvas 可见
  ensureCanvasVisible() {
    // 强制设置样式
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.zIndex = '-999';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.opacity = '1';
    this.canvas.style.visibility = 'visible';
    this.canvas.style.display = 'block';
    
    this.log('Canvas 可见性已确保');
  }

  // 设置事件监听
  setupEventListeners() {
    // 窗口大小调整
    window.addEventListener('resize', () => this.onResize());
    
    // 页面可见性变化
    document.addEventListener('visibilitychange', () => this.onVisibilityChange());
    
    // 滚动事件（确保背景固定）
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });
    
    this.log('事件监听器设置完成');
  }

  // 窗口大小调整
  onResize() {
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(window.devicePixelRatio, this.config.maxPixelRatio),
    };

    this.camera.aspect = this.sizes.width / this.sizes.height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(this.sizes.pixelRatio);
    
    this.ensureCanvasVisible();
    
    this.log('窗口大小已调整:', this.sizes);
  }

  // 页面可见性变化
  onVisibilityChange() {
    if (document.hidden) {
      this.log('页面隐藏，暂停渲染');
      if (!this.config.forceContinuousRender) {
        this.stopAnimation();
      }
    } else {
      this.log('页面显示，恢复渲染');
      this.startAnimation();
    }
  }

  // 滚动事件
  onScroll() {
    // 确保 Canvas 始终固定
    this.ensureCanvasVisible();
    
    if (this.config.debug) {
      this.log('滚动位置:', window.scrollY);
    }
  }

  // 开始动画
  startAnimation() {
    if (this.isAnimating) {
      this.log('动画已在运行');
      return;
    }
    
    this.isAnimating = true;
    this.clock = this.clock || new THREE.Clock();
    this.animate();
    
    this.log('动画已启动');
  }

  // 停止动画
  stopAnimation() {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    this.log('动画已停止');
  }

  // 动画循环
  animate() {
    if (!this.isAnimating) return;

    const elapsedTime = this.clock.getElapsedTime();

    // 更新着色器 uniforms
    this.particleMaterial.uniforms.uTime.value = elapsedTime;
    this.particleMaterial.uniforms.uCamPos.value = this.camera.position;

    // 更新控制器
    if (this.controls) {
      this.controls.update();
    }

    // 渲染场景
    this.renderer.render(this.scene, this.camera);

    // 请求下一帧
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  // 更新配置
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.log('配置已更新:', this.config);
    
    // 重新生成粒子（如果需要）
    if (newConfig.count || newConfig.branches || newConfig.innerColor || newConfig.outerColor) {
      this.destroyParticles();
      this.createParticles();
    }
  }

  // 销毁粒子
  destroyParticles() {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particleGeometry.dispose();
      this.particleMaterial.dispose();
      this.log('粒子已销毁');
    }
  }

  // 销毁实例
  destroy() {
    this.log('销毁实例...');
    
    this.stopAnimation();
    this.destroyParticles();
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    if (this.controls) {
      this.controls.dispose();
    }
    
    window.removeEventListener('resize', () => this.onResize());
    document.removeEventListener('visibilitychange', () => this.onVisibilityChange());
    window.removeEventListener('scroll', () => this.onScroll());
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    this.isInitialized = false;
    this.log('实例已销毁');
  }

  // 截图功能
  screenshot() {
    return this.canvas.toDataURL('image/png');
  }

  // 获取状态信息
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isAnimating: this.isAnimating,
      particleCount: this.config.count,
      fps: this.renderer.info.render.frame,
      canvasSize: this.sizes,
      cameraPosition: this.camera.position,
    };
  }
}

// ==================== 自动初始化 ====================
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    console.log('[OrgParticles] DOM 加载完成，开始初始化...');
    
    const canvas = document.querySelector('.webgl-particles-bg');
    
    // 从 data 属性读取配置
    let config = {};
    if (canvas && canvas.dataset.config) {
      try {
        config = JSON.parse(canvas.dataset.config);
      } catch (e) {
        console.warn('配置解析失败:', e);
      }
    }
    
    // 创建实例
    window.orgParticlesBg = new OrgParticlesBackground(config);
    
    // 添加到 window 对象方便调试
    window.OrgParticlesBackground = OrgParticlesBackground;
    
    console.log('[OrgParticles] 实例已创建，可通过 window.orgParticlesBg 访问');
  });
}

// ==================== 模块导出 ====================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrgParticlesBackground;
}
