# 3D Drone Flight Emulator

A 3D simulation of drone flight on a real-world map.  
The flight path was taken from GPS records of an actual drone flight in a real location near Zurich.  
The exact coordinates are displayed on the map.

Demo: https://badggit.github.io/map-webgl-test/  
Click House button in the corner.

Used technologies:
- Mapbox GL JS
- WebGL (without using Three.js or other libraries)
- TypeScript / GLSL
- ReactJS
- Interpolation of the flight path from GPS data points
- Determination of the drone's movement direction and rotation of the model accordingly

Potential Improvements:
- Increase line thickness using this method: https://blog.mapbox.com/drawing-antialiased-lines-with-opengl-8766f34192dc
- Use a more detailed drone model with Three.js
