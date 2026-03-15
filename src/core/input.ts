export interface InputState {
  keys: Set<string>;
  keysJustPressed: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  mouseJustPressed: boolean;
  mouseJustReleased: boolean;
  rightMouseDown: boolean;
  wheelDelta: number;
}

export class InputManager {
  private state: InputState = {
    keys: new Set(),
    keysJustPressed: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    mouseJustPressed: false,
    mouseJustReleased: false,
    rightMouseDown: false,
    wheelDelta: 0,
  };

  private dragStartX = 0;
  private dragStartY = 0;
  private isDragging = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (!this.state.keys.has(e.code)) {
        this.state.keysJustPressed.add(e.code);
      }
      this.state.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.state.keys.delete(e.code);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.state.mouseX = e.clientX - rect.left;
      this.state.mouseY = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.state.mouseDown = true;
        this.state.mouseJustPressed = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
      } else if (e.button === 2) {
        this.state.rightMouseDown = true;
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.state.mouseDown = false;
        this.state.mouseJustReleased = true;
        this.isDragging = false;
      } else if (e.button === 2) {
        this.state.rightMouseDown = false;
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.state.wheelDelta += e.deltaY;
    }, { passive: false });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  getState(): Readonly<InputState> {
    return this.state;
  }

  isKeyDown(code: string): boolean {
    return this.state.keys.has(code);
  }

  isKeyJustPressed(code: string): boolean {
    return this.state.keysJustPressed.has(code);
  }

  getDragDelta(): { dx: number; dy: number } | null {
    if (!this.state.rightMouseDown) {
      this.isDragging = false;
      return null;
    }
    const dx = this.state.mouseX - this.dragStartX;
    const dy = this.state.mouseY - this.dragStartY;
    this.dragStartX = this.state.mouseX;
    this.dragStartY = this.state.mouseY;
    this.isDragging = true;
    return { dx, dy };
  }

  endFrame(): void {
    this.state.keysJustPressed.clear();
    this.state.mouseJustPressed = false;
    this.state.mouseJustReleased = false;
    this.state.wheelDelta = 0;
  }
}
