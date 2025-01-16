const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

enum ButtonType {
  PLAY = "Play",
  CHANGE_TEAM = "ChangeTeam",
  UNUSED = "Unused",
}

enum UIState {
  TITLE_SCREEN = "TitleScreen",
  IN_GAME = "InGame",
  SETTINGS = "Settings",
}

enum EventType {
  MOUSE_DOWN = "MouseDown",
}

interface event {
  event: EventType;
  data: any;
}

function constructEvent(eventType: EventType, data: any): event {
  return {
    event: eventType,
    data: data,
  };
}

class Game {
  private ctx: CanvasRenderingContext2D;
  private eventBus: EventBus;
  private ui: UI;
  private displayDriver: DisplayDriver;
  private uiState: UIState;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.eventBus = new EventBus(this);

    const boundingBox = canvas.parentElement!.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio;

    this.ctx.canvas.width = boundingBox.width * devicePixelRatio;
    this.ctx.canvas.height = boundingBox.height * devicePixelRatio;
    this.ctx.canvas.style.width = `${boundingBox.width}px`;
    this.ctx.canvas.style.height = `${boundingBox.height}px`;

    this.ui = new UI(this.eventBus, this.ctx);
    this.displayDriver = new DisplayDriver(this.ctx, this.eventBus, this.ui);
    this.uiState = UIState.TITLE_SCREEN;

    requestAnimationFrame(() => {
      this.draw();
    });
  }

  private draw(): void {
    this.displayDriver.draw(this.uiState);
    requestAnimationFrame(() => {
      this.draw();
    });
  }

  update(event: event): void {
    switch (event.event) {
      case EventType.MOUSE_DOWN:
        console.log(event);
        this.handleBtn(event.data);
        break;
    }
  }

  private handleBtn(btn: ButtonType): void {
    switch (btn) {
      case ButtonType.PLAY:
        this.uiState = UIState.IN_GAME;
        // this.ui.update(UIState.IN_GAME);
        break;
    }
  }
}

class DisplayDriver {
  private ctx: CanvasRenderingContext2D;
  private eventBus: EventBus;
  private ui: UI;

  constructor(ctx: CanvasRenderingContext2D, eventBus: EventBus, ui: UI) {
    this.ctx = ctx;
    this.eventBus = eventBus;
    this.ui = ui;

    window.addEventListener("resize", () => {
      this.resize();
    });
    this.resize();

    // window.addEventListener("mousedown", (e: MouseEvent) => {
    //   const btn = this.buttonClicked(this.mouse(e));
    //   const event = constructEvent(EventType.MOUSE_DOWN, btn);
    //   this.eventBus.send(event);
    // });
  }

  private resize(): void {
    const boundingBox = canvas.parentElement!.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio;

    this.ctx.canvas.width = boundingBox.width * devicePixelRatio;
    this.ctx.canvas.height = boundingBox.height * devicePixelRatio;
    this.ctx.canvas.style.width = `${boundingBox.width}px`;
    this.ctx.canvas.style.height = `${boundingBox.height}px`;

    this.ui.resize();
  }

  draw(uiState: UIState): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    switch (uiState) {
      case UIState.TITLE_SCREEN:
        this.ui.drawTitleScreenUi();
        break;
      // case UIState.IN_GAME:
      //   this.ui.drawGameUi();
      //   break;
    }
  }

  // private buttonClicked(mouse: { x: number; y: number }): ButtonType | null {
  //   const btn = this.ui.currentButtons.find(
  //     (btn) =>
  //       mouse.x >= btn.x &&
  //       mouse.x <= btn.x + btn.width &&
  //       mouse.y >= btn.y &&
  //       mouse.y <= btn.y + btn.height
  //   );
  //   return btn ? btn.button : null;
  // }

  private mouse(e: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
  }
}

class EventBus {
  private bus: Game;

  constructor(bus: Game) {
    this.bus = bus;
  }

  send(event: event): void {
    this.bus.update(event);
  }
}

const mainScreenButtons = [
  {
    button: ButtonType.PLAY,
    text: "Play",
    height: 100,
    width: 200,
    x: 0,
    y: 0,
  },
  {
    button: ButtonType.CHANGE_TEAM,
    text: "Change Team",
    height: 100,
    width: 200,
    x: 0,
    y: 0,
  },
  {
    button: ButtonType.UNUSED,
    text: "Unused",
    height: 100,
    width: 200,
    x: 0,
    y: 0,
  },
  {
    button: ButtonType.UNUSED,
    text: "Unused",
    height: 100,
    width: 200,
    x: 0,
    y: 0,
  },
];

function constructTitleScreen(ctxWidth: number, ctxHeight: number): Panel {
  const mainPanel = new Panel(
    ctxWidth * 0.25,
    ctxHeight * 0.25,
    ctxWidth * 0.5,
    ctxHeight * 0.5,
    Alignment.VERTICAL,
    10
  );

  mainScreenButtons.forEach((btn) => {
    const buttonWidth = mainPanel.width * 0.8;
    const buttonHeight =
      mainPanel.height / mainScreenButtons.length - mainPanel.margin;
    const childBtn = new Button(0, 0, buttonWidth, buttonHeight, btn.text);
    mainPanel.addChild(childBtn);
  });

  mainPanel.resize();
  return mainPanel;
}

class UI {
  private eventBus: EventBus;
  private ctx: CanvasRenderingContext2D;
  private titleScreen: Panel;

  constructor(eventBus: EventBus, ctx: CanvasRenderingContext2D) {
    this.eventBus = eventBus;
    this.ctx = ctx;
    this.titleScreen = constructTitleScreen(
      this.ctx.canvas.width,
      this.ctx.canvas.height
    );
  }

  drawTitleScreenUi(): void {
    this.titleScreen.draw(this.ctx);
  }

  resize(): void {
    this.titleScreen.height = Math.floor(this.ctx.canvas.height * 0.4);
    this.titleScreen.width = Math.floor(this.titleScreen.height * 0.5);
    this.titleScreen.x = Math.floor(
      this.ctx.canvas.width / 2 - this.titleScreen.width / 2
    );
    this.titleScreen.y = Math.floor(
      this.ctx.canvas.height / 2 - this.titleScreen.height / 2
    );

    this.titleScreen.resize();
  }
}

class UIElement {
  x: number;
  y: number;
  width: number;
  height: number;
  children: UIElement[];

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.children = [];
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.children.forEach((child) => child.draw(ctx));
  }

  resize(): void {
    this.children.forEach((child) => child.resize());
  }
}

enum Alignment {
  VERTICAL = "Vertical",
  HORIZONTAL = "Horizontal",
}

class Panel extends UIElement {
  alignment: Alignment;
  margin: number;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    alignment: Alignment,
    margin: number
  ) {
    super(x, y, width, height);
    this.alignment = alignment;
    this.margin = margin;
  }

  resize(): void {
    const totalChildren = this.children.length;
    let width: number, height: number;
    let xOffset: ((index: number) => number) | number = 0;
    let yOffset: ((index: number) => number) | number = 0;

    switch (this.alignment) {
      case Alignment.VERTICAL:
        height = Math.floor(this.height / totalChildren - this.margin);
        width = this.width;
        yOffset = (index: number) => (height + this.margin) * index;
        break;

      case Alignment.HORIZONTAL:
        width = Math.floor(this.width / totalChildren - this.margin);
        height = this.height;
        xOffset = (index: number) => (width + this.margin) * index;
        break;
    }

    for (const [index, child] of this.children.entries()) {
      child.width = width;
      child.height = height;
      child.x = this.x + (typeof xOffset === "function" ? xOffset(index) : xOffset);
      child.y = this.y + (typeof yOffset === "function" ? yOffset(index) : yOffset);
    }

    super.resize();
  }

  addChild(child: UIElement): void {
    this.children.push(child);
  }
}

class Button extends UIElement {
  text: string;

  constructor(x: number, y: number, width: number, height: number, text: string) {
    super(x, y, width, height);
    this.text = text;
  }

  resize(): void {
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.stroke();

    const fontSize = Math.round(this.width * 0.1);
    ctx.fillStyle = "white";
    ctx.font = `${fontSize}px Arial`;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const textX = this.x + this.width / 2;
    const textY = this.y + this.height / 2;

    ctx.fillText(this.text, textX, textY);
  }

  containsPoint(x: number, y: number): boolean {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    );
  }
}

function main(): void {
  const game = new Game(ctx);
}

main();

