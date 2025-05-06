fetch('https://jdboud.github.io/DDGgraphJDB/data/binaryCleanUserNumberCollections3Test024.xlsx')
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => {
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Convert the JSON data to the required format
        const formattedData = jsonData.slice(1).map(row => ({
            X: row[0],
            Y: row[1],
            Z: row[2],
            Density: row[3]
        }));

        // Your existing visualization code goes here

        // Create a scene, camera, and renderer
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0xffffff, 1); // Set background to white
        document.body.appendChild(renderer.domElement);

        // Set up lights
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(0, 1, 1).normalize();
        scene.add(light);

        const ambientLight = new THREE.AmbientLight(0xfffff4, 1);
        scene.add(ambientLight);

        // Create a color scale for densities
        const colorScale = d3.scaleSequential(d3.interpolateRgb("white", "salmon"))
            .domain(d3.extent(formattedData, d => d.Density));

        // Determine the bounds of the data for centering
        const xExtent = d3.extent(formattedData, d => d.X);
        const yExtent = d3.extent(formattedData, d => d.Y);
        const zExtent = d3.extent(formattedData, d => d.Z);

        const xRange = xExtent[1] - xExtent[0];
        const yRange = yExtent[1] - yExtent[0];
        const zRange = zExtent[1] - zExtent[0];

        const xCenter = (xExtent[0] + xExtent[1]) / 2;
        const yCenter = (yExtent[0] + yExtent[1]) / 2;
        const zCenter = (zExtent[0] + zExtent[1]) / 2;

        const zScalingFactor = 1000; // Adjust this factor to scale Z heights for better visualization

        let objects = [];
        let initialPositions = [];

        function createBarGraph() {
            // Remove existing objects
            objects.forEach(object => scene.remove(object));
            objects = [];
            initialPositions = [];

            // Create bars from data
            formattedData.forEach(d => {
                const geometry = new THREE.BoxGeometry(1, 1, d.Z / zScalingFactor);
                const color = new THREE.Color(colorScale(d.Density));
                const material = new THREE.MeshPhongMaterial({ color: color, transparent: true, opacity: 0.8 });
                const bar = new THREE.Mesh(geometry, material);

                const posX = (d.X - xCenter) / xRange * 80; // Scale and center the bars
                const posY = (d.Y - yCenter) / yRange * 80; // Scale and center the bars
                const posZ = (d.Z / (2 * zScalingFactor)); // Center the bars on the Z axis

                bar.position.set(posX, posY, posZ);

                // Check for NaN values before computing bounding sphere
                const positions = geometry.attributes.position.array;
                let hasNaN = false;
                for (let i = 0; i < positions.length; i++) {
                    if (isNaN(positions[i])) {
                        console.error('NaN found at index', i);
                        hasNaN = true;
                        break;
                    }
                }

                if (!hasNaN) {
                    geometry.computeBoundingSphere();
                } else {
                    console.error('Bounding sphere computation aborted due to NaN values.');
                }

                scene.add(bar);
                objects.push(bar);
                initialPositions.push({ x: posX, y: posY, z: posZ });
            });
        }

        function createScatterPlot() {
            // Remove existing objects
            objects.forEach(object => scene.remove(object));
            objects = [];
            initialPositions = [];

            // Create scatter points from data
            formattedData.forEach(d => {
                const geometry = new THREE.SphereGeometry(d.Z / zScalingFactor / 2, 16, 16);
                const color = new THREE.Color(colorScale(d.Density));
                const material = new THREE.MeshPhongMaterial({ color: color, transparent: true, opacity: 0.8 });
                const point = new THREE.Mesh(geometry, material);

                const posX = (d.X - xCenter) / xRange * 80; // Scale and center the points
                const posY = (d.Y - yCenter) / yRange * 80; // Scale and center the points
                const posZ = d.Z / zScalingFactor; // Scale and center the points

                point.position.set(posX, posY, posZ);

                // Check for NaN values before computing bounding sphere
                const positions = geometry.attributes.position.array;
                let hasNaN = false;
                for (let i = 0; i < positions.length; i++) {
                    if (isNaN(positions[i])) {
                        console.error('NaN found at index', i);
                        hasNaN = true;
                        break;
                    }
                }

                if (!hasNaN) {
                    geometry.computeBoundingSphere();
                } else {
                    console.error('Bounding sphere computation aborted due to NaN values.');
                }

                scene.add(point);
                objects.push(point); // Reusing objects array for scatter points
                initialPositions.push({ x: posX, y: posY, z: posZ });
            });
        }

        function createSurfacePlot() {
            // Remove existing objects
            objects.forEach(object => scene.remove(object));
            objects = [];
            initialPositions = [];

            // Create surface plot from data
            const gridSize = Math.sqrt(formattedData.length);
            const geometry = new THREE.PlaneGeometry(gridSize, gridSize, gridSize - 1, gridSize - 1);
            const vertices = geometry.attributes.position.array;
            formattedData.forEach((d, i) => {
                vertices[i * 3 + 2] = d.Z / zScalingFactor; // Update Z value based on density
            });

            geometry.computeVertexNormals();
            const material = new THREE.MeshPhongMaterial({ color: 0x999999, side: THREE.DoubleSide, flatShading: true });
            const surface = new THREE.Mesh(geometry, material);

            surface.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
            surface.position.set(0, 0, 0);

            // Check for NaN values before computing bounding sphere
            const positions = geometry.attributes.position.array;
            let hasNaN = false;
            for (let i = 0; i < positions.length; i++) {
                if (isNaN(positions[i])) {
                    console.error('NaN found at index', i);
                    hasNaN = true;
                    break;
                }
            }

            if (!hasNaN) {
                geometry.computeBoundingSphere();
            } else {
                console.error('Bounding sphere computation aborted due to NaN values.');
            }

            scene.add(surface);
            objects.push(surface);
        }

        function createHeatmap() {
            // Remove existing objects
            objects.forEach(object => scene.remove(object));
            objects = [];
            initialPositions = [];

            // Create heatmap from data
            formattedData.forEach(d => {
                const geometry = new THREE.PlaneGeometry(1, 1);
                const color = new THREE.Color(colorScale(d.Density));
                const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
                const plane = new THREE.Mesh(geometry, material);

                const posX = (d.X - xCenter) / xRange * 80; // Scale and center the planes
                const posY = (d.Y - yCenter) / yRange * 80; // Scale and center the planes
                const posZ = 0; // Keep planes on the same Z level

                plane.position.set(posX, posY, posZ);

                // Check for NaN values before computing bounding sphere
                const positions = geometry.attributes.position.array;
                let hasNaN = false;
                for (let i = 0; i < positions.length; i++) {
                    if (isNaN(positions[i])) {
                        console.error('NaN found at index', i);
                        hasNaN = true;
                        break;
                    }
                }

                if (!hasNaN) {
                    geometry.computeBoundingSphere();
                } else {
                    console.error('Bounding sphere computation aborted due to NaN values.');
                }

                scene.add(plane);
                objects.push(plane); // Reusing objects array for heatmap planes
                initialPositions.push({ x: posX, y: posY, z: posZ });
            });
        }

        function createLineGraph() {
            // Remove existing objects
            objects.forEach(object => scene.remove(object));
            objects = [];
            initialPositions = [];

            // Create line graph from data
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const colors = [];

            formattedData.forEach(d => {
                const posX = (d.X - xCenter) / xRange * 80;
                const posY = (d.Y - yCenter) / yRange * 80;
                const posZ = (d.Z / zScalingFactor);

                vertices.push(posX, posY, posZ);

                const color = new THREE.Color(colorScale(d.Density));
                colors.push(color.r, color.g, color.b);
            });

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

            const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 });
            const line = new THREE.Line(geometry, material);

            // Check for NaN values before computing bounding sphere
            const positions = geometry.attributes.position.array;
            let hasNaN = false;
            for (let i = 0; i < positions.length; i++) {
                if (isNaN(positions[i])) {
                    console.error('NaN found at index', i);
                    hasNaN = true;
                    break;
                }
            }

            if (!hasNaN) {
                geometry.computeBoundingSphere();
            } else {
                console.error('Bounding sphere computation aborted due to NaN values.');
            }

            scene.add(line);
            objects.push(line);
        }

        function create3DHeatmap() {
            // Remove existing objects
            objects.forEach(object => scene.remove(object));
            objects = [];
            initialPositions = [];

            // Create 3D heatmap from data
            formattedData.forEach(d => {
                const geometry = new THREE.BoxGeometry(1, 1, d.Z / zScalingFactor);
                const color = new THREE.Color(colorScale(d.Density));
                const material = new THREE.MeshPhongMaterial({ color: color, transparent: true, opacity: 0.8 });
                const cube = new THREE.Mesh(geometry, material);

                const posX = (d.X - xCenter) / xRange * 80; // Scale and center the cubes
                const posY = (d.Y - yCenter) / yRange * 80; // Scale and center the cubes
                const posZ = d.Z / (2 * zScalingFactor); // Set the height position based on density

                cube.position.set(posX, posY, posZ);

                // Check for NaN values before computing bounding sphere
                const positions = geometry.attributes.position.array;
                let hasNaN = false;
                for (let i = 0; i < positions.length; i++) {
                    if (isNaN(positions[i])) {
                        console.error('NaN found at index', i);
                        hasNaN = true;
                        break;
                    }
                }

                if (!hasNaN) {
                    geometry.computeBoundingSphere();
                } else {
                    console.error('Bounding sphere computation aborted due to NaN values.');
                }

                scene.add(cube);
                objects.push(cube); // Reusing objects array for 3D heatmap cubes
                initialPositions.push({ x: posX, y: posY, z: posZ });
            });
        }

        // Initial visualization
        createBarGraph();

        // Handle visualization type change
        const visualizationType = document.getElementById('visualizationType');
        visualizationType.addEventListener('change', (event) => {
            if (event.target.value === 'bar') {
                createBarGraph();
            } else if (event.target.value === 'scatter') {
                createScatterPlot();
            } else if (event.target.value === 'surface') {
                createSurfacePlot();
            } else if (event.target.value === 'heatmap') {
                createHeatmap();
            } else if (event.target.value === 'line') {
                createLineGraph();
            } else if (event.target.value === '3dheatmap') {
                create3DHeatmap();
            }
        });

        // Position the camera at a 3/4 view
        camera.position.set(50, 50, 50);
        camera.lookAt(scene.position);

        // Sliders for interactive camera position control
        const sliderX = document.getElementById('sliderX');
        const sliderY = document.getElementById('sliderY');
        const sliderZ = document.getElementById('sliderZ');
        const scaleX = document.getElementById('scaleX');
        const scaleY = document.getElementById('scaleY');
        const scaleZ = document.getElementById('scaleZ');
        const opacitySlider = document.getElementById('opacity');
        const sizeSlider = document.getElementById('size');
        const lineWeightSlider = document.getElementById('lineWeight');
        const zoomSlider = document.getElementById('zoom');
        const rotationSlider = document.getElementById('rotation');

        sliderX.addEventListener('input', () => {
            camera.position.x = Number(sliderX.value);
            camera.lookAt(scene.position);
        });

        sliderY.addEventListener('input', () => {
            camera.position.y = Number(sliderY.value);
            camera.lookAt(scene.position);
        });

        sliderZ.addEventListener('input', () => {
            camera.position.z = Number(sliderZ.value);
            camera.lookAt(scene.position);
        });

        zoomSlider.addEventListener('input', () => {
            camera.zoom = Number(zoomSlider.value) / 50; // Adjust zoom factor as needed
            camera.updateProjectionMatrix();
        });

        rotationSlider.addEventListener('input', () => {
            const rotationValue = Number(rotationSlider.value) * Math.PI / 180;
            camera.rotation.z = rotationValue;
        });

        function updateObjectPositions() {
            const scaleXValue = Number(scaleX.value) / 80;
            const scaleYValue = Number(scaleY.value) / 80;
            const scaleZValue = Number(scaleZ.value) / 80;
            objects.forEach((object, index) => {
                object.position.x = initialPositions[index].x * scaleXValue;
                object.position.y = initialPositions[index].y * scaleYValue;
                object.position.z = initialPositions[index].z * scaleZValue;
            });
        }

        function updateOpacity() {
            const opacityValue = Number(opacitySlider.value);
            objects.forEach(object => {
                object.material.opacity = opacityValue;
            });
        }

        function updateSize() {
            const sizeValue = Number(sizeSlider.value);
            objects.forEach(object => {
                if (object.geometry instanceof THREE.BoxGeometry || object.geometry instanceof THREE.SphereGeometry) {
                    object.scale.set(sizeValue, sizeValue, sizeValue);
                }
            });
        }

        function updateLineWeight() {
            const lineWeightValue = Number(lineWeightSlider.value);
            objects.forEach(object => {
                if (object instanceof THREE.Line) {
                    object.material.linewidth = lineWeightValue;
                }
            });
        }

        scaleX.addEventListener('input', updateObjectPositions);
        scaleY.addEventListener('input', updateObjectPositions);
        scaleZ.addEventListener('input', updateObjectPositions);
        opacitySlider.addEventListener('input', updateOpacity);
        sizeSlider.addEventListener('input', updateSize);
        lineWeightSlider.addEventListener('input', updateLineWeight);

        // Render the scene
        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();
        // Handle window resize
        window.addEventListener('resize', function() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        });
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
