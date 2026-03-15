import {
  CameraRotation,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  CAMERA_PAN_SPEED,
} from '@/core/constants';
import { InputManager } from '@/core/input';

export class Camera {
  x = 0;
  y = 0;
  zoom = DEFAULT_ZOOM;
  rotation: CameraRotation = CameraRotation.R0;

  private targetX = 0;
  private targetY = 0;
  private targetZoom = DEFAULT_ZOOM;
  private smoothing = 0.15;

  centerOn(screenWidth: number, screenHeight: number, worldPx: number, worldPy: number): void {
    this.targetX = screenWidth / 2 - worldPx * this.zoom;
    this.targetY = screenHeight / 2 - worldPy * this.zoom;
    this.x = this.targetX;
    this.y = this.targetY;
  }

  update(input: InputManager, screenWidth: number, screenHeight: number): void {
    const state = input.getState();

    // Keyboard panning
    const panSpeed = CAMERA_PAN_SPEED / this.zoom;
    if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) this.targetX += panSpeed * 3;
    if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) this.targetX -= panSpeed * 3;
    if (input.isKeyDown('ArrowUp') || input.isKeyDown('KeyW')) this.targetY += panSpeed * 3;
    if (input.isKeyDown('ArrowDown') || input.isKeyDown('KeyS')) this.targetY -= panSpeed * 3;

    // Right-click drag panning
    const drag = input.getDragDelta();
    if (drag) {
      this.targetX += drag.dx;
      this.targetY += drag.dy;
    }

    // Zoom with mouse wheel
    if (state.wheelDelta !== 0) {
      const zoomFactor = state.wheelDelta > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.targetZoom * zoomFactor));

      // Zoom toward mouse position
      const mouseWorldX = (state.mouseX - this.x) / this.zoom;
      const mouseWorldY = (state.mouseY - this.y) / this.zoom;

      this.targetZoom = newZoom;
      this.targetX = state.mouseX - mouseWorldX * newZoom;
      this.targetY = state.mouseY - mouseWorldY * newZoom;
    }

    // Camera rotation (Q/E keys)
    if (input.isKeyJustPressed('KeyQ')) {
      this.rotation = ((this.rotation + 3) % 4) as CameraRotation;
    }
    if (input.isKeyJustPressed('KeyE')) {
      this.rotation = ((this.rotation + 1) % 4) as CameraRotation;
    }

    // Smooth interpolation
    this.x += (this.targetX - this.x) * this.smoothing;
    this.y += (this.targetY - this.y) * this.smoothing;
    this.zoom += (this.targetZoom - this.zoom) * this.smoothing;
  }

  /**
   * Convert screen coordinates to world-space pixel coordinates.
   */
  screenToWorldPixel(screenX: number, screenY: number): { wpx: number; wpy: number } {
    return {
      wpx: (screenX - this.x) / this.zoom,
      wpy: (screenY - this.y) / this.zoom,
    };
  }
}
