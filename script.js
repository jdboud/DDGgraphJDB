// script.js

// ─── 1. Parse‐in Raw Data ─────────────────────────────────────────────────────

function parseMyLines(text) {
  const recs = [];
  text.split(/\r?\n/).forEach(line => {
    const m = line.match(
      /Y1:\s*(\d+)\s*Y2:\s*(\d+).*?Receiver\s*1:\s*([\d,\s]+)\s*-\s*PotVals:\s*([\d,\s]+)/
    );
    if (!m) return;
    const X = +m[1], Y = +m[2];
    const zs = m[3].split(',').map(s => +s.trim());
    const ds = m[4].split(',').map(s => +s.trim());
    zs.forEach((z, i) => {
      if (ds[i] > 0) recs.push({ X, Y, Z: z, Density: ds[i] });
    });
  });
  return recs;
}

document.getElementById('parseBtn').addEventListener('click', () => {
  const txt = document.getElementById('rawData').value.trim();
  if (!txt) return alert('Please paste your data first.');
  const records = parseMyLines(txt);
  if (!records.length) return alert('No valid records found.');
  renderVisualization(records);
});


// ─── 2. Three.js & D3 Setup ──────────────────────────────────────────────────

// Scene, camera, renderer
const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff, 1);
document.body.appendChild(renderer.domElement);

// Lights
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 1, 1).normalize();
scene.add(light);
scene.add(new THREE.AmbientLight(0xfffff4, 1));

// Globals
let formattedData     = [];
let objects           = [];
let initialPositions  = [];
let colorScale;
let xExtent, yExtent, xRange, yRange, xCenter, yCenter;
const zScalingFactor  = 1000;

// Compute extents & color scale
function computeScales() {
  xExtent = d3.extent(formattedData, d => d.X);
  yExtent = d3.extent(formattedData, d => d.Y);
  xRange  = xExtent[1] - xExtent[0];
  yRange  = yExtent[1] - yExtent[0];
  xCenter = (xExtent[0] + xExtent[1]) / 2;
  yCenter = (yExtent[0] + yExtent[1]) / 2;
  colorScale = d3.scaleSequential(d3.interpolateRgb("white", "salmon"))
                 .domain(d3.extent(formattedData, d => d.Density));
}


// ─── 3. Graph‐Creation Functions ─────────────────────────────────────────────

function createBarGraph() {
  formattedData.forEach(d => {
    const geom     = new THREE.BoxGeometry(1, 1, d.Z / zScalingFactor);
    const mat      = new THREE.MeshPhongMaterial({ color: new THREE.Color(colorScale(d.Density)), transparent:true, opacity:0.8 });
    const bar      = new THREE.Mesh(geom, mat);
    const posX     = (d.X - xCenter)/xRange*80;
    const posY     = (d.Y - yCenter)/yRange*80;
    const posZ     = d.Z/(2*zScalingFactor);
    bar.position.set(posX, posY, posZ);

    // bounding sphere guard
    if (!Array.from(geom.attributes.position.array).some(isNaN)) {
      geom.computeBoundingSphere();
    }

    scene.add(bar);
    objects.push(bar);
    initialPositions.push({ x:posX, y:posY, z:posZ });
  });
}

function createScatterPlot() {
  formattedData.forEach(d => {
    const geom = new THREE.SphereGeometry(d.Z/zScalingFactor/2, 16, 16);
    const mat  = new THREE.MeshPhongMaterial({ color: new THREE.Color(colorScale(d.Density)), transparent:true, opacity:0.8 });
    const pt   = new THREE.Mesh(geom, mat);
    const posX = (d.X - xCenter)/xRange*80;
    const posY = (d.Y - yCenter)/yRange*80;
    const posZ = d.Z/zScalingFactor;
    pt.position.set(posX, posY, posZ);

    if (!Array.from(geom.attributes.position.array).some(isNaN)) {
      geom.computeBoundingSphere();
    }

    scene.add(pt);
    objects.push(pt);
    initialPositions.push({ x:posX, y:posY, z:posZ });
  });
}

function createSurfacePlot() {
  const gridSize = Math.sqrt(formattedData.length);
  const geom     = new THREE.PlaneGeometry(gridSize, gridSize, gridSize-1, gridSize-1);
  const verts    = geom.attributes.position.array;
  formattedData.forEach((d,i) => {
    verts[i*3+2] = d.Z/zScalingFactor;
  });
  geom.computeVertexNormals();
  if (!verts.some(isNaN)) geom.computeBoundingSphere();
  const mat     = new THREE.MeshPhongMaterial({ color:0x999999, side:THREE.DoubleSide, flatShading:true });
  const surf    = new THREE.Mesh(geom, mat);
  surf.rotation.x = -Math.PI/2;
  scene.add(surf);
  objects.push(surf);
}

function createHeatmap() {
  formattedData.forEach(d => {
    const geom = new THREE.PlaneGeometry(1,1);
    const mat  = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorScale(d.Density)), transparent:true, opacity:0.8 });
    const pl   = new THREE.Mesh(geom, mat);
    const posX = (d.X - xCenter)/xRange*80;
    const posY = (d.Y - yCenter)/yRange*80;
    pl.position.set(posX, posY, 0);

    if (!Array.from(geom.attributes.position.array).some(isNaN)) {
      geom.computeBoundingSphere();
    }

    scene.add(pl);
    objects.push(pl);
    initialPositions.push({ x:posX, y:posY, z:0 });
  });
}

function createLineGraph() {
  const geom = new THREE.BufferGeometry();
  const verts = [], cols = [];
  formattedData.forEach(d => {
    const posX = (d.X - xCenter)/xRange*80;
    const posY = (d.Y - yCenter)/yRange*80;
    const posZ = d.Z/zScalingFactor;
    verts.push(posX, posY, posZ);
    const c = new THREE.Color(colorScale(d.Density));
    cols.push(c.r, c.g, c.b);
  });
  geom.setAttribute('position', new THREE.Float32BufferAttribute(verts,3));
  geom.setAttribute('color',    new THREE.Float32BufferAttribute(cols,3));
  if (!verts.some(isNaN)) geom.computeBoundingSphere();
  const mat = new THREE.LineBasicMaterial({ vertexColors:true, transparent:true, opacity:0.8 });
  const line = new THREE.Line(geom, mat);
  scene.add(line);
  objects.push(line);
}

function create3DHeatmap() {
  formattedData.forEach(d => {
    const geom = new THREE.BoxGeometry(1,1,d.Z/zScalingFactor);
    const mat  = new THREE.MeshPhongMaterial({ color: new THREE.Color(colorScale(d.Density)), transparent:true, opacity:0.8 });
    const cube = new THREE.Mesh(geom, mat);
    const posX = (d.X - xCenter)/xRange*80;
    const posY = (d.Y - yCenter)/yRange*80;
    const posZ = d.Z/(2*zScalingFactor);
    cube.position.set(posX, posY, posZ);

    if (!Array.from(geom.attributes.position.array).some(isNaN)) {
      geom.computeBoundingSphere();
    }

    scene.add(cube);
    objects.push(cube);
    initialPositions.push({ x:posX, y:posY, z:posZ });
  });
}


// ─── 4. Render & Controls ────────────────────────────────────────────────────

function renderVisualization(data) {
  formattedData = data;
  computeScales();
  objects.forEach(o => scene.remove(o));
  objects = [];
  initialPositions = [];

  const type = document.getElementById('visualizationType').value;
  if (type === 'bar')     createBarGraph();
  else if (type === 'scatter')  createScatterPlot();
  else if (type === 'surface')  createSurfacePlot();
  else if (type === 'heatmap')  createHeatmap();
  else if (type === 'line')     createLineGraph();
  else if (type === '3dheatmap') create3DHeatmap();
}

document.getElementById('visualizationType')
  .addEventListener('change', () => renderVisualization(formattedData));

// Sliders
const sliderX = document.getElementById('sliderX');
const sliderY = document.getElementById('sliderY');
const sliderZ = document.getElementById('sliderZ');
const scaleX  = document.getElementById('scaleX');
const scaleY  = document.getElementById('scaleY');
const scaleZ  = document.getElementById('scaleZ');
const opacity = document.getElementById('opacity');
const size    = document.getElementById('size');
const lw      = document.getElementById('lineWeight');
const zoom    = document.getElementById('zoom');
const rot     = document.getElementById('rotation');

sliderX .addEventListener('input', ()=>{ camera.position.x = +sliderX.value; camera.lookAt(scene.position); });
sliderY .addEventListener('input', ()=>{ camera.position.y = +sliderY.value; camera.lookAt(scene.position); });
sliderZ .addEventListener('input', ()=>{ camera.position.z = +sliderZ.value; camera.lookAt(scene.position); });
zoom    .addEventListener('input', ()=>{ camera.zoom = +zoom.value/50; camera.updateProjectionMatrix(); });
rot     .addEventListener('input', ()=>{ camera.rotation.z = +rot.value*Math.PI/180; });

function updateObjectPositions() {
  const sx = +scaleX.value/80, sy = +scaleY.value/80, sz = +scaleZ.value/80;
  objects.forEach((o,i) => {
    o.position.set(
      initialPositions[i].x * sx,
      initialPositions[i].y * sy,
      initialPositions[i].z * sz
    );
  });
}
function updateOpacity() {
  const v = +opacity.value;
  objects.forEach(o => o.material.opacity = v);
}
function updateSize() {
  const v = +size.value;
  objects.forEach(o => {
    if (o.geometry instanceof THREE.BoxGeometry || o.geometry instanceof THREE.SphereGeometry) {
      o.scale.set(v, v, v);
    }
  });
}
function updateLineWeight() {
  const v = +lw.value;
  objects.forEach(o => {
    if (o instanceof THREE.Line) o.material.linewidth = v;
  });
}

scaleX.addEventListener('input', updateObjectPositions);
scaleY.addEventListener('input', updateObjectPositions);
scaleZ.addEventListener('input', updateObjectPositions);
opacity.addEventListener('input', updateOpacity);
size.addEventListener('input', updateSize);
lw.addEventListener('input', updateLineWeight);


// ─── 5. Fallback XLSX Load ───────────────────────────────────────────────────

if (!document.getElementById('rawData').value.trim()) {
  fetch('https://jdboud.github.io/DDGgraphJDB/data/binaryCleanUserNumberCollections3Test024.xlsx')
    .then(r => r.arrayBuffer())
    .then(buf => {
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
      const arr = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 })
        .slice(1)
        .map(r => ({ X: r[0], Y: r[1], Z: r[2], Density: r[3] }))
        .filter(d => d.Density > 0);
      renderVisualization(arr);
    })
    .catch(err => console.error('Fetch XLSX error:', err));
}


// ─── 6. Camera & Animate ────────────────────────────────────────────────────

camera.position.set(50, 50, 50);
camera.lookAt(scene.position);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
