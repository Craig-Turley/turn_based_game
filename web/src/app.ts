const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

enum EventType {
  CREATE_ROOM,
  JOIN_ROOM,
  PLAY,
  CHANGE_TEAM,
  UI_TOGGLE,
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

type Move = {
  name: String,
  damage: number, // positive or negative based on healing effects and stuff 
}

class Character {
  public sprite: Sprite;
  public position: Vector;
  public health: number;
  public defense: number;
  public attack: Move[];

  constructor(sprite: Sprite, position: Vector, health: number, defense: number, attack: Move[]) {
    this.sprite = sprite;
    this.position = position;
    this.health = health;
    this.defense = defense;
    this.attack = attack;
  }
}

class GameState {
  roomKey: string | null;
  team: Character[];

  constructor(ctxWidth: number, ctxHeight: number) {
    // const team: Character[] = [];
    // // figure this out - (update) alright I think I did - (update) yeah no I didn't
    // const spacing = Math.floor((ctxWidth / 2) / 4);
    // for (let i = 1; i <= 3; i++) {
    //   const sprite = new Sprite(Sprites.Necromancer.image, Sprites.Necromancer.start, Sprites.Necromancer.size, Sprites.Necromancer.offset, Sprites.Necromancer.id);
    //   const pos = new Vector((spacing * i), ctxHeight - Sprites.StageFloor.size.y - sprite.size.y);
    //   team.push(new Character(sprite, pos, 1, 1, 1));
    // }
    this.team = this.constructTeam(ctxWidth, ctxHeight);
    // this.team = this.constructTeam(ctxWidth, ctxHeight);
    this.roomKey = null;
  }

  constructTeam(ctxWidth: number, ctxHeight: number): Character[] {
    const team: Character[] = [];
    const spacing = Math.floor((ctxWidth / 2) / 4);

    const necromancerSprite = new Sprite(Characters.Necromancer.image, Characters.Necromancer.start, Characters.Necromancer.size, Characters.Necromancer.offset, Characters.Necromancer.id);
    const necromancerPos = new Vector(spacing * 1, ctxHeight - Characters.StageFloor.size.y - necromancerSprite.size.y);
    team.push(new Character(necromancerSprite, necromancerPos, 3, 5, Characters.Necromancer.moves));

    const witchSprite = new Sprite(Characters.BlueWitch.image, Characters.BlueWitch.start, Characters.BlueWitch.size, Characters.BlueWitch.offset, Characters.BlueWitch.id);
    const witchPos = new Vector(spacing * 2, ctxHeight - Characters.StageFloor.size.y - witchSprite.size.y);
    team.push(new Character(witchSprite, witchPos, 2, 6, Characters.BlueWitch.moves));

    const knightSprite = new Sprite(Characters.Knight.image, Characters.Knight.start, Characters.Knight.size, Characters.Knight.offset, Characters.Knight.id);
    const knightPos = new Vector(spacing * 3, ctxHeight - Characters.StageFloor.size.y - knightSprite.size.y);
    team.push(new Character(knightSprite, knightPos, 5, 3, Characters.Knight.moves));

    return team;
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
    this.ui = new UI(this.eventBus, 320, 180);
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
        this.ui.setMode(this.uiState);;
        break;
      case EventType.UI_TOGGLE:
        const btn: Button = event.data;
        // TODO clean this up so that we're not searching unessescary (spelling lol) panels
        btn.toggleIds.forEach((id) => {
          this.ui.curMode.forEach((child) => child.toggleChild(id));
        });
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
    this.floortile = new Sprite(Characters.StageFloor.image, Characters.StageFloor.start, Characters.StageFloor.size, Characters.StageFloor.offset, Characters.StageFloor.id);
    this.undergroundtile = new Sprite(Characters.Underground.image, Characters.Underground.start, Characters.Underground.size, Characters.Underground.offset, Characters.Underground.id);
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

enum SpriteID {
  Knight,
  BlueWitch,
  Necromancer,
  StageFloor,
  Underground,
}

const Characters = {
  StageFloor: {
    image: "./assets/platforms/tiles/tile_0003.png",
    start: new Vector(0, 0),
    size: new Vector(21, 21),
    offset: new Vector(0, 0),
    id: SpriteID.StageFloor,
  },
  Underground: {
    image: "./assets/platforms/tiles/tile_0032.png",
    start: new Vector(0, 0),
    size: new Vector(21, 21),
    offset: new Vector(0, 0),
    id: SpriteID.Underground,
  },
  Knight: {
    image: "./assets/knight/color_1/outline/png_sheets/_idle.png",
    start: new Vector(0, 0),
    size: new Vector(120, 80),
    offset: new Vector(0, 0),
    moves: [
      { name: "Slash", damage: 10 },
    ],
    id: SpriteID.Knight,
  },
  BlueWitch: {
    image: "./assets/blue_witch/_idle.png",
    start: new Vector(0, 0),
    size: new Vector(32, 40),
    offset: new Vector(0, 0),
    moves: [
      { name: "Heal", damage: - 4 },
      { name: "Arcane Burst", damage: 7 },
    ],
    id: SpriteID.BlueWitch,
  },
  Necromancer: {
    image: "./assets/necromancer/sprite_sheet.png",
    start: new Vector(0, 0),
    size: new Vector(160, 128),
    moves: [
      { name: "Bone Shield", damage: 0 },
      { name: "Dark Pulse", damage: 7 },
    ],
    offset: new Vector(0, 0),
    id: SpriteID.Necromancer,
  },
};

class Sprite {
  image: CanvasImageSource;
  start: Vector;
  size: Vector;
  offset: Vector;
  id: SpriteID;

  constructor(path: string, start: Vector, size: Vector, offset: Vector, id: SpriteID) {
    const img = new Image();
    img.src = path;
    this.image = img;
    this.size = size;
    this.start = start;
    this.offset = offset;
    this.id = id;
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
  public scale: number;

  constructor(ctx: CanvasRenderingContext2D, gameState: GameState, ui: UI) {
    this.ctx = ctx;
    this.ui = ui;
    this.baseWidth = 320;
    this.baseHeight = 180;
    this.ctxWidth = 320;
    this.ctxHeight = 180;
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

      // debug
      // this.ctx.strokeStyle = "black";
      // this.ctx.lineWidth = 5;
      // this.ctx.beginPath();
      // this.ctx.rect(this.cX(0), this.cY(0), this.ctxWidth, this.ctxHeight);
      // this.ctx.stroke();
      //
      // this.ctx.beginPath();
      // this.ctx.moveTo(this.cX(Math.floor(this.ctxWidth / 2)), 0);
      // this.ctx.lineTo(this.cX(Math.floor(this.ctxWidth / 2)), this.ctxHeight);
      // this.ctx.stroke();
      //
      // this.ctx.beginPath();
      // this.ctx.moveTo(this.cX(Math.floor(this.ctxWidth / 4)), 0);
      // this.ctx.lineTo(this.cX(Math.floor(this.ctxWidth / 4)), this.ctxHeight);
      // this.ctx.stroke();
    });

    // im drawing all the way across the bottom of the screen to account for letterboxing
    // this is the bottom part of the stage btw
    const blockwidth = this.stage.floortile.size.x;
    for (let i = 0 - this.baseWidth * 2; i < this.cX(this.ctxWidth); i += blockwidth) {
      const floorPos = new Vector(i, this.baseHeight - this.stage.floortile.size.y);
      this.drawSprite(this.stage.floortile, floorPos);
      // underground. not sure about this
      let k = 0;
      for (let j = this.ctxHeight; j < this.ctxHeight + this.baseHeight; j += blockwidth) {
        const undergroundPos = new Vector(i, this.baseHeight + (k * blockwidth));
        this.drawSprite(this.stage.undergroundtile, undergroundPos);
        k++;
      }
    }

    this.ctx.fillStyle = this.stage.shading;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  private drawCharacters(): void {
    this.gameState.team.forEach((character, i) => {
      const x = character.position.x;
      const y = character.position.y;
      const sPos = new Vector(x, y);
      this.drawSprite(character.sprite, sPos)
    });
  }

  private drawSprite(sprite: Sprite, pos: Vector): void {
    const x = this.cX(pos.x * this.scale - Math.floor(sprite.size.x * this.scale / 2));
    const y = this.cY(pos.y * this.scale);
    const width = sprite.size.x * this.scale;
    const height = sprite.size.y * this.scale;
    this.ctx.drawImage(
      sprite.image,
      sprite.start.x,
      sprite.start.y,
      sprite.size.x,
      sprite.size.y,
      x,
      y,
      width,
      height,
    );

    //debug
    // if (sprite.id !== SpriteID.BlueWitch) {
    //   return;
    // }
    //
    // console.log(`Sprite ID: ${sprite.id}, Width: ${width}, Position: (${x}, ${y})`);
    //
    // this.ctx.beginPath();
    // this.ctx.strokeStyle = 'red';
    // this.ctx.rect(x, y, width, height); // No need to use cX for dimensions
    // this.ctx.stroke();
    //
    // const centerX = x + width / 2;
    // this.ctx.beginPath();
    // this.ctx.moveTo(centerX, y); // Center line start
    // this.ctx.lineTo(centerX, y + height); // Center line end
    // this.ctx.stroke();
    //
  }

  private drawUI(uiState: UIMode) {
    this.ui.curMode.forEach((element) => {
      if (!element.visible) return

      switch (true) {
        case element instanceof Button:
          this.drawButton(element as Button);
          break;
        case element instanceof Panel:
          this.drawPanel(element as Panel)
          break;
      }
    });
  }

  private drawButton(btn: Button) {
    if (!btn.visible) return
    this.ctx.fillStyle = btn.backgroundColor;
    this.ctx.fillRect(this.cX(btn.x * this.scale), this.cY(btn.y * this.scale), btn.width * this.scale, btn.height * this.scale);

    this.ctx.strokeStyle = btn.borderColor;
    this.ctx.lineWidth = btn.borderWidth;
    this.ctx.beginPath();
    this.ctx.rect(this.cX(btn.x * this.scale), this.cY(btn.y * this.scale), btn.width * this.scale, btn.height * this.scale);
    this.ctx.stroke();

    this.ctx.fillStyle = "black";
    const fontSize = Math.round(btn.width * this.scale * 0.08);
    this.ctx.font = `${fontSize}px "Press Start 2P"`;

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const textX = Math.floor(btn.x + btn.width / 2) * this.scale;
    const textY = Math.floor(btn.y + btn.height / 2) * this.scale;

    this.ctx.fillText(btn.text, this.cX(textX), this.cY(textY));
  }

  private drawPanel(pnl: Panel) {
    if (!pnl.visible) return
    this.ctx.save();
    this.ctx.fillStyle = pnl.backgroundColor;
    this.ctx.fillRect(this.cX(pnl.x * this.scale), this.cY(pnl.y * this.scale), this.scale * pnl.width, this.scale * pnl.height)
    this.ctx.restore();

    this.ctx.strokeStyle = pnl.borderColor;
    this.ctx.lineWidth = pnl.borderWidth;
    this.ctx.beginPath();
    this.ctx.rect(this.cX(pnl.x * this.scale), this.cY(pnl.y * this.scale), pnl.width * this.scale, pnl.height * this.scale);
    this.ctx.stroke();

    pnl.children.forEach((child) => {
      switch (true) {
        case child instanceof Button:
          this.drawButton(child as Button);
          break;
        case child instanceof Panel:
          this.drawPanel(child as Panel)
          break;
      }
    });
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


function constructTitleScreen(baseWidth: number, baseHeight: number, generateID: () => number): UIElement[] {
  const pnlHeight = Math.floor(baseHeight * 0.4);
  const pnlWidth = Math.floor(pnlHeight * 0.5);
  const x = Math.floor(
    (baseWidth * 0.5) - (pnlWidth * 0.5)
  );
  const y = Math.floor(
    (baseHeight * 0.5) - (pnlHeight * 0.5)
  );

  const mainPanel = new Panel(
    generateID(),
    x,
    y,
    pnlWidth,
    pnlHeight,
    null,
    []
  );

  // should export this later to maybe some persistence files
  const mainScreenButtons = [
    {
      event: [EventType.CREATE_ROOM],
      text: "Create Room",
    },
    {
      event: [EventType.CHANGE_TEAM],
      text: "Join Room",
    },
    {
      event: [EventType.CHANGE_TEAM],
      text: "Change Team",
    },
    {
      event: [EventType.UNUSED],
      text: "Unused",
    },
  ];

  // some padding for the buttons
  const padding = 4;
  const btnHeight = (pnlHeight / mainScreenButtons.length) - padding;
  mainScreenButtons.forEach((btn, i) => {
    const btnY = (y + ((btnHeight + padding) * i));
    const childBtn = new Button(generateID(), x, btnY, pnlWidth, btnHeight, mainPanel, [], btn.event, btn.text);
    childBtn.backgroundColor = BackgroundColor.IvoryWhite;
    childBtn.borderColor = BorderColor.Black;
    childBtn.borderWidth = BorderWidth.Med;
    mainPanel.addChild(childBtn);
  });


  return [mainPanel];
}

function constructGameScreen(baseWidth: number, baseHeight: number, generateID: () => number): UIElement[] {
  // x, y, width, height, parent, children
  const pnlWidth = baseWidth * 0.7;
  const pnlHeight = Characters.StageFloor.size.y;
  const x = Math.floor((baseWidth / 2) - (pnlWidth / 2));
  const y = Math.floor((baseHeight) - (pnlHeight - 3));
  const mainPanel = new Panel(
    generateID(),
    x,
    y,
    pnlWidth,
    pnlHeight,
    null,
    [],
  );

  mainPanel.backgroundColor = BackgroundColor.IvoryWhite;
  mainPanel.borderColor = BorderColor.Black;
  mainPanel.borderWidth = BorderWidth.Med;

  // the below code is just for testing and proof of concept
  const btnWidth = pnlWidth * 0.2;
  const btnHeight = pnlHeight * 0.8;
  const button = new Button(
    generateID(),
    x + ((pnlWidth / 2) - (btnWidth / 2)),
    y + ((pnlHeight / 2) - (btnHeight / 2)),
    btnWidth,
    btnHeight,
    mainPanel,
    [],
    [EventType.UI_TOGGLE],
    "Change"
  );

  button.backgroundColor = BackgroundColor.IvoryWhite;
  button.borderColor = BorderColor.Black;
  button.borderWidth = BorderWidth.Med;

  const btn2Width = pnlWidth * 0.2;
  const btn2Height = pnlHeight * 0.8;
  const button2 = new Button(
    generateID(),
    x + (pnlWidth - btn2Width - 2),
    y + ((pnlHeight / 2) - (btn2Height / 2)),
    btn2Width,
    btn2Height,
    mainPanel,
    [],
    [EventType.UI_TOGGLE],
    "Back"
  );

  button2.backgroundColor = BackgroundColor.IvoryWhite;
  button2.borderColor = BorderColor.Black;
  button2.borderWidth = BorderWidth.Med;
  button2.visible = false;

  mainPanel.addChild(button);
  mainPanel.addChild(button2);

  button.addToggleId(button2.id);
  button2.addToggleId(button2.id);
  button.addToggleId(button.id);
  button2.addToggleId(button.id);

  return [mainPanel];
}

enum UIMode {
  TitleScreen,
  Waiting,
  InGame,
}

// damn never thought id ever use a closure but here we are
function initIdGenerator(): () => number {
  let counter = 0;

  return function generateID(): number {
    return counter++;
  }
}

class UI {
  private eventBus: EventBus;
  private idGenerator: () => number;

  public curMode: UIElement[];
  public screens: { [key in UIMode]: UIElement[] }

  constructor(eventBus: EventBus, baseWidth: number, baseHeight: number) {
    this.eventBus = eventBus;
    this.idGenerator = initIdGenerator();
    this.screens = {
      [UIMode.TitleScreen]: constructTitleScreen(baseWidth, baseHeight, this.idGenerator),
      [UIMode.Waiting]: [],
      [UIMode.InGame]: constructGameScreen(baseWidth, baseHeight, this.idGenerator),
    };
    this.curMode = this.screens[UIMode.TitleScreen];
    document.addEventListener("click", (e: MouseEvent) => {
      const mousePosition = this.mouse(e);
      for (const element of this.curMode) {
        const btn = this.buttonClicked(element, mousePosition);

        if (btn) {
          console.log(btn.text);
          const events = btn.eventList();
          events.forEach((e) => {
            const event = ConstructEvent(e, btn);
            this.eventBus.send(event);
          });
          break;
        }
      }
    });

    console.log(this.screens);
  }

  public setMode(mode: UIMode) {
    switch (mode) {
      case (UIMode.TitleScreen):
        this.curMode = this.screens[UIMode.TitleScreen];
        break;
      case (UIMode.InGame):
        this.curMode = this.screens[UIMode.InGame];
        break;
    }
  }

  // i like this function
  // ram will be eaten up so much if the UI is anymore complex though
  private buttonClicked(element: UIElement, mouse: { x: number; y: number }): Button | null {
    if (!element.contains(mouse.x, mouse.y) || !element.visible) return null;

    if (element instanceof Button) return element;

    if (element instanceof Panel) {
      for (const child of element.children) {
        const btn = this.buttonClicked(child, mouse);
        if (btn) return btn;
      }
    }

    return null;
  }

  // so readable
  private mouse(e: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();

    // im ngl I feel like this access to the display driver function is incorrect but if I didn't do it this way,
    // then my code would look like a react project that passes down a piece of data 5 layers
    const scale = this.eventBus.bus.displayDriver.scale;
    const x = Math.floor(this.eventBus.bus.displayDriver.rX((e.clientX - rect.left) * (canvas.width / rect.width)) / scale);
    const y = Math.floor(this.eventBus.bus.displayDriver.rY((e.clientY - rect.top) * (canvas.height / rect.height)) / scale);

    console.log(x, y)

    return { x: x, y: y };
  }

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

class UIElement {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  parent: UIElement | null;
  children: UIElement[];
  visible: boolean;
  borderWidth: number;
  borderColor: string;
  backgroundColor: string;

  constructor(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
    parent: UIElement | null,
    children: UIElement[]
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.parent = parent;
    this.children = children;
    this.borderWidth = BorderWidth.Med;
    this.borderColor = "rgba(0, 0, 0, 0)";
    this.backgroundColor = "rgba(0, 0, 0, 0)";
    this.visible = true
  }

  contains(x: number, y: number): boolean {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    );
  }

  toggle(): void {
    this.visible = !this.visible;
  }

  toggleChild(id: number): void {
    for (const child of this.children) {
      if (child.id == id) {
        child.toggle();
        break;
      }

      child.toggleChild(id);
    }
  }
}

class Panel extends UIElement {
  constructor(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
    parent: UIElement | null,
    children: UIElement[]
  ) {
    super(id, x, y, width, height, parent, children);
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
  events: EventType[];
  toggleIds: number[];

  constructor(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
    parent: UIElement | null,
    children: UIElement[],
    events: EventType[],
    text: string
  ) {
    super(id, x, y, width, height, parent, children);
    this.events = events;
    this.text = text;
    this.toggleIds = [];
  }

  eventList(): EventType[] {
    return this.events;
  }

  addToggleId(id: number) {
    this.toggleIds.push(id);
  }
}

class Modal extends UIElement {
  text: string;

  constructor(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
    parent: UIElement | null,
    text: string
  ) {
    super(id, x, y, width, height, parent, []);
    this.text = text;
  }

}

function main(): void {
  const game = new Game(ctx);
}

main();
