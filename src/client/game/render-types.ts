export interface InputProcessor {
  processInput(): void;
}

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface CameraPosition {
  x: number;
  y: number;
}
