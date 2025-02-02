const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

enum EventType {
  CREATE_ROOM,
  JOIN_ROOM,
  PLAY,
  CHANGE_TEAM,
  UI_TOGGLE,
  UNUSED,
  CHOOSE_ACTIVE_CHARACTER
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
    team.push(new Character(necromancerSprite, necromancerPos, 3, 5, Characters.Necromancer.moves, Characters.Necromancer.id));

    const witchSprite = new Sprite(Characters.BlueWitch.image, Characters.BlueWitch.start, Characters.BlueWitch.size, Characters.BlueWitch.offset, Characters.BlueWitch.id);
    const witchPos = new Vector(spacing * 2, ctxHeight - Characters.StageFloor.size.y - witchSprite.size.y);
    team.push(new Character(witchSprite, witchPos, 2, 6, Characters.BlueWitch.moves, Characters.BlueWitch.id));

    const knightSprite = new Sprite(Characters.Knight.image, Characters.Knight.start, Characters.Knight.size, Characters.Knight.offset, Characters.Knight.id);
    const knightPos = new Vector(spacing * 3, ctxHeight - Characters.StageFloor.size.y - knightSprite.size.y);
    team.push(new Character(knightSprite, knightPos, 5, 3, Characters.Knight.moves, Characters.Knight.id));

    return team;
  }

}

const BASE_WIDTH = 320;
const BASE_HEIGHT = 180;

class Game {
  private ctx: CanvasRenderingContext2D;
  private eventBus: EventBus;
  private ui: UI;
  private uiState: UIMode;
  public gameState: GameState;
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
        this.ui.setMode(this.uiState);
        break;
      case EventType.UI_TOGGLE:
        // TODO clean this up so that we're not searching unessescary (spelling lol) panels
        console.log(event.data);
        break;
      case EventType.CHOOSE_ACTIVE_CHARACTER:
        console.log(event);
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
    const curScreen = this.ui.curMode.peek()!;
    curScreen.children.forEach((element) => {
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

function constructTitleScreen(baseWidth: number, baseHeight: number, generateID: () => number): UIElement {
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
  );

  const mainScreenButtons = [
    {
      events: [{ event: EventType.CREATE_ROOM, data: null }],
      text: "Create Room",
    },
    {
      events: [{ event: EventType.CHANGE_TEAM, data: null }],
      text: "Join Room",
    },
    {
      events: [{ event: EventType.CHANGE_TEAM, data: null }],
      text: "Change Team",
    },
    {
      events: [{ event: EventType.UNUSED, data: null }],
      text: "Unused",
    },
  ];

  // some padding for the buttons
  const padding = 4;
  const btnHeight = (pnlHeight / mainScreenButtons.length) - padding;
  mainScreenButtons.forEach((btn, i) => {
    const btnY = (y + ((btnHeight + padding) * i));
    const childBtn = new Button(generateID(), x, btnY, pnlWidth, btnHeight, btn.events, btn.text);
    childBtn.parent = mainPanel;
    childBtn.backgroundColor = BackgroundColor.IvoryWhite;
    childBtn.borderColor = BorderColor.Black;
    childBtn.borderWidth = BorderWidth.Med;
    mainPanel.addChild(childBtn);
  });


  return mainPanel;
}

function evenlySpaceButtons(
  generateID: () => number,
  parentX: number,
  parentY: number,
  parentWidth: number,
  parentHeight: number,
  btnCount: number,
  padding: number
): Button[] {

  const btnWidth = Math.floor((parentWidth - (padding * (btnCount + 1))) / btnCount);
  const btnHeight = Math.floor(parentHeight * 0.8);

  const totalButtonsWidth = btnCount * btnWidth + (btnCount - 1) * padding;
  const startX = parentX + Math.floor((parentWidth - totalButtonsWidth) / 2);

  const btns: Button[] = [];
  for (let i = 0; i < btnCount; i++) {
    const btnX = startX + i * (btnWidth + padding); // Compute X position for the button
    const btnY = parentY + Math.floor((parentHeight - btnHeight) / 2); // Center Y position

    const btn = new Button(
      generateID(),
      btnX,
      btnY,
      btnWidth,
      btnHeight,
      [],
      "",
    );

    btns.push(btn);
  }

  return btns;
}

function setBackButton(btn: Button) {
  btn.backgroundColor = BackgroundColor.LightGrey;
  btn.borderColor = BorderColor.Black;
  btn.borderWidth = BorderWidth.Med;
  btn.text = "Back";
}

// function constructGameScreen(
//   team: Character[],
//   baseWidth: number,
//   baseHeight: number,
//   generateID: () => number
// ): { screens: UIElement[], charactersid: number } {
//   // x, y, width, height, parent, children
//   let pnlWidth = baseWidth * 0.7;
//   let pnlHeight = Characters.StageFloor.size.y;
//   let x = Math.floor((baseWidth / 2) - (pnlWidth / 2));
//   let y = Math.floor((baseHeight) - (pnlHeight - 3));
//   const mainPanel = new Panel(
//     generateID(),
//     x,
//     y,
//     pnlWidth,
//     pnlHeight,
//   );
//
//   mainPanel.backgroundColor = BackgroundColor.IvoryWhite;
//   mainPanel.borderColor = BorderColor.Black;
//   mainPanel.borderWidth = BorderWidth.Med;
//
//   const characters = new Panel(
//     generateID(),
//     x,
//     y,
//     pnlWidth,
//     pnlHeight,
//   );
//
//   const characterBtns = evenlySpaceButtons(
//     generateID,
//     x,
//     y,
//     pnlWidth,
//     pnlHeight,
//     3,
//     4
//   );
//
//   for (let i = 0; i < characterBtns.length; i++) {
//     const btn = characterBtns[i];
//     btn.text = `${team[i].name}`;
//     btn.backgroundColor = BackgroundColor.IvoryWhite;
//     btn.borderWidth = BorderWidth.Med;
//     btn.borderColor = BorderColor.Black;
//     btn.addEvents({
//       event: EventType.CHOOSE_ACTIVE_CHARACTER,
//       data: team[i]
//     });
//   }
//
//   characters.addChild(...characterBtns);
//   mainPanel.addChild(characters);
//
//   return {
//     screens: [mainPanel],
//     charactersid: characters.id,
//   };
// }

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


// type UIElementOpts = {
//   borderWidth: number;
//   borderColor: string;
//   backgroundColor: string;
// }

enum BackgroundColor {
  IvoryWhite = "#FFFFF0",
  LightGrey = "#D3D3D3"
}

enum BorderWidth {
  Med = 3
}

enum BorderColor {
  Black = "black"
}

const defaultOpts = {
  borderWidth: BorderWidth.Med,
  borderColor: BorderColor.Black,
  backgroundColor: BackgroundColor.IvoryWhite,
}

function constructScreen(ui: UI): void {
  ui.Begin(UIMode.TitleScreen);
  ui.button(defaultOpts);
  ui.button(defaultOpts);
  ui.button(defaultOpts);
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

  peek(): UIElement | undefined {
    return this.stack[this.stack.length - 1];
  }
}

class UI {
  private eventBus: EventBus;
  private generateID: () => number;

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
    constructScreen(this);
    document.addEventListener("click", (e: MouseEvent) => {
      const mousePosition = this.mouse(e);
      for (const element of this.curMode.peek()!.children) {
        const btn = this.buttonClicked(element, mousePosition);

        if (btn) {
          console.log(btn.text);
          const events = btn.eventList();
          events.forEach((e) => {
            this.eventBus.send(e);
          });
          break;
        }
      }
    });
  }

  // START HERE. REMEMBER RENDERSTACK AND NEW SUBMENU CLASS. WE'RE RENDERING
  // ALL CHILDREN AND IF A SUBMENU IS PRESSED, THE NEXT MENU SHOULD BE PUSHED
  // TO THE STACK TO BE RENDERED. THE BACK BUTTON WILL POP. YOU GOT THIS!!!!!!
  public Begin(mode: UIMode): void {
    this.screens[mode].push(new Panel(this.generateID(), 0, 0, BASE_WIDTH, BASE_HEIGHT));
    this.currentBuildMode = mode;
  }

  public beginMenu(id: string, name: string, opts: UIElementOpts): void {
    const currentElement = this.screens[this.currentBuildMode].peek()!;
    const menu = new Menu(id, 0, 0, 0, 0, name, opts);
    menu.parent = currentElement;
    currentElement.addChildren(menu);
    this.screens[this.currentBuildMode].push(menu);
  }

  public button(opts: UIElementOpts): void {
    const currentElement = this.screens[this.currentBuildMode].peek();
    const btn = new Button(this.generateID(), 0, 0, 0, 0, [], "");
    btn.parent = currentElement!;
    currentElement!.addChildren(btn);
  }

  public endMenu(): void {
    this.screens[this.currentBuildMode].pop(); 
  }

  // this is where all the position calculation goes
  public End(): void {
    console.log(this.screens[this.currentBuildMode]);
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


type UIElementOpts = {
  borderWidth: number;
  borderColor: string;
  backgroundColor: string;
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
    this.borderWidth = BorderWidth.Med;
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
  constructor(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    super(id, x, y, width, height);
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
    text: string
  ) {
    super(id, x, y, width, height);
    this.events = events;
    this.text = text;
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

  constructor(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
    parent: UIElement | null,
    text: string
  ) {
    super(id, x, y, width, height);
    this.text = text;
  }

}

function main(): void {
  const game = new Game(ctx);
}

main();
