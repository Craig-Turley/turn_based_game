const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

enum EventType {
  PLAY,
  CHANGE_TEAM,
  UNUSED,
}

enum UIState {
  TITLE_SCREEN = "TitleScreen",
  IN_GAME = "InGame",
  SETTINGS = "Settings",
}

interface event {
  event: EventType;
  data: any;
}

function ConstructEvent(eventType: EventType, data: any): event {
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
  private uiState: UIMode;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.eventBus = new EventBus(this);
    this.ui = new UI(this.eventBus);
    this.displayDriver = new DisplayDriver(this.ctx, this.ui);
    this.uiState = UIMode.TitleScreen;

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
      case EventType.PLAY:
        this.uiState = UIMode.InGame;
        this.ui.setMode(this.uiState);
        break;
    }
  }
}

class DisplayDriver {
  private ctx: CanvasRenderingContext2D;
  private ui: UI;

  constructor(ctx: CanvasRenderingContext2D, ui: UI) {
    this.ctx = ctx;
    this.ui = ui;

    window.addEventListener("resize", () => {
      this.resize();
    });
    this.resize();
  }

  private resize(): void {
    const boundingBox = canvas.parentElement!.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio;

    this.ctx.canvas.width = boundingBox.width * devicePixelRatio;
    this.ctx.canvas.height = boundingBox.height * devicePixelRatio;
    this.ctx.canvas.style.width = `${boundingBox.width}px`;
    this.ctx.canvas.style.height = `${boundingBox.height}px`;

    this.ui.resize(this.ctx.canvas.width, this.ctx.canvas.height);
  }

  draw(uiState: UIMode): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.drawUI(uiState);
  }

  drawUI(uiState: UIMode) {
    switch (uiState) {
      case UIMode.TitleScreen:
        this.ui.titleScreen.children.forEach((child) => {
          if (child instanceof Button) {
            this.drawButton(child);
          }
        });
        break;
      case UIMode.InGame:
        this.ui.gameScreen.children.forEach((child) => {
          if (child instanceof Button) {
            this.drawButton(child);
          }
        });
        break;
    }
  }

  private drawButton(btn: Button) {
    this.ctx.strokeStyle = "white";
    this.ctx.beginPath();
    this.ctx.rect(btn.x, btn.y, btn.width, btn.height);
    this.ctx.stroke();

    const fontSize = Math.round(btn.width * 0.1);
    this.ctx.fillStyle = "white";
    this.ctx.font = `${fontSize}px Arial`;

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const textX = btn.x + btn.width / 2;
    const textY = btn.y + btn.height / 2;

    this.ctx.fillText(btn.text, textX, textY);
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


function constructTitleScreen(): Panel {
  const mainScreenButtons = [
    {
      event: EventType.PLAY,
      text: "Play",
      height: 100,
      width: 200,
      x: 0,
      y: 0,
    },
    {
      event: EventType.CHANGE_TEAM,
      text: "Change Team",
      height: 100,
      width: 200,
      x: 0,
      y: 0,
    },
    {
      event: EventType.UNUSED,
      text: "Unused",
      height: 100,
      width: 200,
      x: 0,
      y: 0,
    },
    {
      event: EventType.UNUSED,
      text: "Unused",
      height: 100,
      width: 200,
      x: 0,
      y: 0,
    },
  ];

  const mainPanel = new Panel(
    0,
    0,
    0,
    0,
    Alignment.VERTICAL,
    10
  );

  mainScreenButtons.forEach((btn) => {
    const buttonWidth = mainPanel.width * 0.8;
    const buttonHeight =
      mainPanel.height / mainScreenButtons.length - mainPanel.margin;
    const childBtn = new Button(0, 0, buttonWidth, buttonHeight, btn.text, btn.event);
    mainPanel.addChild(childBtn);
  });

  mainPanel.resize();
  return mainPanel;
}

function constructGameScreen(): Panel {
  const mainScreenButtons = [
    {
      event: EventType.UNUSED,
      text: "Attack",
      height: 100,
      width: 200,
      x: 0,
      y: 0,
    },
    {
      event: EventType.UNUSED,
      text: "Unused",
      height: 100,
      width: 200,
      x: 0,
      y: 0,
    },
    {
      event: EventType.UNUSED,
      text: "Unused",
      height: 100,
      width: 200,
      x: 0,
      y: 0,
    },
    {
      event: EventType.UNUSED,
      text: "Unused",
      height: 100,
      width: 200,
      x: 0,
      y: 0,
    },
  ];

  const mainPanel = new Panel(
    0,
    0,
    0,
    0,
    Alignment.HORIZONTAL,
    10
  );

  mainScreenButtons.forEach((btn) => {
    const buttonWidth = mainPanel.width * 0.8;
    const buttonHeight =
      mainPanel.height / mainScreenButtons.length - mainPanel.margin;
    const childBtn = new Button(0, 0, buttonWidth, buttonHeight, btn.text, btn.event);
    mainPanel.addChild(childBtn);
  });

  mainPanel.resize();
  return mainPanel;
}

enum UIMode {
  TitleScreen,
  InGame,
}

class UI {
  private eventBus: EventBus;

  public curMode: Panel;
  public titleScreen: Panel;
  public gameScreen: Panel;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.titleScreen = constructTitleScreen();
    this.gameScreen = constructGameScreen();
    this.curMode = this.titleScreen;
    document.addEventListener("click", (e: MouseEvent) => {
      const mousePosition = this.mouse(e);
      const btn = this.buttonClicked(mousePosition);

      if (btn) {
        console.log(btn.text);
        const event = ConstructEvent(btn.eventType(), btn);
        this.eventBus.send(event);
      }
    });
  }

  public setMode(mode: UIMode) {
    switch (mode) {
      case (UIMode.TitleScreen):
        this.curMode = this.titleScreen;
        break;
      case (UIMode.InGame):
        this.curMode = this.gameScreen;
        break;
    }
  }

  resize(ctxWidth: number, ctxHeight: number): void {
    // TitleScreen
    this.titleScreen.height = Math.floor(ctxHeight * 0.4);
    this.titleScreen.width = Math.floor(this.titleScreen.height * 0.5);
    this.titleScreen.x = Math.floor(
      (ctxWidth / 2) - (this.titleScreen.width / 2)
    );
    this.titleScreen.y = Math.floor(
      ctxHeight / 2 - this.titleScreen.height / 2
    );

    this.titleScreen.resize();

    // Game Screen
    this.gameScreen.height = Math.floor(ctxHeight * 0.1);
    this.gameScreen.width = ctxWidth - 6;
    this.gameScreen.x = 3;
    this.gameScreen.y = ctxHeight - this.gameScreen.height;

    this.gameScreen.resize();
  }

  private buttonClicked(mouse: { x: number; y: number }): Button | null {
    if (!this.curMode.contains(mouse.x, mouse.y)) {
      return null;
    }

    for (const child of this.curMode.children) {
      const btn = this.checkChildren(child, mouse.x, mouse.y);
      if (btn !== null) {
        return btn;
      }
    }

    return null;
  }

  private checkChildren(node: UIElement, x: number, y: number): Button | null {
    if (!node.contains(x, y)) {
      return null;
    }

    if (node instanceof Button && node.containsPoint(x, y)) {
      return node;
    }

    for (const child of node.children) {
      const btn = this.checkChildren(child, x, y);
      if (btn !== null) {
        return btn;
      }
    }

    return null;
  }

  private mouse(e: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
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

  resize(): void {
    this.children.forEach((child) => child.resize());
  }

  contains(x: number, y: number): boolean {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    );
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
  event: EventType;

  constructor(x: number, y: number, width: number, height: number, text: string, event: EventType) {
    super(x, y, width, height);
    this.text = text;
    this.event = event;
  }

  resize(): void {
  }

  containsPoint(x: number, y: number): boolean {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    );
  }

  eventType(): EventType {
    return this.event;
  }
}

function main(): void {
  const game = new Game(ctx);
}

main();

