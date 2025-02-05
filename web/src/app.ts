const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

enum EventType {
  CREATE_ROOM,
  JOIN_ROOM,
  PLAY,
  CHANGE_TEAM,
  UI_TOGGLE,
  UI_UNTOGGLE,
  UI_UNTOGGLE_ID,
  UNUSED,
  CHOOSE_ACTIVE_CHARACTER, // cuurrently not used
  OUTGOINGATTACK,
  INCOMINGATTACK,
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
  name: string,
  damage: number, // positive or negative based on healing effects and stuff 
}

class Character {
  public sprite: Sprite;
  public position: Vector;
  public health: number;
  public defense: number;
  public attack: Move[];
  public name: string;

  constructor(sprite: Sprite, position: Vector, health: number, defense: number, attack: Move[], name: string) {
    this.sprite = sprite;
    this.position = position;
    this.health = health;
    this.defense = defense;
    this.attack = attack;
    this.name = name;
  }
}

class GameState {
  roomKey: string | null;
  team: Character[];

  constructor(ctxWidth: number, ctxHeight: number) {
    this.team = this.constructTeam(ctxWidth, ctxHeight);
    this.roomKey = null;
  }

  constructTeam(ctxWidth: number, ctxHeight: number): Character[] {
    const team: Character[] = [];
    const spacing = Math.floor((ctxWidth / 2) / 4);

    const necromancerSprite = new Sprite(Characters.Necromancer.image, Characters.Necromancer.start, Characters.Necromancer.size, Characters.Necromancer.offset, Characters.Necromancer.id);
    const necromancerPos = new Vector(spacing * 1, ctxHeight - Characters.StageFloor.size.y - necromancerSprite.size.y);
    team.push(new Character(necromancerSprite, necromancerPos, 20, 5, Characters.Necromancer.moves, Characters.Necromancer.id));

    const witchSprite = new Sprite(Characters.BlueWitch.image, Characters.BlueWitch.start, Characters.BlueWitch.size, Characters.BlueWitch.offset, Characters.BlueWitch.id);
    const witchPos = new Vector(spacing * 2, ctxHeight - Characters.StageFloor.size.y - witchSprite.size.y);
    team.push(new Character(witchSprite, witchPos, 17, 6, Characters.BlueWitch.moves, Characters.BlueWitch.id));

    const knightSprite = new Sprite(Characters.Knight.image, Characters.Knight.start, Characters.Knight.size, Characters.Knight.offset, Characters.Knight.id);
    const knightPos = new Vector(spacing * 3, ctxHeight - Characters.StageFloor.size.y - knightSprite.size.y);
    team.push(new Character(knightSprite, knightPos, 22, 3, Characters.Knight.moves, Characters.Knight.id));

    return team;
  }

  handleAttack(attack: any) {
    const target = this.team.find((character) => character.name == attack.target);
    console.log("Target", target);
  }

}

const BASE_WIDTH = 320;
const BASE_HEIGHT = 180;

class Game {
  private ctx: CanvasRenderingContext2D;
  private eventBus: EventBus;
  private ui: UI;
  private uiState: UIMode;
  public commsDriver: CommunicationProtocolDriver;
  public gameState: GameState;
  public displayDriver: DisplayDriver;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.eventBus = new EventBus(this);
    this.commsDriver = new CommunicationProtocolDriver()
    this.gameState = new GameState(BASE_WIDTH, BASE_HEIGHT);
    this.ui = new UI(this.eventBus, BASE_WIDTH, BASE_HEIGHT);
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
        this.uiState = UIMode.Waiting;
        this.ui.setMode(this.uiState);
        (async () => {
          const roomCode = await this.commsDriver.createRoom();
          const modal = this.ui.curMode.peek()!.findById("gameId") as Modal;
          modal.setText(`Room Number: ${roomCode}`);
          // set the modal here. need to add setting to UI
        })();

        break;
      case EventType.UI_TOGGLE:
        this.ui.curMode.push(event.data);
        break;
      case EventType.UI_UNTOGGLE:
        this.ui.curMode.pop();
        break;
      case EventType.UI_UNTOGGLE_ID:
        this.ui.curMode.popBackTo(event.data);
        break;
      case EventType.CHOOSE_ACTIVE_CHARACTER:
        console.log(event);
        break;
      case EventType.OUTGOINGATTACK:
        console.log(event);
        break;
      case EventType.INCOMINGATTACK:
        this.gameState.handleAttack(event.data);
    }
  }
}

class CommunicationProtocolDriver {
  constructor() { }

  createRoom(): Promise<string> {
    return new Promise((res, rej) => {
      setTimeout(() => {
        res("12345678");
      }, 1000);
    });
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
  Knight = "Knight",
  BlueWitch = "Blue Witch",
  Necromancer = "Necromancer",
  StageFloor = "Stage Floor",
  Underground = "Underground",
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
      { name: "Defend", damage: 0 },
    ],
    id: SpriteID.Knight,
    name: "Knight",
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
    name: "Witch",
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
    name: "Necromancer",
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
  private ctxWidth: number;
  private ctxHeight: number;
  private xOffset: number;
  private yOffset: number;
  private stage: Stage;
  private gameState: GameState;
  public baseWidth: number;
  public baseHeight: number;
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
    this.drawUI(this.ui.curMode.peek()!);
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

  private drawUI(curScreen: UIElement) {
    this.drawPanel(curScreen as Panel);
    curScreen.children.forEach((child) => {
      if (!child.visible) return
      if (child instanceof Menu || child instanceof Button) {
        this.drawButton(child as Button);
      } else if (child instanceof Modal) {
        this.drawModal(child as Modal)
      } else if (child instanceof Panel) {
        this.drawUI(child as Panel);
      }
    });
  }

  private drawButton(btn: Button) {
    if (!btn.visible) return;

    this.ctx.fillStyle = btn.backgroundColor;
    this.ctx.fillRect(this.cX(btn.x * this.scale), this.cY(btn.y * this.scale), btn.width * this.scale, btn.height * this.scale);

    this.ctx.strokeStyle = btn.borderColor;
    this.ctx.lineWidth = btn.borderWidth;
    this.ctx.beginPath();
    this.ctx.rect(this.cX(btn.x * this.scale), this.cY(btn.y * this.scale), btn.width * this.scale, btn.height * this.scale);
    this.ctx.stroke();

    this.ctx.fillStyle = "black";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const maxWidth = btn.width * this.scale * 0.9;
    const maxHeight = btn.height * this.scale * 0.7;
    let fontSize = Math.round(btn.width * this.scale * 0.5);

    this.ctx.font = `${fontSize}px "Press Start 2P"`;

    while (this.ctx.measureText(btn.text).width > maxWidth && fontSize > 10) {
      fontSize -= 1;
      this.ctx.font = `${fontSize}px "Press Start 2P"`;
    }

    const words = btn.text.split(" ");
    let lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      let testLine = currentLine + " " + words[i];
      if (this.ctx.measureText(testLine).width > maxWidth) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    while (lines.length * fontSize * 1.2 > maxHeight && fontSize > 10) {
      fontSize -= 1;
      this.ctx.font = `${fontSize}px "Press Start 2P"`;
    }

    const textX = Math.floor(btn.x + btn.width / 2) * this.scale;
    const textY = Math.floor(btn.y + btn.height / 2) * this.scale - ((lines.length - 1) * fontSize * 0.6) / 2;

    lines.forEach((line, i) => {
      this.ctx.fillText(line, this.cX(textX), this.cY(textY + i * fontSize * 1.2));
    });
  }

  private drawModal(modal: Modal) {
    this.ctx.fillStyle = modal.backgroundColor;
    this.ctx.fillRect(this.cX(modal.x * this.scale), this.cY(modal.y * this.scale), modal.width * this.scale, modal.height * this.scale);

    this.ctx.strokeStyle = modal.borderColor;
    this.ctx.lineWidth = modal.borderWidth;
    this.ctx.beginPath();
    this.ctx.rect(this.cX(modal.x * this.scale), this.cY(modal.y * this.scale), modal.width * this.scale, modal.height * this.scale);
    this.ctx.stroke();

    this.ctx.fillStyle = modal.textColor;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const maxWidth = modal.width * this.scale * 0.9; // Allow 90% of button width
    const maxHeight = modal.height * this.scale * 0.7; // Allow 70% of button height
    let fontSize = Math.round(modal.height * this.scale * 0.5); // Start based on height

    this.ctx.font = `${fontSize}px "Press Start 2P"`;

    while (this.ctx.measureText(modal.text).width > maxWidth && fontSize > 10) {
      fontSize -= 1;
      this.ctx.font = `${fontSize}px "Press Start 2P"`;
    }

    const words = modal.text.split(" ");
    let lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      let testLine = currentLine + " " + words[i];
      if (this.ctx.measureText(testLine).width > maxWidth) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    while (lines.length * fontSize * 1.2 > maxHeight && fontSize > 10) {
      fontSize -= 1;
      this.ctx.font = `${fontSize}px "Press Start 2P"`;
    }

    const textX = Math.floor(modal.x + modal.width / 2) * this.scale;
    const textY = Math.floor(modal.y + modal.height / 2) * this.scale - ((lines.length - 1) * fontSize * 0.6) / 2;

    lines.forEach((line, i) => {
      this.ctx.fillText(line, this.cX(textX), this.cY(textY + i * fontSize * 1.2));
    });
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
      if (child instanceof Menu || child instanceof Button) {
        this.drawButton(child as Button);
      } else if (child instanceof Panel) {
        this.drawUI(child as Panel);
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

function setBackButton(btn: Button) {
  btn.backgroundColor = BackgroundColor.LightGrey;
  btn.borderColor = BorderColor.Black;
  btn.borderWidth = BorderWidth.Med;
  btn.text = "Back";
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

enum BackgroundColor {
  IvoryWhite = "#FFFFF0",
  LightGrey = "#D3D3D3",
  Black = "#000000",
  LightRed = "#FF7F7F",
  DarkTransparentGrey = "rgba(50, 50, 50, 1)",
}

enum BorderWidth {
  Med = 3
}

enum BorderColor {
  Black = "black",
  IvoryWhite = "#FFFFF0",
}

type UIElementOpts = {
  borderWidth: number;
  borderColor: string;
  backgroundColor: string;
  padding: number;
  alignment: Alignment;
  textColor: string;
}

enum Alignment {
  Vertical,
  Horizontal
}

const defaultOpts = {
  borderWidth: 0,
  borderColor: "rgba(0,0,0,0)",
  backgroundColor: "rgba(0,0,0,0)",
  padding: 0,
  alignment: Alignment.Vertical,
  textColor: "rgba(0,0,0,0)"
}

const defaultButtonOpts = {
  borderWidth: BorderWidth.Med,
  borderColor: BorderColor.Black,
  backgroundColor: BackgroundColor.IvoryWhite,
  padding: 0,
  alignment: Alignment.Vertical,
  textColor: "rgba(0,0,0,0)"
}

const defaultPanelOpts = {
  ...defaultOpts,
  backgroundColor: BackgroundColor.IvoryWhite,
  borderColor: BorderColor.Black,
  borderWidth: BorderWidth.Med
};

function constructMainScreen(ui: UI): void {
  const aspectRatio = 1.5;
  let pnlHeight = Math.floor(BASE_HEIGHT * 0.5);
  let pnlWidth = Math.floor(pnlHeight / aspectRatio);

  ui.Begin(UIMode.TitleScreen);
  ui.beginPanel(defaultOpts, null, ((BASE_WIDTH * 0.5) - (pnlWidth * 0.5)), ((BASE_HEIGHT * 0.5) - (pnlHeight * 0.5)), pnlWidth, pnlHeight);
  ui.button(defaultButtonOpts, "Make Room", [ConstructEvent(EventType.CREATE_ROOM, "")]);
  ui.button(defaultButtonOpts, "Join Room", [ConstructEvent(EventType.JOIN_ROOM, "")]);
  ui.button({ ...defaultButtonOpts, backgroundColor: BackgroundColor.LightGrey }, "Change Team", [ConstructEvent(EventType.JOIN_ROOM, "")]);
  ui.endPanel();
  ui.End();
}

function constructWaitingScreen(ui: UI): void {
  const pnlWidth = BASE_WIDTH * 0.6;
  const pnlHeight = Characters.StageFloor.size.y;
  const pnlX = Math.floor((BASE_WIDTH / 2) - (pnlWidth / 2));
  const pnlY = Math.floor((BASE_HEIGHT) - (pnlHeight - 3));

  const modalWidth = BASE_WIDTH * 0.5;
  const modalHeight = modalWidth;
  const modalX = Math.floor((BASE_WIDTH / 2) - (modalWidth / 2));
  const modalY = Math.floor((BASE_HEIGHT / 2) - (modalHeight / 2));

  ui.Begin(UIMode.Waiting);
  ui.beginPanel(defaultPanelOpts, null, pnlX, pnlY, pnlWidth, pnlHeight);
  ui.modal({ ...defaultOpts, textColor: BackgroundColor.Black }, "Waiting for player to Join");
  ui.endPanel();

  ui.beginPanel(defaultOpts, null, modalX, modalY, modalWidth, modalHeight);
  ui.modal({ ...defaultOpts, textColor: BackgroundColor.IvoryWhite, backgroundColor: BackgroundColor.DarkTransparentGrey }, "Fetching Room Number...", "gameId");
  ui.endPanel();
  ui.End();
}

function constructGameScreen(ui: UI): void {
  let pnlWidth = BASE_WIDTH * 0.7;
  let pnlHeight = Characters.StageFloor.size.y;
  let x = Math.floor((BASE_WIDTH) - (pnlWidth + (BASE_WIDTH * 0.05)));
  let y = Math.floor((BASE_HEIGHT) - (pnlHeight - 3));
  let sidePnlWidth = BASE_WIDTH * 0.2;
  let sidePnlHeight = Characters.StageFloor.size.y;
  let sidex = BASE_HEIGHT * 0.05;
  let sidey = Math.floor((BASE_HEIGHT) - (sidePnlHeight - 3));

  const team = [...ui.eventBus.bus.gameState.team].reverse();
  ui.Begin(UIMode.InGame, "characterScreen");

  ui.beginPanel({ ...defaultOpts, alignment: Alignment.Horizontal, backgroundColor: BackgroundColor.Black, borderColor: BorderColor.IvoryWhite }, null, sidex, sidey, sidePnlWidth, sidePnlHeight);
  ui.modal({ ...defaultOpts, alignment: Alignment.Horizontal, backgroundColor: BackgroundColor.Black, textColor: BackgroundColor.IvoryWhite }, "Choose a character");
  ui.endPanel();

  ui.beginPanel({ ...defaultOpts, alignment: Alignment.Horizontal, backgroundColor: BackgroundColor.IvoryWhite, borderColor: BorderColor.Black, borderWidth: BorderWidth.Med }, "characterScreen", x, y, pnlWidth, pnlHeight);

  team.forEach((character) => {
    ui.beginMenu(`${character.name}Button`, `${character.name}`, defaultButtonOpts);

    ui.beginPanel({ ...defaultOpts, alignment: Alignment.Horizontal, backgroundColor: BackgroundColor.Black, borderColor: BorderColor.IvoryWhite }, null, sidex, sidey, sidePnlWidth, sidePnlHeight);
    ui.modal({ ...defaultOpts, alignment: Alignment.Horizontal, backgroundColor: BackgroundColor.Black, textColor: BackgroundColor.IvoryWhite }, "Choose an attack");
    ui.endPanel();

    ui.beginPanel({ ...defaultOpts, alignment: Alignment.Horizontal, backgroundColor: BackgroundColor.IvoryWhite, borderColor: BorderColor.Black, borderWidth: BorderWidth.Med }, null, x, y, pnlWidth, pnlHeight);

    ui.backButton({ ...defaultButtonOpts, backgroundColor: BackgroundColor.LightGrey });
    character.attack.forEach((attack) => {
      ui.beginMenu(`${character.name}${attack.name}Button`, `${attack.name}`, defaultButtonOpts);

      ui.beginPanel({ ...defaultOpts, alignment: Alignment.Horizontal, backgroundColor: BackgroundColor.Black, borderColor: BorderColor.IvoryWhite }, null, sidex, sidey, sidePnlWidth, sidePnlHeight);
      ui.modal({ ...defaultOpts, alignment: Alignment.Horizontal, backgroundColor: BackgroundColor.Black, textColor: BackgroundColor.IvoryWhite }, "Choose a target");
      ui.endPanel();

      ui.beginPanel({ ...defaultOpts, alignment: Alignment.Horizontal, backgroundColor: BackgroundColor.IvoryWhite, borderColor: BorderColor.Black, borderWidth: BorderWidth.Med }, null, x, y, pnlWidth, pnlHeight);
      ui.backButton({ ...defaultButtonOpts, backgroundColor: BackgroundColor.LightGrey });
      ui.button({ ...defaultButtonOpts, backgroundColor: BackgroundColor.LightRed }, "Knight", [ConstructEvent(EventType.INCOMINGATTACK, { character: Characters.Knight.id, attack: attack, target: Characters.Knight.id }), ConstructEvent(EventType.UI_UNTOGGLE_ID, "characterScreen")]);
      ui.button({ ...defaultButtonOpts, backgroundColor: BackgroundColor.LightRed }, "Witch", [ConstructEvent(EventType.INCOMINGATTACK, { character: Characters.Knight.id, attack: attack, target: Characters.Knight.id }), ConstructEvent(EventType.UI_UNTOGGLE_ID, "characterScreen")]);
      ui.button({ ...defaultButtonOpts, backgroundColor: BackgroundColor.LightRed }, "Necromancer", [ConstructEvent(EventType.INCOMINGATTACK, { character: Characters.Knight.id, attack: attack, target: Characters.Knight.id }), ConstructEvent(EventType.UI_UNTOGGLE_ID, "characterScreen")]);
      ui.endPanel();
      ui.endMenu();
    });

    ui.endPanel();
    ui.endMenu();
  });

  ui.endPanel();
  ui.End();
}

class RenderStack {
  stack: UIElement[];

  constructor(...elements: UIElement[]) {
    this.stack = [...elements];
  }

  push(element: UIElement) {
    this.stack.push(element);
  }

  pop(): UIElement | undefined {
    return this.stack.pop();
  }

  popBackTo(elementId: string) {
    while (this.stack.length > 0) {
      const element = this.peek();
      if (element?.id === elementId) {
        break;
      }

      this.pop();
    }
  }

  peek(): UIElement | undefined {
    return this.stack[this.stack.length - 1];
  }
}

class UI {
  private generateID: () => number;
  public eventBus: EventBus;

  public curMode: RenderStack;
  public screens: { [key in UIMode]: RenderStack }

  private currentBuildMode: UIMode;

  constructor(eventBus: EventBus, baseWidth: number, baseHeight: number) {
    this.eventBus = eventBus;
    this.generateID = initIdGenerator();
    this.screens = {
      [UIMode.TitleScreen]: new RenderStack(),
      [UIMode.Waiting]: new RenderStack(),
      [UIMode.InGame]: new RenderStack(),
    };
    this.curMode = this.screens[UIMode.TitleScreen];
    this.currentBuildMode = UIMode.TitleScreen;
    constructMainScreen(this);
    constructWaitingScreen(this);
    constructGameScreen(this);
    document.addEventListener("click", (e: MouseEvent) => {
      const mousePosition = this.mouse(e);
      for (const element of this.curMode.peek()!.children) {
        const btn = this.buttonClicked(element, mousePosition);

        if (btn instanceof Button) {
          // console.log(btn.text);
          const events = btn.eventList();
          events.forEach((e) => {
            this.eventBus.send(e);
          });
          break;
        }

        if (btn instanceof Menu) {
          this.eventBus.send(btn.toggleEvent);
          break;
        }
      }
    });
  }

  public Begin(mode: UIMode, id: string | null = null): void {
    this.screens[mode].push(new Panel(id ?? this.generateID(), 0, 0, BASE_WIDTH, BASE_HEIGHT, defaultOpts));
    this.currentBuildMode = mode;
  }

  public beginMenu(id: string, name: string, opts: UIElementOpts): void {
    const currentElement = this.screens[this.currentBuildMode].peek()!;
    const menu = new Menu(id, 0, 0, 0, 0, name, opts);
    menu.parent = currentElement;
    currentElement.addChildren(menu);
    this.screens[this.currentBuildMode].push(menu);
  }

  public endMenu(): void {
    this.screens[this.currentBuildMode].pop();
  }

  public button(opts: UIElementOpts, text: string, events: event[]): void {
    const currentElement = this.screens[this.currentBuildMode].peek();
    const btn = new Button(this.generateID(), 0, 0, 0, 0, events, text, opts);
    btn.parent = currentElement!;
    currentElement!.addChildren(btn);
  }

  public backButton(opts: UIElementOpts): void {
    const currentElement = this.screens[this.currentBuildMode].peek()!;
    const btn = new Button(this.generateID(), 0, 0, 0, 0, [{ event: EventType.UI_UNTOGGLE, data: [] }], "Back", opts);
    btn.parent = currentElement;
    currentElement.addChildren(btn);
  }

  public modal(opts: UIElementOpts, text: string, id: string | null = null): void {
    const currentElement = this.screens[this.currentBuildMode].peek();
    const modal = new Modal(id ?? this.generateID(), 0, 0, 0, 0, text, opts);
    modal.parent = currentElement!;
    currentElement!.addChildren(modal);
  }

  public beginPanel(opts: UIElementOpts, id: string | null, ...args: [number, number, number, number]) {
    const currentElement = this.screens[this.currentBuildMode].peek()!;
    const panelID = id ?? this.generateID();
    const panel = new Panel(panelID, ...args, opts);
    panel.parent = currentElement;
    currentElement.addChildren(panel);
    this.screens[this.currentBuildMode].push(panel);
  }

  public endPanel() {
    const panel: Panel = this.screens[this.currentBuildMode].peek()! as Panel;
    if (panel.alignment == Alignment.Horizontal) {
      this.alignHorizontally(panel);
    } else {
      this.alignVertically(panel);
    }
    this.screens[this.currentBuildMode].pop();
  }

  private alignHorizontally(panel: UIElement) {
    const padding = 4;
    const btnCount = panel.children.length;
    const btnWidth = Math.floor((panel.width - (padding * (btnCount + 1))) / btnCount);
    const btnHeight = Math.floor(panel.height * 0.8);

    const totalButtonsWidth = btnCount * btnWidth + (btnCount - 1) * padding;
    const startX = panel.x + Math.floor((panel.width - totalButtonsWidth) / 2);
    for (let i = 0; i < panel.children.length; i++) {
      const btn = panel.children[i];
      const btnX = startX + i * (btnWidth + padding);
      const btnY = panel.y + Math.floor((panel.height - btnHeight) / 2);
      btn.x = btnX;
      btn.y = btnY;
      btn.height = btnHeight;
      btn.width = btnWidth;
    }

  }

  private alignVertically(panel: UIElement) {
    const padding = 4;
    const btnCount = panel.children.length;
    const btnWidth = Math.floor(panel.width * 0.8);
    const btnHeight = Math.floor((panel.height - (padding * (btnCount + 1))) / btnCount);

    const totalButtonsHeight = btnCount * btnHeight + (btnCount - 1) * padding;
    const startY = panel.y + Math.floor((panel.height - totalButtonsHeight) / 2);

    for (let i = 0; i < panel.children.length; i++) {
      const btn = panel.children[i];
      const btnX = panel.x + Math.floor((panel.width - btnWidth) / 2);
      const btnY = startY + i * (btnHeight + padding);

      btn.x = btnX;
      btn.y = btnY;
      btn.width = btnWidth;
      btn.height = btnHeight;
    }
  }

  public End(): void {
  }

  public setMode(mode: UIMode) {
    this.curMode = this.screens[mode];
  }

  // i like this function
  // ram will be eaten up so much if the UI is anymore complex though
  private buttonClicked(element: UIElement, mouse: { x: number; y: number }): Button | Menu | null {
    if (!element.contains(mouse.x, mouse.y) || !element.visible) return null;

    if (element instanceof Menu) return element;

    if (element instanceof Button) return element;

    if (element instanceof Panel) {
      for (const child of element.children) {
        const btn = this.buttonClicked(child, mouse);

        if (btn) return btn;
      }
    }

    return null;
  }

  public setText(text: string): void {
  }

  // so readable
  private mouse(e: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();

    // im ngl I feel like this access to the display driver function is incorrect but if I didn't do it this way,
    // then my code would look like a react project that passes down a piece of data 5 layers
    const scale = this.eventBus.bus.displayDriver.scale;
    const x = Math.floor(this.eventBus.bus.displayDriver.rX((e.clientX - rect.left) * (canvas.width / rect.width)) / scale);
    const y = Math.floor(this.eventBus.bus.displayDriver.rY((e.clientY - rect.top) * (canvas.height / rect.height)) / scale);

    // console.log(x, y)

    return { x: x, y: y };
  }

}


class UIElement {
  id: number | string;
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
    id: number | string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.parent = null;
    this.children = [];
    this.borderWidth = 0;
    this.borderColor = "rgba(0, 0, 0, 0)";
    this.backgroundColor = "rgba(0, 0, 0, 0)";
    this.visible = true;
  }

  contains(x: number, y: number): boolean {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    );
  }

  addChildren(...children: UIElement[]) {
    this.children.push(...children);
  }

  findById(id: string | number): UIElement | null {
    if (this.id === id) return this;

    for (const child of this.children) {
      if (child.id === id) return child;
    }

    for (const child of this.children) {
      const element = child.findById(id);
      if (element != null) return element;
    }

    return null;
  }

  // this has potential to mess up some state
  // ex 
  // parentpanel -> btn, btn, childpanel -> btn, btn
  // toggle called on childpanel, toggle called on parent panel
  // just be aware. not a problem now since were toggling at the top
  // level but just something to keep on the radar
  toggle(): void {
    this.visible = !this.visible;
    this.children.forEach((child) => child.toggle());
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
  alignment: Alignment;

  constructor(
    id: string | number,
    x: number,
    y: number,
    width: number,
    height: number,
    opts: UIElementOpts,
  ) {
    super(id, x, y, width, height);
    this.borderColor = opts.borderColor;
    this.borderWidth = opts.borderWidth;
    this.backgroundColor = opts.backgroundColor;
    this.alignment = opts.alignment;
  }

  addChild(...child: UIElement[]): void {
    this.children.push(...child);
  }

  // addScreen(id: number, screen: UIElement[]): void {
  //   this.screens.set(id, screen);
  // }
}

class Menu extends UIElement {
  text: string;
  toggleEvent: event;

  constructor(
    id: number | string,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    opts: UIElementOpts
  ) {
    super(id, x, y, width, height);
    this.text = text;
    this.borderColor = opts.borderColor;
    this.backgroundColor = opts.backgroundColor;
    this.borderWidth = opts.borderWidth;
    this.toggleEvent = { event: EventType.UI_TOGGLE, data: this };
  }
}

class Button extends UIElement {
  text: string;
  events: event[];
  data: any;

  constructor(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
    events: event[],
    text: string,
    opts: UIElementOpts
  ) {
    super(id, x, y, width, height);
    this.events = events;
    this.text = text;
    this.borderColor = opts.borderColor;
    this.borderWidth = opts.borderWidth;
    this.backgroundColor = opts.backgroundColor;
  }

  eventList(): event[] {
    return this.events;
  }

  addEvents(...events: event[]) {
    this.events.push(...events);
  }
}

class Modal extends UIElement {
  text: string;
  textColor: string;

  constructor(
    id: string | number,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    opts: UIElementOpts,
  ) {
    super(id, x, y, width, height);
    this.text = text;
    this.textColor = opts.textColor;
  }

  setText(text: string) {
    this.text = text;
  }

}

function main(): void {
  const game = new Game(ctx);
}

main();
