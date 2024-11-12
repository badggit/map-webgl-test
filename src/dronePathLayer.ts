import { CustomLayerInterface, Map, MercatorCoordinate } from 'mapbox-gl';
import { DronePathCoordinates } from './dronePathCoordinates.ts';

// Extend Mapbox custom layer interface //
export interface DronePathLayer extends CustomLayerInterface {
  type: 'custom',
  program: WebGLProgram | null;
  positionBuffer: WebGLBuffer | null;
}

const dronePathLayer = async (droneCoordinates: DronePathCoordinates | undefined, map: Map | undefined): Promise<DronePathLayer | undefined> => {
  if (!droneCoordinates || !map) {
    return;
  }

  // Make a new layer //
  const layer: DronePathLayer = {
    id: 'drone-path-layer',
    type: 'custom',
    renderingMode: '3d',

    // Some properties here
    program: null as WebGLProgram | null,
    positionBuffer: null as WebGLBuffer | null,

    onAdd: function (_map: Map, gl: WebGLRenderingContext) {
      // Initialize WebGL buffers and shaders //
      const vertexShaderSource = `
      attribute vec3 position;
      uniform mat4 u_matrix;
      void main() {
        gl_Position = u_matrix * vec4(position, 1.0);
      }
    `;
      const fragmentShaderSource = `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(0.0, 0.5, 1.0, 1.0); // Light blue color
      }
    `;

      // Compile shaders //
      const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vertexShader, vertexShaderSource);
      gl.compileShader(vertexShader);

      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fragmentShader, fragmentShaderSource);
      gl.compileShader(fragmentShader);

      // Create program and link shaders //
      this.program = gl.createProgram()!;
      gl.attachShader(this.program, vertexShader);
      gl.attachShader(this.program, fragmentShader);
      gl.linkProgram(this.program);

      // Create a buffer to store the line coordinates //
      this.positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

      // Convert coordinates to WebGL Mercator coordinates including altitude //
      const mercatorCoords = droneCoordinates?.map(coord => {
        const mercator = MercatorCoordinate.fromLngLat([coord[1], coord[2]], coord[3]);
        return [mercator.x, mercator.y, mercator.z];
      }).flat();

      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mercatorCoords), gl.STATIC_DRAW);
    },

    render: function (gl: WebGLRenderingContext, matrix: number[]) {
      if (!this.program || !this.positionBuffer) return;

      gl.useProgram(this.program);

      // Pass the transformation matrix //
      const uMatrix = gl.getUniformLocation(this.program, 'u_matrix');
      gl.uniformMatrix4fv(uMatrix, false, matrix);

      // Bind the buffer and set up position attribute //
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      const position = gl.getAttribLocation(this.program, 'position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);

      // Draw the line //
      gl.drawArrays(gl.LINE_STRIP, 0, droneCoordinates.length || 0);

      // Repaint the map for continuous updates //
      map?.triggerRepaint();
    },
  };

  return layer;
};

export default dronePathLayer;
