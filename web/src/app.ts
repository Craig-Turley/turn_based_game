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
  public sprite: Sprite;
  public position: Vector;
  public health: number;
  public attack: number;
  public defense: number;

  constructor(sprite: Sprite, position: Vector, health: number, attack: number, defense: number) {
    this.sprite = sprite;
    this.position = position;
    this.health = health;
    this.attack = attack;
    this.defense = defense;
  }
}

class GameState {
  roomKey: string | null;
  team: Character[];

  constructor(ctxWidth: number, ctxHeight: number) {
    const team: Character[] = [];
    // figure this out
    const spacing = Math.floor((ctxWidth / 2) * 0.8) / 3;
    for (let i = 0; i < 3; i++) {
      const sprite = new Sprite(Sprites.Knight.image, Sprites.Knight.start, Sprites.Knight.size);
      const pos = new Vector(spacing * (i), ctxHeight - Sprites.StageFloor.size.y - sprite.size.y);
      team.push(new Character(sprite, pos, 1, 1, 1));
    }
    this.team = team;
    this.roomKey = null;
  }
}

class Game {
  private ctx: CanvasRenderingContext2D;
  private eventBus: EventBus;
  private ui: UI;
  private uiState: UIMode;
  private gameState: GameState;
  public displayDriver: DisplayDriver;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.eventBus = new EventBus(this);
    this.ui = new UI(this.eventBus);
    this.gameState = new GameState(320, 180);
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
  public floortile: Sprite;
  public undergroundtile: Sprite;
  public shading: Shading;

  constructor() {
    const layers: CanvasImageSource[] = [];
    this.paths.forEach(async (path) => {
      const img = await this.loadImage(path);
      layers.push(img);
    });
    this.layers = layers;
    this.floortile = new Sprite(Sprites.StageFloor.image, Sprites.StageFloor.start, Sprites.StageFloor.size);
    this.undergroundtile = new Sprite(Sprites.Underground.image, Sprites.Underground.start, Sprites.Underground.size);
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
    image: "./assets/platforms/tiles/tile_0003.png",
    start: new Vector(0, 0),
    size: new Vector(21, 21),
  },
  Underground: {
    image: "./assets/platforms/tiles/tile_0032.png",
    start: new Vector(0, 0),
    size: new Vector(21, 21),
  },
  BlueWitch: {},
  Knight: {
    image: "./assets/knight/color_1/outline/png_sheets/_idle.png",
    start: new Vector(0, 0),
    size: new Vector(120, 80),
  },
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
  private scale: number;
  private stage: Stage;
  private gameState: GameState;

  constructor(ctx: CanvasRenderingContext2D, gameState: GameState, ui: UI) {
    this.ctx = ctx;
    this.ui = ui;
    this.baseWidth = 320;
    this.baseHeight = 180;
    this.ctxWidth = 16;
    this.ctxHeight = 9;
    this.scale = 1;
    this.xOffset = 0;
    this.yOffset = 0;
    this.stage = new Stage();
    this.gameState = gameState;

    window.addEventListener("resize", () => {
      this.resize();
    });
    this.resize();
  }

  public cX(x: number) {
    return this.xOffset + x;
  }

  // not using this atm might delete later
  public cY(y: number) {
    return this.yOffset + y;
  }

  public rX(x: number) {
    return x - this.xOffset;
  }

  // ditto cY
  public rY(y: number) {
    return y - this.yOffset;
  }

  private resize(): void {
    const boundingBox = canvas.parentElement!.getBoundingClientRect();
    this.ctx.canvas.width = boundingBox.width;
    this.ctx.canvas.height = boundingBox.height;

    // the game will break if it is too small. this ensures it wont brick the game
    // if the user decides to, for some unkown reason, make their screen smaller than
    // 320px x 180px
    if (this.ctx.canvas.width < this.baseWidth || this.ctx.canvas.height < this.baseHeight) {
      this.ctx.canvas.width = this.baseWidth;
      this.ctx.canvas.height = this.baseHeight;
      this.ctxWidth = this.baseWidth;
      this.ctxHeight = this.baseHeight;
      return
    }

    let ctxWidth = (boundingBox.width) - ((boundingBox.width) % this.baseWidth);
    let ctxHeight = (ctxWidth / this.baseWidth) * this.baseHeight;

    // @TODO make this cleaner. I feel like there's a more concise way of performing this check
    if (ctxHeight > this.ctx.canvas.height) {
      ctxHeight = (boundingBox.height) - ((boundingBox.height) % this.baseHeight);
      ctxWidth = (ctxHeight / this.baseHeight) * this.baseWidth;
    }

    this.ctxWidth = ctxWidth;
    this.ctxHeight = ctxHeight;
    this.scale = Math.min((this.ctxWidth / this.baseWidth), (this.ctxHeight / this.baseHeight));

    this.xOffset = Math.floor(Math.abs((this.ctx.canvas.width - this.ctxWidth) / 2));
    // this.yOffset = Math.floor(Math.abs((this.ctx.canvas.height - this.ctxHeight) / 2));

    this.ui.resize(this.ctxWidth, this.ctxHeight);
  }

  draw(uiState: UIMode): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    // for future referce just incase I decide to add a Y offset 
    // this is the hex for the background color => #afdfcb

    // this.drawDebug();
    this.drawStage();
    this.drawCharacters();
    this.drawUI(uiState);
  }

  private drawDebug() {
    this.ctx.fillStyle = 'red';
    this.ctx.fillRect(this.cX(0), this.cY(0), this.cX(this.ctxWidth), this.cY(this.ctxHeight));
  }

  private drawStage(): void {
    // this is the background
    this.stage.layers.forEach((layer) => {
      this.ctx.drawImage(layer, this.cX(0), this.cY(0), this.ctxWidth, this.ctxHeight);

      // draw for overflow
      this.ctx.drawImage(layer, this.cX(0) - this.ctxWidth, this.cY(0), this.ctxWidth, this.ctxHeight);
      this.ctx.drawImage(layer, this.cX(this.ctxWidth), this.cY(0), this.ctxWidth, this.ctxHeight);
    });

    // im drawing all the way across the bottom of the screen to account for letterboxing
    // this is the bottom part of the stage btw
    const blockwidth = this.stage.floortile.size.x * this.scale;
    for (let i = 0 - this.baseWidth * 2; i < this.cX(this.ctxWidth); i += blockwidth) {
      const floorPos = new Vector(this.cX(i), this.cY(this.ctxHeight - this.stage.floortile.size.y * this.scale));
      this.drawSprite(this.stage.floortile, floorPos);

      // underground. not sure about this
      let k = 0;
      for (let j = this.ctxHeight; j < this.ctxHeight + this.baseHeight; j += blockwidth) {
        const undergroundPos = new Vector(this.cX(i), this.ctxHeight + (k * blockwidth));
        this.drawSprite(this.stage.undergroundtile, undergroundPos);
        k++;
      }
    }

    this.ctx.fillStyle = this.stage.shading;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  private drawCharacters(): void {
    this.gameState.team.forEach((character) => {
      const x = this.cX(character.position.x * this.scale);
      const y = this.cY(character.position.y * this.scale);
      const sPos = new Vector(x, y);
      this.drawSprite(character.sprite, sPos) 
    });
  }

  private drawSprite(sprite: Sprite, pos: Vector): void {
    const sWidth = sprite.size.x * this.scale;
    const sHeight = sprite.size.y * this.scale;
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
        this.drawPanel(this.ui.titleScreen);

        this.ui.titleScreen.children.forEach((child) => {
          if (child instanceof Button) {
            this.drawButton(child);
          } else if (child instanceof Panel) {
            this.drawPanel(child)
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
    this.ctx.fillRect(this.cX(btn.x), this.cY(btn.y), btn.width, btn.height);

    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 5;
    this.ctx.beginPath();
    this.ctx.rect(this.cX(btn.x), this.cY(btn.y), btn.width, btn.height);
    this.ctx.stroke();

    this.ctx.fillStyle = "black";
    const fontSize = Math.round(btn.width * 0.08);
    this.ctx.font = `${fontSize}px "Press Start 2P"`;

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const textX = btn.x + btn.width / 2;
    const textY = btn.y + btn.height / 2;

    this.ctx.fillText(btn.text, this.cX(textX), this.cY(textY));
  }

  private drawPanel(pnl: Panel) {
    this.ctx.fillStyle = pnl.backgroundColor;
    this.ctx.fillRect(this.cX(pnl.x), this.cY(pnl.y), pnl.width, pnl.height)

    this.ctx.strokeStyle = pnl.backgroundColor;
    this.ctx.lineWidth = pnl.borderWidth;
    this.ctx.beginPath();
    this.ctx.rect(this.cX(pnl.x), this.cY(pnl.y), pnl.width, pnl.height);
  }
}

class EventBus {
  public bus: Game;

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
    10,
    BorderWidth.Med,
    null
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
    10,
    BorderWidth.Med,
    null,
  );

  const screens = Map<number, UIElement[]>
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

  // so readable
  private mouse(e: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();

    // im ngl I feel like this access to the display driver function is incorrect but if I didn't do it this way,
    // then my code would look like a react project that passes down a piece of data 5 layers
    const x = this.eventBus.bus.displayDriver.rX((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = this.eventBus.bus.displayDriver.rY((e.clientY - rect.top) * (canvas.height / rect.height));

    return { x: x, y: y };
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

enum BackgroundColor {
  IvoryWhite = "#FFFFF0"
}

enum BorderWidth {
  Med = 5
}

enum BorderColor {
  Black = "black"
}

class Panel extends UIElement {
  public screens: Map<number, UIElement[]> | null;
  public alignment: Alignment;
  public margin: number;
  public borderWidth: number;
  public borderColor: string;
  public backgroundColor: string;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    alignment: Alignment,
    margin: number,
    borderWidth: number = 0,
    screens: Map<number, UIElement[]> | null,
    borderColor: string = "",
    backgroundColor: string = ""
  ) {
    super(x, y, width, height);
    this.alignment = alignment;
    this.margin = margin;
    this.borderWidth = borderWidth;
    this.borderColor = borderColor;
    this.backgroundColor = backgroundColor;
    this.screens = screens;
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

  // addScreen(id: number, screen: UIElement[]): void {
  //   this.screens.set(id, screen);
  // }
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
