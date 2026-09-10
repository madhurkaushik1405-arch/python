/* ═══════════════════════════════════════════════════════════
   AURORA — WebGL scene
   shader aurora · displaced icosahedron · 15k GPU particles
   bloom post-processing · mouse parallax · quality tiers
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var canvas = document.getElementById("webgl");
  var state = {
    enabled: false,
    quality: "high", // high | low
    mouse: { x: 0, y: 0, tx: 0, ty: 0 },
    scroll: 0,
    clock: null,
    paused: false
  };

  /* ── capability probe ─────────────────────────────────── */
  function capable() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
        (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  }
  function isLowEnd() {
    var m = navigator.hardwareConcurrency || 4;
    var mobile = /Mobi|Android/i.test(navigator.userAgent);
    return mobile || m <= 4;
  }

  /* ── shaders ──────────────────────────────────────────── */
  var AURORA_FRAG = [
    "precision highp float;",
    "uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse;",
    "varying vec2 vUv;",

    "vec2 hash(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return -1.0+2.0*fract(sin(p)*43758.5453123); }",
    "float noise(vec2 p){",
    "  vec2 i=floor(p), f=fract(p);",
    "  vec2 u=f*f*(3.0-2.0*f);",
    "  return mix(mix(dot(hash(i+vec2(0,0)),f-vec2(0,0)),dot(hash(i+vec2(1,0)),f-vec2(1,0)),u.x),",
    "             mix(dot(hash(i+vec2(0,1)),f-vec2(0,1)),dot(hash(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);",
    "}",
    "float fbm(vec2 p){ float v=0.0,a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);",
    "  for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=0.5; } return v; }",

    "void main(){",
    "  vec2 uv=vUv; vec2 p=(uv-0.5)*vec2(uRes.x/uRes.y,1.0);",
    "  float t=uTime*0.06;",
    "  vec2 flow=vec2(fbm(p*1.4+vec2(t*0.7,-t*0.4)), fbm(p*1.4-vec2(t*0.5,t*0.6)));",
    "  float bands=fbm(p*2.1+flow*1.7+vec2(0.0,t));",
    "  float curtain=fbm(vec2(p.x*3.4+t, p.y*1.1-flow.y*0.8));",
    "  float ridge=smoothstep(0.42,0.95,curtain*0.6+bands*0.55+0.18);",
    "  vec3 cviolet=vec3(0.42,0.18,0.95);",
    "  vec3 ccyan=vec3(0.02,0.62,0.83);",
    "  vec3 cpink=vec3(0.95,0.55,0.98);",
    "  vec3 col=mix(cviolet,ccyan,clamp(p.x*0.9+0.55,0.0,1.0));",
    "  col=mix(col,cpink,clamp(ridge*p.y*0.9,0.0,1.0));",
    "  col*=ridge*(0.32+0.5*ridge);",
    "  float glow=fbm(p*0.8-t*0.25)*0.5+0.5;",
    "  col+=glow*glow*0.10;",
    "  vec2 m=uMouse*0.35;",
    "  float pool=exp(-dot(p-m,p-m)*1.1);",
    "  col+=pool*0.045;",
    "  float vig=smoothstep(1.25,0.35,length(uv-0.5));",
    "  col*=mix(0.72,1.0,vig);",
    "  col=pow(max(col,0.0),vec3(0.9));",
    "  gl_FragColor=vec4(col,1.0);",
    "}"
  ].join("\n");

  var BASIC_VERT = [
    "varying vec2 vUv;",
    "void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }"
  ].join("\n");

  var CRYSTAL_VERT = [
    "uniform float uTime; uniform float uAmp;",
    "varying vec3 vNormal; varying vec3 vPos; varying float vDisp;",
    "vec3 hash3(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return -1.0+2.0*fract(sin(p)*43758.5453123); }",
    "float noise(vec3 p){",
    "  vec3 i=floor(p), f=fract(p); vec3 u=f*f*(3.0-2.0*f);",
    "  return mix(mix(mix(dot(hash3(i+vec3(0,0,0)),f-vec3(0,0,0)),dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),",
    "                 mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),",
    "             mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),",
    "                 mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);",
    "}",
    "void main(){",
    "  float n1=noise(normal*2.1+uTime*0.22);",
    "  float n2=noise(normal*5.3-uTime*0.14);",
    "  float d=n1*0.62+n2*0.28;",
    "  vDisp=d;",
    "  vec3 pos=position+normal*d*uAmp;",
    "  vNormal=normalize(normalMatrix*normal);",
    "  vec4 mv=modelViewMatrix*vec4(pos,1.0);",
    "  vPos=mv.xyz;",
    "  gl_Position=projectionMatrix*mv;",
    "}"
  ].join("\n");

  var CRYSTAL_FRAG = [
    "uniform float uTime;",
    "varying vec3 vNormal; varying vec3 vPos; varying float vDisp;",
    "void main(){",
    "  vec3 N=normalize(vNormal);",
    "  vec3 V=normalize(-vPos);",
    "  float fres=pow(1.0-max(dot(N,V),0.0),2.4);",
    "  vec3 base=mix(vec3(0.05,0.05,0.12), vec3(0.35,0.10,0.75), clamp(vDisp*1.6+0.5,0.0,1.0));",
    "  vec3 rim1=vec3(0.05,0.75,0.95);",
    "  vec3 rim2=vec3(0.98,0.55,0.95);",
    "  float sw=0.5+0.5*sin(uTime*0.6+vPos.x*1.8+vPos.y*1.2);",
    "  vec3 rim=mix(rim1,rim2,sw);",
    "  vec3 col=base+rim*fres*1.05;",
    "  col+=vec3(0.9,0.4,1.0)*max(vDisp,0.0)*0.32;",
    "  gl_FragColor=vec4(col,1.0);",
    "}"
  ].join("\n");

  var PARTICLE_VERT = [
    "uniform float uTime; uniform float uSize; uniform vec2 uMouse;",
    "attribute float aSeed;",
    "varying float vSeed; varying float vFade;",
    "void main(){",
    "  vSeed=aSeed;",
    "  vec3 p=position;",
    "  float t=uTime;",
    "  p.x+=sin(t*0.35+aSeed*17.0)*0.55;",
    "  p.y+=cos(t*0.28+aSeed*23.0)*0.55 + mod(t*0.08+aSeed,4.0)-2.0;",
    "  p.z+=sin(t*0.22+aSeed*31.0)*0.55;",
    "  vec2 m=uMouse*1.6;",
    "  float d=distance(p.xy,m);",
    "  p.xy+=(p.xy-m)*0.22*exp(-d*d*0.25);",
    "  vec4 mv=modelViewMatrix*vec4(p,1.0);",
    "  gl_PointSize=uSize*(60.0/-mv.z)*(0.5+aSeed*0.9);",
    "  vFade=smoothstep(26.0,6.0,-mv.z);",
    "  gl_Position=projectionMatrix*mv;",
    "}"
  ].join("\n");

  var PARTICLE_FRAG = [
    "precision highp float;",
    "varying float vSeed; varying float vFade;",
    "void main(){",
    "  vec2 c=gl_PointCoord-0.5;",
    "  float d=length(c);",
    "  if(d>0.5) discard;",
    "  float a=smoothstep(0.5,0.05,d);",
    "  vec3 c1=vec3(0.55,0.35,1.0);",
    "  vec3 c2=vec3(0.10,0.80,0.95);",
    "  vec3 c3=vec3(0.98,0.60,0.98);",
    "  vec3 col=vSeed<0.5?mix(c1,c2,vSeed*2.0):mix(c2,c3,(vSeed-0.5)*2.0);",
    "  gl_FragColor=vec4(col,a*vFade*0.5);",
    "}"
  ].join("\n");

  /* ── scene pieces ─────────────────────────────────────── */
  var renderer, scene, camera, composer, bloom, rafId;
  var auroraMat, crystalMat, wireMat, partMat, crystal, wire, particles, bgMesh;
  var group;

  function build() {
    var lowEnd = isLowEnd();
    state.quality = lowEnd ? "low" : "high";

    renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: !lowEnd, alpha: false, powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030308);
    scene.fog = new THREE.FogExp2(0x030308, 0.05);

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    group = new THREE.Group();
    scene.add(group);

    /* aurora background plane */
    auroraMat = new THREE.ShaderMaterial({
      vertexShader: BASIC_VERT, fragmentShader: AURORA_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uMouse: { value: new THREE.Vector2(0, 0) }
      },
      depthWrite: false, depthTest: false
    });
    bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), auroraMat);
    bgMesh.frustumCulled = false;
    scene.add(bgMesh);

    /* displaced crystal */
    crystalMat = new THREE.ShaderMaterial({
      vertexShader: CRYSTAL_VERT, fragmentShader: CRYSTAL_FRAG,
      uniforms: { uTime: { value: 0 }, uAmp: { value: 0.62 } }
    });
    var geo = new THREE.IcosahedronGeometry(1.55, state.quality === "high" ? 64 : 24);
    crystal = new THREE.Mesh(geo, crystalMat);
    group.add(crystal);

    wireMat = new THREE.MeshBasicMaterial({
      color: 0x7c3aed, wireframe: true, transparent: true, opacity: 0.10
    });
    wire = new THREE.Mesh(geo, wireMat);
    wire.scale.setScalar(1.003);
    group.add(wire);

    /* particles */
    var COUNT = state.quality === "high" ? 15000 : 5000;
    var pos = new Float32Array(COUNT * 3);
    var seed = new Float32Array(COUNT);
    for (var i = 0; i < COUNT; i++) {
      var r = 3.2 + Math.random() * 11;
      var th = Math.random() * Math.PI * 2;
      var ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.6;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      seed[i] = Math.random();
    }
    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    partMat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT, fragmentShader: PARTICLE_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: state.quality === "high" ? 1.3 : 1.0 },
        uMouse: { value: new THREE.Vector2(0, 0) }
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    particles = new THREE.Points(pGeo, partMat);
    scene.add(particles);

    /* post-processing */
    if (THREE.EffectComposer && THREE.UnrealBloomPass) {
      composer = new THREE.EffectComposer(renderer);
      composer.addPass(new THREE.RenderPass(scene, camera));
      bloom = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5, 0.55, 0.32
      );
      composer.addPass(bloom);
    }

    state.clock = new THREE.Clock();
    state.enabled = true;
    tick();
  }

  /* ── render loop ──────────────────────────────────────── */
  function tick() {
    rafId = requestAnimationFrame(tick);
    if (state.paused || document.hidden) return;

    var t = state.clock.getElapsedTime();

    state.mouse.x += (state.mouse.tx - state.mouse.x) * 0.045;
    state.mouse.y += (state.mouse.ty - state.mouse.y) * 0.045;

    auroraMat.uniforms.uTime.value = t;
    auroraMat.uniforms.uMouse.value.set(state.mouse.x, state.mouse.y);

    crystalMat.uniforms.uTime.value = t;
    partMat.uniforms.uTime.value = t;
    partMat.uniforms.uMouse.value.set(state.mouse.x, state.mouse.y);

    crystal.rotation.y = t * 0.14;
    crystal.rotation.x = Math.sin(t * 0.18) * 0.22;
    wire.rotation.copy(crystal.rotation);
    group.position.y = Math.sin(t * 0.5) * 0.22 - state.scroll * 1.6;
    group.rotation.z = state.mouse.x * 0.12;
    group.rotation.x = -state.mouse.y * 0.16;

    particles.rotation.y = t * 0.02 + state.mouse.x * 0.08;
    particles.rotation.x = state.mouse.y * 0.06;

    camera.position.x = state.mouse.x * 0.55;
    camera.position.y = -state.mouse.y * 0.4 + Math.sin(t * 0.3) * 0.1;
    camera.lookAt(0, 0, 0);

    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  /* ── quality ──────────────────────────────────────────── */
  function setQuality(mode) {
    if (!state.enabled) return;
    state.quality = mode;
    var hi = mode === "high";
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 2 : 1));
    if (bloom) bloom.enabled = hi;
    if (wireMat) wireMat.opacity = hi ? 0.10 : 0.06;
    if (crystalMat) crystalMat.uniforms.uAmp.value = hi ? 0.62 : 0.5;
    particles.visible = hi ? true : particles.visible; // keep on, cheaper enough
    document.body.classList.toggle("no-fx", !hi);
    onResize();
  }
  function toggleQuality() {
    setQuality(state.quality === "high" ? "low" : "high");
    return state.quality;
  }

  /* ── resize / input ───────────────────────────────────── */
  function onResize() {
    if (!state.enabled) return;
    var w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
    auroraMat.uniforms.uRes.value.set(w, h);
  }

  function onMouse(e) {
    state.mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }

  function onScroll(scrollY) {
    state.scroll = Math.min(scrollY / Math.max(window.innerHeight, 1), 1.4);
  }

  function init() {
    if (!capable()) {
      document.body.classList.add("css-fx");
      canvas.style.display = "none";
      return false;
    }
    build();
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouse, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (state.clock && !document.hidden) state.clock.getDelta(); // avoid time jump
    });
    return true;
  }

  window.AuroraScene = {
    init: init,
    toggleQuality: toggleQuality,
    setQuality: setQuality,
    onScroll: onScroll,
    get quality() { return state.quality; },
    get enabled() { return state.enabled; }
  };
})();
