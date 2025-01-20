const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

enum EventType {
  CREATE_ROOM,
  JOIN_ROOM,
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

class Character {
  position: Vector;

  constructor(position: Vector) {
    this.position = position;
  }
}

class GameState {
  roomKey: string | null;
  team: Character[];

  constructor() {
    const team: Character[] = [];
    for (let i = 0; i < 3; i++) {
      const pos = new Vector(200 + 160 * i, canvas.height - 31);
      team.push(new Character(pos));
    }
    this.team = team;
    this.roomKey = null;
  }
}

class Game {
  private ctx: CanvasRenderingContext2D;
  private eventBus: EventBus;
  private ui: UI;
  private displayDriver: DisplayDriver;
  private uiState: UIMode;
  private gameState: GameState;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.eventBus = new EventBus(this);
    this.ui = new UI(this.eventBus);
    this.gameState = new GameState();
    this.displayDriver = new DisplayDriver(this.ctx, this.gameState, this.ui);
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
      case EventType.CREATE_ROOM:
        this.uiState = UIMode.InGame;
        this.ui.setMode(this.uiState);
        break;
    }
  }
}

enum Shading {
  SHADE = "rgba(64, 64, 64, 0.5)",
  NOSHADE = "",
}

class Stage {
  private paths = [
    './assets/jungle_asset_pack/parallax_background/plx-1.png',
    './assets/jungle_asset_pack/parallax_background/plx-2.png',
    './assets/jungle_asset_pack/parallax_background/plx-3.png',
    './assets/jungle_asset_pack/parallax_background/plx-4.png',
    './assets/jungle_asset_pack/parallax_background/plx-5.png',
  ];

  public layers: CanvasImageSource[];
  public tileset: Sprite;
  public shading: Shading;

  constructor() {
    const layers: CanvasImageSource[] = [];
    this.paths.forEach(async (path) => {
      const img = await this.loadImage(path);
      layers.push(img);
    });
    this.layers = layers;
    this.tileset = new Sprite(Sprites.StageFloor.image, Sprites.StageFloor.start, Sprites.StageFloor.size);
    this.shading = Shading.SHADE;
  }

  private loadImage(path: string): Promise<CanvasImageSource> {
    return new Promise((res, rej) => {
      const img = new Image();
      img.src = path;
      img.onload = () => res(img);
      // @TODO handle this error. Program will blow up if not
      img.onerror = (err) => rej(err);
    });
  }

  public toggleShading() {
    this.shading = this.shading === Shading.SHADE ? Shading.NOSHADE : Shading.SHADE;
  }
}

class Vector {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

const Sprites = {
  StageFloor: {
    image: "./assets/jungle_asset_pack/jungle_tileset/jungle_tileset.png",
    start: new Vector(16, 224),
    size: new Vector(159, 31),
  },
  BlueWitch: {},
  Knight: {},
  Necromancer: {},
};

class Sprite {
  image: CanvasImageSource;
  start: Vector;
  size: Vector;

  constructor(path: string, start: Vector, size: Vector) {
    const img = new Image();
    img.src = path;
    this.image = img;
    this.size = size;
    this.start = start;
  }
}

class DisplayDriver {
  private ctx: CanvasRenderingContext2D;
  private ui: UI;
  private baseWidth: number;
  private baseHeight: number;
  private ctxWidth: number;
  private ctxHeight: number;
  private xOffset: number;
  private yOffset: number;
  private stage: Stage;
  private gameState: GameState;

  constructor(ctx: CanvasRenderingContext2D, gameState: GameState, ui: UI) {
    this.ctx = ctx;
    this.ui = ui;
    this.baseWidth = 16;
    this.baseHeight = 9;
    this.ctxWidth = 16;
    this.ctxHeight = 9;
    this.xOffset = 0;
    this.yOffset = 0;
    this.stage = new Stage();
    this.gameState = gameState;

    window.addEventListener("resize", () => {
      this.resize();
    });
    this.resize();
  }

  private cX(x: number) {
    return this.xOffset + x;
  }
  
  private cY(y: number) {
    return this.yOffset + y;
  }

  private resize(): void {
    const boundingBox = canvas.parentElement!.getBoundingClientRect();
    this.ctx.canvas.width = boundingBox.width; 
    this.ctx.canvas.height = boundingBox.height;

    let ctxWidth = (boundingBox.width) - ((boundingBox.width) % this.baseWidth);
    let ctxHeight = (ctxWidth / this.baseWidth) * this.baseHeight;

    // @TODO make this cleaner. I feel like there's a more concise way of performing this check
    if (ctxHeight > this.ctx.canvas.height) {
      ctxHeight = (boundingBox.height) - ((boundingBox.width) % this.baseHeight);
      ctxWidth = (ctxHeight / this.baseHeight) * this.baseWidth;
    }

    this.ctxWidth = ctxWidth;
    this.ctxHeight = ctxHeight;

    this.xOffset = Math.floor(Math.abs((this.ctx.canvas.width - this.ctxWidth) / 2));
    this.yOffset = Math.floor(Math.abs((this.ctx.canvas.height - this.ctxHeight) / 2));

    this.ui.resize(this.ctxWidth, this.ctxHeight);
  }

  draw(uiState: UIMode): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.drawDebug();
    // this.drawStage();
    // this.drawCharacters();
    // this.drawUI(uiState);
  }

  private drawDebug() {
    this.ctx.fillStyle = 'red';
    this.ctx.fillRect(this.cX(0), this.cY(0), this.cX(this.ctxWidth), this.cY(this.ctxHeight));
  }

  private drawStage(): void {
    this.stage.layers.forEach((layer) => {
      this.ctx.drawImage(layer, 0, 0, this.ctxWidth, this.ctxHeight);
    });

    // this is crazy ngl
    for (let i = 0; i < 2; i++) {
      const scale = this.ctxWidth * 0.5 / this.stage.tileset.size.x;
      const pos = new Vector(i * this.stage.tileset.size.x * scale, this.ctxHeight- this.stage.tileset.size.y * scale);
      this.drawSprite(this.stage.tileset, pos, scale);
    }

    this.ctx.fillStyle = this.stage.shading;
    this.ctx.fillRect(0, 0, this.ctxWidth, this.ctxHeight);
  }

  private drawCharacters(): void {
    this.gameState.team.forEach((character) => {
      this.ctx.fillStyle = "red";
      this.ctx.fillRect(character.position.x - 25, character.position.y - 25, 25, 25);
    });
  }

  private drawSprite(sprite: Sprite, pos: Vector, scale: number): void {
    const sWidth = sprite.size.x * scale;
    const sHeight = sprite.size.y * scale;
    this.ctx.drawImage(
      sprite.image,
      sprite.start.x,
      sprite.start.y,
      sprite.size.x,
      sprite.size.y,
      pos.x,
      pos.y,
      sWidth,
      sHeight,
    )
  }

  private drawUI(uiState: UIMode) {
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
    this.ctx.fillStyle = "#FFFFF0";
    this.ctx.fillRect(btn.x, btn.y, btn.width, btn.height);

    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 5;
    this.ctx.beginPath();
    this.ctx.rect(btn.x, btn.y, btn.width, btn.height);
    this.ctx.stroke();

    this.ctx.fillStyle = "black";
    const fontSize = Math.round(btn.width * 0.08);
    this.ctx.font = `${fontSize}px "Press Start 2P"`;

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
      event: EventType.CREATE_ROOM,
      text: "Create Room",
      height: 100,
      width: 200,
      x: 0,
      y: 0,
    },
    {
      event: EventType.CHANGE_TEAM,
      text: "Join Room",
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
  Waiting,
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
