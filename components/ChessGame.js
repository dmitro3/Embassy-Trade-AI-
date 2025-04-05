'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EMB_TOKEN_CONFIG } from '@/lib/embToken';
import { useChessRewards } from '@/lib/useChessRewards';
import { useWallet } from '@/lib/WalletProvider';
import ChessIsolated from './ChessIsolated';

const ChessGame = ({ difficulty = 'medium', onGameEnd, isIsolated = false, isPremium = false }) => {
  const mountRef = useRef(null);
  const [gameStatus, setGameStatus] = useState('playing');
  const [thinking, setThinking] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading 3D chess board...');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [isConnectedToShyft, setIsConnectedToShyft] = useState(false);
  const [lastReward, setLastReward] = useState(null);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [webGLSupported, setWebGLSupported] = useState(null);
  const [webGLError, setWebGLError] = useState(null);
  const [retryAttempted, setRetryAttempted] = useState(false);
  const [showPremiumOverlay, setShowPremiumOverlay] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [embBalance, setEmbBalance] = useState(0);
  const [renderMode, setRenderMode] = useState('loading'); // 'loading', '3d', '2d-enhanced', 'isolated'
  const [graphicsQuality, setGraphicsQuality] = useState('auto'); // 'high', 'medium', 'low', 'auto'
  const [renderStats, setRenderStats] = useState(null);
  const wsRef = useRef(null);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const fpsMonitorRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const frameCountRef = useRef(0);

  // Get wallet connection status
  const { connected, publicKey } = useWallet();
  
  // Get chess rewards functionality
  const chessRewards = useChessRewards();

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const chessRef = useRef(null);
  const chessPiecesRef = useRef({});
  const boardSquaresRef = useRef([]);
  const raycasterRef = useRef(null);
  const mouseRef = useRef(null);
  const controlsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const modulesRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  const premiumEffectsRef = useRef(null);

  const PIECE_COLORS = {
    w: 0xFAF0E6,
    b: 0x3B2507
  };

  // Check if the user has EMB tokens to enable premium features
  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (connected && publicKey) {
        try {
          const balance = await chessRewards.getEMBBalance();
          setEmbBalance(balance);
          // User is premium if they have any EMB tokens or if premium mode is enabled from parent
          setIsPremiumUser(balance > 0 || isPremium);
        } catch (error) {
          console.error("Error checking EMB balance:", error);
          setIsPremiumUser(isPremium);
        }
      } else {
        setIsPremiumUser(isPremium);
      }
    };

    checkPremiumStatus();
  }, [connected, publicKey, chessRewards, isPremium]);

  const detectWebGLSupport = useCallback(async () => {
    try {
      setLoadingMessage('Checking WebGL compatibility...');
      
      const canvas = document.createElement('canvas');
      const contexts = [
        'webgl2',
        'webgl',
        'experimental-webgl',
        'experimental-webgl2'
      ];
      
      let gl = null;
      let contextType = null;
      let contextVersion = 1;
      
      for (const context of contexts) {
        try {
          gl = canvas.getContext(context, {
            failIfMajorPerformanceCaveat: false,
            antialias: false,
            depth: true,
            powerPreference: 'default',
            preserveDrawingBuffer: false
          });
          if (gl) {
            contextType = context;
            if (context.includes('2')) {
              contextVersion = 2;
            }
            break;
          }
        } catch (e) {
          console.warn(`Failed to get ${context} context:`, e);
        }
      }

      let realWebGLWorks = false;
      let capabilities = { 
        maxTextureSize: 0,
        maxVertexAttribs: 0,
        maxVaryingVectors: 0,
        performance: 'unknown'
      };
      
      if (gl) {
        try {
          // Test that WebGL actually works by performing a simple operation
          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          
          // Additional test - try to create a simple shader program
          try {
            const vertexShader = gl.createShader(gl.VERTEX_SHADER);
            const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            if (vertexShader && fragmentShader) {
              // Simple shader - just test creation
              gl.deleteShader(vertexShader);
              gl.deleteShader(fragmentShader);
            }
            
            // Get capabilities for graphics quality determination
            capabilities.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            capabilities.maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
            capabilities.maxVaryingVectors = gl.getParameter(gl.MAX_VARYING_VECTORS);
            
            // Performance test - draw a lot of triangles and measure time
            const performanceTestStart = performance.now();
            const vertexCount = 10000;
            const vertices = new Float32Array(vertexCount * 3);
            for (let i = 0; i < vertexCount * 3; i++) {
              vertices[i] = Math.random();
            }
            
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
            
            const performanceTestEnd = performance.now();
            const testDuration = performanceTestEnd - performanceTestStart;
            
            if (testDuration < 50) {
              capabilities.performance = 'high';
            } else if (testDuration < 200) {
              capabilities.performance = 'medium';
            } else {
              capabilities.performance = 'low';
            }
            
            gl.deleteBuffer(buffer);
          } catch (shaderError) {
            console.warn("Shader test failed:", shaderError);
            capabilities.performance = 'low';
          }
          
          realWebGLWorks = true;
        } catch (e) {
          console.error("WebGL available but not functioning:", e);
          realWebGLWorks = false;
        }
      }
      
      const result = {
        supported: !!gl && realWebGLWorks,
        contextType: contextType || 'none',
        contextVersion,
        details: gl ? {
          vendor: gl.getParameter(gl.VENDOR),
          renderer: gl.getParameter(gl.RENDERER),
          version: gl.getParameter(gl.VERSION),
          shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
          unmaskedVendor: null,
          unmaskedRenderer: null,
          maxTextureSize: capabilities.maxTextureSize,
          performance: capabilities.performance
        } : null
      };
      
      // Get unmasked info if available
      try {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          result.details.unmaskedVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
          result.details.unmaskedRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
        }
      } catch (e) {
        console.warn("Could not get unmasked WebGL info:", e);
      }
      
      setWebGLSupported(result.supported);
      
      if (!result.supported) {
        setWebGLError(`WebGL not properly supported in your browser or hardware. Context: ${result.contextType}`);
        console.warn("WebGL not supported:", result);
        setRenderMode('2d-enhanced');
        return false;
      }
      
      // Set graphics quality based on capabilities
      if (graphicsQuality === 'auto') {
        if (result.details && result.details.performance) {
          switch (result.details.performance) {
            case 'high':
              setGraphicsQuality('high');
              break;
            case 'medium':
              setGraphicsQuality('medium');
              break;
            case 'low':
              setGraphicsQuality('low');
              break;
            default:
              // Default to medium if we can't determine
              setGraphicsQuality('medium');
          }
        } else {
          setGraphicsQuality('medium');
        }
      }
      
      // Check if we support WebGL2 - better performance and effects
      if (result.contextVersion === 2) {
        console.log("WebGL2 supported - enabling enhanced graphics options");
      }
      
      setRenderStats(result);
      return result.supported;
    } catch (e) {
      console.error("Error detecting WebGL support:", e);
      setWebGLSupported(false);
      setWebGLError(`Error detecting WebGL: ${e.message}`);
      setRenderMode('2d-enhanced');
      return false;
    }
  }, [graphicsQuality]);

  // Initialize the chess board
  useEffect(() => {
    if (isIsolated) {
      setRenderMode('isolated');
      return;
    }
    
    let loadingTimeout = setTimeout(() => {
      setLoadingMessage('Still loading... This may take a moment.');
    }, 5000);
    
    // Check WebGL support first
    detectWebGLSupport().then(async (supported) => {
      clearTimeout(loadingTimeout);
      
      if (!supported) {
        console.log("WebGL not supported, using enhanced 2D chess mode");
        setRenderMode('2d-enhanced');
        return;
      }
      
      try {
        setLoadingMessage('Loading 3D chess engine...');
        
        // Dynamically import all required 3D libraries
        const [
          { Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight, 
            Raycaster, Vector2, Vector3, Box3, Color, MeshBasicMaterial, Group,
            SpotLight, PointLight, Fog, FogExp2, HemisphereLight, Clock,
            BufferGeometryLoader, MeshStandardMaterial, TextureLoader },
          { OrbitControls },
          { GLTFLoader },
          { EffectComposer },
          { RenderPass },
          { UnrealBloomPass },
          { OutlinePass },
          { Chess }
        ] = await Promise.all([
          import('three'),
          import('three/examples/jsm/controls/OrbitControls.js'),
          import('three/examples/jsm/loaders/GLTFLoader.js'),
          import('three/examples/jsm/postprocessing/EffectComposer.js'),
          import('three/examples/jsm/postprocessing/RenderPass.js'),
          import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
          import('three/examples/jsm/postprocessing/OutlinePass.js'),
          import('chess.js')
        ]);
        
        modulesRef.current = {
          Scene,
          PerspectiveCamera,
          WebGLRenderer,
          AmbientLight,
          DirectionalLight,
          SpotLight,
          PointLight,
          Raycaster,
          Vector2,
          Vector3,
          Box3,
          Color,
          MeshBasicMaterial,
          MeshStandardMaterial,
          Group,
          OrbitControls,
          GLTFLoader,
          Fog,
          FogExp2,
          HemisphereLight,
          Clock,
          BufferGeometryLoader,
          TextureLoader,
          EffectComposer,
          RenderPass,
          UnrealBloomPass,
          OutlinePass,
          Chess
        };
        
        // Initialize 3D scene
        initializeChess3D();
        setRenderMode('3d');
        
        // Start FPS monitoring for adaptive quality
        startPerformanceMonitoring();
        
      } catch (error) {
        console.error("Error loading 3D chess:", error);
        setLoadError(true);
        setWebGLError(`Error initializing 3D chess: ${error.message}`);
        setRenderMode('2d-enhanced');
      } finally {
        clearTimeout(loadingTimeout);
      }
    });
    
    return () => {
      clearTimeout(loadingTimeout);
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (fpsMonitorRef.current) {
        clearInterval(fpsMonitorRef.current);
      }
      // Cleanup Three.js resources
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [detectWebGLSupport, isIsolated]);

  // Setup performance monitoring to adjust graphics quality
  const startPerformanceMonitoring = () => {
    // Reset frame counters
    frameCountRef.current = 0;
    lastFrameTimeRef.current = performance.now();
    
    // Check every 5 seconds
    fpsMonitorRef.current = setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastFrameTimeRef.current;
      
      if (elapsed === 0) return;
      
      const fps = Math.round((frameCountRef.current / elapsed) * 1000);
      console.log(`Current FPS: ${fps}`);
      
      // Auto-adjust quality if needed
      if (graphicsQuality === 'auto' || graphicsQuality === 'high') {
        if (fps < 25) {
          console.log("Performance issue detected, downgrading graphics quality");
          if (graphicsQuality === 'high') setGraphicsQuality('medium');
          else if (graphicsQuality === 'medium') setGraphicsQuality('low');
          
          // Apply the new quality settings
          applyGraphicsQuality();
        }
      }
      
      // Reset for next interval
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }, 5000);
  };
  
  // Apply graphics quality settings to the renderer
  const applyGraphicsQuality = () => {
    if (!rendererRef.current || !sceneRef.current) return;
    
    const renderer = rendererRef.current;
    
    switch (graphicsQuality) {
      case 'high':
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        if (premiumEffectsRef.current && premiumEffectsRef.current.composer) {
          premiumEffectsRef.current.composer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        }
        break;
      case 'medium':
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.shadowMap.enabled = isPremiumUser;
        if (premiumEffectsRef.current && premiumEffectsRef.current.composer) {
          premiumEffectsRef.current.composer.setSize(
            Math.floor(mountRef.current.clientWidth * 0.8), 
            Math.floor(mountRef.current.clientHeight * 0.8)
          );
        }
        break;
      case 'low':
        renderer.setPixelRatio(1);
        renderer.shadowMap.enabled = false;
        if (premiumEffectsRef.current && premiumEffectsRef.current.composer) {
          premiumEffectsRef.current.composer.setSize(
            Math.floor(mountRef.current.clientWidth * 0.6), 
            Math.floor(mountRef.current.clientHeight * 0.6)
          );
        }
        break;
    }
    
    // Make sure renderer is resized correctly
    if (mountRef.current) {
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    }
    
    // Update camera and other settings as needed
    if (cameraRef.current) {
      cameraRef.current.updateProjectionMatrix();
    }
  };

  // Initialize 3D chess scene
  const initializeChess3D = () => {
    if (!mountRef.current || !modulesRef.current) return;
    
    const {
      Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight,
      SpotLight, Raycaster, Vector2, Vector3, Color, Chess, Clock,
      EffectComposer, RenderPass, UnrealBloomPass, OutlinePass, PointLight,
      HemisphereLight, MeshStandardMaterial, Fog
    } = modulesRef.current;
    
    // Create scene
    const scene = new Scene();
    scene.background = new Color(isPremiumUser ? 0x0a0a14 : 0x121212);
    
    // Add fog for premium users
    if (isPremiumUser) {
      scene.fog = new Fog(0x0a0a14, 10, 25);
    }
    
    sceneRef.current = scene;
    
    // Create camera
    const camera = new PerspectiveCamera(
      45, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000
    );
    camera.position.set(0, 5, 7);
    cameraRef.current = camera;
    
    // Create renderer with appropriate quality settings
    const renderer = new WebGLRenderer({ 
      antialias: graphicsQuality !== 'low',
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(
      graphicsQuality === 'high' ? window.devicePixelRatio :
      graphicsQuality === 'medium' ? Math.min(window.devicePixelRatio, 1.5) : 1
    );
    renderer.shadowMap.enabled = graphicsQuality !== 'low';
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Enhanced lighting setup based on quality level and premium status
    const lightingSetup = () => {
      // Base ambient light
      const ambientLight = new AmbientLight(0xffffff, isPremiumUser ? 0.4 : 0.5);
      scene.add(ambientLight);
      
      // Primary directional light (sun)
      const directionalLight = new DirectionalLight(
        isPremiumUser ? 0xf5f5ff : 0xffffff, 
        isPremiumUser ? 0.8 : 1
      );
      directionalLight.position.set(5, 10, 7);
      directionalLight.castShadow = graphicsQuality !== 'low';
      scene.add(directionalLight);
      
      // Premium lighting enhancements
      if (isPremiumUser) {
        // Add hemisphere light for more natural lighting
        const hemisphereLight = new HemisphereLight(0xb3e5fc, 0x3f2806, 0.6);
        scene.add(hemisphereLight);
        
        // Add spot light to highlight the board
        const spotLight = new SpotLight(0xffffff, 0.7, 15, Math.PI / 4, 0.5);
        spotLight.position.set(0, 8, 0);
        spotLight.target.position.set(0, 0, 0);
        spotLight.castShadow = graphicsQuality !== 'low';
        scene.add(spotLight);
        scene.add(spotLight.target);
        
        // Accent lights for dramatic effect
        const redAccent = new PointLight(0xff5252, 0.5, 15);
        redAccent.position.set(-5, 2, -5);
        scene.add(redAccent);
        
        const blueAccent = new PointLight(0x4fc3f7, 0.5, 15);
        blueAccent.position.set(5, 2, 5);
        scene.add(blueAccent);
      }
    };
    
    // Set up lighting
    lightingSetup();
    
    // Initialize orbit controls
    const { OrbitControls } = modulesRef.current;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    
    // Premium users get smoother controls
    if (isPremiumUser) {
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
    }
    
    controls.update();
    controlsRef.current = controls;
    
    // Initialize chess game
    const chess = new Chess();
    chessRef.current = chess;
    
    // Initialize raycaster for interaction
    const raycaster = new Raycaster();
    const mouse = new Vector2();
    raycasterRef.current = raycaster;
    mouseRef.current = mouse;
    
    // Setup post-processing effects for premium users
    if (isPremiumUser && graphicsQuality !== 'low') {
      setupPremiumEffects(scene, camera, renderer);
    }
    
    // Load the chess board model
    loadChessBoard();
    
    // Create clock for animations
    const clock = new Clock();
    
    // Setup animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Update controls if they have damping
      if (controlsRef.current && controlsRef.current.enableDamping) {
        controlsRef.current.update();
      }
      
      // Update any premium visual effects
      if (isPremiumUser && premiumEffectsRef.current) {
        const elapsed = clock.getElapsedTime();
        
        // Animate lights if we have them
        if (premiumEffectsRef.current.lights) {
          premiumEffectsRef.current.lights.forEach(light => {
            if (light.animation) {
              const { target, speed, amplitude, base } = light.animation;
              // Simple sine wave animation for light intensity
              target.intensity = base + Math.sin(elapsed * speed) * amplitude;
            }
          });
        }
        
        // Use effect composer if available, otherwise use regular renderer
        if (premiumEffectsRef.current.composer && graphicsQuality !== 'low') {
          premiumEffectsRef.current.composer.render();
        } else {
          renderer.render(scene, camera);
        }
      } else {
        // Standard rendering
        renderer.render(scene, camera);
      }
      
      // Count frames for FPS monitoring
      frameCountRef.current++;
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      
      // Update post-processing sizes
      if (isPremiumUser && premiumEffectsRef.current && premiumEffectsRef.current.composer) {
        premiumEffectsRef.current.composer.setSize(
          mountRef.current.clientWidth,
          mountRef.current.clientHeight
        );
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  };

  // Setup premium visual effects
  const setupPremiumEffects = (scene, camera, renderer) => {
    const {
      EffectComposer,
      RenderPass,
      UnrealBloomPass,
      OutlinePass,
      Vector2,
      PointLight
    } = modulesRef.current;
    
    // Create effect composer
    const composer = new EffectComposer(renderer);
    
    // Add basic render pass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Add subtle bloom effect
    const bloomPass = new UnrealBloomPass(
      new Vector2(mountRef.current.clientWidth, mountRef.current.clientHeight),
      0.4,  // strength
      0.1,  // radius
      0.9   // threshold
    );
    composer.addPass(bloomPass);
    
    // Setup for outline pass (will be used when selecting pieces)
    const outlinePass = new OutlinePass(
      new Vector2(mountRef.current.clientWidth, mountRef.current.clientHeight),
      scene,
      camera
    );
    outlinePass.edgeStrength = 3;
    outlinePass.edgeGlow = 1;
    outlinePass.edgeThickness = 1;
    outlinePass.pulsePeriod = 2;
    outlinePass.visibleEdgeColor.set('#ffffff');
    outlinePass.hiddenEdgeColor.set('#190a05');
    composer.addPass(outlinePass);
    
    // Create animated lights
    const animatedLights = [];
    
    // Subtle pulsing light
    const pulsingLight = new PointLight(0x00b0ff, 0.4, 10);
    pulsingLight.position.set(0, 3, 0);
    scene.add(pulsingLight);
    
    // Store light with animation parameters
    animatedLights.push({
      light: pulsingLight,
      animation: {
        target: pulsingLight,
        speed: 1.5,
        amplitude: 0.2,
        base: 0.4
      }
    });
    
    // Store all premium effects references
    premiumEffectsRef.current = {
      composer,
      lights: animatedLights,
      outlinePass,
      bloomPass
    };
  };

  // Load the chess board model
  const loadChessBoard = () => {
    setLoadingMessage('Loading 3D chess pieces...');
    
    // In a real implementation, this would load actual 3D models
    // For now, we'll simulate the loading process with timeouts
    
    setTimeout(() => {
      setLoadingMessage('Preparing game environment...');
      setTimeout(() => {
        setLoadingMessage('Setting up AI opponent...');
        setTimeout(() => {
          setLoadingMessage('');
        }, 800);
      }, 1200);
    }, 1000);
  };

  // Handle game end event
  const handleGameEnd = async (result) => {
    setGameStatus(result);
    
    // Only try to give rewards if the user is connected with a wallet
    if (connected && publicKey && chessRewards.isInitialized) {
      let rewardResult = null;
      
      // Process rewards based on game outcome
      if (result === 'win') {
        rewardResult = await chessRewards.rewardForWin(difficulty);
        
        // Apply premium bonus if applicable
        if (isPremiumUser && rewardResult?.success) {
          rewardResult.xpAmount = Math.floor(rewardResult.xpAmount * 1.25); // 25% bonus
          rewardResult.rewardAmount = rewardResult.rewardAmount * 1.2; // 20% bonus
        }
      } else if (result === 'draw') {
        rewardResult = await chessRewards.rewardForDraw(difficulty);
        
        // Apply premium bonus if applicable
        if (isPremiumUser && rewardResult?.success) {
          rewardResult.xpAmount = Math.floor(rewardResult.xpAmount * 1.1); // 10% bonus
          rewardResult.rewardAmount = rewardResult.rewardAmount * 1.1; // 10% bonus
        }
      }
      
      // If the reward was successful, show animation
      if (rewardResult?.success) {
        setLastReward({
          amount: rewardResult.rewardAmount,
          xp: rewardResult.xpAmount
        });
        setShowRewardAnimation(true);
        
        // Hide the reward animation after a few seconds
        setTimeout(() => {
          setShowRewardAnimation(false);
        }, 3000);
      }
    }
    
    // Call the external onGameEnd handler if provided
    if (onGameEnd) {
      onGameEnd(result);
    }
  };
  
  // Handle special move rewards
  const handleSpecialMove = async (moveType) => {
    if (connected && publicKey && chessRewards.isInitialized) {
      const rewardResult = await chessRewards.rewardForSpecialMove(moveType);
      
      // Apply premium bonus if applicable
      if (isPremiumUser && rewardResult?.success) {
        rewardResult.xpAmount = Math.floor(rewardResult.xpAmount * 1.2); // 20% bonus
        rewardResult.rewardAmount = rewardResult.rewardAmount * 1.15; // 15% bonus
      }
      
      // If the reward was successful, show mini animation
      if (rewardResult?.success) {
        setLastReward({
          amount: rewardResult.rewardAmount,
          xp: rewardResult.xpAmount
        });
        setShowRewardAnimation(true);
        
        // Hide the reward animation after a short time
        setTimeout(() => {
          setShowRewardAnimation(false);
        }, 2000);
      }
    }
  };

  // Switch to isolated chess mode
  const switchToIsolatedMode = () => {
    cancelAnimationFrame(animationFrameRef.current);
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
    if (mountRef.current) {
      mountRef.current.innerHTML = '';
    }
    setRenderMode('isolated');
  };

  // Switch to enhanced 2D mode
  const switchTo2DEnhancedMode = () => {
    cancelAnimationFrame(animationFrameRef.current);
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
    if (mountRef.current) {
      mountRef.current.innerHTML = '';
    }
    setRenderMode('2d-enhanced');
  };

  // Show premium features overlay
  const showPremiumFeatures = () => {
    setShowPremiumOverlay(true);
  };

  // Retry loading 3D chess
  const retryLoading = () => {
    setRetryAttempted(true);
    setWebGLError(null);
    setLoadError(false);
    setRenderMode('loading');
    retryCount.current += 1;
    
    // Clean up previous attempt
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
    if (mountRef.current) {
      mountRef.current.innerHTML = '';
    }
    
    // Attempt to initialize again with a delay
    setTimeout(() => {
      detectWebGLSupport().then(async (supported) => {
        if (supported) {
          try {
            setLoadingMessage('Reloading 3D chess engine...');
            if (retryCount.current >= maxRetries) {
              // After several tries, use lower quality settings
              setGraphicsQuality('low');
            }
            initializeChess3D();
            setRenderMode('3d');
          } catch (error) {
            console.error("Error reloading 3D chess:", error);
            setLoadError(true);
            
            // If we've tried too many times, switch to 2D enhanced mode
            if (retryCount.current >= maxRetries) {
              switchTo2DEnhancedMode();
            }
          }
        } else {
          // WebGL still not supported, use 2D enhanced mode
          switchTo2DEnhancedMode();
        }
      });
    }, 500);
  };

  // Render the appropriate mode
  const renderChessGame = () => {
    switch (renderMode) {
      case 'loading':
        return (
          <div className="flex items-center justify-center w-full h-full bg-gray-800 rounded-xl">
            <div className="flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <div className="text-blue-400">{loadingMessage || 'Loading chess...'}</div>
            </div>
          </div>
        );
        
      case '3d':
        return (
          <div ref={mountRef} className="w-full h-full relative">
            {/* 3D canvas will be mounted here */}
            {showRewardAnimation && lastReward && (
              <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-blue-900/80 backdrop-blur-md p-3 rounded-xl text-center animate-float-up">
                <div className="text-yellow-300 font-bold">+ {lastReward.amount} EMB</div>
                <div className="text-blue-300">+ {lastReward.xp} XP</div>
              </div>
            )}
            {isPremiumUser && (
              <div className="absolute bottom-2 right-2 bg-purple-900/30 backdrop-blur-sm px-2 py-1 rounded text-xs text-purple-300">
                Premium
              </div>
            )}
            
            {/* Overlay for load errors that allows retry */}
            {loadError && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <div className="bg-gray-800 p-5 rounded-xl max-w-md text-center">
                  <svg className="w-14 h-14 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-medium text-white mb-2">3D Chess Failed to Load</h3>
                  <p className="text-gray-300 mb-3">{webGLError || 'There was a problem loading the 3D chess game.'}</p>
                  <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 justify-center">
                    <button
                      onClick={retryLoading}
                      disabled={retryCount.current >= maxRetries}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Retry {retryCount.current > 0 ? `(${retryCount.current}/${maxRetries})` : ''}
                    </button>
                    <button
                      onClick={switchTo2DEnhancedMode}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
                    >
                      Switch to 2D Mode
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        
      case '2d-enhanced':
        return (
          <div className="w-full h-full relative">
            {/* Enhanced 2D version with premium features when available */}
            <div className="h-full w-full">
              <ChessIsolated 
                difficulty={difficulty}
                onGameEnd={handleGameEnd}
                isPremium={isPremiumUser}
                onSpecialMove={handleSpecialMove}
                theme={isPremiumUser ? 'premium' : 'standard'}
              />
            </div>
            
            {showRewardAnimation && lastReward && (
              <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-blue-900/80 backdrop-blur-md p-3 rounded-xl text-center animate-float-up">
                <div className="text-yellow-300 font-bold">+ {lastReward.amount} EMB</div>
                <div className="text-blue-300">+ {lastReward.xp} XP</div>
              </div>
            )}
            
            {isPremiumUser && (
              <div className="absolute bottom-2 right-2 bg-purple-900/30 backdrop-blur-sm px-2 py-1 rounded text-xs text-purple-300">
                Premium
              </div>
            )}
            
            {/* Subtle indicator that this is the 2D fallback */}
            <div className="absolute top-2 left-2 bg-gray-800/70 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-300">
              2D Enhanced Mode
            </div>
          </div>
        );
        
      case 'isolated':
        return <ChessIsolated 
                difficulty={difficulty}
                onGameEnd={handleGameEnd}
                isPremium={isPremiumUser}
                onSpecialMove={handleSpecialMove}
               />;
                
      default:
        return <div className="text-red-500">Unknown render mode: {renderMode}</div>;
    }
  };

  return (
    <div className="w-full h-full">
      {renderChessGame()}
      
      {/* Premium features overlay */}
      {showPremiumOverlay && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
          <div className="bg-gray-800 p-5 rounded-xl max-w-md">
            <h3 className="text-xl font-medium text-white mb-3">Premium Chess Features</h3>
            <ul className="text-gray-300 space-y-2 mb-4">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-purple-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Enhanced visual effects with dynamic lighting</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-purple-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>25% bonus rewards for winning games</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-purple-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Unlock exclusive chess piece sets and animations</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-purple-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Higher chance of receiving trading signals from games</span>
              </li>
            </ul>
            <div className="flex justify-end">
              <button
                onClick={() => setShowPremiumOverlay(false)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChessGame;