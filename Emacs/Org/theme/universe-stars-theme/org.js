/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            Palantir Wiki 完整增强包 v2.6.0 - 星空漂浮版                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  本文件基于 org.js 提纯，仅保留"星空漂浮"背景效果                         ║
 * ║  已移除的背景效果: 粒子银河、DNA螺旋、几何网格、波浪流动                   ║
 * ║                                                                          ║
 * ║  【扩展指南】搜索 "★★★ 扩展点" 找到所有可添加新效果的位置：               ║
 * ║  1. effectConfigs 数组 - 添加新效果的配置                                 ║
 * ║  2. createParticles() switch - 添加新效果的 case                          ║
 * ║  3. create[EffectName]() 方法 - 添加新效果的实现                          ║
 * ║  4. animate() switch - 添加效果特定的动画逻辑                             ║
 * ║  5. cameraSettings 对象 - 添加新效果的相机配置                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

(function() {
    'use strict';

    /* [OPT-P12] Debug flag for conditional logging */
    const DEBUG = false; // Set to true to enable debug logs

    // ======== 全局配置中心 ========
    const GLOBAL_CONFIG = {
	// Z-index 层级系统（统一管理）
	zIndex: {
	    particleBg: -999,        // 粒子背景（最底层）
	    base: 0,
	    content: 1,
	    elements: 2,
	    headings: 10,
	    headingsSpecial: 15,
	    interactive: 50,
	    dropdown: 1000,
	    sticky: 1020,
	    fixed: 1030,
	    modal: 1040,
	    popover: 1050,
	    tooltip: 1060
	},

	// 功能开关
	enableParticles: true,      // 是否启用粒子背景
	enableWikiEnhance: true,    // 是否启用 Wiki 增强

	// 调试模式
	debug: DEBUG
    };
    
    // 允许通过全局变量覆盖配置
    if (window.PALANTIR_CONFIG) {
	Object.assign(GLOBAL_CONFIG, window.PALANTIR_CONFIG);
    }
    
    // ======== 全局工具函数 ========
    function globalLog(...args) {
	if (GLOBAL_CONFIG.debug) {
	    console.log('[PalantirWiki]', ...args);
	}
    }

    /* [OPT-P04] HTML escaping utility to prevent XSS attacks */
    function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
    }

    /* [OPT-P13/P14] Theme Manager for automatic light/dark mode detection */
    const ThemeManager = {
	init() {
	    // Check for saved preference or system preference
	    const savedTheme = localStorage.getItem('theme');
	    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

	    if (savedTheme) {
		this.setTheme(savedTheme);
	    } else if (prefersDark) {
		this.setTheme('dark');
	    } else {
		this.setTheme('light');
	    }

	    // Listen for system theme changes
	    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
		if (!localStorage.getItem('theme')) {
		    this.setTheme(e.matches ? 'dark' : 'light');
		}
	    });

	    if (DEBUG) console.log('✅ ThemeManager initialized');
	},

	setTheme(theme) {
	    document.documentElement.setAttribute('data-theme', theme);
	    localStorage.setItem('theme', theme);
	    if (DEBUG) console.log(`🎨 Theme set to: ${theme}`);
	},

	toggleTheme() {
	    const current = document.documentElement.getAttribute('data-theme') || 'dark';
	    this.setTheme(current === 'dark' ? 'light' : 'dark');
	}
    };

    // =====================================================
    // 第一部分：Three.js 粒子背景 - 呼吸感色彩系统 v6.0
    // =====================================================

    // ═══════════════════════════════════════════════════════════════
    // 工具函数：HSL转RGB十六进制
    // ═══════════════════════════════════════════════════════════════
    function hslToHex(h, s, l) {
	h = h % 360;
	s = Math.max(0, Math.min(100, s)) / 100;
	l = Math.max(0, Math.min(100, l)) / 100;

	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs((h / 60) % 2 - 1));
	const m = l - c / 2;

	let r = 0, g = 0, b = 0;
	if (h >= 0 && h < 60) {
	    r = c; g = x; b = 0;
	} else if (h >= 60 && h < 120) {
	    r = x; g = c; b = 0;
	} else if (h >= 120 && h < 180) {
	    r = 0; g = c; b = x;
	} else if (h >= 180 && h < 240) {
	    r = 0; g = x; b = c;
	} else if (h >= 240 && h < 300) {
	    r = x; g = 0; b = c;
	} else if (h >= 300 && h < 360) {
	    r = c; g = 0; b = x;
	}

	const toHex = (n) => {
	    const hex = Math.round((n + m) * 255).toString(16);
	    return hex.length === 1 ? '0' + hex : hex;
	};

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    // ═══════════════════════════════════════════════════════════════
    // 4主题 × 6色呼吸循环配置
    // ═══════════════════════════════════════════════════════════════
    const THEME_COLOR_CONFIGS = {
	monokai: {
	    name: '赛博极光',
	    stops: [
		{ name: '电路绿', h: 100, s: 100, l: 45 },
		{ name: '霓虹粉', h: 330, s: 100, l: 50 },
		{ name: '钴蓝', h: 210, s: 100, l: 50 },
		{ name: '等离子紫', h: 270, s: 100, l: 50 },
		{ name: '熔岩橙', h: 25, s: 100, l: 50 },
		{ name: '激光黄', h: 60, s: 100, l: 44 },
	    ],
	    breathModulation: {
		saturationAmplitude: 8,
		lightnessAmplitude: 6,
	    },
	},
	dracula: {
	    name: '梦幻暮光',
	    stops: [
		{ name: '玫瑰紫', h: 326, s: 100, l: 74 },
		{ name: '梦幻蓝', h: 265, s: 89, l: 78 },
		{ name: '极光绿', h: 135, s: 94, l: 65 },
		{ name: '珊瑚橙', h: 31, s: 100, l: 71 },
		{ name: '薰衣草', h: 266, s: 91, l: 83 },
		{ name: '粉蓝', h: 191, s: 97, l: 77 },
	    ],
	    breathModulation: {
		saturationAmplitude: 6,
		lightnessAmplitude: 5,
	    },
	},
	gruvbox: {
	    name: '暖色禅境',
	    stops: [
		{ name: '秋叶红', h: 4, s: 96, l: 60 },
		{ name: '金麦���', h: 45, s: 93, l: 58 },
		{ name: '翠竹绿', h: 62, s: 65, l: 45 },
		{ name: '湖水青', h: 166, s: 22, l: 56 },
		{ name: '琥珀橙', h: 24, s: 99, l: 55 },
		{ name: '土陶棕', h: 18, s: 87, l: 45 },
	    ],
	    breathModulation: {
		saturationAmplitude: 7,
		lightnessAmplitude: 5,
	    },
	},
	raycast: {
	    name: '深空冥想',
	    stops: [
		{ name: '深紫罗兰', h: 258, s: 90, l: 76 },
		{ name: '月光蓝', h: 213, s: 94, l: 68 },
		{ name: '星云青', h: 160, s: 60, l: 53 },
		{ name: '子夜靛', h: 239, s: 84, l: 67 },
		{ name: '暮色紫', h: 278, s: 92, l: 75 },
		{ name: '星尘银', h: 214, s: 14, l: 61 },
	    ],
	    breathModulation: {
		saturationAmplitude: 5,
		lightnessAmplitude: 4,
	    },
	},
    };

    // ═══════════════════════════════════════════════════════════════
    // 5层光源色相偏移配置
    // ═══════════════════════════════════════════════════════════════
    const LAYER_OFFSETS = {
	particle: { hueOffset: 0, satBoost: 0, lightBoost: 0, emissiveIntensity: 0.12 },
	primaryLight: { hueOffset: 30, satBoost: 0, lightBoost: 5, intensityBase: 1.2, distance: 450, decay: 1.8 },
	followLight: { hueOffset: 60, satBoost: -8, lightBoost: 3, intensityBase: 0.8, distance: 400, decay: 1.5 },
	auxLight1: { hueOffset: 120, satBoost: -12, lightBoost: -2, intensityBase: 0.5, distance: 500, decay: 2.0 },
	auxLight2: { hueOffset: -120, satBoost: -12, lightBoost: -8, intensityBase: 0.5, distance: 500, decay: 2.0 },
	ambient: { hueOffset: 0, satBoost: -45, lightBoost: -25, intensityBase: 0.5 },
    };

    // ═══════════════════════════════════════════════════════════════
    // 呼吸感色彩系统核心类
    // ═══════════════════════════════════════════════════════════════
    class BreathingColorSystem {
	constructor(themeName) {
	    this.theme = THEME_COLOR_CONFIGS[themeName] || THEME_COLOR_CONFIGS.monokai;
	    this.colorStops = this.theme.stops;
	    this.breathPeriod = 6000; // 6秒完整周期
	    this.startTime = performance.now();

	    // 缓存动态效果
	    this.currentDynamics = {
		opacity: 0.4,
		breathIntensity: 0,
		bloomStrength: 0.65,
		scale: 1.0,
	    };
	}

	// 获取呼吸阶段 (0-1)
	getBreathPhase() {
	    const elapsed = performance.now() - this.startTime;
	    return (elapsed % this.breathPeriod) / this.breathPeriod;
	}

	// 正弦缓动函数
	easeInOutSine(t) {
	    return -(Math.cos(Math.PI * t) - 1) / 2;
	}

	// 6色循环插值
	getCurrentColor() {
	    const phase = this.getBreathPhase();
	    const segmentIndex = Math.floor(phase * 6);
	    const segmentProgress = (phase * 6) % 1;
	    const eased = this.easeInOutSine(segmentProgress);

	    return this.interpolateHSL(
		this.colorStops[segmentIndex],
		this.colorStops[(segmentIndex + 1) % 6],
		eased
	    );
	}

	// HSL插值（处理360度边界）
	interpolateHSL(fromState, toState, progress) {
	    let hue;
	    const hueDiff = toState.h - fromState.h;

	    if (Math.abs(hueDiff) > 180) {
		if (hueDiff > 0) {
		    hue = fromState.h + progress * (hueDiff - 360);
		} else {
		    hue = fromState.h + progress * (hueDiff + 360);
		}
	    } else {
		hue = fromState.h + progress * hueDiff;
	    }
	    hue = (hue + 360) % 360;

	    const saturation = fromState.s + progress * (toState.s - fromState.s);
	    const lightness = fromState.l + progress * (toState.l - fromState.l);

	    return { h: hue, s: saturation, l: lightness };
	}

	// 双重调制：呼吸波动
	applyBreathModulation(baseColor) {
	    const breathIntensity = Math.sin(this.getBreathPhase() * Math.PI * 2);
	    const modulation = this.theme.breathModulation;

	    return {
		h: baseColor.h,
		s: Math.max(0, Math.min(100, baseColor.s + breathIntensity * modulation.saturationAmplitude)),
		l: Math.max(0, Math.min(100, baseColor.l + breathIntensity * modulation.lightnessAmplitude)),
	    };
	}

	// 更新呼吸动态效果
	updateBreathDynamics() {
	    const phase = this.getBreathPhase();
	    const breathIntensity = Math.sin(phase * Math.PI * 2);
	    const normalizedPhase = (breathIntensity + 1) / 2;

	    this.currentDynamics.breathIntensity = breathIntensity;
	    this.currentDynamics.opacity = 0.35 + normalizedPhase * 0.4; // 0.35 ↔ 0.75
	    this.currentDynamics.bloomStrength = 0.4 + normalizedPhase * 0.5; // 0.4 ↔ 0.9
	    this.currentDynamics.scale = 0.92 + normalizedPhase * 0.16; // 0.92 ↔ 1.08
	}

	// 生成指定层的颜色
	getLayerColor(layerName) {
	    const layer = LAYER_OFFSETS[layerName];
	    if (!layer) {
		console.warn(`Unknown color layer: ${layerName}`);
		return '#ffffff';
	    }

	    const baseColor = this.getCurrentColor();
	    const modulated = this.applyBreathModulation(baseColor);

	    const finalHue = (modulated.h + layer.hueOffset + 360) % 360;
	    const finalSaturation = Math.max(0, Math.min(100, modulated.s + layer.satBoost));
	    const finalLightness = Math.max(0, Math.min(100, modulated.l + layer.lightBoost));

	    return hslToHex(finalHue, finalSaturation, finalLightness);
	}

	// 获取所有层的颜色
	getAllColors() {
	    this.updateBreathDynamics();

	    return {
		particle: this.getLayerColor('particle'),
		primaryLight: this.getLayerColor('primaryLight'),
		followLight: this.getLayerColor('followLight'),
		auxLight1: this.getLayerColor('auxLight1'),
		auxLight2: this.getLayerColor('auxLight2'),
		ambient: this.getLayerColor('ambient'),
		dynamics: this.currentDynamics,
	    };
	}

	// 获取光源强度（随呼吸变化）
	getIntensity(layerName) {
	    const layer = LAYER_OFFSETS[layerName];
	    if (!layer || !layer.intensityBase) return 1.0;

	    const breathScale = 0.7 + (this.currentDynamics.opacity - 0.35) / 0.4 * 0.6;
	    return layer.intensityBase * breathScale;
	}

	// 调试：获取当前状态
	getBreathState() {
	    const phase = this.getBreathPhase();
	    const segmentIndex = Math.floor(phase * 6);
	    const breathPhase = this.currentDynamics.breathIntensity > 0 ? '吸气' : '呼气';
	    return `${breathPhase} | ${this.colorStops[segmentIndex].name} → ${this.colorStops[(segmentIndex + 1) % 6].name}`;
	}
    }

    /* [OPT-P05] Magic numbers extracted to configuration constants */
    /* [OPT-P17] Smart particle count based on device capabilities */
    const PARTICLE_CONFIG = {
        COUNT_DESKTOP_HIGH: 200000,
        COUNT_DESKTOP_MID: 100000,
        COUNT_DESKTOP_LOW: 50000,
        COUNT_MOBILE: 30000,
        COUNT_LOW_END: 15000,
        MOBILE_WIDTH_THRESHOLD: 768,
        BRANCHES: 2,
        RADIUS: 5,
        RANDOMNESS: 0.777,
        RANDOMNESS_POW: 2,
        FOV: 75,
        NEAR: 0.01,
        FAR: 100,
        AUTO_ROTATE_SPEED: 0.1,
        MAX_PIXEL_RATIO: 2,
        COLOR_ANIMATION_SPEED: 0.04,
        CAMERA_POSITION: { x: 3.95, y: 4.86, z: -0.46 },
        COLORS: {
            INNER: '#86ffbd',
            OUTER: '#1b3984'
        }
    };

    class OrgParticlesBackground {
	constructor(config = {}) {
	    // Detect current theme
	    this.currentTheme = this.detectTheme();

	    // 初始化呼吸感色彩系统 [v6.0]
	    this.colorSystem = new BreathingColorSystem(this.currentTheme);
	    const themeName = THEME_COLOR_CONFIGS[this.currentTheme]?.name || this.currentTheme;
	    console.log('[色彩系统] 初始化完成，主题:', themeName);

	    // Performance quality levels
	    this.qualityLevel = localStorage.getItem('particle-quality') || 'balanced';
	    this.bloomEnabled = true;

	    // Particle effect management
	    this.currentEffect = 0; // 0-4 for 5 effects
	    // ═══════════════════════════════════════════════════════════════════════
	    // 【背景效果注册表】
	    // ★★★ 扩展点：在此数组中添加新的背景效果配置 ★★★
	    // 格式: { name: '效果名称', type: '效果类型', ...其他参数 }
	    // ═══════════════════════════════════════════════════════════════════════
	    this.effectConfigs = [
		// ┌─────────────────────────────────────────────────────────────────┐
		// │ 效果 #0: 星空漂浮 (Starfield) - 当前唯一保留的效果              │
		// │ 描述: 静谧的宇宙星空，星星随呼吸轻微闪烁                         │
		// └─────────────────────────────────────────────────────────────────┘
		{ name: '星空漂浮', type: 'starfield', branches: 0, radius: 8, spin: 0 },

		// ┌─────────────────────────────────────────────────────────────────┐
		// │ 【占位】效果 #1: 在此添加新效果                                  │
		// │ 示例:                                                           │
		// │ { name: '粒子银河', type: 'galaxy', branches: 2, radius: 5, spin: 1 },
		// └─────────────────────────────────────────────────────────────────┘
	    ];

	    // Load saved effect preference
	    const saved = localStorage.getItem('particle-effect-preference');
	    if (saved !== null) {
		this.currentEffect = parseInt(saved);
	    }

	    // 使用全局 Z-index 配置
	    this.config = {
		canvasSelector: '.webgl-particles-bg',
		debug: GLOBAL_CONFIG.debug,
		count: this.calculateParticleCount(),
		branches: PARTICLE_CONFIG.BRANCHES,
		radius: PARTICLE_CONFIG.RADIUS,
		innerColor: PARTICLE_CONFIG.COLORS.INNER,
		outerColor: PARTICLE_CONFIG.COLORS.OUTER,
		randomness: PARTICLE_CONFIG.RANDOMNESS,
		randomnessPow: PARTICLE_CONFIG.RANDOMNESS_POW,
		cameraPosition: PARTICLE_CONFIG.CAMERA_POSITION,
		fov: PARTICLE_CONFIG.FOV,
		near: PARTICLE_CONFIG.NEAR,
		far: PARTICLE_CONFIG.FAR,
		enableOrbitControls: false,
		autoRotate: true,
		autoRotateSpeed: PARTICLE_CONFIG.AUTO_ROTATE_SPEED,
		enableAntiAlias: !this.isMobile(),
		maxPixelRatio: PARTICLE_CONFIG.MAX_PIXEL_RATIO,
		colorAnimationSpeed: PARTICLE_CONFIG.COLOR_ANIMATION_SPEED,
		forceContinuousRender: true,
		renderOnDemand: false,
		zIndex: GLOBAL_CONFIG.zIndex.particleBg, // ✅ 使用全局配置
		...config
	    };

	    this.isInitialized = false;
	    this.isAnimating = false;
	    this.animationId = null;

	    /* [OPT-P02] Bind event handlers to prevent memory leaks */
	    this.boundOnResize = this.onResize.bind(this);
	    this.boundOnVisibilityChange = this.onVisibilityChange.bind(this);
	    this.boundOnScroll = this.onScroll.bind(this);
	    this.boundOnThemeChange = null; // Will be bound in setupEventListeners
	    this.boundOnMouseMove = this.onMouseMove.bind(this); // [v6.0] 鼠标跟踪

	    this.log('粒子背景初始化配置:', this.config);

	    // Apply quality settings
	    this.applyQualitySettings();
	}

	log(...args) {
	    if (this.config.debug) {
		console.log('[Particles]', ...args);
	    }
	}

	detectTheme() {
	    const html = document.documentElement;
	    const themeAttr = html.getAttribute('data-theme');
	    return themeAttr || 'monokai';
	}

	getEffectColors(effectType) {
	    // 使用新的呼吸色彩系统 [v6.0]
	    if (!this.colorSystem) {
		console.error('colorSystem not initialized');
		return { inner: '#ffffff', outer: '#888888', color: '#66D9EF' };
	    }

	    // 获取当前呼吸色彩
	    const breathingColor = this.colorSystem.getLayerColor('particle');

	    // 为了兼容现有代码，返回相同颜色作为 inner/outer
	    // 未来可以扩展为多色渐变
	    return {
		inner: breathingColor,
		outer: breathingColor,
		mid: breathingColor,
		color: breathingColor,
		warm: breathingColor,
		cool: breathingColor,
		pulse: breathingColor,
		accent: breathingColor,
	    };
	}

	applyQualitySettings() {
	    const baseCount = this.calculateParticleCount();
	    switch(this.qualityLevel) {
		case 'high':
		    this.config.count = baseCount;
		    this.config.enableAntiAlias = true;
		    this.bloomEnabled = true;
		    break;
		case 'balanced':
		    this.config.count = Math.floor(baseCount * 0.6);
		    this.config.enableAntiAlias = true;
		    this.bloomEnabled = true;
		    break;
		case 'performance':
		    this.config.count = Math.floor(baseCount * 0.3);
		    this.config.enableAntiAlias = false;
		    this.bloomEnabled = false;
		    break;
	    }
	}

	switchQuality() {
	    const qualities = ['high', 'balanced', 'performance'];
	    const currentIndex = qualities.indexOf(this.qualityLevel);
	    const nextIndex = (currentIndex + 1) % 3;
	    this.qualityLevel = qualities[nextIndex];

	    localStorage.setItem('particle-quality', this.qualityLevel);
	    this.applyQualitySettings();

	    // Recreate particles with new quality
	    this.createParticles();

	    const labels = {
		high: '高质量（性能要求高）',
		balanced: '平衡（推荐）',
		performance: '高性能（低配置）'
	    };

	    return labels[this.qualityLevel];
	}

	isMobile() {
	    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		navigator.userAgent
	    ) || window.innerWidth < PARTICLE_CONFIG.MOBILE_WIDTH_THRESHOLD;
	}

	/* [OPT-P17] Smart particle count calculation based on device capabilities */
	calculateParticleCount() {
	    const isMobile = this.isMobile();
	    const width = window.innerWidth;
	    const height = window.innerHeight;
	    const pixelCount = width * height;

	    // Detect low-end devices
	    const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
	    const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;

	    if (isMobile) {
	        // Mobile devices: reduce particles for better performance
	        if (isLowEnd || hasLowMemory) {
	            return PARTICLE_CONFIG.COUNT_LOW_END;
	        }
	        return PARTICLE_CONFIG.COUNT_MOBILE;
	    }

	    // Desktop devices: scale based on screen size
	    if (pixelCount > 2073600) { // > 1920x1080
	        return isLowEnd ? PARTICLE_CONFIG.COUNT_DESKTOP_MID : PARTICLE_CONFIG.COUNT_DESKTOP_HIGH;
	    } else if (pixelCount > 1228800) { // > 1280x960
	        return PARTICLE_CONFIG.COUNT_DESKTOP_MID;
	    } else {
	        return PARTICLE_CONFIG.COUNT_DESKTOP_LOW;
	    }
	}

	async init() {
	    try {
		this.log('开始初始化...');
		this.showLoading();

		await this.loadThreeJS();
		this.setupCanvas();
		this.setupScene();
		this.setupCamera();
		this.setupRenderer();
		this.setupBloom(); // [v6.0] 泛光后处理
		await this.setupControls();
		this.createParticles();
		this.setupEventListeners();
		this.ensureCanvasVisible();

		this.isInitialized = true;
		this.hideLoading();
		this.startAnimation();

		this.log('初始化完成！');
		return true;
	    } catch (error) {
		console.error('粒子背景初始化失败:', error);
		this.hideLoading();
		return false;
	    }
	}

	showLoading() {
	    const loader = document.createElement('div');
	    loader.className = 'particles-loading';
	    loader.id = 'particles-loader';
	    loader.style.cssText = `
position: fixed;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
color: #66d9ef;
font-size: 1rem;
z-index: ${GLOBAL_CONFIG.zIndex.modal};
opacity: 1;
transition: opacity 0.5s;
pointer-events: none;
`;
	    document.body.appendChild(loader);
	}

	hideLoading() {
	    const loader = document.getElementById('particles-loader');
	    if (loader) {
		loader.style.opacity = '0';
		setTimeout(() => loader.remove(), 500);
	    }
	}

	async loadThreeJS() {
	    if (window.THREE) {
		this.log('Three.js 已加载');
		return;
	    }

	    this.log('加载 Three.js...');

	    // 尝试多个CDN源以提高成功率（更新为更可靠的CDN）
	    const cdnSources = [
		'https://unpkg.com/three@0.159.0/build/three.min.js',
		'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js',
		'https://cdnjs.cloudflare.com/ajax/libs/three.js/r159/three.min.js'
	    ];

	    for (const src of cdnSources) {
		try {
		    await this.loadScriptFromUrl(src);
		    if (window.THREE) {
			this.log('Three.js 加载成功 from:', src);
			return;
		    }
		} catch (err) {
		    this.log('从', src, '加载失败，尝试下一个...');
		}
	    }

	    throw new Error('所有CDN源均无法加载Three.js');
	}

	
	loadScriptFromUrl(url) {
	    return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = url;
		script.crossOrigin = 'anonymous';

		const timeout = setTimeout(() => {
		    reject(new Error('加载超时'));
		}, 10000); // 10秒超时

		script.onload = () => {
		    clearTimeout(timeout);
		    resolve();
		};

		script.onerror = (e) => {
		    clearTimeout(timeout);
		    reject(e);
		};

		document.head.appendChild(script);
	    });
	}

	setupCanvas() {
	    let canvas = document.querySelector(this.config.canvasSelector);
            
	    if (!canvas) {
		this.log('Canvas 不存在，自动创建...');
		canvas = document.createElement('canvas');
		canvas.className = this.config.canvasSelector.replace('.', '');
		document.body.insertBefore(canvas, document.body.firstChild);
	    }
            
	    this.canvas = canvas;
	    this.log('Canvas 设置完成');
	}

	setupScene() {
	    this.scene = new THREE.Scene();
	    this.sizes = {
		width: window.innerWidth,
		height: window.innerHeight,
		pixelRatio: Math.min(window.devicePixelRatio, this.config.maxPixelRatio),
	    };
	    this.log('场景设置完成');

	    // ═══════════════════════════════════════════════════════
	    // 初始化5层光源系统 [v6.0]
	    // ═══════════════════════════════════════════════════════
	    this.setupLighting();
	}

	setupLighting() {
	    // 环境光 - 提供基础照明
	    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
	    this.scene.add(this.ambientLight);

	    // 主光源 - 位于场景原点，强度最高
	    this.primaryLight = new THREE.PointLight(0xffffff, 1.2, 450, 1.8);
	    this.primaryLight.position.set(0, 0, 0);
	    this.scene.add(this.primaryLight);

	    // 跟随光源 - 跟踪鼠标位置，提供动态照明
	    this.followLight = new THREE.PointLight(0xffffff, 0.8, 400, 1.5);
	    this.followLight.position.set(0, 0, 3);
	    this.scene.add(this.followLight);

	    // 辅助光源1 - 固定位置提供侧面光
	    this.auxLight1 = new THREE.PointLight(0xffffff, 0.5, 500, 2.0);
	    this.auxLight1.position.set(150, 100, 50);
	    this.scene.add(this.auxLight1);

	    // 辅助光源2 - 固定位置提供背面光
	    this.auxLight2 = new THREE.PointLight(0xffffff, 0.5, 500, 2.0);
	    this.auxLight2.position.set(-150, -100, -50);
	    this.scene.add(this.auxLight2);

	    // 初始化鼠标位置（用于跟随光源）
	    this.mouse = { x: 0, y: 0 };

	    this.log('[光源系统] 5层光源初始化完成');
	}

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
	    this.log('相机设置完成');
	}

	setupRenderer() {
	    this.renderer = new THREE.WebGLRenderer({
		canvas: this.canvas,
		alpha: true,
		antialias: this.config.enableAntiAlias,
		powerPreference: 'high-performance',
	    });

	    this.renderer.setSize(this.sizes.width, this.sizes.height);
	    this.renderer.setPixelRatio(this.sizes.pixelRatio);
	    this.renderer.setClearColor(0x000000, 0.8); // [v2.0] 增强至 80% 不透明度 - 明显可见

	    this.log('渲染器设置完成');
	}

	setupBloom() {
	    // ═══════════════════════════════════════════════════════
	    // [v6.0] 内联UnrealBloom后处理 - 避免CORS问题
	    // 创建渲染目标和全屏四边形，使用内联shader实现泛光
	    // ═══════════════════════════════════════════════════════

	    // 创建渲染目标（用于多pass渲染）
	    this.renderTarget = new THREE.WebGLRenderTarget(this.sizes.width, this.sizes.height, {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat,
		stencilBuffer: false,
	    });

	    this.bloomTarget = new THREE.WebGLRenderTarget(this.sizes.width, this.sizes.height, {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat,
		stencilBuffer: false,
	    });

	    // 创建全屏四边形场景
	    this.bloomScene = new THREE.Scene();
	    this.bloomCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

	    // 内联泛光shader
	    const bloomShader = {
		uniforms: {
		    tDiffuse: { value: null },
		    bloomStrength: { value: 0.65 }, // 泛光强度（会被呼吸动态调整）
		    bloomThreshold: { value: 0.2 }, // 亮度阈值
		    bloomRadius: { value: 0.5 }, // 扩散半径
		},
		vertexShader: `
		    varying vec2 vUv;
		    void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		    }
		`,
		fragmentShader: `
		    uniform sampler2D tDiffuse;
		    uniform float bloomStrength;
		    uniform float bloomThreshold;
		    uniform float bloomRadius;
		    varying vec2 vUv;

		    // 高斯模糊采样（5×5核）
		    vec4 blur5(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
			vec4 color = vec4(0.0);
			vec2 off1 = vec2(1.3333333333333333) * direction / resolution;
			color += texture2D(image, uv) * 0.29411764705882354;
			color += texture2D(image, uv + off1) * 0.35294117647058826;
			color += texture2D(image, uv - off1) * 0.35294117647058826;
			return color;
		    }

		    void main() {
			vec4 texel = texture2D(tDiffuse, vUv);

			// 提取亮部（阈值过滤）
			float brightness = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));
			float contribution = max(0.0, brightness - bloomThreshold);
			vec3 bloomColor = texel.rgb * contribution * bloomStrength;

			// 应用高斯模糊
			vec2 resolution = vec2(1024.0, 1024.0); // 近似值
			vec4 blurredH = blur5(tDiffuse, vUv, resolution, vec2(bloomRadius, 0.0));
			vec4 blurredV = blur5(tDiffuse, vUv, resolution, vec2(0.0, bloomRadius));
			vec4 blurred = (blurredH + blurredV) * 0.5;

			// 合成：原图 + 泛光
			gl_FragColor = texel + blurred * bloomStrength;
		    }
		`,
	    };

	    this.bloomMaterial = new THREE.ShaderMaterial({
		uniforms: bloomShader.uniforms,
		vertexShader: bloomShader.vertexShader,
		fragmentShader: bloomShader.fragmentShader,
		depthTest: false,
		depthWrite: false,
	    });

	    const bloomQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.bloomMaterial);
	    this.bloomScene.add(bloomQuad);

	    this.log('[泛光系统] UnrealBloom 后处理初始化完成');
	}

	async setupControls() {
	    if (!this.config.enableOrbitControls) {
		this.log('OrbitControls 已禁用');
		return;
	    }

	    try {
		/* [OPT-P09] Updated OrbitControls to match Three.js v0.159.0 */
		const { OrbitControls } = await import(
		    'https://unpkg.com/three@0.159.0/examples/jsm/controls/OrbitControls.js'
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

	createParticles() {
	    const effect = this.effectConfigs[this.currentEffect];

	    if (this.particles) {
		this.scene.remove(this.particles);
		this.particleGeometry.dispose();
		this.particleMaterial.dispose();
	    }

	    this.log('创建粒子系统:', effect.name);

	    // [v2.0] 根据效果类型调整相机视角
	    this.adjustCameraForEffect(effect.type);

	    // ═══════════════════════════════════════════════════════════════════════
	    // 【粒子创建分发器】
	    // ★★★ 扩展点：在此 switch 中添加新效果的 case ★★★
	    // ═══════════════════════════════════════════════════════════════════════
	    switch(effect.type) {
		// ─────────────────────────────────────────────────────────
		// 效果 #0: 星空漂浮 (Starfield)
		// ─────────────────────────────────────────────────────────
		case 'starfield':
		    this.createStarfield(effect);
		    break;

		// ─────────────────────────────────────────────────────────
		// 【占位】在此添加新效果的 case
		// 示例:
		// case 'galaxy':
		//     this.createGalaxy(effect);
		//     break;
		// ─────────────────────────────────────────────────────────

		default:
		    console.warn('未知效果类型:', effect.type, '，降级到默认效果');
		    this.createStarfield(effect);
	    }
	}

	adjustCameraForEffect(effectType) {
	    if (!this.camera) return;

	    // [v2.0] 根据效果类型设置最佳相机位置
	    // ═══════════════════════════════════════════════════════════════════════
	    // 【相机设置注册表】
	    // ★★★ 扩展点：在此添加新效果的相机配置 ★★★
	    // ═══════════════════════════════════════════════════════════════════════
	    const cameraSettings = {
		// 效果 #0: 星空漂浮
		'starfield': { pos: [0, 0, 5], lookAt: [0, 0, 0] },

		// 【占位】新效果的相机配置
		// 'galaxy': { pos: [0, 0, 5], lookAt: [0, 0, 0] },
	    };

	    const setting = cameraSettings[effectType] || cameraSettings['starfield'];
	    this.camera.position.set(...setting.pos);
	    this.camera.lookAt(new THREE.Vector3(...setting.lookAt));

	    this.log(`[相机调整] ${effectType}: 位置=${setting.pos}, 朝向=${setting.lookAt}`);
	}

	// ═══════════════════════════════════════════════════════════════════════
	// 【占位】createGalaxy 方法已移除
	// ★★★ 扩展点：在此添加新效果的实现方法 ★★★
	// 示例:
	// createGalaxy(effect) {
	//     // 创建银河效果的粒子系统
	// }
	// ═══════════════════════════════════════════════════════════════════════

	// ═══════════════════════════════════════════════════════════════════════
	// 【效果实现】星空漂浮 (Starfield)
	// 描述: 球形分布的星星，具有闪烁效果和轻微的径向呼吸
	// ═══════════════════════════════════════════════════════════════════════
	createStarfield(effect) {
	    this.particleGeometry = new THREE.BufferGeometry();
	    const positions = new Float32Array(this.config.count * 3);
	    const colors = new Float32Array(this.config.count * 3);
	    const sizes = new Float32Array(this.config.count);
	    const alphas = new Float32Array(this.config.count);
	    const twinkleSeeds = new Float32Array(this.config.count);

	    // Get theme-adaptive colors with temperature variation
	    const themeColors = this.getEffectColors('starfield');
	    const coolColor = new THREE.Color(themeColors.cool);
	    const warmColor = new THREE.Color(themeColors.warm);
	    const innerColor = new THREE.Color(themeColors.inner);
	    const outerColor = new THREE.Color(themeColors.outer);

	    for (let i = 0; i < this.config.count; i++) {
		const i3 = i * 3;

		// Spherical random distribution
		const theta = Math.random() * Math.PI * 2;
		const phi = Math.acos(2 * Math.random() - 1);
		const r = Math.pow(Math.random(), 0.8) * effect.radius; // 稍微更均匀的分布

		positions[i3] = r * Math.sin(phi) * Math.cos(theta);
		positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
		positions[i3 + 2] = r * Math.cos(phi);

		// 星星大小分类：90% 小星 + 8% 中星 + 2% 亮星
		const starType = Math.random();
		let size, baseAlpha;
		if (starType < 0.9) {
		    // 小星
		    size = Math.random() * 0.012 + 0.008;
		    baseAlpha = Math.random() * 0.3 + 0.2;
		} else if (starType < 0.98) {
		    // 中星
		    size = Math.random() * 0.025 + 0.02;
		    baseAlpha = Math.random() * 0.4 + 0.4;
		} else {
		    // 亮星
		    size = Math.random() * 0.04 + 0.03;
		    baseAlpha = Math.random() * 0.3 + 0.6;
		}
		sizes[i] = size;

		// 色温变化：蓝白/中性/暖白
		const temp = Math.random();
		let color;
		if (temp < 0.3) {
		    // 冷色星（蓝白）
		    color = coolColor.clone();
		} else if (temp < 0.7) {
		    // 中性星
		    color = innerColor.clone().lerp(outerColor, Math.random());
		} else {
		    // 暖色星（黄白）
		    color = warmColor.clone();
		}

		colors[i3] = color.r;
		colors[i3 + 1] = color.g;
		colors[i3 + 2] = color.b;

		// 景深：远处星星更暗
		const depth = r / effect.radius;
		alphas[i] = baseAlpha * (1.0 - depth * 0.3);

		// 闪烁种子（用于控制每颗星的闪烁相位）
		twinkleSeeds[i] = Math.random() * 100.0;
	    }

	    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
	    this.particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
	    this.particleGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
	    this.particleGeometry.setAttribute('aTwinkleSeed', new THREE.BufferAttribute(twinkleSeeds, 1));

	    this.particleMaterial = new THREE.ShaderMaterial({
		depthWrite: false,
		vertexColors: true,
		blending: THREE.AdditiveBlending,
		transparent: true,
		uniforms: {
		    uTime: { value: 0 },
		},
		vertexShader: `
uniform float uTime;
attribute float aSize;
attribute float aAlpha;
attribute float aTwinkleSeed;
varying vec3 vColor;
varying float vAlpha;
varying float vTwinkleSeed;

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    // ═══════════════════════════════════════════════════════
    // [v6.0] 径向扩张流场 - 添加轻微呼吸和湍流
    // ═══════════════════════════════════════════════════════
    float radius = length(modelPosition.xyz);
    vec3 direction = normalize(modelPosition.xyz);

    // 径向呼吸（轻微缩放）
    float expansionCycle = sin(uTime * 0.25) * 0.03; // 降低幅度从0.2到0.03
    modelPosition.xyz *= (1.0 + expansionCycle);

    // 湍流扰动（添加位移而非重写）
    float turbulence = sin(radius * 3.0 + uTime * 0.8 + aTwinkleSeed) * 0.02; // 降低幅度
    turbulence += sin(radius * 7.0 - uTime * 1.2 + aTwinkleSeed * 2.0) * 0.01;
    modelPosition.xyz += direction * turbulence;

    vec4 mvPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * mvPosition;

    // 粒子大小随距离衰减
    gl_PointSize = aSize * (300.0 / -mvPosition.z);

    vColor = color;
    vAlpha = aAlpha;
    vTwinkleSeed = aTwinkleSeed;
}
`,
		fragmentShader: `
uniform float uTime;
varying vec3 vColor;
varying float vAlpha;
varying float vTwinkleSeed;

void main() {
    // 柔和的圆形粒子
    float dist = length(gl_PointCoord - vec2(0.5));
    float strength = smoothstep(0.5, 0.0, dist);

    // 闪烁效果：使用 sin 波动，每颗星有独立相位
    float twinkle = sin(uTime * 2.0 + vTwinkleSeed) * 0.3 + 0.7;

    // 最终 alpha
    float finalAlpha = vAlpha * strength * twinkle;

    gl_FragColor = vec4(vColor, finalAlpha);
}
`,
	    });

	    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
	    this.scene.add(this.particles);
	    this.log('真实星空效果创建完成，粒子数:', this.config.count);
	}


	// [已移除] createDNA 方法 - 可在此添加新效果


	// [已移除] createGrid 方法 - 可在此添加新效果


	// [已移除] createWave 方法 - 可在此添加新效果

	ensureCanvasVisible() {
	    this.canvas.style.cssText = `
position: fixed !important;
top: 0 !important;
left: 0 !important;
width: 100vw !important;
height: 100vh !important;
z-index: ${this.config.zIndex} !important;
pointer-events: none !important;
opacity: 1 !important;
visibility: visible !important;
display: block !important;
`;
	    this.log('Canvas 可见性已确保');
	}

	setupEventListeners() {
	    /* [OPT-P02] Use bound handlers for proper cleanup */
	    window.addEventListener('resize', this.boundOnResize);
	    document.addEventListener('visibilitychange', this.boundOnVisibilityChange);
	    window.addEventListener('scroll', this.boundOnScroll, { passive: true });

	    // Listen for theme changes
	    this.boundOnThemeChange = this.onThemeChange.bind(this);
	    window.addEventListener('themeChanged', this.boundOnThemeChange);

	    // [v6.0] 鼠标跟踪用于跟随光源
	    window.addEventListener('mousemove', this.boundOnMouseMove, { passive: true });

	    this.log('事件监听器设置完成');
	}

	onMouseMove(event) {
	    // 归一化鼠标坐标到 [-1, 1] 范围
	    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
	}

	onThemeChange() {
	    this.currentTheme = this.detectTheme();
	    this.log('主题已更改为:', this.currentTheme);

	    // 重新创建呼吸感色彩系统 [v6.0]
	    this.colorSystem = new BreathingColorSystem(this.currentTheme);
	    const themeName = THEME_COLOR_CONFIGS[this.currentTheme]?.name || this.currentTheme;
	    this.log('[色彩系统] 主题切换，重新初始化:', themeName);

	    // Recreate particles with new theme colors
	    this.createParticles();
	}

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

	    // Update composer size if it exists
	    if (this.composer) {
		this.composer.setSize(this.sizes.width, this.sizes.height);
	    }

	    // [v6.0] 更新泛光渲染目标大小
	    if (this.renderTarget) {
		this.renderTarget.setSize(this.sizes.width, this.sizes.height);
	    }
	    if (this.bloomTarget) {
		this.bloomTarget.setSize(this.sizes.width, this.sizes.height);
	    }

	    this.ensureCanvasVisible();
	}

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

	onScroll() {
	    this.ensureCanvasVisible();
	}

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

	stopAnimation() {
	    this.isAnimating = false;
	    if (this.animationId) {
		cancelAnimationFrame(this.animationId);
		this.animationId = null;
	    }
	    this.log('动画已停止');
	}

	animate() {
	    if (!this.isAnimating) return;

	    this.animationId = requestAnimationFrame(() => this.animate());

	    const currentEffect = this.effectConfigs[this.currentEffect];
	    const time = Date.now() * 0.001; // Time in seconds

	    // ═══════════════════════════════════════════════════════
	    // [v6.0] 呼吸感色彩系统更新（暂时禁用，ShaderMaterial不支持）
	    // TODO: 需要在shader中添加uniform来接收颜色
	    // ═══════════════════════════════════════════���═══════════
	    // 注释掉：ShaderMaterial没有color/emissive属性，不受PointLight影响

	    if (this.particles && this.particleMaterial) {
		// 所有效果现在都使用 ShaderMaterial，直接更新 uTime uniform
		if (this.particleMaterial.uniforms && this.particleMaterial.uniforms.uTime) {
		    this.particleMaterial.uniforms.uTime.value = time;
		}

		// ═══════════════════════════════════════════════════════
		// [v6.0] 效果特定的动画（补充shader流场）
		// Galaxy: 螺旋流场（shader）
		// Starfield: 径向扩张流场（shader）+ 视差旋转（JS）
		// DNA: 螺旋上升流场（shader）+ 整体旋转（JS）
		// Grid: 脉冲波流场（shader，包含旋转）
		// Wave: 水平漂移流场（shader）
		// ═══════════════════════════════════════════════════════
		// ═══════════════════════════════════════════════════════════════════════
		// 【效果动画分发器】
		// ★★★ 扩展点：在此 switch 中添加效果特定的动画逻辑 ★★★
		// ═══════════════════════════════════════════════════════════════════════
		switch(currentEffect.type) {
		    // ─────────────────────────────────────────────────────────
		    // 效果 #0: 星空漂浮 - 缓慢旋转营造视差感
		    // ─────────────────────────────────────────────────────────
		    case 'starfield':
			// [v6.0] shader处理径向扩张，JS添加缓慢旋转营造视差感
			this.particles.rotation.y = time * 0.01;
			break;

		    // ─────────────────────────────────────────────────────────
		    // 【占位】在此添加新效果的动画逻辑
		    // 示例:
		    // case 'galaxy':
		    //     // 银河效果的动画逻辑
		    //     break;
		    // ─────────────────────────────────────────────────────────
		}
	    }

	    // ═══════════════════════════════════════════════════════
	    // [v6.0] 泛光后处理呼吸动态更新
	    // ═══════════════════════════════════════════════════════
	    if (this.bloomMaterial && this.colorSystem) {
		const dynamics = this.colorSystem.currentDynamics;
		// 泛光强度随呼吸周期变化：0.4 ↔ 0.9
		this.bloomMaterial.uniforms.bloomStrength.value = dynamics.bloomStrength;
	    }

	    if (this.controls) {
		this.controls.update();
	    }

	    this.render();
	}

	render() {
	    // ═══════════════════════════════════════════════════════
	    // [v6.0] 两阶段渲染：场景 → 泛光后处理 → 屏幕
	    // ═══════════════════════════════════════════════════════
	    if (this.renderTarget && this.bloomMaterial && this.bloomScene) {
		// Pass 1: 渲染场景到渲染目标
		this.renderer.setRenderTarget(this.renderTarget);
		this.renderer.clear();
		this.renderer.render(this.scene, this.camera);

		// Pass 2: 将渲染目标传递给泛光shader，渲染到屏幕
		this.bloomMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
		this.renderer.setRenderTarget(null);
		this.renderer.clear();
		this.renderer.render(this.bloomScene, this.bloomCamera);
	    } else {
		// 降级：如果泛光系统未初始化，直接渲染
		this.renderer.render(this.scene, this.camera);
	    }
	}

	updateConfig(newConfig) {
	    this.config = { ...this.config, ...newConfig };
	    this.log('配置已更新:', this.config);
            
	    if (newConfig.count || newConfig.branches || newConfig.innerColor || newConfig.outerColor) {
		this.destroyParticles();
		this.createParticles();
	    }
	}

	destroyParticles() {
	    if (this.particles) {
		this.scene.remove(this.particles);
		this.particleGeometry.dispose();
		this.particleMaterial.dispose();
		this.log('粒子已销毁');
	    }
	}

	// ═══════════════════════════════════════════════════════════════════════
	// 【效果切换方法】
	// ★★★ 扩展点：添加新效果后，更新 effectConfigs.length 自动生效 ★★★
	// ═══════════════════════════════════════════════════════════════════════
	switchEffect() {
	    this.currentEffect = (this.currentEffect + 1) % this.effectConfigs.length;
	    localStorage.setItem('particle-effect-preference', this.currentEffect);
	    this.createParticles();
	    return this.effectConfigs[this.currentEffect].name;
	}

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

	    // [v6.0] 清理泛光后处理资源
	    if (this.renderTarget) {
		this.renderTarget.dispose();
	    }
	    if (this.bloomTarget) {
		this.bloomTarget.dispose();
	    }
	    if (this.bloomMaterial) {
		this.bloomMaterial.dispose();
	    }

	    /* [OPT-P02] Remove event listeners using bound references */
	    window.removeEventListener('resize', this.boundOnResize);
	    document.removeEventListener('visibilitychange', this.boundOnVisibilityChange);
	    window.removeEventListener('scroll', this.boundOnScroll);
	    window.removeEventListener('mousemove', this.boundOnMouseMove); // [v6.0]
	    if (this.boundOnThemeChange) {
		window.removeEventListener('themeChanged', this.boundOnThemeChange);
	    }

	    if (this.canvas && this.canvas.parentNode) {
		this.canvas.parentNode.removeChild(this.canvas);
	    }

	    this.isInitialized = false;
	    this.log('实例已销毁');
	}

	screenshot() {
	    return this.canvas.toDataURL('image/png');
	}

	getStatus() {
	    return {
		isInitialized: this.isInitialized,
		isAnimating: this.isAnimating,
		particleCount: this.config.count,
		fps: this.renderer ? this.renderer.info.render.frame : 0,
		canvasSize: this.sizes,
		cameraPosition: this.camera ? this.camera.position : null,
	    };
	}
    }
    
    // =====================================================
    // 第二部分：Wiki 增强功能
    // =====================================================
    
    const CONFIG = {
	tocSelector: '#table-of-contents',
	tocLinkSelector: '#table-of-contents a',
	activeClass: 'active',
	scrollOffset: 100,
	debounceDelay: 100,
	defaultSectionLevel: 2,
	enableSectionToggle: true,
	codeBlockDelay: 100,
	transitionDuration: 220,
	scrollBehavior: 'smooth',
	forceTopAlign: true,
	smoothScrollStep: 100,
	zIndex: GLOBAL_CONFIG.zIndex  // ✅ 使用全局 Z-index
    };
    
    // ======== 工具函数 ========
    
    function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
	    const later = () => {
		clearTimeout(timeout);
		func(...args);
	    };
	    clearTimeout(timeout);
	    timeout = setTimeout(later, wait);
	};
    }
    
    function throttle(func, limit) {
	let inThrottle;
	return function(...args) {
	    if (!inThrottle) {
		func.apply(this, args);
		inThrottle = true;
		setTimeout(() => inThrottle = false, limit);
	    }
	};
    }
    
    function scrollToTopAlign(element, offset = CONFIG.scrollOffset) {
	const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
	const targetScrollTop = elementTop - offset;
        
	window.scrollTo({
	    top: targetScrollTop,
	    behavior: CONFIG.scrollBehavior
	});
    }
    
    function forceReflow(element) {
	if (element) {
	    void element.offsetHeight;
	}
    }
    
    function smoothScrollBy(distance) {
	window.scrollBy({
	    top: distance,
	    behavior: 'smooth'
	});
    }
    
    function setZIndex(element, level) {
	if (element && CONFIG.zIndex[level] !== undefined) {
	    element.style.zIndex = CONFIG.zIndex[level];
	}
    }
    
    // ======== 层级控制初始化 ========
    function initSectionLevelControl() {
	let levelAttr = parseInt(document.body.getAttribute('data-section-level') || '', 10);
	const stored = parseInt(localStorage.getItem('org.sectionLevel') || '', 10);
	let cssVar = NaN;
	try {
	    const val = getComputedStyle(document.documentElement)
		  .getPropertyValue('--default-section-level').trim();
	    cssVar = parseInt(val || '', 10);
	} catch (e) {}
	const level = [levelAttr, stored, cssVar, CONFIG.defaultSectionLevel]
	      .find(v => Number.isFinite(v) && v >= 2 && v <= 6);

	if (!document.body.hasAttribute('data-section-level')) {
	    document.body.setAttribute('data-section-level', String(level));
	}

	const hasHasSupport = !!(window.CSS && CSS.supports && 
				 CSS.supports('selector(:has(*))'));
	if (!hasHasSupport) {
	    document.body.classList.add('no-has');
	    updateActivePath();
	    window.addEventListener('hashchange', updateActivePath, { passive: true });
	}

	/* [OPT-P12] Conditional logging */
	if (DEBUG) console.log(`📊 默认显示层级: H${level}${hasHasSupport ? '' : '（JS回退模式）'}`);
    }
    
    // ======== TOC 智能高亮 ========
    function initTOCHighlight() {
	const tocLinks = document.querySelectorAll(CONFIG.tocLinkSelector);
	if (tocLinks.length === 0) return;
        
	function updateActiveLink() {
	    const hash = window.location.hash;
	    const currentLevel = parseInt(
		document.body.getAttribute('data-section-level') || 
		    CONFIG.defaultSectionLevel, 10
	    );

	    tocLinks.forEach(link => {
		link.classList.remove(CONFIG.activeClass);
		link.removeAttribute('aria-current');
	    });

	    let targetHref = hash;
	    const targetEl = hash ? document.querySelector(hash) : null;
	    if (targetEl) {
		const tag = targetEl.tagName || '';
		const lvl = tag.startsWith('H') ? parseInt(tag.slice(1), 10) : NaN;
		if (Number.isFinite(lvl) && lvl !== currentLevel) {
		    const container = getContainerForLevelFromHeading(targetEl, currentLevel);
		    if (container) {
			const heading = container.querySelector(`h${currentLevel}`);
			if (heading && heading.id) targetHref = `#${heading.id}`;
		    }
		}
	    }

	    if (targetHref) {
		const match = Array.from(tocLinks).find(a => 
		    a.getAttribute('href') === targetHref
		);
		if (match) {
		    match.classList.add(CONFIG.activeClass);
		    match.setAttribute('aria-current', 'true');
		    const toc = document.querySelector(CONFIG.tocSelector);
		    if (toc && match.offsetParent) {
			match.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		    }
		}
	    } else {
		const firstLink = tocLinks[0];
		if (firstLink) {
		    firstLink.classList.add(CONFIG.activeClass);
		    firstLink.setAttribute('aria-current', 'true');
		}
	    }
	}
        
	window.addEventListener('hashchange', updateActiveLink);
	updateActiveLink();
        
	if (DEBUG) console.log('✅ TOC高亮已启用（基于URL hash）');
    }
    
    // ======== 平滑滚动 ========
    function initSmoothScroll() {
	if (!CONFIG.enableSectionToggle) {
	    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
		anchor.addEventListener('click', function(e) {
		    const targetId = this.getAttribute('href');
		    if (!targetId || targetId === '#') return;
                    
		    const targetElement = document.querySelector(targetId);
		    if (targetElement) {
			e.preventDefault();
			scrollToTopAlign(targetElement, CONFIG.scrollOffset);
                        
			if (history.pushState) {
			    history.pushState(null, null, targetId);
			}
                        
			targetElement.setAttribute('tabindex', '-1');
			targetElement.focus();
		    }
		});
	    });
	} else {
	    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
		anchor.addEventListener('click', async function(e) {
		    const targetId = this.getAttribute('href');
		    if (!targetId || targetId === '#') return;
                    
		    const targetElement = document.querySelector(targetId);
		    if (!targetElement) return;
                    
		    e.preventDefault();
                    
		    if (window.location.hash) {
			history.replaceState(null, null, window.location.pathname + window.location.search);
			await new Promise(resolve => requestAnimationFrame(resolve));
		    }
                    
		    window.location.hash = targetId;
		    forceReflow(document.body);
                    
		    await new Promise(resolve => setTimeout(resolve, CONFIG.transitionDuration + 130));
		    await new Promise(resolve => requestAnimationFrame(() => {
			requestAnimationFrame(resolve);
		    }));
                    
		    scrollToTopAlign(targetElement, CONFIG.scrollOffset);
                    
		    setTimeout(() => {
			targetElement.setAttribute('tabindex', '-1');
			targetElement.focus({ preventScroll: true });
		    }, 400);
		});
	    });
	}
        
	if (DEBUG) console.log(`✅ 平滑滚动已启用（${CONFIG.enableSectionToggle ? 'CSS切换优化模式' : '传统模式'}）`);
    }
    
    // ======== 返回顶部按钮 ========
    function initBackToTop() {
	const button = document.createElement('button');
	button.innerHTML = '↑';
	button.className = 'back-to-top';
	button.setAttribute('aria-label', '返回顶部');
	button.setAttribute('title', '返回顶部');
	document.body.appendChild(button);
        
	setZIndex(button, 'dropdown');
        
	const style = document.createElement('style');
	style.textContent = `
.back-to-top {
position: fixed;
bottom: 1rem;
right: 1rem;
width: 48px;
height: 48px;
border-radius: 50%;
background: linear-gradient(135deg, #66D9EF 0%, #AE81FF 100%);
color: #272822;
border: none;
font-size: 1.5rem;
font-weight: bold;
cursor: pointer;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
opacity: 0;
transform: translateY(100px);
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
z-index: ${CONFIG.zIndex.dropdown};
pointer-events: none;
}
.back-to-top.visible {
opacity: 1;
transform: translateY(0);
pointer-events: all;
}
.back-to-top:hover {
transform: translateY(-4px) scale(1.05);
box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6);
z-index: ${CONFIG.zIndex.dropdown + 1};
}
.back-to-top:active {
transform: translateY(-2px) scale(0.95);
}
@media screen and (max-width: 768px) {
.back-to-top {
bottom: 1rem;
right: 1rem;
width: 40px;
height: 40px;
font-size: 1.25rem;
}
}
`;
	document.head.appendChild(style);
        
	const toggleButton = throttle(() => {
	    if (window.scrollY > 300) {
		button.classList.add('visible');
	    } else {
		button.classList.remove('visible');
	    }
	}, 100);
        
	window.addEventListener('scroll', toggleButton, { passive: true });
	toggleButton();
        
	button.addEventListener('click', () => {
	    if (CONFIG.enableSectionToggle) {
		history.pushState("", document.title, 
				  window.location.pathname + window.location.search);
		window.dispatchEvent(new HashChangeEvent('hashchange'));
	    }
            
	    window.scrollTo({
		top: 0,
		behavior: 'smooth'
	    });
            
	    const title = document.querySelector('h1, .title');
	    if (title) {
		title.setAttribute('tabindex', '-1');
		title.focus();
	    }
	});
        
	if (DEBUG) console.log('✅ 返回顶部按钮已加载');
    }
    
    // ======== TOC 移动端折叠功能 ========
    function initTOCToggle() {
	if (window.innerWidth > 768) return;
        
	const toc = document.querySelector(CONFIG.tocSelector);
	if (!toc) return;
        
	const title = toc.querySelector('h2, .title');
	if (!title) return;
        
	const content = toc.querySelector('div, nav');
	if (!content) return;
        
	title.style.cursor = 'pointer';
	title.style.userSelect = 'none';
	title.setAttribute('aria-expanded', 'true');
	title.setAttribute('role', 'button');
	title.setAttribute('tabindex', '0');
        
	const icon = document.createElement('span');
	icon.textContent = ' ▼';
	icon.style.fontSize = '0.8em';
	icon.style.marginLeft = '0.5rem';
	icon.style.transition = 'transform 0.3s ease';
	title.appendChild(icon);
        
	function toggleTOC() {
	    const isExpanded = title.getAttribute('aria-expanded') === 'true';
	    title.setAttribute('aria-expanded', !isExpanded);
            
	    if (isExpanded) {
		content.style.display = 'none';
		icon.style.transform = 'rotate(-90deg)';
	    } else {
		content.style.display = 'block';
		icon.style.transform = 'rotate(0deg)';
	    }
	}
        
	title.addEventListener('click', toggleTOC);
	title.addEventListener('keydown', (e) => {
	    if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault();
		toggleTOC();
	    }
	});
        
	if (DEBUG) console.log('✅ TOC移动端折叠已启用');
    }
    
    // ======== 外部链接新窗口打开 ========
    function initExternalLinks() {
	document.querySelectorAll('a[href^="http"]').forEach(link => {
	    try {
		const url = new URL(link.href);
		if (url.hostname !== window.location.hostname) {
		    link.setAttribute('target', '_blank');
		    link.setAttribute('rel', 'noopener noreferrer');
                    
		    if (!link.querySelector('.external-icon')) {
			const icon = document.createElement('span');
			icon.className = 'external-icon';
			icon.innerHTML = ' ↗';
			icon.style.fontSize = '0.8em';
			icon.style.opacity = '0.6';
			link.appendChild(icon);
		    }
		}
	    } catch (e) {
		// 忽略无效 URL
	    }
	});
    }
    
    // ======== 图片懒加载 ========
    function initLazyLoading() {
	if ('IntersectionObserver' in window) {
	    const imageObserver = new IntersectionObserver((entries, observer) => {
		entries.forEach(entry => {
		    if (entry.isIntersecting) {
			const img = entry.target;
			if (img.dataset.src) {
			    img.src = img.dataset.src;
			    img.removeAttribute('data-src');
			}
			observer.unobserve(img);
		    }
		});
	    });
            
	    document.querySelectorAll('img[data-src]').forEach(img => {
		imageObserver.observe(img);
	    });
	}
    }
    
    // ======== 表格响应式包装 ========
    function initResponsiveTables() {
	document.querySelectorAll('table').forEach(table => {
	    if (!table.parentElement.classList.contains('table-wrapper')) {
		const wrapper = document.createElement('div');
		wrapper.className = 'table-wrapper';
		wrapper.style.overflowX = 'auto';
		table.parentNode.insertBefore(wrapper, table);
		wrapper.appendChild(table);
	    }
	});
    }
    
    // ======== 导航辅助函数 ========
    
    function getVisibleHeadings() {
	const level = parseInt(document.body.getAttribute('data-section-level') || '2', 10);
	return Array.from(document.querySelectorAll(`h${level}[id]`));
    }
    
    function getCurrentHeading() {
	const hash = window.location.hash;
	if (!hash) return null;
	return document.querySelector(hash);
    }
    
    function getSiblingHeading(direction) {
	const headings = getVisibleHeadings();
	if (headings.length === 0) return null;
        
	const current = getCurrentHeading();
	if (!current) {
	    return direction === 'next' ? headings[0] : headings[headings.length - 1];
	}
        
	const currentIndex = headings.findIndex(h => h === current);
	if (currentIndex === -1) return null;
        
	if (direction === 'next') {
	    return currentIndex < headings.length - 1 ? headings[currentIndex + 1] : null;
	} else {
	    return currentIndex > 0 ? headings[currentIndex - 1] : null;
	}
    }
    
    function getParentSiblingHeading(direction) {
	const level = parseInt(document.body.getAttribute('data-section-level') || '2', 10);
	if (level <= 2) {
	    return getSiblingHeading(direction);
	}
        
	const current = getCurrentHeading();
	if (!current) return null;
        
	const parentLevel = level - 1;
	const parentContainer = current.closest(`.outline-${parentLevel}`);
	if (!parentContainer) return getSiblingHeading(direction);
        
	const parentHeading = parentContainer.querySelector(`h${parentLevel}[id]`);
	if (!parentHeading) return null;
        
	const allParentHeadings = Array.from(document.querySelectorAll(`h${parentLevel}[id]`));
	const parentIndex = allParentHeadings.findIndex(h => h === parentHeading);
        
	if (parentIndex === -1) return null;
        
	if (direction === 'next') {
	    return parentIndex < allParentHeadings.length - 1 ? 
		allParentHeadings[parentIndex + 1] : null;
	} else {
	    return parentIndex > 0 ? allParentHeadings[parentIndex - 1] : null;
	}
    }
    
    // ======== 全局搜索功能 ========
    function initGlobalSearch() {
	const searchOverlay = document.createElement('div');
	searchOverlay.id = 'global-search-overlay';
	searchOverlay.innerHTML = `
<div class="search-container">
<div class="search-header">
<input type="text" id="search-input" placeholder="搜索内容..." autocomplete="off">
<button id="search-close" aria-label="关闭搜索">✕</button>
</div>
<div id="search-results"></div>
<div class="search-footer">
<kbd>↑↓</kbd> 导航 | <kbd>Enter</kbd> 跳转 | <kbd>Esc</kbd> 关闭
</div>
</div>
`;
	document.body.appendChild(searchOverlay);
        
	setZIndex(searchOverlay, 'modal');
        
	const style = document.createElement('style');
	style.textContent = `
#global-search-overlay {
display: none;
position: fixed;
top: 0;
left: 0;
width: 100%;
height: 100%;
background: rgba(39, 40, 34, 0.95);
z-index: ${CONFIG.zIndex.modal};
backdrop-filter: blur(8px);
}
#global-search-overlay.active {
display: flex;
align-items: flex-start;
justify-content: center;
padding-top: 10vh;
}
.search-container {
background: #1e1f1c;
border: 1px solid #75715e;
border-radius: 8px;
width: 90%;
max-width: 600px;
max-height: 70vh;
display: flex;
flex-direction: column;
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
position: relative;
z-index: ${CONFIG.zIndex.modal + 1};
}
.search-header {
display: flex;
padding: 1rem;
border-bottom: 1px solid #75715e;
}
#search-input {
flex: 1;
background: #272822;
border: 1px solid #75715e;
border-radius: 4px;
color: #f8f8f2;
padding: 0.5rem 1rem;
font-size: 1rem;
outline: none;
}
#search-input:focus {
border-color: #66d9ef;
box-shadow: 0 0 0 2px rgba(102, 217, 239, 0.2);
}
#search-close {
background: transparent;
border: none;
color: #f8f8f2;
font-size: 1.5rem;
cursor: pointer;
padding: 0 0.5rem;
margin-left: 0.5rem;
opacity: 0.7;
transition: opacity 0.2s;
}
#search-close:hover {
opacity: 1;
}
#search-results {
flex: 1;
overflow-y: auto;
padding: 0.5rem;
}
.search-result-item {
padding: 0.75rem 1rem;
margin: 0.25rem 0;
background: #272822;
border: 1px solid transparent;
border-radius: 4px;
cursor: pointer;
transition: all 0.2s;
}
.search-result-item:hover,
.search-result-item.selected {
border-color: #66d9ef;
background: #2d2e27;
z-index: 1;
}
.search-result-title {
color: #66d9ef;
font-weight: bold;
margin-bottom: 0.25rem;
}
.search-result-excerpt {
color: #f8f8f2;
font-size: 0.875rem;
line-height: 1.5;
}
.search-result-excerpt mark {
background: #f92672;
color: #f8f8f2;
padding: 0 2px;
border-radius: 2px;
}
.search-footer {
padding: 0.75rem 1rem;
border-top: 1px solid #75715e;
color: #75715e;
font-size: 0.875rem;
text-align: center;
}
.search-footer kbd {
background: #272822;
border: 1px solid #75715e;
border-radius: 3px;
padding: 2px 6px;
font-size: 0.75rem;
margin: 0 2px;
}
.no-results {
text-align: center;
padding: 2rem;
color: #75715e;
}
`;
	document.head.appendChild(style);
        
	const input = document.getElementById('search-input');
	const results = document.getElementById('search-results');
	const closeBtn = document.getElementById('search-close');
        
	let selectedIndex = -1;
	let searchResults = [];
        
	function performSearch(query) {
	    if (!query.trim()) {
		results.innerHTML = '';
		return;
	    }
            
	    searchResults = [];
	    const lowerQuery = query.toLowerCase();
            
	    document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li').forEach(el => {
		const text = el.textContent || '';
		const lowerText = text.toLowerCase();
                
		if (lowerText.includes(lowerQuery)) {
		    let heading = el;
		    if (!el.tagName.match(/^H[1-6]$/)) {
			heading = el.closest('[id]') || el.previousElementSibling;
			while (heading && !heading.tagName.match(/^H[1-6]$/)) {
			    heading = heading.previousElementSibling;
			}
		    }
                    
		    if (heading && heading.id) {
			const index = lowerText.indexOf(lowerQuery);
			const start = Math.max(0, index - 50);
			const end = Math.min(text.length, index + query.length + 50);
			let excerpt = text.substring(start, end);

			if (start > 0) excerpt = '...' + excerpt;
			if (end < text.length) excerpt = excerpt + '...';

			/* [OPT-P04] Escape user input before creating regex to prevent XSS */
			const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const regex = new RegExp(`(${escapedQuery})`, 'gi');
			// Escape the excerpt first, then add mark tags
			excerpt = escapeHtml(excerpt).replace(regex, '<mark>$1</mark>');

			searchResults.push({
			    id: heading.id,
			    title: escapeHtml(heading.textContent),
			    excerpt: excerpt
			});
		    }
		}
	    });
            
	    const uniqueResults = [];
	    const seen = new Set();
	    searchResults.forEach(result => {
		if (!seen.has(result.id)) {
		    seen.add(result.id);
		    uniqueResults.push(result);
		}
	    });
	    searchResults = uniqueResults;
            
	    if (searchResults.length === 0) {
		results.innerHTML = '<div class="no-results">未找到匹配结果</div>';
	    } else {
		results.innerHTML = searchResults.map((result, index) => `
<div class="search-result-item" data-index="${index}">
<div class="search-result-title">${result.title}</div>
<div class="search-result-excerpt">${result.excerpt}</div>
</div>
`).join('');
                
		results.querySelectorAll('.search-result-item').forEach(item => {
		    item.addEventListener('click', () => {
			const index = parseInt(item.dataset.index);
			jumpToResult(index);
		    });
		});
	    }
            
	    selectedIndex = -1;
	}
        
	function jumpToResult(index) {
	    if (index >= 0 && index < searchResults.length) {
		const result = searchResults[index];
		closeSearch();
                
		setTimeout(() => {
		    window.PalantirWiki.scrollToElement(`#${result.id}`);
		}, 100);
	    }
	}
        
	function updateSelection() {
	    results.querySelectorAll('.search-result-item').forEach((item, index) => {
		if (index === selectedIndex) {
		    item.classList.add('selected');
		    item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		} else {
		    item.classList.remove('selected');
		}
	    });
	}
        
	function openSearch() {
	    searchOverlay.classList.add('active');
	    input.value = '';
	    input.focus();
	    results.innerHTML = '';
	    selectedIndex = -1;
	    searchResults = [];
	}
        
	function closeSearch() {
	    searchOverlay.classList.remove('active');
	}
        
	input.addEventListener('input', debounce((e) => {
	    performSearch(e.target.value);
	}, 300));
        
	input.addEventListener('keydown', (e) => {
	    if (e.key === 'ArrowDown') {
		e.preventDefault();
		if (selectedIndex < searchResults.length - 1) {
		    selectedIndex++;
		    updateSelection();
		}
	    } else if (e.key === 'ArrowUp') {
		e.preventDefault();
		if (selectedIndex > 0) {
		    selectedIndex--;
		    updateSelection();
		}
	    } else if (e.key === 'Enter') {
		e.preventDefault();
		if (selectedIndex >= 0) {
		    jumpToResult(selectedIndex);
		} else if (searchResults.length > 0) {
		    jumpToResult(0);
		}
	    } else if (e.key === 'Escape') {
		closeSearch();
	    }
	});
        
	closeBtn.addEventListener('click', closeSearch);
	searchOverlay.addEventListener('click', (e) => {
	    if (e.target === searchOverlay) {
		closeSearch();
	    }
	});
        
	window.PalantirWiki.openSearch = openSearch;
	window.PalantirWiki.closeSearch = closeSearch;
        
	if (DEBUG) console.log('✅ 全局搜索已启用（Alt+O）');
    }
    
    // ======== 键盘快捷键 ========
    function initKeyboardShortcuts() {
	// Track 'g' key presses for 'gg' shortcut
	let lastGTime = 0;
	const GG_TIMEOUT = 500; // milliseconds

	// Helper function to get all H2 headings
	function getAllH2Headings() {
	    // 获取所有有ID的H2标题
	    const h2s = Array.from(document.querySelectorAll('h2[id]'));
	    if (DEBUG) console.log('📚 找到', h2s.length, '个H2标题');
	    return h2s;
	}

	// Helper function to find current or nearest H2
	function getCurrentH2() {
	    const scrollPos = window.scrollY + 150; // Offset for header
	    const h2s = getAllH2Headings();

	    if (h2s.length === 0) {
		if (DEBUG) console.log('⚠️ 没有找到H2标题');
		return -1;
	    }

	    // 从后往前找，找到第一个在当前滚动位置上方的H2
	    for (let i = h2s.length - 1; i >= 0; i--) {
		const h2Top = h2s[i].getBoundingClientRect().top + window.scrollY;
		if (h2Top <= scrollPos) {
		    if (DEBUG) console.log('📍 当前在H2索引:', i, '-', h2s[i].textContent.trim().substring(0, 30));
		    return i;
		}
	    }

	    // 如果没有找到，说明在第一个H2之前，返回-1
	    if (DEBUG) console.log('📍 当前位置在第一个H2之前，返回0');
	    return 0; // 返回第一个H2的索引
	}

	// Helper function to scroll to H2
	function scrollToH2(heading) {
	    if (heading) {
		if (DEBUG) console.log('🎯 滚动到:', heading.textContent.trim().substring(0, 50));
		heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
		// 可选：更新URL hash（如果需要）
		if (heading.id) {
		    window.history.pushState(null, '', '#' + heading.id);
		}
		// ✅ 新增：自动聚焦headline，使TAB键可以立即折叠/展开
		setTimeout(function() {
		    heading.focus();
		}, 300); // 等待滚动动画完成后聚焦
	    } else {
		if (DEBUG) console.log('⚠️ scrollToH2: heading为空');
	    }
	}

	document.addEventListener('keydown', (e) => {
	    // Toggle TOC with 't' key (not Alt+t)
	    if (e.key === 't' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
		// Check if we're not in an input field
		const activeElement = document.activeElement;
		if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
		    return; // Don't toggle if typing in input
		}
		e.preventDefault();
		document.body.classList.toggle('toc-hidden');
		if (DEBUG) console.log('TOC toggled');
	    }

	    // 'gg' - Scroll to top (double-g within 500ms)
	    if (e.key === 'g' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
		const activeElement = document.activeElement;
		if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
		    return;
		}

		const now = Date.now();
		if (now - lastGTime < GG_TIMEOUT) {
		    e.preventDefault();
		    window.scrollTo({ top: 0, behavior: 'smooth' });
		    lastGTime = 0;
		    if (DEBUG) console.log('gg - Scroll to top');
		} else {
		    lastGTime = now;
		}
	    }

	    // 'G' - Scroll to bottom (Shift+g)
	    if (e.key === 'G' && !e.altKey && !e.ctrlKey && !e.metaKey && e.shiftKey) {
		const activeElement = document.activeElement;
		if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
		    return;
		}
		e.preventDefault();
		window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
		if (DEBUG) console.log('G - Scroll to bottom');
	    }

	    // [FIX-V3] Vim风格导航快捷键

	    // j - 向下翻页
	    if (!e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'j') {
		// 避免在输入框中触发
		if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
		e.preventDefault();
		smoothScrollBy(CONFIG.smoothScrollStep);
		if (DEBUG) console.log('j - Scroll down');
	    }

	    // k - 向上翻页
	    if (!e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'k') {
		// 避免在输入框中触发
		if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
		e.preventDefault();
		smoothScrollBy(-CONFIG.smoothScrollStep);
		if (DEBUG) console.log('k - Scroll up');
	    }

	    // n - 下一节(下一个H2)
	    if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key === 'n') {
		// 避免在输入框中触发
		const activeEl = document.activeElement;
		if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
		    return;
		}
		e.preventDefault();
		console.log('🔍 n键被按下，开始查找H2标题...');
		const h2s = getAllH2Headings();
		const currentIndex = getCurrentH2();
		console.log('当前索引:', currentIndex, '总H2数:', h2s.length);
		if (currentIndex >= 0 && currentIndex < h2s.length - 1) {
		    scrollToH2(h2s[currentIndex + 1]);
		    console.log('✅ n - 跳转到下一节 (H2)');
		} else if (currentIndex < 0 && h2s.length > 0) {
		    // 如果在第一个H2之前，跳到第一个H2
		    scrollToH2(h2s[0]);
		    console.log('✅ n - 跳转到第一节 (H2)');
		} else {
		    console.log('💡 已经在最后一个H2了');
		}
	    }

	    // p - 上一节(上一个H2)
	    if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key === 'p') {
		// 避免在输入框中触发
		const activeEl = document.activeElement;
		if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
		    return;
		}
		e.preventDefault();
		console.log('🔍 p键被按下，开始查找H2标题...');
		const h2s = getAllH2Headings();
		const currentIndex = getCurrentH2();
		console.log('当前索引:', currentIndex, '总H2数:', h2s.length);
		if (currentIndex > 0) {
		    scrollToH2(h2s[currentIndex - 1]);
		    console.log('✅ p - 跳转到上一节 (H2)');
		} else if (currentIndex === 0) {
		    console.log('💡 已经在第一个H2了');
		} else {
		    // 如果返回-1，也跳到第一个
		    if (h2s.length > 0) {
			scrollToH2(h2s[0]);
			console.log('✅ p - 跳转到第一节 (H2)');
		    }
		}
	    }

	    // Keep existing shortcuts
	    if (e.altKey && e.key === 't') {
		e.preventDefault();
		window.scrollTo({ top: 0, behavior: 'smooth' });
	    }

	    if (e.altKey && e.key === 'b') {
		e.preventDefault();
		smoothScrollBy(-CONFIG.smoothScrollStep);
	    }

	    if (e.altKey && e.key === 'f') {
		e.preventDefault();
		smoothScrollBy(CONFIG.smoothScrollStep);
	    }

	    if (e.altKey && e.key === 'h') {
		e.preventDefault();
		const prev = getParentSiblingHeading('prev');
		if (prev && prev.id) {
		    window.PalantirWiki.scrollToElement(`#${prev.id}`);
		} else {
		    if (DEBUG) console.log('💡 已经是第一个父级节点');
		}
	    }

	    if (e.altKey && e.key === 'l') {
		e.preventDefault();
		const next = getParentSiblingHeading('next');
		if (next && next.id) {
		    window.PalantirWiki.scrollToElement(`#${next.id}`);
		} else {
		    if (DEBUG) console.log('💡 已经是最后一个父级节点');
		}
	    }

	    if (e.altKey && e.key === 'o') {
		e.preventDefault();
		window.PalantirWiki.openSearch();
	    }

	    if (e.altKey && e.key === 'c') {
		e.preventDefault();
		const tocTitle = document.querySelector('#table-of-contents h2, #table-of-contents .title');
		if (tocTitle) {
		    tocTitle.click();
		}
	    }
	});

	if (DEBUG) {
	    console.log('✅ 键盘快捷键已启用');
	    console.log('   t: Toggle TOC');
	    console.log('   gg: Scroll to top');
	    console.log('   G: Scroll to bottom');
	    console.log('   Alt+J/K: Next/Previous H2 heading');
	    console.log('   Alt+T: 返回顶部');
	    console.log('   Alt+B/F: 缓慢向上/下滚动');
	    console.log('   Alt+H/L: 上/下父级节点');
	    console.log('   Alt+O: 全局搜索');
	    console.log('   Alt+C: TOC折叠');
	}
    }
    
    // ======== 打印优化 ========
    function initPrintOptimization() {
	window.addEventListener('beforeprint', () => {
	    const toc = document.querySelector('#table-of-contents');
	    if (toc) {
		const content = toc.querySelector('div, nav');
		if (content) {
		    content.style.display = 'block';
		}
	    }
	});
    }
    
    // ======== 性能监控 ========
    function initPerformanceMonitoring() {
	if ('PerformanceObserver' in window) {
	    try {
		const observer = new PerformanceObserver((list) => {
		    for (const entry of list.getEntries()) {
			if (entry.duration > 50) {
			    console.warn('⚠️ 长任务检测:', entry);
			}
		    }
		});
		observer.observe({ entryTypes: ['longtask'] });
	    } catch (e) {
		// 某些浏览器可能不支持
	    }
	}
    }
    
    // ======== Z-index 检查与修复 ========
    function validateZIndexes() {
	const checks = [
	    { selector: '#table-of-contents', expected: CONFIG.zIndex.fixed, name: 'TOC' },
	    { selector: '.back-to-top', expected: CONFIG.zIndex.dropdown, name: '返回顶部按钮' },
	    { selector: '#global-search-overlay', expected: CONFIG.zIndex.modal, name: '搜索覆盖层' },
	    { selector: '.webgl-particles-bg', expected: CONFIG.zIndex.particleBg, name: '粒子背景' }
	];
        
	checks.forEach(({ selector, expected, name }) => {
	    const element = document.querySelector(selector);
	    if (element) {
		const computed = window.getComputedStyle(element).zIndex;
		const actual = parseInt(computed, 10);
		if (actual !== expected && computed !== 'auto') {
		    console.warn(`⚠️ ${name} z-index 不匹配: 期望 ${expected}, 实际 ${actual}`);
		}
	    }
	});
        
	if (DEBUG) console.log('✅ Z-index 层级检查完成');
    }
    
    // ======== 工具函数 ========
    function getHeadingLevel(el) {
	if (!el || !el.tagName) return NaN;
	const t = el.tagName.toUpperCase();
	return t[0] === 'H' ? parseInt(t.slice(1), 10) : NaN;
    }
    
    function getContainerForLevelFromHeading(heading, level) {
	if (!heading || !Number.isFinite(level)) return null;
	const currentLevel = getHeadingLevel(heading);
	if (!Number.isFinite(currentLevel)) return null;
	if (currentLevel === level) {
	    return heading.closest(`.outline-${level}`);
	} else if (currentLevel > level) {
	    return heading.closest(`.outline-${level}`);
	} else {
	    const base = heading.closest(`.outline-${currentLevel}`);
	    if (!base) return null;
	    return base.querySelector(`.outline-${level}`);
	}
    }
    
    function updateActivePath() {
	const outlines = document.querySelectorAll('.outline-2, .outline-3, .outline-4, .outline-5, .outline-6');
	outlines.forEach(el => el.removeAttribute('data-active'));

	const level = parseInt(document.body.getAttribute('data-section-level') || '2', 10);
	const hash = window.location.hash;
	let heading = hash ? document.querySelector(hash) : null;

	if (!heading) {
	    let c2 = document.querySelector('.outline-2:first-of-type');
	    if (!c2) return;
	    let targetContainer = c2;
	    if (level >= 3) {
		const c3 = c2.querySelector('.outline-3:first-of-type');
		if (c3) targetContainer = c3;
		if (level >= 4) {
		    const c4 = c3 ? c3.querySelector('.outline-4:first-of-type') : null;
		    if (c4) targetContainer = c4;
		    if (level >= 5) {
			const c5 = c4 ? c4.querySelector('.outline-5:first-of-type') : null;
			if (c5) targetContainer = c5;
			if (level >= 6) {
			    const c6 = c5 ? c5.querySelector('.outline-6:first-of-type') : null;
			    if (c6) targetContainer = c6;
			}
		    }
		}
	    }
	    const root2 = targetContainer.closest('.outline-2') || targetContainer;
	    if (root2) root2.setAttribute('data-active', 'true');
	    for (let l = 3; l <= level; l++) {
		const anc = targetContainer.closest(`.outline-${l}`);
		if (anc) anc.setAttribute('data-active', 'true');
	    }
	    targetContainer.setAttribute('data-active', 'true');
	    targetContainer.querySelectorAll('.outline-3, .outline-4, .outline-5, .outline-6').forEach(el => el.setAttribute('data-active', 'true'));
	    return;
	}

	const container = getContainerForLevelFromHeading(heading, level);
	if (!container) return;
	const root = container.closest('.outline-2') || container;
	if (root) root.setAttribute('data-active', 'true');
	for (let l = 3; l <= level; l++) {
	    const anc = container.closest(`.outline-${l}`);
	    if (anc) anc.setAttribute('data-active', 'true');
	}
	container.setAttribute('data-active', 'true');
	container.querySelectorAll('.outline-3, .outline-4, .outline-5, .outline-6').forEach(el => el.setAttribute('data-active', 'true'));
    }

    // ======== 统一初始化入口 ========
    function initAll() {
	if (document.readyState === 'loading') {
	    document.addEventListener('DOMContentLoaded', initAll);
	    return;
	}

	if (DEBUG) console.log('🚀 Palantir Wiki 完整增强包 v2.6.0 初始化中...');

	try {
	    // 0️⃣ Initialize Theme Manager (always runs first)
	    ThemeManager.init();

	    // 1️⃣ 初始化粒子背景（如果启用）
	    if (GLOBAL_CONFIG.enableParticles) {
		globalLog('初始化粒子背景...');
		window.particleBackground = new OrgParticlesBackground();
		window.particleBackground.init();
	    }

	    // 2️⃣ 初始化 Wiki 增强功能（如果启用）
	    if (GLOBAL_CONFIG.enableWikiEnhance) {
		globalLog('初始化 Wiki 增强功能...');
                
		initSectionLevelControl();
                
		const toc = document.querySelector(CONFIG.tocSelector);
		if (toc) {
		    initTOCHighlight();
		    initTOCToggle();
		}
                
		initSmoothScroll();
		initBackToTop();
		
		/* [FIX-V2] 移除 initCodeCopy() - 现在由更高级的脚本统一处理 */
		
		initGlobalSearch();
		initExternalLinks();
		initResponsiveTables();
		initLazyLoading();
		initKeyboardShortcuts();
		initPrintOptimization();
                
		setTimeout(validateZIndexes, 500);
                
		if (window.location.hostname === 'localhost' || 
		    window.location.hostname === '127.0.0.1') {
		    initPerformanceMonitoring();
		}
	    }
            
	    console.log('✨ Palantir Wiki 完整增强包 v2.6.0 初始化完成');
            
	    const event = new CustomEvent('palantir-wiki-ready', {
		detail: { 
		    version: '2.6.0',
		    particlesEnabled: GLOBAL_CONFIG.enableParticles,
		    wikiEnhanceEnabled: GLOBAL_CONFIG.enableWikiEnhance,
		    sectionLevel: document.body.getAttribute('data-section-level'),
		    zIndexConfig: GLOBAL_CONFIG.zIndex
		}
	    });
	    document.dispatchEvent(event);
            
	} catch (error) {
	    console.error('❌ Palantir Wiki 初始化失败:', error);
	}
    }
    
    // ======== 启动 ========
    initAll();
    
    // ======== 导出统一API ========
    window.PalantirWiki = {
	version: '2.6.0',
	config: { ...GLOBAL_CONFIG, ...CONFIG },

	// Theme control
	theme: {
	    toggle: () => ThemeManager.toggleTheme(),
	    set: (theme) => ThemeManager.setTheme(theme),
	    get: () => document.documentElement.getAttribute('data-theme') || 'dark'
	},

	// 粒子背景控制
	particles: {
	    get instance() { return window.particleBackground; },
	    toggle: (enable) => {
		if (enable && !window.particleBackground) {
		    window.particleBackground = new OrgParticlesBackground();
		    window.particleBackground.init();
		} else if (!enable && window.particleBackground) {
		    window.particleBackground.destroy();
		    window.particleBackground = null;
		}
	    },
	    updateConfig: (config) => {
		if (window.particleBackground) {
		    window.particleBackground.updateConfig(config);
		}
	    }
	},
        
	// Wiki 功能 API
	setZIndex: setZIndex,
	getZIndex: (level) => CONFIG.zIndex[level],
        
	refreshTOC: initTOCHighlight,
        
	scrollToTop: () => {
	    if (CONFIG.enableSectionToggle) {
		history.pushState("", document.title, window.location.pathname);
		window.dispatchEvent(new HashChangeEvent('hashchange'));
	    }
	    window.scrollTo({ top: 0, behavior: 'smooth' });
	},
        
	scrollToBottom: () => window.scrollTo({ 
	    top: document.documentElement.scrollHeight, 
	    behavior: 'smooth' 
	}),
        
	scrollToElement: async (selector) => {
	    const element = typeof selector === 'string' ? 
		  document.querySelector(selector) : selector;
	    if (!element) {
		console.error('❌ 元素不存在:', selector);
		return false;
	    }
            
	    if (element.id && /^H[2-6]$/i.test(element.tagName)) {
		if (window.location.hash) {
		    history.replaceState(null, null, window.location.pathname + window.location.search);
		    await new Promise(resolve => requestAnimationFrame(resolve));
		}
                
		window.location.hash = element.id;
		forceReflow(document.body);
                
		await new Promise(resolve => setTimeout(resolve, CONFIG.transitionDuration + 130));
		await new Promise(resolve => requestAnimationFrame(() => {
		    requestAnimationFrame(resolve);
		}));
	    }
            
	    scrollToTopAlign(element, CONFIG.scrollOffset);
            
	    setTimeout(() => {
		element.setAttribute('tabindex', '-1');
		element.focus({ preventScroll: true });
	    }, 400);
            
	    return true;
	},
        
	setSectionLevel: (level) => {
	    if (!(level >= 2 && level <= 6)) {
		console.error('❌ 层级必须在2-6之间');
		return false;
	    }
	    document.body.setAttribute('data-section-level', String(level));
	    try { localStorage.setItem('org.sectionLevel', String(level)); } catch (e) {}

	    const hash = window.location.hash;
	    if (hash) {
		const target = document.querySelector(hash);
		if (target) {
		    const container = getContainerForLevelFromHeading(target, level);
		    if (container) {
			const heading = container.querySelector(`h${level}`);
			if (heading && heading.id) {
			    if (heading.id !== target.id) {
				location.hash = `#${heading.id}`;
			    }
			}
		    }
		}
	    }

	    if (document.body.classList.contains('no-has')) {
		updateActivePath();
	    }

	    console.log(`📊 层级已设置为: H${level}`);
	    return true;
	},
        
	getSectionLevel: () => {
	    const attr = parseInt(document.body.getAttribute('data-section-level') || '', 10);
	    if (Number.isFinite(attr)) return attr;
	    try { 
		const stored = parseInt(localStorage.getItem('org.sectionLevel') || '', 10); 
		if (Number.isFinite(stored)) return stored; 
	    } catch (e) {}
	    return CONFIG.defaultSectionLevel;
	},
        
	toggleSectionMode: (enable) => {
	    CONFIG.enableSectionToggle = enable;
	    console.log(`${enable ? '✅' : '❌'} 单页章节切换已${enable ? '启用' : '禁用'}`);
	},
        
	setScrollOffset: (offset) => {
	    if (typeof offset === 'number' && offset >= 0) {
		CONFIG.scrollOffset = offset;
		console.log(`📏 滚动偏移量已设置为: ${offset}px`);
		return true;
	    }
	    console.error('❌ 偏移量必须为非负数');
	    return false;
	},
        
	setScrollStep: (step) => {
	    if (typeof step === 'number' && step > 0) {
		CONFIG.smoothScrollStep = step;
		console.log(`📏 平滑滚动步长已设置为: ${step}px`);
		return true;
	    }
	    console.error('❌ 步长必须为正数');
	    return false;
	},
        
	repositionCurrent: async () => {
	    const hash = window.location.hash;
	    if (!hash) return false;
            
	    const element = document.querySelector(hash);
	    if (!element) return false;
            
	    await new Promise(resolve => setTimeout(resolve, CONFIG.transitionDuration + 130));
	    await new Promise(resolve => requestAnimationFrame(() => {
		requestAnimationFrame(resolve);
	    }));
            
	    scrollToTopAlign(element, CONFIG.scrollOffset);
	    return true;
	},
        
	nextSibling: () => {
	    const next = getSiblingHeading('next');
	    if (next && next.id) {
		window.PalantirWiki.scrollToElement(`#${next.id}`);
		return true;
	    }
	    return false;
	},
        
	prevSibling: () => {
	    const prev = getSiblingHeading('prev');
	    if (prev && prev.id) {
		window.PalantirWiki.scrollToElement(`#${prev.id}`);
		return true;
	    }
	    return false;
	},
        
	nextParent: () => {
	    const next = getParentSiblingHeading('next');
	    if (next && next.id) {
		window.PalantirWiki.scrollToElement(`#${next.id}`);
		return true;
	    }
	    return false;
	},
        
	prevParent: () => {
	    const prev = getParentSiblingHeading('prev');
	    if (prev && prev.id) {
		window.PalantirWiki.scrollToElement(`#${prev.id}`);
		return true;
	    }
	    return false;
	},
        
	scrollUp: (step) => {
	    smoothScrollBy(-(step || CONFIG.smoothScrollStep));
	},
        
	scrollDown: (step) => {
	    smoothScrollBy(step || CONFIG.smoothScrollStep);
	},
        
	openSearch: null,
	closeSearch: null,
        
	debug: {
	    validateZIndexes: validateZIndexes,
	    inspectElement: (selector) => {
		const el = document.querySelector(selector);
		if (!el) {
		    console.error('❌ 元素不存在:', selector);
		    return null;
		}
		const style = window.getComputedStyle(el);
		return {
		    element: el,
		    zIndex: style.zIndex,
		    position: style.position,
		    display: style.display,
		    visibility: style.visibility,
		    opacity: style.opacity
		};
	    },
	    getStatus: () => ({
		wiki: {
		    version: '2.6.0',
		    sectionLevel: document.body.getAttribute('data-section-level'),
		    enableSectionToggle: CONFIG.enableSectionToggle
		},
		particles: window.particleBackground ? window.particleBackground.getStatus() : null
	    })
	}
    };

})();

// ========================================================
// L Key: Cycle Through Particle Effects
// ========================================================
(function() {
    'use strict';

    function switchParticleEffect() {
	if (window.particleBackground && window.particleBackground.switchEffect) {
	    const effectName = window.particleBackground.switchEffect();
	    showEffectToast('粒子效果：' + effectName);
	}
    }

    function showEffectToast(message) {
	const existingToasts = document.querySelectorAll('.theme-toast, .fold-toast, .effect-toast');
	existingToasts.forEach(function(toast) {
	    toast.remove();
	});

	const toast = document.createElement('div');
	toast.className = 'theme-toast effect-toast';
	toast.textContent = message;
	document.body.appendChild(toast);

	setTimeout(function() {
	    toast.remove();
	}, 2000);
    }

    document.addEventListener('keydown', function(e) {
	if (e.key === 'l' || e.key === 'L') {
	    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
		return;
	    }
	    if (e.ctrlKey || e.metaKey || e.altKey) {
		return;
	    }
	    e.preventDefault();
	    switchParticleEffect();
	}
    });

    console.log('✅ L键粒子效果切换已启用');
})();

(function() {
    'use strict';

    const opacityLevels = [0.1, 0.2, 0.4, 0.6, 0.8];
    const opacityLabels = ['10% (极淡)', '20% (很淡)', '40% (默认)', '60% (中等)', '80% (明显)'];
    let currentOpacityIndex = 2; // Default 40%

    function cycleOpacity() {
        currentOpacityIndex = (currentOpacityIndex + 1) % opacityLevels.length;
        const opacity = opacityLevels[currentOpacityIndex];

        // Update renderer opacity
        if (window.particleBackground && window.particleBackground.renderer) {
            window.particleBackground.renderer.setClearColor(0x000000, opacity);
        }

        // Save preference
        localStorage.setItem('particle-opacity-preference', currentOpacityIndex);

        showOpacityToast('背景透明度：' + opacityLabels[currentOpacityIndex]);
    }

    function showOpacityToast(message) {
        const existingToasts = document.querySelectorAll('.theme-toast, .fold-toast, .effect-toast, .opacity-toast');
        existingToasts.forEach(function(toast) {
            toast.remove();
        });

        const toast = document.createElement('div');
        toast.className = 'theme-toast opacity-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(function() {
            toast.remove();
        }, 2000);
    }

    // O key listener
    document.addEventListener('keydown', function(e) {
        if (e.key === 'o' || e.key === 'O') {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }
            if (e.ctrlKey || e.metaKey || e.altKey) {
                return;
            }
            e.preventDefault();
            cycleOpacity();
        }
    });

    // Restore saved opacity on init
    window.addEventListener('load', function() {
        const saved = localStorage.getItem('particle-opacity-preference');
        if (saved !== null) {
            currentOpacityIndex = parseInt(saved);
            const opacity = opacityLevels[currentOpacityIndex];
            if (window.particleBackground && window.particleBackground.renderer) {
                window.particleBackground.renderer.setClearColor(0x000000, opacity);
            }
        }
    });

    console.log('✅ O键透明度控制已启用');
})();

(function() {
    'use strict';

    function toggleQuality() {
        if (window.particleBackground && window.particleBackground.switchQuality) {
            const qualityName = window.particleBackground.switchQuality();
            showQualityToast('渲染质量：' + qualityName);
        }
    }

    function showQualityToast(message) {
        const existingToasts = document.querySelectorAll('.theme-toast, .fold-toast, .effect-toast, .opacity-toast, .quality-toast');
        existingToasts.forEach(function(toast) {
            toast.remove();
        });

        const toast = document.createElement('div');
        toast.className = 'theme-toast quality-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(function() {
            toast.remove();
        }, 2000);
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'q' || e.key === 'Q') {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }
            if (e.ctrlKey || e.metaKey || e.altKey) {
                return;
            }
            e.preventDefault();
            toggleQuality();
        }
    });

    console.log('✅ Q键性能切换已启用');
})();
/* =====================================================
[FIX-CODE-BLOCK] 代码块增强功能
- Prism.js 语法高亮初始化
- 复制按钮功能
===================================================== */

(function() {
    'use strict';

    // [FIX-CODE-BLOCK] Prism 自动高亮 - Org mode 代码块适配
    document.addEventListener('DOMContentLoaded', function() {
        // 为 Org mode 代码块添加 Prism 类名
        document.querySelectorAll('pre.src').forEach(function(pre) {
            const code = pre.querySelector('code') || pre;

            // 从类名提取语言
            const classList = Array.from(pre.classList);
            const langClass = classList.find(cls => cls.startsWith('src-'));

            if (langClass) {
                const lang = langClass.replace('src-', '').replace(/\+\+/g, 'pp');

                // 语言映射表
                const langMap = {
                    'python': 'python',
                    'javascript': 'javascript',
                    'js': 'javascript',
                    'css': 'css',
                    'html': 'markup',
                    'bash': 'bash',
                    'sh': 'bash',
                    'json': 'json',
                    'emacs-lisp': 'lisp',
                    'elisp': 'lisp',
                    'c': 'c',
                    'cpp': 'cpp',
                    'cpppp': 'cpp',
                    'java': 'java',
                    'rust': 'rust',
                    'go': 'go',
                    'ruby': 'ruby',
                    'php': 'php',
                    'sql': 'sql',
                    'xml': 'markup',
                    'yaml': 'yaml',
                    'r': 'r',
                    'matlab': 'matlab'
                };

                const prismLang = langMap[lang] || lang;
                pre.classList.add('language-' + prismLang);

                // 如果有 code 子元素，也添加类名
                if (code !== pre) {
                    code.classList.add('language-' + prismLang);
                }

                // [FIX-CODE-BLOCK] 生成右上角语言标签
                const langTag = document.createElement('div');
                langTag.className = 'code-lang-tag';
                langTag.textContent = prismLang.toUpperCase();
                pre.appendChild(langTag);
            }
        });

        // 触发 Prism 高亮
        if (window.Prism) {
            Prism.highlightAll();
        }
    });

    // [FIX-CODE-BLOCK] 为所有代码块添加复制按钮
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('pre.src, pre[class*="language-"]').forEach(function(pre) {
            // 避免重复添加
            if (pre.querySelector('.code-copy-btn')) {
                return;
            }

            // 创建复制按钮
            const button = document.createElement('button');
            button.className = 'code-copy-btn';
            button.textContent = '复制';
            button.setAttribute('aria-label', '复制代码');
            button.setAttribute('type', 'button');

            // 点击复制
            button.addEventListener('click', function() {
                // 获取代码内容
                const code = pre.querySelector('code');
                const text = code ? code.textContent : pre.textContent;

                // 使用 Clipboard API
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(function() {
                        // 成功反馈
                        button.textContent = '已复制！';
                        button.classList.add('copied');

                        setTimeout(function() {
                            button.textContent = '复制';
                            button.classList.remove('copied');
                        }, 2000);
                    }).catch(function(err) {
                        console.error('复制失败:', err);
                        button.textContent = '复制失败';
                        setTimeout(function() {
                            button.textContent = '复制';
                        }, 2000);
                    });
                } else {
                    // 降级方案：使用 execCommand
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();

                    try {
                        const successful = document.execCommand('copy');
                        if (successful) {
                            button.textContent = '已复制！';
                            button.classList.add('copied');
                            setTimeout(function() {
                                button.textContent = '复制';
                                button.classList.remove('copied');
                            }, 2000);
                        } else {
                            button.textContent = '复制失败';
                            setTimeout(function() {
                                button.textContent = '复制';
                            }, 2000);
                        }
                    } catch (err) {
                        console.error('复制失败:', err);
                        button.textContent = '复制失败';
                        setTimeout(function() {
                            button.textContent = '复制';
                        }, 2000);
                    }

                    document.body.removeChild(textarea);
                }
            });

            pre.appendChild(button);
        });
    });

    // ========================================================================
    // 多主题切换系统
    // ========================================================================

    // Theme Configuration
    const THEMES = [
        { id: 'monokai', name: 'Doom Monokai' },
        { id: 'dracula', name: 'Doom Dracula' },
        { id: 'gruvbox', name: 'Doom Gruvbox' },
        { id: 'raycast', name: 'Raycast Fusion' }
    ];

    /**
     * Get current theme from localStorage or default to monokai
     */
    function getCurrentTheme() {
        return localStorage.getItem('org-mode-theme-preference') || 'monokai';
    }

    /**
     * Apply theme by setting data-theme attribute on html element
     * @param {string} themeId - The theme ID to apply
     */
    function applyTheme(themeId) {
        const html = document.documentElement;
        if (themeId === 'monokai') {
            html.removeAttribute('data-theme');
        } else {
            html.setAttribute('data-theme', themeId);
        }
        localStorage.setItem('org-mode-theme-preference', themeId);
        // globalLog('主题已切换至:', themeId);

        // Dispatch theme change event for particle system
        window.dispatchEvent(new CustomEvent('themeChanged'));
    }

    /**
     * Show toast notification for theme change
     * @param {string} themeName - The theme name to display
     */
    function showThemeToast(themeName) {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.theme-toast');
        existingToasts.forEach(function(toast) {
            toast.remove();
        });

        // Create new toast
        const toast = document.createElement('div');
        toast.className = 'theme-toast';
        toast.textContent = '已切换至：' + themeName;
        document.body.appendChild(toast);

        // Remove toast after 2 seconds
        setTimeout(function() {
            toast.remove();
        }, 2000);
    }

    /**
     * Switch to next theme in the list
     */
    function switchToNextTheme() {
        const current = getCurrentTheme();
        const currentIndex = THEMES.findIndex(function(t) {
            return t.id === current;
        });
        const nextIndex = (currentIndex + 1) % THEMES.length;
        const nextTheme = THEMES[nextIndex];

        applyTheme(nextTheme.id);
        showThemeToast(nextTheme.name);
    }

    // Initialize theme on page load
    document.addEventListener('DOMContentLoaded', function() {
        const savedTheme = getCurrentTheme();
        applyTheme(savedTheme);
        // globalLog('初始主题:', savedTheme);
    });

    // Listen for D key to cycle through themes
    document.addEventListener('keydown', function(e) {
        // Check if D or d key is pressed without modifiers
        if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Don't trigger if typing in input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            e.preventDefault();
            switchToNextTheme();
        }
    });

    // globalLog('主题切换系统已初始化');

})();

// ========================================================
// Code Block Folding Feature (30+ lines)
// ========================================================
(function() {
    'use strict';

    function initCodeBlockFolding() {
        document.querySelectorAll('pre code').forEach(function(code) {
            const text = code.textContent || code.innerText;
            const lines = text.split('\n').length;

            if (lines > 30) {
                const pre = code.closest('pre');
                if (!pre) return;

                // Don't re-initialize if already done
                if (pre.querySelector('.code-toggle-btn')) return;

                pre.classList.add('code-collapsed');
                pre.style.position = 'relative';

                const btn = document.createElement('button');
                btn.className = 'code-toggle-btn';
                btn.textContent = '展开查看剩余 ' + (lines - 12) + ' 行';
                btn.setAttribute('aria-label', '展开代码');

                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const isCollapsed = pre.classList.toggle('code-collapsed');
                    btn.textContent = isCollapsed
                        ? '展开查看剩余 ' + (lines - 12) + ' 行'
                        : '折叠代码';
                    btn.setAttribute('aria-label', isCollapsed ? '展开代码' : '折叠代码');
                });

                pre.appendChild(btn);
            }
        });

        console.log('✅ 代码块折叠功能已初始化');
    }

    // Initialize after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCodeBlockFolding);
    } else {
        initCodeBlockFolding();
    }
})();

// ========================================================
// TOC-Headline Position Sync with Intersection Observer
// ========================================================
(function() {
    'use strict';

    function initTOCHeadlineSync() {
        const tocLinks = document.querySelectorAll('#table-of-contents a[href^="#"]');
        if (tocLinks.length === 0) return;

        // Create a map of id -> TOC link
        const tocLinkMap = new Map();
        tocLinks.forEach(function(link) {
            const href = link.getAttribute('href');
            if (href && href.length > 1) {
                const id = href.substring(1);
                tocLinkMap.set(id, link);
            }
        });

        // Intersection Observer to detect visible headlines
        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -70% 0px', // Middle 30% of viewport
            threshold: 0
        };

        let currentActiveId = null;

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    if (id && currentActiveId !== id) {
                        currentActiveId = id;
                        updateTOCHighlight(id);
                    }
                }
            });
        }, observerOptions);

        function updateTOCHighlight(activeId) {
            // Remove all active classes
            tocLinks.forEach(function(link) {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            });

            // Add active class to matching link
            const activeLink = tocLinkMap.get(activeId);
            if (activeLink) {
                activeLink.classList.add('active');
                activeLink.setAttribute('aria-current', 'true');

                // Scroll TOC to show active link
                const toc = document.querySelector('#table-of-contents');
                if (toc && activeLink.offsetParent) {
                    activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            }
        }

        // Observe all headlines with IDs
        document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]').forEach(function(heading) {
            observer.observe(heading);
        });

        console.log('✅ TOC-Headline同步已启用');
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTOCHeadlineSync);
    } else {
        initTOCHeadlineSync();
    }
})();

// ========================================================
// Headline TAB Key Folding Feature
// ========================================================
(function() {
    'use strict';

    function initHeadlineFolding() {
        // Make all headlines focusable
        const headlines = document.querySelectorAll('h2, h3, h4, h5, h6');
        headlines.forEach(function(h) {
            if (h.closest('#table-of-contents')) return; // Skip TOC headlines

            h.setAttribute('tabindex', '0');
            h.style.cursor = 'pointer';

            // Store initial state
            h.dataset.collapsed = 'false';
        });

        // TAB key listener
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const target = e.target;

                // Check if focus is on a headline
                if (/^H[2-6]$/i.test(target.tagName) && target.hasAttribute('tabindex')) {
                    // Don't interfere if it's in TOC
                    if (target.closest('#table-of-contents')) return;

                    e.preventDefault(); // Prevent default tab navigation
                    toggleHeadlineContent(target);
                }
            }
        });

        function toggleHeadlineContent(heading) {
            const level = parseInt(heading.tagName[1]);
            const isCollapsed = heading.dataset.collapsed === 'true';

            // Find all content until next same-level or higher-level heading
            let nextEl = heading.nextElementSibling;
            const elementsToToggle = [];

            while (nextEl) {
                const tagName = nextEl.tagName;

                // Stop if we hit another heading of same or higher level
                if (/^H[1-6]$/i.test(tagName)) {
                    const nextLevel = parseInt(tagName[1]);
                    if (nextLevel <= level) {
                        break;
                    }
                }

                elementsToToggle.push(nextEl);
                nextEl = nextEl.nextElementSibling;
            }

            // Toggle visibility
            if (isCollapsed) {
                // Expand
                elementsToToggle.forEach(function(el) {
                    el.classList.remove('headline-content-hidden');
                });
                heading.classList.remove('collapsed');
                heading.dataset.collapsed = 'false';
            } else {
                // Collapse
                elementsToToggle.forEach(function(el) {
                    el.classList.add('headline-content-hidden');
                });
                heading.classList.add('collapsed');
                heading.dataset.collapsed = 'true';
            }
        }

        console.log('✅ Headline TAB折叠已启用');
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeadlineFolding);
    } else {
        initHeadlineFolding();
    }
})();

// ========================================================
// F Key: Global Fold/Unfold All Sections
// ========================================================
(function() {
    'use strict';

    let globalFoldState = false; // false=展开, true=折叠

    function toggleAllHeadlines() {
        const headlines = document.querySelectorAll('h2, h3, h4, h5, h6');
        globalFoldState = !globalFoldState;

        headlines.forEach(function(h) {
            if (h.closest('#table-of-contents')) return; // 跳过TOC
            if (!h.hasAttribute('tabindex')) return; // 跳过未初始化的headline

            const level = parseInt(h.tagName[1]);
            let nextEl = h.nextElementSibling;
            const elementsToToggle = [];

            while (nextEl) {
                const tagName = nextEl.tagName;
                if (/^H[1-6]$/i.test(tagName)) {
                    const nextLevel = parseInt(tagName[1]);
                    if (nextLevel <= level) break;
                }
                elementsToToggle.push(nextEl);
                nextEl = nextEl.nextElementSibling;
            }

            if (globalFoldState) {
                // 折叠
                elementsToToggle.forEach(function(el) {
                    el.classList.add('headline-content-hidden');
                });
                h.classList.add('collapsed');
                h.dataset.collapsed = 'true';
            } else {
                // 展开
                elementsToToggle.forEach(function(el) {
                    el.classList.remove('headline-content-hidden');
                });
                h.classList.remove('collapsed');
                h.dataset.collapsed = 'false';
            }
        });

        showFoldToast(globalFoldState ? '已折叠所有章节' : '已展开所有章节');
    }

    function showFoldToast(message) {
        // 移除现有toast
        const existingToasts = document.querySelectorAll('.theme-toast, .fold-toast');
        existingToasts.forEach(function(toast) {
            toast.remove();
        });

        const toast = document.createElement('div');
        toast.className = 'theme-toast fold-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(function() {
            toast.remove();
        }, 2000);
    }

    // F键监听
    document.addEventListener('keydown', function(e) {
        if (e.key === 'f' || e.key === 'F') {
            // 避免在输入框中触发
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }
            // 避免与Ctrl+F冲突（浏览器查找）
            if (e.ctrlKey || e.metaKey || e.altKey) {
                return;
            }
            e.preventDefault();
            toggleAllHeadlines();
        }
    });

    console.log('✅ F键全局折叠已启用');
})();
