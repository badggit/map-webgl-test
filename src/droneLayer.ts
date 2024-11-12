import { CustomLayerInterface, Map, MercatorCoordinate } from 'mapbox-gl';
import { DronePathCoordinates } from './dronePathCoordinates.ts';

import dronePNG from './assets/drone.png';

// Define the structure of the drone control object
export type DroneControl = {
  moveTo: (lat: number, lng: number, altitude: number, bearing?: number) => void;
  flyStart: (coordinates: DronePathCoordinates, step?: number, progress?: number) => void;
} | undefined;

// Extend Mapbox custom layer interface //
export interface DroneLayer extends CustomLayerInterface {
  aTextureCoord: number;
  type: 'custom',
  indexBuffer: WebGLBuffer | null;
  uColor: WebGLUniformLocation | null;
  buffer: WebGLBuffer | null;
  uRotate: WebGLUniformLocation | null;
  uTranslate: WebGLUniformLocation | null;
  uSize: WebGLUniformLocation | null;
  uMatrix: WebGLUniformLocation | null;
  aPos: number;
  program: WebGLProgram | null;
  positionBuffer: WebGLBuffer | null;
  texture: WebGLTexture | null;
  uSampler: WebGLUniformLocation | null;
  textureCoordBuffer: WebGLBuffer | null;
  textureLoaded: boolean;
}

// Calculate bearing between two points
export const calculateBearing = (start: [number, number], end: [number, number]): number => {
  // Convert longitude and latitude to radians
  const startLng = start[0] * (Math.PI / 180);
  const startLat = start[1] * (Math.PI / 180);
  const endLng = end[0] * (Math.PI / 180);
  const endLat = end[1] * (Math.PI / 180);

  // Calculate the difference in coordinates
  const dLng = endLng - startLng;

  // Calculate the bearing
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
  let bearing = Math.atan2(y, x);

  // Convert bearing to degrees
  bearing = bearing * (180 / Math.PI);

  // Normalize the bearing to a value between 0 and 360
  return (bearing + 360) % 360;
};

// Add drone 3D object to the map and return controls
const droneLayer = (map: Map): DroneControl => {
  if (!map) return;

  // Initialize drone position and bearing
  let dronePosition = [0, 0, 0];
  let droneBearing = 0;

  // Custom layer for 3D drone
  const droneLayer: DroneLayer = {
    id: 'drone-3d',
    type: 'custom',
    renderingMode: '3d',

    // Some properties here
    indexBuffer: null,
    uColor: null,
    buffer: null,
    uRotate: null,
    uTranslate: null,
    uSize: null,
    uMatrix: null,
    aPos: 0,
    program: null,
    positionBuffer: null,
    texture: null,
    uSampler: null,
    textureCoordBuffer: null,
    aTextureCoord: 0,
    textureLoaded: false,

    onAdd: function (_map, gl) {
      // Vertex shader source code
      const vertexSource = `
    attribute vec3 aPos;
    attribute vec2 aTextureCoord;
    uniform mat4 uMatrix;
    uniform float uSize;
    uniform vec3 uTranslate;
    uniform float uRotate;
    varying highp vec2 vTextureCoord;

    void main() {
      vec3 pos = aPos * uSize;
      float s = sin(uRotate);
      float c = cos(uRotate);
      pos = vec3(
        pos.x * c - pos.y * s,
        pos.x * s + pos.y * c,
        pos.z
      );
      gl_Position = uMatrix * vec4(pos + uTranslate, 1.0);
      vTextureCoord = aTextureCoord;
    }
  `;

      // Fragment shader source code
      const fragmentSource = `
    precision mediump float;
    uniform vec3 uColor;
    uniform sampler2D uSampler;
    varying highp vec2 vTextureCoord;
    
    void main() {
      if (vTextureCoord.x != 0.0 || vTextureCoord.y != 0.0) {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
      } else {
        gl_FragColor = vec4(uColor, 1.0);
      }
    }
  `;

      // Create and compile vertex shader
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      if (!vertexShader) return;
      gl.shaderSource(vertexShader, vertexSource);
      gl.compileShader(vertexShader);

      // Create and compile fragment shader
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      if (!fragmentShader) return;
      gl.shaderSource(fragmentShader, fragmentSource);
      gl.compileShader(fragmentShader);

      // Create shader program and link shaders
      this.program = gl.createProgram();
      if (!this.program) return;
      gl.attachShader(this.program, vertexShader);
      gl.attachShader(this.program, fragmentShader);
      gl.linkProgram(this.program);

      // Get attribute and uniform locations
      this.aPos = gl.getAttribLocation(this.program, 'aPos');
      this.aTextureCoord = gl.getAttribLocation(this.program, 'aTextureCoord');
      this.uMatrix = gl.getUniformLocation(this.program, 'uMatrix');
      this.uSize = gl.getUniformLocation(this.program, 'uSize');
      this.uTranslate = gl.getUniformLocation(this.program, 'uTranslate');
      this.uRotate = gl.getUniformLocation(this.program, 'uRotate');
      this.uColor = gl.getUniformLocation(this.program, 'uColor');
      this.uSampler = gl.getUniformLocation(this.program, 'uSampler');

      // Define 3D rectangle vertices (a cuboid)
      const vertices = new Float32Array([
        // Front face
        -0.3, 0.5, 0.3,
        0.3, 0.5, 0.3,
        0.3, 0.5, -0.3,
        -0.3, 0.5, -0.3,
        // Back face
        -0.3, -0.5, 0.3,
        0.3, -0.5, 0.3,
        0.3, -0.5, -0.3,
        -0.3, -0.5, -0.3,
        // Top face
        -0.3, 0.5, 0.3,
        0.3, 0.5, 0.3,
        0.3, -0.5, 0.3,
        -0.3, -0.5, 0.3,
        // Bottom face
        -0.3, 0.5, -0.3,
        0.3, 0.5, -0.3,
        0.3, -0.5, -0.3,
        -0.3, -0.5, -0.3,
        // Right face
        0.3, 0.5, 0.3,
        0.3, 0.5, -0.3,
        0.3, -0.5, -0.3,
        0.3, -0.5, 0.3,
        // Left face
        -0.3, 0.5, 0.3,
        -0.3, 0.5, -0.3,
        -0.3, -0.5, -0.3,
        -0.3, -0.5, 0.3,
      ]);

      // Create buffer and load vertex data
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      // Create index buffer for drawing the cuboid
      const indices = new Uint16Array([
        0, 1, 2, 0, 2, 3,  // Front face
        4, 5, 6, 4, 6, 7,  // Back face
        8, 9, 10, 8, 10, 11,  // Top face
        12, 13, 14, 12, 14, 15,  // Bottom face
        16, 17, 18, 16, 18, 19,  // Right face
        20, 21, 22, 20, 22, 23,   // Left face
      ]);
      this.indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

      // Set up texture coordinate buffer
      const textureCoordinates = new Float32Array([
        // Other faces (set to 0 to use solid color)
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, // Top face
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, // Back face
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, // Front face
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, // Bottom face
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, // Right face
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,  // Left face
      ]);

      this.textureCoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, textureCoordinates, gl.STATIC_DRAW);

      // Load the texture
      const image = new Image();
      image.onload = () => {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        this.textureLoaded = true;
      };
      image.src = dronePNG; // Make sure to import dronePNG at the top of your file
    },

    render: function (gl, matrix) {
      if (!this.program) return;  // Add this check

      gl.useProgram(this.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.enableVertexAttribArray(this.aPos);
      gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);

      // Set up the texture coordinate attribute
      gl.enableVertexAttribArray(this.aTextureCoord);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
      gl.vertexAttribPointer(this.aTextureCoord, 2, gl.FLOAT, false, 0, 0);

      // Set uniform values
      const size = 0.0000005; // Adjust size as needed
      const mercatorPosition = MercatorCoordinate.fromLngLat({ lng: dronePosition[0], lat: dronePosition[1] }, dronePosition[2]);

      gl.uniformMatrix4fv(this.uMatrix, false, matrix);
      gl.uniform1f(this.uSize, size);
      gl.uniform3f(this.uTranslate, mercatorPosition.x, mercatorPosition.y, mercatorPosition.z);
      gl.uniform1f(this.uRotate, droneBearing * Math.PI / 180);
      gl.uniform3f(this.uColor, 1.0, 0.0, 0.0); // Red color for non-textured faces

      // Only bind and use the texture if it has been loaded
      if (this.textureLoaded && this.texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.uSampler, 0);
      }

      // Enable depth testing
      gl.enable(gl.DEPTH_TEST);

      // Bind the index buffer
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

      // Draw the cuboid
      gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

      // Disable depth testing after rendering
      gl.disable(gl.DEPTH_TEST);
    },

  };

  // Add the custom layer to the map
  map.addLayer(droneLayer);

  // Function to move the drone to a specific position
  const moveTo = (lng: number, lat: number, altitude: number, bearing: number = 0) => {
    dronePosition = [lng, lat, altitude];
    droneBearing = bearing;
    map.triggerRepaint();
  };

  // Movement timeout
  let droneMoveTimeout: number = 0;

  // Start moving drone smoothly with interpolations
  const flyStart = (coordinates: DronePathCoordinates, step: number = 0, progress: number = 0) => {
    const coords = coordinates;

    // Stop previous movement
    if (droneMoveTimeout) {
      clearTimeout(droneMoveTimeout);
    }

    // Check that we have everything we need
    if (!coords) {
      return;
    }

    // Check that this step exists
    if (!coords[step]) {
      return;
    }

    // Calculate interpolated position
    const currentCoord = coords[step];
    const nextCoord = coords[step + 1] || currentCoord;

    const interpolatedLng = currentCoord[1] + (nextCoord[1] - currentCoord[1]) * progress;
    const interpolatedLat = currentCoord[2] + (nextCoord[2] - currentCoord[2]) * progress;
    const interpolatedAlt = currentCoord[3] + (nextCoord[3] - currentCoord[3]) * progress;

    // Calculate bearing
    const bearing = calculateBearing(
      [currentCoord[1], currentCoord[2]],
      [nextCoord[1], nextCoord[2]],
    );

    // Move the drone
    moveTo(interpolatedLng, interpolatedLat, interpolatedAlt, bearing);

    const nextProgress = progress + 0.05; // Smoothness level

    if (nextProgress >= 1) {
      // Move to the next step
      droneMoveTimeout = setTimeout(() => flyStart(coords, step + 1, 0), 5);
    } else {
      // Continue interpolating current step
      droneMoveTimeout = setTimeout(() => flyStart(coords, step, nextProgress), 5);
    }
  };

  // Return the drone control object
  return {
    moveTo,
    flyStart,
  };
};

export default droneLayer;
