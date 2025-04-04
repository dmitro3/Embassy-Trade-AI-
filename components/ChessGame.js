'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EMB_TOKEN_CONFIG } from '@/lib/embToken';
import { useChessRewards } from '@/lib/useChessRewards';

const ChessGame = ({ difficulty = 'medium', onGameEnd, isIsolated = false }) => {
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
  const wsRef = useRef(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

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

  const PIECE_COLORS = {
    w: 0xFAF0E6,
    b: 0x3B2507
  };

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
            break;
          }
        } catch (e) {
          console.warn(`Failed to get ${context} context:`, e);
        }
      }

      let realWebGLWorks = false;
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
          } catch (shaderError) {
            console.warn("Shader test failed:", shaderError);
          }
          
          realWebGLWorks = true;
        } catch (e) {
          console.error("WebGL available but not functioning:", e);
          realWebGLWorks = false;
          setWebGLError(`WebGL context creation failed: ${e.message}`);
        }
        
        const loseContext = gl.getExtension('WEBGL_lose_context');
        if (loseContext) loseContext.loseContext();
      } else {
        setWebGLError("WebGL context could not be created");
      }

      // Browser detection logic
      const isBrave = navigator.brave && await navigator.brave.isBrave() || false;
      const isFirefox = navigator.userAgent.includes('Firefox/');
      const isChrome = navigator.userAgent.includes('Chrome/');
      const isSafari = navigator.userAgent.includes('Safari/') && !navigator.userAgent.includes('Chrome/');
      const isEdge = navigator.userAgent.includes('Edg/');
      const isHeadless = /\bHeadlessChrome\b/.test(navigator.userAgent);
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      const hasStrictPrivacy = isBrave || isFirefox || isHeadless;

      const browserDetails = {
        hasWebGL: !!gl && realWebGLWorks,
        contextType,
        hasStrictPrivacy,
        browser: { isBrave, isFirefox, isChrome, isSafari, isEdge, isHeadless, isMobile },
        rendererType: (!!gl && realWebGLWorks) ? contextType : 'fallback'
      };

      console.info("WebGL Detection Results:", browserDetails);

      // Generate specific guidance based on browser
      let troubleshootingMessage = "";
      if (!gl || !realWebGLWorks) {
        if (isBrave) {
          troubleshootingMessage = "Brave's shields may be blocking WebGL. Click the Brave shield icon in the address bar and set 'Shields' to 'Down' for this site.";
        } else if (isFirefox) {
          troubleshootingMessage = "Firefox may have WebGL disabled. Try typing 'about:config' in the address bar, search for 'webgl.disabled', and ensure it's set to 'false'.";
        } else if (isSafari) {
          troubleshootingMessage = "Safari requires WebGL to be enabled. Go to Safari > Preferences > Advanced and check 'Show Develop menu in menu bar', then select Develop > Enable WebGL.";
        } else if (isChrome) {
          troubleshootingMessage = "Chrome should support WebGL by default. Try typing 'chrome://flags' in the address bar, search for WebGL, and ensure it's enabled.";
        }
        
        if (troubleshootingMessage) {
          setWebGLError(troubleshootingMessage);
        }
      }

      return browserDetails;
    } catch (e) {
      console.error('Error detecting WebGL support:', e);
      setWebGLError(`Error detecting WebGL support: ${e.message}`);
      return {
        hasWebGL: false,
        hasStrictPrivacy: false,
        rendererType: 'fallback',
        error: e.message
      };
    }
  }, []);

  const connectToWebSocket = useCallback(() => {
    if (isIsolated || !window.WebSocket) return;

    try {
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname;
      const port = hostname === 'localhost' ? ':3001' : '';
      const wsUrl = `${protocol}//${hostname}${port}/chess`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection established for chess game');
        setIsConnectedToShyft(true);
        
        try {
          ws.send(JSON.stringify({
            type: 'chess_connect',
            difficulty,
            mode: '3d',
            clientInfo: {
              browser: navigator.userAgent,
              webGL: webGLSupported
            }
          }));
        } catch (e) {
          console.error('Error sending initial data to WebSocket:', e);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          
          if (data.type === 'chess_ping') {
            ws.send(JSON.stringify({ type: 'chess_pong' }));
          }
        } catch (e) {
          console.error('Error processing WebSocket message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnectedToShyft(false);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnectedToShyft(false);
        
        setTimeout(() => {
          if (wsRef.current === ws) {
            connectToWebSocket();
          }
        }, 5000);
      };
    } catch (e) {
      console.error('Error establishing WebSocket connection:', e);
      setIsConnectedToShyft(false);
    }
  }, [difficulty, isIsolated, webGLSupported]);

  const handleBoardClick = useCallback((event) => {
    if (!mountRef.current || !sceneRef.current || !cameraRef.current || !raycasterRef.current || !chessRef.current || thinking) return;

    try {
      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      const pieceObjects = Object.values(chessPiecesRef.current);
      const allMeshes = [];

      pieceObjects.forEach(piece => {
        if (piece && piece.children && piece.children.forEach) {
          piece.children.forEach(child => {
            if (child && child.isMesh) {
              allMeshes.push(child);
            }
          });
        } else if (piece && piece.isMesh) {
          allMeshes.push(piece);
        }
      });

      if (boardSquaresRef.current && boardSquaresRef.current.length) {
        allMeshes.push(...boardSquaresRef.current);
      }

      const intersects = raycasterRef.current.intersectObjects(allMeshes, true);

      if (intersects.length > 0) {
        const intersected = intersects[0].object;

        const isPiece = !boardSquaresRef.current.includes(intersected);

        let squareName;
        if (isPiece) {
          const pieceObj = intersected.userData.parent || intersected;
          const piecePos = pieceObj.position;

          const squareX = Math.round(piecePos.x + 3.5);
          const squareZ = Math.round(piecePos.z + 3.5);

          if (squareX >= 0 && squareX < 8 && squareZ >= 0 && squareZ < 8) {
            const file = String.fromCharCode(97 + squareX);
            const rank = 8 - squareZ;
            squareName = file + rank;
          }
        } else {
          squareName = intersected.userData.square;
        }

        if (squareName) {
          const pieceOnSquare = chessRef.current.get(squareName);

          if (selectedSquare) {
            if (validMoves.includes(squareName)) {
              try {
                const moveResult = chessRef.current.move({
                  from: selectedSquare,
                  to: squareName,
                  promotion: 'q'
                });

                if (wsRef.current && isConnectedToShyft) {
                  try {
                    wsRef.current.send(JSON.stringify({
                      type: 'chess_move',
                      from: selectedSquare,
                      to: squareName,
                      moveResult
                    }));
                  } catch (e) {
                    console.error('Error sending move to WebSocket:', e);
                  }
                }

                updateBoardDisplay();

                setSelectedSquare(null);
                setValidMoves([]);
                resetSquareColors();

                checkGameStatus();

                if (!chessRef.current.isGameOver()) {
                  makeAIMove();
                }
              } catch (error) {
                console.error('Error making move:', error);
              }
            } else {
              if (pieceOnSquare && pieceOnSquare.color === 'w') {
                setSelectedSquare(squareName);
                highlightValidMoves(squareName);
              } else {
                setSelectedSquare(null);
                setValidMoves([]);
                resetSquareColors();
              }
            }
          } else {
            if (pieceOnSquare && pieceOnSquare.color === 'w') {
              setSelectedSquare(squareName);
              highlightValidMoves(squareName);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling board click:', error);
    }
  }, [selectedSquare, validMoves, thinking, gameStatus, isConnectedToShyft]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    // Set a loading timeout to prevent infinite loading
    loadTimeoutRef.current = setTimeout(() => {
      if (isMounted) {
        console.error("Loading timeout reached - game initialization took too long");
        setLoadError(true);
        setWebGLError("Game initialization timed out. This could be due to slow hardware or browser compatibility issues.");
        setLoadingMessage("Loading took too long. Your device might not support WebGL or is too slow for this application.");
      }
    }, 15000); // 15 seconds timeout

    const loadDependencies = async () => {
      try {
        setLoadingMessage('Checking browser compatibility...');

        const support = await detectWebGLSupport();
        setWebGLSupported(support.hasWebGL);
        
        if (!support.hasWebGL) {
          console.warn('WebGL not detected or not functioning. Will attempt to use fallback renderer.');
          if (retryCount.current === 0) {
            // First attempt failed - set error but continue with fallback attempt
            setLoadingMessage('WebGL not available. Attempting to use compatibility mode...');
          }
        }

        setLoadingMessage('Loading Three.js library...');
        
        let THREE, OrbitControls, Chess;
        
        try {
          THREE = await Promise.race([
            import('three').catch(err => {
              console.error("Failed to load Three.js:", err);
              throw new Error("Failed to load Three.js library");
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Three.js loading timeout')), 10000)
            )
          ]);
        } catch (err) {
          console.error("Three.js loading failed:", err);
          setWebGLError(`Failed to load Three.js: ${err.message}`);
          throw new Error(`Failed to load Three.js: ${err.message}`);
        }

        setLoadingMessage('Loading controls...');
        try {
          const OrbitControlsModule = await import('three/examples/jsm/controls/OrbitControls');
          OrbitControls = OrbitControlsModule.OrbitControls;
        } catch (err) {
          console.error("Failed to load OrbitControls:", err);
          setWebGLError("Failed to load 3D controls");
          throw new Error("Failed to load OrbitControls module");
        }

        setLoadingMessage('Loading chess engine...');
        try {
          const ChessModule = await import('chess.js');
          Chess = ChessModule.Chess;
        } catch (err) {
          console.error("Failed to load chess.js:", err);
          setWebGLError("Failed to load chess engine");
          throw new Error("Failed to load chess engine");
        }

        modulesRef.current = {
          THREE,
          OrbitControls,
          Chess,
          rendererType: support.hasWebGL ? (support.contextType || 'webgl') : 'fallback',
          hasStrictPrivacy: support.hasStrictPrivacy
        };

        if (!isMounted) return null;
        setLoadingMessage('Initializing game board...');
        return { THREE, OrbitControls, Chess };
      } catch (error) {
        console.error("Failed to load dependencies:", error);
        if (isMounted) {
          setLoadError(true);
          if (retryCount.current < maxRetries) {
            retryCount.current++;
            setLoadError(false);
            setLoadingMessage(`Retrying with compatibility mode (attempt ${retryCount.current}/${maxRetries})...`);
            return await loadDependencies();
          }
        }
        return null;
      }
    };

    const initGame = async () => {
      try {
        const modules = await loadDependencies();
        if (!modules || !mountRef.current || !isMounted) {
          if (isMounted) {
            setLoadError(true);
            setLoadingMessage('Failed to load game dependencies');
          }
          return;
        }

        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }

        const { THREE, OrbitControls, Chess } = modules;

        setLoadingMessage('Creating game scene...');
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x121212);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(
          45,
          mountRef.current.clientWidth / mountRef.current.clientHeight,
          0.1,
          1000
        );
        camera.position.set(0, 8, 8);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        setLoadingMessage('Setting up renderer...');
        try {
          let renderer;
          const createRenderer = () => {
            try {
              // Progressively reduce quality for compatibility
              if (retryCount.current > 1) {
                return new THREE.WebGLRenderer({
                  antialias: false,
                  alpha: false,
                  powerPreference: 'default',
                  precision: 'lowp',
                  preserveDrawingBuffer: false,
                  failIfMajorPerformanceCaveat: false
                });
              } else if (retryCount.current > 0) {
                return new THREE.WebGLRenderer({
                  antialias: false,
                  alpha: true,
                  powerPreference: 'default',
                  preserveDrawingBuffer: false
                });
              }
              
              return new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
                preserveDrawingBuffer: true
              });
            } catch (e) {
              console.warn("Trying simplified WebGL renderer:", e);
              return new THREE.WebGLRenderer({
                antialias: false,
                alpha: false,
                powerPreference: 'default',
                precision: 'lowp'
              });
            }
          };

          try {
            renderer = createRenderer();
          } catch (err) {
            console.warn("WebGL renderer failed, trying fallback:", err);
            try {
              renderer = new THREE.WebGLRenderer({
                canvas: document.createElement('canvas'),
                context: null,
                precision: 'lowp',
                logarithmicDepthBuffer: false,
                failIfMajorPerformanceCaveat: false
              });
            } catch (e) {
              if (THREE.CanvasRenderer) {
                renderer = new THREE.CanvasRenderer();
              } else {
                throw new Error("No compatible renderer available");
              }
            }
          }

          try {
            const testGeometry = new THREE.BoxGeometry(1, 1, 1);
            const testMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const testMesh = new THREE.Mesh(testGeometry, testMaterial);
            scene.add(testMesh);
            renderer.render(scene, camera);
            scene.remove(testMesh);
            
            console.log("Renderer test successful");
          } catch (renderTestError) {
            console.error("Renderer test failed:", renderTestError);
            throw new Error("Renderer created but failed test render");
          }

          renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);

          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          const pixelRatio = (isMobile || modulesRef.current?.hasStrictPrivacy || retryCount.current > 0) ? 1 : window.devicePixelRatio;
          renderer.setPixelRatio(pixelRatio);

          if (retryCount.current === 0) {
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
          }

          if (mountRef.current.childElementCount === 0) {
            mountRef.current.appendChild(renderer.domElement);
          }
          rendererRef.current = renderer;
        } catch (rendererError) {
          console.error("WebGL renderer creation failed:", rendererError);
          setWebGLError("Failed to create WebGL renderer. Your browser may not support WebGL.");
          throw new Error("Failed to create WebGL renderer. Your browser may not support WebGL.");
        }

        // Rest of the initialization
        // ...existing code...

        setLoadingMessage('Initializing controls...');
        raycasterRef.current = new THREE.Raycaster();
        mouseRef.current = new THREE.Vector2();

        const controls = new OrbitControls(camera, rendererRef.current.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.maxPolarAngle = Math.PI / 2.1;
        controls.minDistance = 5;
        controls.maxDistance = 15;
        controls.target.set(0, 0, 0);
        controlsRef.current = controls;

        setLoadingMessage('Creating chessboard...');
        createChessboard(THREE, scene);

        setLoadingMessage('Creating chess pieces...');
        chessRef.current = new Chess();

        createChessPieces(THREE, scene, chessRef.current);

        connectToWebSocket();

        setLoadingMessage('Starting game...');
        const animate = () => {
          if (!isMounted) return;

          animationFrameRef.current = requestAnimationFrame(animate);

          if (controlsRef.current) {
            controlsRef.current.update();
          }

          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            try {
              rendererRef.current.render(sceneRef.current, cameraRef.current);
            } catch (renderError) {
              console.error("Error during rendering:", renderError);
              if (isMounted && !loadError) {
                setLoadError(true);
                setWebGLError("Error during rendering. WebGL might have crashed.");
              }
            }
          }
        };

        animate();

        const handleResize = () => {
          if (mountRef.current && rendererRef.current && cameraRef.current) {
            const width = mountRef.current.clientWidth;
            const height = mountRef.current.clientHeight;

            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(width, height);
          }
        };

        window.addEventListener('resize', handleResize);

        if (mountRef.current) {
          mountRef.current.addEventListener('click', handleBoardClick);
        }

        // Clear the error state since initialization succeeded
        setLoadError(false);
        setWebGLError(null);

        return () => {
          window.removeEventListener('resize', handleResize);

          if (mountRef.current) {
            mountRef.current.removeEventListener('click', handleBoardClick);
          }

          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }

          if (rendererRef.current && mountRef.current) {
            if (mountRef.current.contains(rendererRef.current.domElement)) {
              mountRef.current.removeChild(rendererRef.current.domElement);
            }
          }

          if (rendererRef.current) {
            rendererRef.current.dispose();
            if (rendererRef.current.renderLists) {
              rendererRef.current.renderLists.dispose();
            }

            try {
              const gl = rendererRef.current.getContext();
              if (gl) {
                const extension = gl.getExtension('WEBGL_lose_context');
                if (extension) extension.loseContext();
              }
            } catch (e) {
              console.warn("Error releasing WebGL context:", e);
            }
          }
          
          if (wsRef.current) {
            wsRef.current.close();
          }
          
          if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
          }
        };
      } catch (error) {
        console.error("Error initializing chess game:", error);
        if (isMounted) {
          setLoadError(true);
          setLoadingMessage(`Error: ${error.message || 'Failed to initialize game'}`);
        }
        if (onGameEnd) onGameEnd('error');
      }
    };

    initGame();

    return () => {
      isMounted = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [handleBoardClick, onGameEnd, isIsolated, connectToWebSocket, detectWebGLSupport]);

  const highlightValidMoves = (squareName) => {
    if (!chessRef.current) return;

    resetSquareColors();

    const selectedSquareObj = boardSquaresRef.current.find(s => s.userData.square === squareName);
    if (selectedSquareObj) {
      const originalMaterial = selectedSquareObj.userData.originalMaterial.clone();
      originalMaterial.color.set(0x4CAF50);
      selectedSquareObj.material = originalMaterial;
    }

    const moves = chessRef.current.moves({
      square: squareName,
      verbose: true
    });

    const validSquareNames = moves.map(move => move.to);
    setValidMoves(validSquareNames);

    validSquareNames.forEach(square => {
      const squareObj = boardSquaresRef.current.find(s => s.userData.square === square);
      if (squareObj) {
        const originalMaterial = squareObj.userData.originalMaterial.clone();
        originalMaterial.color.set(0x2196F3);
        squareObj.material = originalMaterial;
      }
    });
  };

  const resetSquareColors = () => {
    if (!boardSquaresRef.current) return;

    boardSquaresRef.current.forEach(square => {
      if (square && square.userData && square.userData.originalMaterial) {
        square.material = square.userData.originalMaterial.clone();
      }
    });
  };

  const createChessboard = (THREE, scene) => {
    const boardGeometry = new THREE.BoxGeometry(8.4, 0.5, 8.4);
    const boardMaterial = new THREE.MeshStandardMaterial({ color: 0x5D4037 });
    const board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.position.y = -0.3;
    board.receiveShadow = true;
    scene.add(board);

    boardSquaresRef.current = [];

    const squareGeometry = new THREE.BoxGeometry(1, 0.1, 1);

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const isWhite = (i + j) % 2 === 0;
        const squareMaterial = new THREE.MeshStandardMaterial({
          color: isWhite ? 0xF0D9B5 : 0xB58863
        });

        const square = new THREE.Mesh(squareGeometry, squareMaterial);

        const x = j - 3.5;
        const z = i - 3.5;
        square.position.set(x, 0, z);

        const file = String.fromCharCode(97 + j);
        const rank = 8 - i;
        const squareName = file + rank;

        square.userData = {
          square: squareName,
          isWhite,
          originalMaterial: squareMaterial.clone()
        };

        square.receiveShadow = true;
        scene.add(square);

        boardSquaresRef.current.push(square);
      }
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 8, -5);
    scene.add(fillLight);
  };

  const createChessPieces = (THREE, scene, chess) => {
    if (!chess || !scene) return;

    if (chessPiecesRef.current) {
      Object.values(chessPiecesRef.current).forEach(piece => {
        if (piece && piece.parent) {
          piece.parent.remove(piece);
        }
      });
    }

    chessPiecesRef.current = {};

    const board = chess.board();

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (!piece) continue;

        const { type, color } = piece;

        const file = String.fromCharCode(97 + j);
        const rank = 8 - i;
        const squareName = file + rank;

        const pieceObject = createPiece(THREE, type, color);

        pieceObject.userData = {
          squareName,
          pieceType: type,
          pieceColor: color
        };

        if (pieceObject instanceof THREE.Group) {
          pieceObject.children.forEach(child => {
            if (child) {
              child.userData = {
                parent: pieceObject,
                ...pieceObject.userData
              };
            }
          });
        }

        const x = j - 3.5;
        const z = i - 3.5;
        pieceObject.position.set(x, 0.6, z);

        scene.add(pieceObject);

        chessPiecesRef.current[squareName] = pieceObject;
      }
    }
  };

  const createPiece = (THREE, type, color) => {
    let geometry;
    const height = 1.0;
    const radius = 0.3;

    const group = new THREE.Group();

    switch (type) {
      case 'p':
        const pawnBase = new THREE.CylinderGeometry(radius * 0.7, radius * 0.9, height * 0.3, 16);
        const pawnMiddle = new THREE.SphereGeometry(radius * 0.6, 16, 8);
        const pawnBaseMesh = new THREE.Mesh(pawnBase);
        const pawnMiddleMesh = new THREE.Mesh(pawnMiddle);
        pawnMiddleMesh.position.y = height * 0.3;
        group.add(pawnBaseMesh);
        group.add(pawnMiddleMesh);
        break;

      case 'r':
        const rookBase = new THREE.CylinderGeometry(radius * 0.8, radius * 0.9, height * 0.7, 4);
        const rookTop = new THREE.BoxGeometry(radius * 2, height * 0.3, radius * 2);
        rookTop.translate(0, height * 0.5, 0);
        const rookBaseMesh = new THREE.Mesh(rookBase);
        const rookTopMesh = new THREE.Mesh(rookTop);
        group.add(rookBaseMesh);
        group.add(rookTopMesh);
        break;

      case 'n':
        const knightBase = new THREE.CylinderGeometry(radius * 0.7, radius * 0.9, height * 0.3, 16);
        const knightHead = new THREE.BoxGeometry(radius * 0.8, height * 0.6, radius * 1.5);
        knightHead.translate(0, height * 0.45, radius * 0.3);
        const knightEar = new THREE.BoxGeometry(radius * 0.5, height * 0.4, radius * 0.4);
        knightEar.translate(0, height * 0.8, radius * 0.4);

        const knightBaseMesh = new THREE.Mesh(knightBase);
        const knightHeadMesh = new THREE.Mesh(knightHead);
        const knightEarMesh = new THREE.Mesh(knightEar);

        group.add(knightBaseMesh);
        group.add(knightHeadMesh);
        group.add(knightEarMesh);
        break;

      case 'b':
        const bishopBase = new THREE.CylinderGeometry(radius * 0.7, radius * 0.9, height * 0.3, 16);
        const bishopMiddle = new THREE.ConeGeometry(radius * 0.6, height * 0.9, 16);
        bishopMiddle.translate(0, height * 0.55, 0);
        const bishopTop = new THREE.SphereGeometry(radius * 0.2, 16, 8);
        bishopTop.translate(0, height * 1.0, 0);

        const bishopBaseMesh = new THREE.Mesh(bishopBase);
        const bishopMiddleMesh = new THREE.Mesh(bishopMiddle);
        const bishopTopMesh = new THREE.Mesh(bishopTop);

        group.add(bishopBaseMesh);
        group.add(bishopMiddleMesh);
        group.add(bishopTopMesh);
        break;

      case 'q':
        const queenBase = new THREE.CylinderGeometry(radius * 0.8, radius * 0.9, height * 0.3, 16);
        const queenMiddle = new THREE.CylinderGeometry(radius * 0.6, radius * 0.7, height * 0.8, 16);
        queenMiddle.translate(0, height * 0.55, 0);

        const queenCrown = new THREE.CylinderGeometry(radius * 0.7, radius * 0.6, height * 0.2, 8);
        queenCrown.translate(0, height * 0.95, 0);

        const queenBaseMesh = new THREE.Mesh(queenBase);
        const queenMiddleMesh = new THREE.Mesh(queenMiddle);
        const queenCrownMesh = new THREE.Mesh(queenCrown);

        group.add(queenBaseMesh);
        group.add(queenMiddleMesh);
        group.add(queenCrownMesh);
        break;

      case 'k':
        const kingBase = new THREE.CylinderGeometry(radius * 0.8, radius * 0.9, height * 0.3, 16);
        const kingMiddle = new THREE.CylinderGeometry(radius * 0.6, radius * 0.7, height * 0.8, 16);
        kingMiddle.translate(0, height * 0.55, 0);

        const kingCrown = new THREE.CylinderGeometry(radius * 0.7, radius * 0.6, height * 0.2, 8);
        kingCrown.translate(0, height * 0.95, 0);

        const crossVert = new THREE.BoxGeometry(radius * 0.1, height * 0.4, radius * 0.1);
        crossVert.translate(0, height * 1.25, 0);
        const crossHorz = new THREE.BoxGeometry(radius * 0.3, height * 0.1, radius * 0.1);
        crossHorz.translate(0, height * 1.15, 0);

        const kingBaseMesh = new THREE.Mesh(kingBase);
        const kingMiddleMesh = new THREE.Mesh(kingMiddle);
        const kingCrownMesh = new THREE.Mesh(kingCrown);
        const crossVertMesh = new THREE.Mesh(crossVert);
        const crossHorzMesh = new THREE.Mesh(crossHorz);

        group.add(kingBaseMesh);
        group.add(kingMiddleMesh);
        group.add(kingCrownMesh);
        group.add(crossVertMesh);
        group.add(crossHorzMesh);
        break;

      default:
        const defaultGeometry = new THREE.CylinderGeometry(radius, radius, height, 16);
        group.add(new THREE.Mesh(defaultGeometry));
        break;
    }

    const material = new THREE.MeshStandardMaterial({
      color: PIECE_COLORS[color],
      metalness: 0.1,
      roughness: 0.8
    });

    group.children.forEach(mesh => {
      if (mesh) {
        mesh.material = material;
        mesh.castShadow = true;
        mesh.receiveShadow = false;
      }
    });

    return group;
  };

  const updateBoardDisplay = () => {
    if (!chessRef.current || !sceneRef.current) return;

    try {
      if (!modulesRef.current || !modulesRef.current.THREE) {
        console.error("THREE.js module not loaded yet");
        return;
      }

      const THREE = modulesRef.current.THREE;
      const board = chessRef.current.board();

      resetSquareColors();

      Object.values(chessPiecesRef.current).forEach(piece => {
        if (piece && piece.parent) {
          piece.parent.remove(piece);
        }
      });

      chessPiecesRef.current = {};

      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const piece = board[i][j];
          if (!piece) continue;

          const { type, color } = piece;

          const file = String.fromCharCode(97 + j);
          const rank = 8 - i;
          const squareName = file + rank;

          const pieceObject = createPiece(THREE, type, color);

          pieceObject.userData = {
            squareName,
            pieceType: type,
            pieceColor: color
          };

          if (pieceObject instanceof THREE.Group) {
            pieceObject.children.forEach(child => {
              if (child) {
                child.userData = {
                  parent: pieceObject,
                  ...pieceObject.userData
                };
              }
            });
          }

          const x = j - 3.5;
          const z = i - 3.5;
          pieceObject.position.set(x, 0.6, z);

          sceneRef.current.add(pieceObject);

          chessPiecesRef.current[squareName] = pieceObject;
        }
      }
    } catch (error) {
      console.error("Error updating board display:", error);
    }
  };

  const makeAIMove = useCallback(() => {
    if (!chessRef.current) return;

    setThinking(true);

    setTimeout(async () => {
      if (!chessRef.current) return;

      try {
        const moves = chessRef.current.moves();

        if (moves.length > 0) {
          let move;

          if (difficulty === 'easy') {
            move = moves[Math.floor(Math.random() * moves.length)];
          } else if (difficulty === 'medium') {
            const capturesAndChecks = moves.filter(m => m.includes('x') || m.includes('+'));
            move = capturesAndChecks.length > 0
              ? capturesAndChecks[Math.floor(Math.random() * capturesAndChecks.length)]
              : moves[Math.floor(Math.random() * moves.length)];
          } else {
            const checkmates = moves.filter(m => m.includes('#'));
            const captures = moves.filter(m => m.includes('x'));
            const checks = moves.filter(m => m.includes('+'));

            if (checkmates.length > 0) {
              move = checkmates[0];
            } else if (captures.length > 0) {
              const highValueCaptures = captures.filter(m => m.includes('xQ') || m.includes('xR') || m.includes('xB') || m.includes('xN'));
              move = highValueCaptures.length > 0
                ? highValueCaptures[Math.floor(Math.random() * highValueCaptures.length)]
                : captures[Math.floor(Math.random() * captures.length)];
            } else if (checks.length > 0) {
              move = checks[Math.floor(Math.random() * checks.length)];
            } else {
              move = moves[Math.floor(Math.random() * moves.length)];
            }
          }

          const moveResult = chessRef.current.move(move);

          if (wsRef.current && isConnectedToShyft) {
            try {
              wsRef.current.send(JSON.stringify({
                type: 'chess_ai_move',
                move,
                moveResult,
                difficulty
              }));
            } catch (e) {
              console.error('Error sending AI move to WebSocket:', e);
            }
          }

          updateBoardDisplay();

          checkGameStatus();
        }
      } catch (error) {
        console.error("Error making AI move:", error);
      } finally {
        setThinking(false);
      }
    }, 1000);
  }, [difficulty, isConnectedToShyft]);

  const checkGameStatus = useCallback(async () => {
    if (!chessRef.current) return;

    if (chessRef.current.isGameOver()) {
      let result = 'draw';

      if (chessRef.current.isCheckmate()) {
        const loser = chessRef.current.turn();
        if (loser === 'w') {
          result = 'loss';
          setGameStatus('loss');
        } else {
          result = 'win';
          setGameStatus('win');

          if (chessRewards.isInitialized && !isIsolated) {
            const rewardResult = await chessRewards.rewardForWin(difficulty);
            if (rewardResult.success) {
              setLastReward({
                amount: rewardResult.rewardAmount,
                xp: rewardResult.xpAmount,
                reason: `Chess win on ${difficulty}`
              });
              setShowRewardAnimation(true);

              setTimeout(() => {
                setShowRewardAnimation(false);
              }, 5000);
            }
          }
        }
      } else if (chessRef.current.isDraw()) {
        setGameStatus('draw');

        if (chessRewards.isInitialized && !isIsolated) {
          const rewardResult = await chessRewards.rewardForDraw(difficulty);
          if (rewardResult.success) {
            setLastReward({
              amount: rewardResult.rewardAmount,
              xp: rewardResult.xpAmount,
              reason: `Chess draw on ${difficulty}`
            });
            setShowRewardAnimation(true);

            setTimeout(() => {
              setShowRewardAnimation(false);
            }, 5000);
          }
        }
      }

      if (wsRef.current && isConnectedToShyft && !isIsolated) {
        wsRef.current.send(JSON.stringify({
          type: 'chess_game_end',
          result,
          difficulty,
          moveCount: chessRef.current.history().length
        }));
      }

      if (onGameEnd) {
        onGameEnd(result);
      }
    }
  }, [onGameEnd, difficulty, chessRewards, isIsolated, isConnectedToShyft]);

  const renderRewardAnimation = () => {
    if (!showRewardAnimation || !lastReward) return null;

    return (
      <div className="chess-reward-animation">
        <div className="reward-content">
          <h3>Reward Earned!</h3>
          <p>{lastReward.amount} EMB tokens</p>
          {lastReward.xp && <p>{lastReward.xp} XP</p>}
          <p className="reward-reason">{lastReward.reason}</p>
        </div>
      </div>
    );
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-900/90 rounded-lg p-4 border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
        <div className="text-center max-w-md">
          <div className="text-red-500 font-medium mb-2">Failed to load 3D Chess</div>
          <p className="text-gray-400 text-sm mb-4">
            There was a problem loading the game. This could be due to WebGL not being supported in your browser,
            or the browser's privacy settings blocking certain features.
          </p>
          
          {webGLSupported === false && (
            <div className="bg-red-900/30 border border-red-700/40 rounded-md p-3 mb-4">
              <p className="text-red-300 text-xs mb-2">
                <strong>WebGL Not Available:</strong> Your browser doesn't support WebGL or it's currently disabled.
              </p>
              {webGLError && (
                <p className="text-yellow-300 text-xs mb-2">
                  <strong>Specific Issue:</strong> {webGLError}
                </p>
              )}
              <ul className="text-red-200 text-xs list-disc list-inside space-y-1">
                <li>Try updating your browser to the latest version</li>
                <li>Check if your graphics card supports WebGL</li>
                <li>Disable hardware acceleration and try again</li>
                <li>If using Brave, disable shields for this site</li>
              </ul>
            </div>
          )}
          
          <div className="space-y-3 mt-4">
            <button 
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white px-4 py-2 rounded w-full font-medium shadow-md shadow-blue-500/20 transition duration-200"
              onClick={() => {
                retryCount.current = 0;
                setLoadError(false);
                setWebGLError(null);
                setRetryAttempted(true);
                setLoadingMessage('Reloading chess game...');
                setTimeout(() => window.location.reload(), 500);
              }}
            >
              Reload Game
            </button>
            <button
              className="bg-gradient-to-r from-gray-600 to-gray-800 hover:brightness-110 text-white px-4 py-2 rounded w-full text-sm shadow-md transition duration-200"
              onClick={() => {
                retryCount.current++;
                setLoadError(false);
                setRetryAttempted(true);
                setLoadingMessage('Loading with compatibility settings...');
                if (onGameEnd) onGameEnd('restart');
              }}
            >
              Try Compatibility Mode
            </button>
            {retryCount.current > 0 && (
              <button
                className="bg-gradient-to-r from-yellow-600 to-amber-700 hover:brightness-110 text-white px-4 py-2 rounded w-full text-sm transition duration-200"
                onClick={() => {
                  window.location.href = '/arcade?mode=2d';
                }}
              >
                Try 2D Mode Instead
              </button>
            )}
          </div>
          
          <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/40 rounded-md">
            <p className="text-blue-300 text-sm">
              <strong>Troubleshooting Tips:</strong>
            </p>
            <ul className="text-blue-200 text-xs list-disc list-inside mt-2 space-y-1">
              <li>Make sure your browser is updated to the latest version</li>
              <li>Check if WebGL is enabled in your browser settings</li>
              <li>Disable any browser extensions that might block WebGL content</li>
              <li>If using a privacy-focused browser like Brave, temporarily disable shields</li>
              <li>Try using Chrome or Edge which generally have better WebGL support</li>
            </ul>
          </div>

          {retryAttempted && (
            <div className="mt-4 p-3 bg-purple-900/30 border border-purple-700/40 rounded-md">
              <p className="text-purple-300 text-sm">
                <strong>Need help?</strong> If you continue having issues after trying the suggestions, please contact our support team at support@embassytrade.ai with the following error details:
              </p>
              <div className="bg-gray-900 text-xs text-purple-200 p-2 mt-2 rounded overflow-auto max-h-16">
                Error: {webGLError || "WebGL not supported"}
                <br />
                Browser: {navigator.userAgent}
              </div>
            </div>
          )}

          {retryCount.current > 0 && !webGLError && (
            <div className="mt-4 p-3 bg-yellow-800/30 border border-yellow-700/30 rounded-md">
              <p className="text-yellow-300 text-sm">
                <strong>Browser compatibility note:</strong> Brave and some other privacy-focused browsers may block WebGL content. 
                Try disabling shields for this site, use Chrome/Edge, or try the 2D mode for the best experience.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!mountRef.current || !chessRef.current) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-900/90 rounded-lg p-4 border border-blue-500/30">
        <div className="flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <div className="text-blue-400 mb-3">{loadingMessage}</div>
          {loadTimeoutRef.current && (
            <div className="text-xs text-blue-300 mt-2">
              If loading takes too long, you can {" "}
              <button 
                className="underline text-cyan-400 hover:text-cyan-300"
                onClick={() => {
                  if (loadTimeoutRef.current) {
                    clearTimeout(loadTimeoutRef.current);
                  }
                  setLoadError(true);
                }}
              >
                try compatibility mode
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mountRef} 
        className="w-full h-full cursor-pointer"
      />
      
      {gameStatus !== 'playing' && (
        <div className="absolute top-4 left-4 px-4 py-2 rounded-md text-white font-medium bg-gray-800/80 backdrop-blur-sm">
          {gameStatus === 'check' && "Check!"}
          {gameStatus === 'checkmate' && `Checkmate! ${chessRef.current?.turn() === 'w' ? 'Black' : 'White'} wins!`}
          {gameStatus === 'draw' && "Draw!"}
          {gameStatus === 'stalemate' && "Stalemate!"}
          {gameStatus === 'win' && "You won!"}
          {gameStatus === 'loss' && "You lost!"}
        </div>
      )}
      
      {thinking && (
        <div className="absolute bottom-4 right-4 px-4 py-2 rounded-md bg-blue-900/80 text-blue-100 flex items-center backdrop-blur-sm">
          <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse mr-2"></div>
          Computer is thinking...
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 px-4 py-2 rounded-md bg-gray-800/80 text-white backdrop-blur-sm text-sm">
        Click on a piece to select it, then click on a highlighted square to move
      </div>
      
      <div className="absolute top-4 right-4 px-4 py-2 rounded-md bg-gray-800/80 text-white backdrop-blur-sm">
        {thinking ? "Computer's turn" : "Your turn"}
      </div>
      
      {!isIsolated && (
        <div className={`absolute bottom-4 right-4 px-2 py-1 rounded-md text-xs ${
          isConnectedToShyft ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
        }`}>
          {isConnectedToShyft ? 'Connected to Shyft' : 'Offline Mode'}
        </div>
      )}

      {renderRewardAnimation()}
    </div>
  );
};

export default React.memo(ChessGame);