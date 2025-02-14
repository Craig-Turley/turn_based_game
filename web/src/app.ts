const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

const BASE_WIDTH = 320;
const BASE_HEIGHT = 180;

enum EventType {
  CREATE_ROOM,
  ROOM_ID_RECIEVED,
  SINGLE_PLAYER,
  CONNECT,
  JOIN_ROOM,
  START_GAME,
  PLAY,
  CHANGE_TEAM,
  UI_TOGGLE,
  UI_UNTOGGLE,
  UI_UNTOGGLE_ID,
  UNUSED,
  CHOOSE_ACTIVE_CHARACTER, // cuurrently not used
  QUEATTACK,
  OUTGOINGATTACK,
  INCOMINGATTACK,
  CHARACTER_DEATH,
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

function AddVectors(a: Vector, b: Vector): Vector {
  return new Vector(a.x + b.x, a.y + b.y);
}

enum Target {
  EnemyTeam,
  OwnTeam,
}

type Move = {
  name: string,
  damage: number, // positive or negative based on healing effects and stuff 
  target: Target,
}

type Attack = {
  character: Character,
  attack: Move,
  target: Character,
}

class Character {
  public sprite: Sprite;
  public originalPosition: Vector;
  public position: Vector;
  public health: number;
  public maxhealth: number;
  public defense: number;
  public attack: Move[];
  public name: string;

  constructor(sprite: Sprite, position: Vector, health: number, defense: number, attack: Move[], name: string) {
    this.sprite = sprite;
    this.position = position;
    this.originalPosition = position;
    this.health = health;
    this.maxhealth = health;
    this.defense = defense;
    this.attack = attack;
    this.name = name;
  }

  maxHealth(): number {
    return this.maxhealth;
  }
}

class GameState {
  roomKey: string | null;
  team: Character[];
  enemyTeam: Character[];
  attackQueue: Attack[];
  eventBus: EventBus;

  constructor(ctxWidth: number, ctxHeight: number, eventBus: EventBus) {
    this.team = this.constructTeam(ctxWidth, ctxHeight);
    this.eventBus = eventBus;
    this.enemyTeam = [];
    this.attackQueue = [];
    this.roomKey = null;
  }

  queAttack(attack: Attack): Boolean {
    const index = this.attackQueue.findIndex((qattack) => attack.character === qattack.character);

    if (index !== -1) {
      this.attackQueue.splice(index, 1);
    }

    this.attackQueue.push(attack);
    return this.attackQueue.length == this.team.length;
  }

  flushQueue(): void {
    this.attackQueue = [];
  }

  constructTeam(ctxWidth: number, ctxHeight: number): Character[] {
    const team: Character[] = [];
    const spacing = Math.floor((ctxWidth / 2) / 4);

    const necromancerSprite = new Sprite(Characters.Necromancer.image, Characters.Necromancer.start, Characters.Necromancer.size, Characters.Necromancer.offset, Characters.Necromancer.id, Characters.Necromancer.animations, Characters.Necromancer.boundingBox, true, 15);
    const necromancerPos = new Vector((spacing * 1), ctxHeight - Characters.StageFloor.size.y - Math.floor(Characters.Necromancer.size.y / 2));
    team.push(new Character(necromancerSprite, necromancerPos, 20, 5, Characters.Necromancer.moves, Characters.Necromancer.id));

    const witchSprite = new Sprite(Characters.BlueWitch.image, Characters.BlueWitch.start, Characters.BlueWitch.size, Characters.BlueWitch.offset, Characters.BlueWitch.id, Characters.BlueWitch.animations, Characters.BlueWitch.boundingBox, true, 10);
    const witchPos = new Vector(spacing * 2, ctxHeight - Characters.StageFloor.size.y - Math.floor(Characters.BlueWitch.size.y / 2));
    team.push(new Character(witchSprite, witchPos, 17, 6, Characters.BlueWitch.moves, Characters.BlueWitch.id));

    const knightSprite = new Sprite(Characters.Knight.image, Characters.Knight.start, Characters.Knight.size, Characters.Knight.offset, Characters.Knight.id, Characters.Knight.animations, Characters.Knight.boundingBox, true, 5);
    const knightPos = new Vector(spacing * 3, ctxHeight - Characters.StageFloor.size.y - Math.floor(Characters.Knight.size.y / 2));
    team.push(new Character(knightSprite, knightPos, 22, 3, Characters.Knight.moves, Characters.Knight.id));

    return team;
  }

  async handleOutgoingAttack(animating: Promise<void> | null, data: Attack) {
    if (animating) {
      await animating;
    }

    const { attack, character, target } = data;
    const health = target.health - attack.damage;
    if (health <= target.maxHealth()) {
      target.health = health;
    }

    if (health <= 0) {
      this.eventBus.send(ConstructEvent(EventType.CHARACTER_DEATH, target));
    }
  }

  async handleIncomingAttack(animating: Promise<void> | null, data: Attack) {
    if (animating) {
      await animating;
    }

    const { attack, character, target } = data;
    const health = target.health - attack.damage;
    if (health <= target.maxHealth()) {
      target.health = health;
    }

    if (health <= 0) {
      this.eventBus.send(ConstructEvent(EventType.CHARACTER_DEATH, target));
    }
  }

  setEnemyTeam(enemyTeam: Character[]) {
    if (enemyTeam.length != 3) {
      console.error(`Team lenght mistmatch. Got ${enemyTeam.length}, want 3`);
    }
    //TODO handle this error
    //text book bad dev moment
    this.enemyTeam = enemyTeam;
  }
}

interface CommunicationProtocolDriver {
  sendTurn(attacks: Attack[]): void,
  connect(): void,
}

class Game {
  private ctx: CanvasRenderingContext2D;
  private eventBus: EventBus;
  private ui: UI;
  private uiState: UIMode;
  public commsDriver!: CommunicationProtocolDriver;
  public gameState: GameState;
  public displayDriver: DisplayDriver;
  animator: Animator;
  animationPromise: Promise<void> | null = null;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.eventBus = new EventBus(this);
    this.gameState = new GameState(BASE_WIDTH, BASE_HEIGHT, this.eventBus);
    this.ui = new UI(this.eventBus);
    this.displayDriver = new DisplayDriver(this.ctx, this.gameState, this.ui);
    this.animator = new Animator();
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
        this.commsDriver = new WebSocketDriver(this.eventBus);
        break;
      case EventType.CONNECT:
        console.log("Connected");
        // probably going to need to add a constructor for online matches when just given a list of characters
        this.gameState.setEnemyTeam(event.data);
        constructGameScreen(this.ui);
        constructOpponentTurnScreen(this.ui);
        break;
      case EventType.START_GAME:
        this.uiState = UIMode.InGame;
        this.ui.setMode(this.uiState);
        break;
      case EventType.SINGLE_PLAYER:
        this.commsDriver = new NOPCommunicationsDriver(this.eventBus);
        this.commsDriver.connect();
        break;
      case EventType.ROOM_ID_RECIEVED:
        const modal = this.ui.curMode.peek()!.findById("gameId") as Modal;
        modal.setText(`Room Number: ${event.data}`);
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
      case EventType.QUEATTACK:
        if (this.gameState.queAttack(event.data)) {
          this.uiState = UIMode.OpponentTurn;
          this.ui.setMode(this.uiState);
          this.update(ConstructEvent(EventType.OUTGOINGATTACK, this.gameState.attackQueue));
        }
        break;
      case EventType.OUTGOINGATTACK:
        (async () => {
          for (const attack of event.data) {
            this.animationPromise = this.animator.animate(attack.attack.name, attack);
            await this.gameState.handleOutgoingAttack(this.animationPromise, attack);
            this.animationPromise = null;
          }
          this.commsDriver.sendTurn(this.gameState.attackQueue);
          this.gameState.flushQueue();
        })();
        break;
      case EventType.INCOMINGATTACK:
        // this.animationPromise = this.animator.animate(event.data);
        // this.gameState.handleIncomingAttack(this.animationPromise, event.data);
        (async () => {
          await new Promise((res) => setTimeout(res, 2000));
          this.ui.setMode(UIMode.InGame);
        });
        break;
      case EventType.CHARACTER_DEATH:
        console.log(`Bro died. (${event.data.name})`);
        break;
    }
  }
}

class Animator {
  animations: { [key: string]: ((data: Attack) => Promise<void>)[] };

  constructor() {
    this.animations = {};
    this.registerAnimation("Slash", animateKnightWalkTarget);
    this.registerAnimation("Slash", animateKnightSlash);
    this.registerAnimation("Slash", animateKnightWalkBack);
  }

  animate(key: string, data: Attack): Promise<void> {
    if (!(key in this.animations)) {
      return new Promise((res) => setTimeout(res, 2000));
    }
    return new Promise(async (res) => {
      for (const animation of this.animations[key]) {
        await animation(data);
      }
      res();
    });
  }

  registerAnimation(key: string, animation: (data: Attack) => Promise<void>) {
    if (!this.animations[key]) {
      this.animations[key] = [];
    }
    this.animations[key].push(animation);
  }
}

// RIP browsers dont support raw tcp connections 
// need to write a damn proxy for this crappy game :')
class WebSocketDriver {
  eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  connect() { }

  sendTurn() { }
}

class NOPCommunicationsDriver {
  eventBus: EventBus;
  team: Character[];
  enemyTeam: Character[];

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.team = this.constructEnemyTeam(BASE_WIDTH, BASE_HEIGHT);
    this.enemyTeam = this.eventBus.bus.gameState.team; // this is the users team
  }

  connect() {
    this.eventBus.send(ConstructEvent(EventType.CONNECT, this.team));
    this.eventBus.send(ConstructEvent(EventType.START_GAME, ""));
  }

  sendTurn(attacks: Attack[]): void {
    // this.eventBus.send(ConstructEvent(EventType.INCOMINGATTACK, "RALRKJ"));
  }
  // constructTeam(ctxWidth: number, ctxHeight: number): Character[] {
  //   const team: Character[] = [];
  //   const spacing = Math.floor((ctxWidth / 2) / 4);
  //
  //   const necromancerSprite = new Sprite(Characters.Necromancer.image, Characters.Necromancer.start, Characters.Necromancer.size, Characters.Necromancer.offset, Characters.Necromancer.id, Characters.Necromancer.animations, Characters.Necromancer.boundingBox, true, 15);
  //   const necromancerPos = new Vector((spacing * 1), ctxHeight - Characters.StageFloor.size.y - Math.floor(Characters.Necromancer.size.y / 2));
  //   team.push(new Character(necromancerSprite, necromancerPos, 20, 5, Characters.Necromancer.moves, Characters.Necromancer.id));
  //
  //   const witchSprite = new Sprite(Characters.BlueWitch.image, Characters.BlueWitch.start, Characters.BlueWitch.size, Characters.BlueWitch.offset, Characters.BlueWitch.id, Characters.BlueWitch.animations, Characters.BlueWitch.boundingBox, true, 10);
  //   const witchPos = new Vector(spacing * 2, ctxHeight - Characters.StageFloor.size.y - Math.floor(Characters.BlueWitch.size.y / 2));
  //   team.push(new Character(witchSprite, witchPos, 17, 6, Characters.BlueWitch.moves, Characters.BlueWitch.id));
  //
  //   const knightSprite = new Sprite(Characters.Knight.image, Characters.Knight.start, Characters.Knight.size, Characters.Knight.offset, Characters.Knight.id, Characters.Knight.animations, Characters.Knight.boundingBox, true, 5);
  //   const knightPos = new Vector(spacing * 3, ctxHeight - Characters.StageFloor.size.y - Math.floor(Characters.Knight.size.y / 2));
  //   team.push(new Character(knightSprite, knightPos, 22, 3, Characters.Knight.moves, Characters.Knight.id));
  //
  //   return team;
  // }

  constructEnemyTeam(ctxWidth: number, ctxHeight: number): Character[] {
    const team: Character[] = [];
    const spacing = Math.floor((ctxWidth / 2) / 4);
    const offset = Math.floor((ctxWidth / 2));

    const necromancerSprite = new Sprite(Characters.Necromancer.image, Characters.Necromancer.start, Characters.Necromancer.size, Characters.Necromancer.offset, Characters.Necromancer.id, Characters.Necromancer.animations, Characters.Necromancer.boundingBox, true, 15);
    const necromancerPos = new Vector(spacing * 3 + offset, ctxHeight - Characters.StageFloor.size.y - Math.floor(Characters.Necromancer.size.y / 2));
    team.push(new Character(necromancerSprite, necromancerPos, 20, 5, Characters.Necromancer.moves, Characters.Necromancer.id + "enemy"));

    const witchSprite = new Sprite(Characters.BlueWitch.image, Characters.BlueWitch.start, Characters.BlueWitch.size, Characters.BlueWitch.offset, Characters.BlueWitch.id, Characters.BlueWitch.animations, Characters.BlueWitch.boundingBox, true, 10);
    const witchPos = new Vector(spacing * 2 + offset, ctxHeight - Characters.StageFloor.size.y - Math.floor(Characters.BlueWitch.size.y / 2));
    team.push(new Character(witchSprite, witchPos, 17, 6, Characters.BlueWitch.moves, Characters.BlueWitch.id + "enemy"));

    const knightSprite = new Sprite(Characters.Knight.image, Characters.Knight.start, Characters.Knight.size, Characters.Knight.offset, Characters.Knight.id, Characters.Knight.animations, Characters.Knight.boundingBox, true, 5);
    const knightPos = new Vector(spacing * 1 + offset, ctxHeight - Characters.StageFloor.size.y - Math.floor(Characters.Knight.size.y / 2));
    team.push(new Character(knightSprite, knightPos, 22, 3, Characters.Knight.moves, Characters.Knight.id + "enemy"));

    team.forEach((t) => t.sprite.toggleMirror());

    return team;
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
    this.floortile = new Sprite(Characters.StageFloor.image, Characters.StageFloor.start, Characters.StageFloor.size, Characters.StageFloor.offset, Characters.StageFloor.id, {}, Characters.StageFloor.boundingBox, false);
    this.undergroundtile = new Sprite(Characters.Underground.image, Characters.Underground.start, Characters.Underground.size, Characters.Underground.offset, Characters.Underground.id, {}, Characters.StageFloor.boundingBox, false);
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

  scale(s: number) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  add(b: Vector) {
    this.x += b.x;
    this.y += b.y;
    return this;
  }
}

enum SpriteID {
  Knight = "Knight",
  BlueWitch = "Blue Witch",
  Necromancer = "Necromancer",
  StageFloor = "Stage Floor",
  Underground = "Underground",
}

type SpriteAnimation = {
  start: Vector
  size: Vector
  frames: number
  offset: Vector
}

const Characters = {
  StageFloor: {
    image: "./assets/platforms/tiles/tile_0003.png",
    start: new Vector(0, 0),
    size: new Vector(21, 21),
    offset: new Vector(0, 0),
    boundingBox: { topl: new Vector(21, 21), bottomr: new Vector(- 10, - 10) },
    id: SpriteID.StageFloor,
  },
  Underground: {
    image: "./assets/platforms/tiles/tile_0032.png",
    start: new Vector(0, 0),
    size: new Vector(21, 21),
    offset: new Vector(0, 0),
    boundingBox: new Vector(21, 21),
    id: SpriteID.Underground,
  },
  Knight: {
    image: "./assets/knight/knight_sprite_sheet.png",
    start: new Vector(0, 80),
    size: new Vector(120, 80),
    offset: new Vector(0, 0),
    boundingBox: { topl: new Vector(-19, -5), bottomr: new Vector(8, 40) },
    moves: [
      { name: "Slash", damage: 5, target: Target.EnemyTeam },
      { name: "Defend", damage: 0, target: Target.OwnTeam },
    ],
    id: SpriteID.Knight,
    name: "Knight",
    animations: {
      ["idle"]: { start: new Vector(1, 329), size: new Vector(120, 82), frames: 10, offset: new Vector(120, 0) },
      ["damage"]: { start: new Vector(1, 165), size: new Vector(120, 82), frames: 1, offset: new Vector(120, 0) },
      ["run"]: { start: new Vector(1, 247), size: new Vector(120, 82), frames: 10, offset: new Vector(120, 0) },
      ["death"]: { start: new Vector(1, 83), size: new Vector(120, 82), frames: 10, offset: new Vector(120, 0) },
      ["Slash"]: { start: new Vector(1, 1), size: new Vector(120, 82), frames: 10, offset: new Vector(120, 0) },
    },
  },
  BlueWitch: {
    image: "./assets/blue_witch/blue_witch_sprite_sheet.png",
    start: new Vector(32, 96),
    size: new Vector(32, 40),
    offset: new Vector(0, 0),
    boundingBox: { topl: new Vector(-16, -20), bottomr: new Vector(16, 20) },
    moves: [
      { name: "Heal", damage: - 3, target: Target.OwnTeam },
      { name: "Arcane Burst", damage: 4, target: Target.EnemyTeam },
    ],
    id: SpriteID.BlueWitch,
    animations: {
      ["idle"]: { start: new Vector(250, 0), size: new Vector(32, 48), frames: 6, offset: new Vector(0, 48) },
      ["damage"]: { start: new Vector(218, 0), size: new Vector(32, 40), frames: 3, offset: new Vector(0, 40) },
      ["run"]: { start: new Vector(186, 0), size: new Vector(32, 40), frames: 8, offset: new Vector(0, 48) },
      ["death"]: { start: new Vector(154, 0), size: new Vector(32, 40), frames: 12, offset: new Vector(0, 40) },
      ["Heal"]: { start: new Vector(186, 0), size: new Vector(32, 48), frames: 5, offset: new Vector(0, 48) },
      ["Arcane Burst"]: { start: new Vector(0, 0), size: new Vector(186, 48), frames: 9, offset: new Vector(0, 48) },
    },
    name: "Witch",
  },
  Necromancer: {
    image: "./assets/necromancer/sprite_sheet.png",
    start: new Vector(0, 0),
    size: new Vector(160, 128),
    offset: new Vector(0, 0),
    boundingBox: { topl: new Vector(-19, -5), bottomr: new Vector(19, 64) },
    moves: [
      { name: "Bone Shield", damage: 0, target: Target.OwnTeam },
      { name: "Dark Pulse", damage: 6, target: Target.EnemyTeam },
    ],
    animations: {
      ["idle"]: { start: new Vector(0, 0), size: new Vector(160, 128), frames: 8, offset: new Vector(160, 0) },
      ["run"]: { start: new Vector(0, 128), size: new Vector(160, 128), frames: 8, offset: new Vector(160, 0) },
      ["damage"]: { start: new Vector(0, 768), size: new Vector(160, 128), frames: 5, offset: new Vector(160, 0) },
      ["death"]: { start: new Vector(0, 896), size: new Vector(160, 128), frames: 8, offset: new Vector(160, 0) },
      ["Dark Pulse"]: { start: new Vector(0, 256), size: new Vector(160, 128), frames: 13, offset: new Vector(160, 0) },
      ["Bone Shield"]: { start: new Vector(0, 512), size: new Vector(160, 128), frames: 17, offset: new Vector(160, 0) },
    },
    id: SpriteID.Necromancer,
    name: "Necromancer",
  },
};

function animateKnightWalkTarget(data: Attack): Promise<void> {
  const { character, attack, target } = data;

  const targetbbOffset = target.sprite.boundingBox.topl.x;
  const characterbbOffset = character.sprite.boundingBox.bottomr.x;

  const frames = 30;
  const distance = (target.position.x + targetbbOffset - 25 - character.position.x + characterbbOffset);
  const offset = Math.floor(distance / frames);

  character.sprite.setAnimation("run");

  return new Promise((res) => {
    const animate = (frame: number) => {
      if (frame >= frames) {
        res();
        return;
      }

      data.character.position.x += offset;
      requestAnimationFrame(() => animate(frame + 1));
    };

    animate(0);
  });

}

function animateKnightSlash(data: Attack): Promise<void> {
  const { character, attack, target } = data;
  const frames = character.sprite.animations[attack.name].frames;

  return new Promise((res) => {
    character.sprite.setAnimation(attack.name);
    const animate = () => {
      const frame = character.sprite.frame;
      if (frame + 1 >= frames) {
        character.sprite.setAnimation("idle");
        res();
        return
      }

      requestAnimationFrame(() => { animate() });
    };

    animate();
  });
}

function animateKnightWalkBack(data: Attack): Promise<void> {
  const { character, attack, target } = data;

  const distance = character.originalPosition.x - character.position.x;
  const frames = 30;
  const offset = Math.floor(distance / frames);

  return new Promise((res) => {
    character.sprite.toggleMirror();
    character.sprite.setAnimation("run");
    const animate = (frame: number) => {
      if (frame >= frames) {
        character.sprite.setAnimation("idle");
        character.sprite.toggleMirror();
        res();
        return;
      }

      character.position.x += offset;
      requestAnimationFrame(() => { animate(frame + 1) });
    };

    animate(0);
  });
}

class Sprite {
  image: CanvasImageSource;
  start: Vector;
  size: Vector;
  offset: Vector;
  boundingBox: { topl: Vector, bottomr: Vector };
  id: SpriteID;
  animations: { [key: string]: SpriteAnimation };
  currentAnimation: string;
  frame: number;
  fps: number;
  lastFrameTime: number;
  frameDelay: number;
  animating: boolean;
  mirrored: boolean;

  constructor(
    path: string,
    start: Vector,
    size: Vector,
    offset: Vector,
    id: SpriteID,
    animations: { [key: string]: SpriteAnimation },
    boundingBox: { topl: Vector, bottomr: Vector },
    canAnimate: boolean = false,
    fps: number = 15,
  ) {
    const img = new Image();
    img.src = path;
    this.image = img;
    this.size = size;
    this.start = canAnimate ? animations["idle"].start : start;
    this.offset = canAnimate ? animations["idle"].offset : start;
    this.boundingBox = boundingBox;
    this.id = id;
    this.animations = animations;
    this.currentAnimation = "idle";
    this.frame = 0;
    this.lastFrameTime = 0;
    this.fps = fps;
    this.frameDelay = 1000 / this.fps;
    this.animating = canAnimate;
    this.mirrored = false;

    if (canAnimate) {
      requestAnimationFrame(this.animate.bind(this));
    }
  }

  setAnimation(animation: string, fps?: number) {
    this.currentAnimation = animation;
    this.size = this.animations[animation].size;
    this.start = this.animations[animation].start;
    this.frame = 0;
    this.fps = fps ?? 10;
    this.frameDelay = 1000 / this.fps;
  }

  animate(timestamp: number) {
    if (this.animating) {
      if (!this.lastFrameTime) this.lastFrameTime = timestamp; // init on first frame

      const elapsed = timestamp - this.lastFrameTime;

      if (elapsed >= this.frameDelay) {
        this.lastFrameTime = timestamp;

        this.frame = (this.frame + 1) % this.animations[this.currentAnimation].frames;

        const animationStart = this.animations[this.currentAnimation].start;
        const animationOffset = this.animations[this.currentAnimation].offset;

        this.start = AddVectors(
          animationStart,
          new Vector(animationOffset.x * this.frame, animationOffset.y * this.frame)
        );

      }

      requestAnimationFrame(this.animate.bind(this));
    }
  }

  toggleMirror(): void {
    this.mirrored = !this.mirrored;
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
    this.drawTeam();
    this.drawEnemyTeam();
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
      const floorPos = new Vector(i, this.baseHeight - this.stage.floortile.size.y / 2);
      this.drawSprite(this.stage.floortile, floorPos);
      // underground. not sure about this
      let k = 0;
      for (let j = this.ctxHeight; j < this.ctxHeight + this.baseHeight; j += blockwidth) {
        const undergroundPos = new Vector(i, this.baseHeight + (k * blockwidth) + this.stage.floortile.size.y / 2);
        this.drawSprite(this.stage.undergroundtile, undergroundPos);
        k++;
      }
    }

    this.ctx.fillStyle = this.stage.shading;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  private drawTeam(): void {
    this.gameState.team.forEach((character) => {
      const x = character.position.x;
      const y = character.position.y;
      const sPos = new Vector(x, y);
      this.drawSprite(character.sprite, sPos);
      this.drawHealth(character);
    });
  }

  private drawEnemyTeam(): void {
    this.gameState.enemyTeam.forEach((character) => {
      const x = character.position.x;
      const y = character.position.y;
      const sPos = new Vector(x, y);
      this.drawSprite(character.sprite, sPos);
      this.drawHealth(character);
    });
  }

  private drawSprite(sprite: Sprite, pos: Vector): void {
    const x = this.cX(this.scale * Math.floor(pos.x - sprite.size.x / 2));
    const y = this.cY(this.scale * Math.floor(pos.y - sprite.size.y / 2));
    const width = sprite.size.x * this.scale;
    const height = sprite.size.y * this.scale;

    this.ctx.save();

    if (sprite.mirrored) {
      this.ctx.translate(x + width, y);
      this.ctx.scale(-1, 1);
    }

    this.ctx.drawImage(
      sprite.image,
      sprite.start.x,
      sprite.start.y,
      sprite.size.x,
      sprite.size.y,
      sprite.mirrored ? 0 : x, // When mirrored, draw from (0,0)
      sprite.mirrored ? 0 : y,
      width,
      height
    );

    this.ctx.restore();
  }

  private drawMirroredSprite(sprite: Sprite, pos: Vector): void {
    const x = this.cX(this.scale * Math.floor((pos.x - sprite.size.x / 2)));
    const y = this.cY(this.scale * Math.floor((pos.y - sprite.size.y / 2)));
    const width = sprite.size.x * this.scale;
    const height = sprite.size.y * this.scale;
    this.ctx.save();
    this.ctx.translate(x + width, y);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(
      sprite.image,
      sprite.start.x,
      sprite.start.y,
      sprite.size.x,
      sprite.size.y,
      0,
      0,
      width,
      height
    );
    this.ctx.restore();
  }

  drawHealth(character: Character) {
    this.ctx.font = `${3 * this.scale}px "Press Start 2P"`;
    const line = `HP: ${character.health}`;
    const textMetrics = this.ctx.measureText(line);

    const linewidth = textMetrics.width * 1.5;
    const lineheight = Math.floor((textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent) * 2);

    const pos = character.position;

    const width = (character.sprite.boundingBox.bottomr.x - character.sprite.boundingBox.topl.x);
    const x = this.cX(this.scale * (character.sprite.boundingBox.topl.x + pos.x + Math.floor(width / 2)));
    const y = this.cY(this.scale * (character.sprite.boundingBox.topl.y + pos.y));

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(Math.floor(x - (linewidth / 2)), Math.floor(y - (lineheight / 2)), linewidth, lineheight);

    this.ctx.fillStyle = BackgroundColor.IvoryWhite;
    this.ctx.fillText(line, x, y);
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
  OpponentTurn,
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
  DarkGrey = "#3b3b3b",
  Black = "#000000",
  LightRed = "#FF7F7F",
  LightGreen = "#90ee90",
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
  ui.button(defaultButtonOpts, "Single Player", [ConstructEvent(EventType.SINGLE_PLAYER, "")]);
  ui.button({ ...defaultButtonOpts, backgroundColor: BackgroundColor.DarkGrey }, "Change Team", [ConstructEvent(EventType.JOIN_ROOM, "")]);
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
  const enemyTeam = [...ui.eventBus.bus.gameState.enemyTeam].reverse();

  const targetMap = {
    [Target.OwnTeam]: team,
    [Target.EnemyTeam]: enemyTeam,
  }

  const targetColorMap = {
    [Target.OwnTeam]: BackgroundColor.LightGreen,
    [Target.EnemyTeam]: BackgroundColor.LightRed,
  }

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

      targetMap[attack.target].forEach((target) => {
        // dont change the order of these events. it matters
        // what are you...a permutation?!?!
        ui.button({ ...defaultButtonOpts, backgroundColor: targetColorMap[attack.target] }, target.name, [ConstructEvent(EventType.UI_UNTOGGLE_ID, "characterScreen"), ConstructEvent(EventType.QUEATTACK, { character: character, attack: attack, target: target })]);
      });

      ui.endPanel();
      ui.endMenu();
    });

    ui.endPanel();
    ui.endMenu();
  });

  ui.endPanel();
  ui.End();
}

function constructOpponentTurnScreen(ui: UI): void {
  let pnlWidth = BASE_WIDTH * 0.7;
  let pnlHeight = Characters.StageFloor.size.y;
  let x = Math.floor((BASE_WIDTH) - (pnlWidth + (BASE_WIDTH * 0.05)));
  let y = Math.floor((BASE_HEIGHT) - (pnlHeight - 3));
  let sidePnlWidth = BASE_WIDTH * 0.2;
  let sidePnlHeight = Characters.StageFloor.size.y;
  let sidex = BASE_HEIGHT * 0.05;
  let sidey = Math.floor((BASE_HEIGHT) - (sidePnlHeight - 3));

  ui.Begin(UIMode.OpponentTurn, "opponentTurn");

  ui.beginPanel({ ...defaultOpts, alignment: Alignment.Horizontal, backgroundColor: BackgroundColor.Black, borderColor: BorderColor.IvoryWhite }, null, sidex, sidey, sidePnlWidth, sidePnlHeight);
  ui.modal({ ...defaultOpts, alignment: Alignment.Horizontal, backgroundColor: BackgroundColor.Black, textColor: BackgroundColor.IvoryWhite }, "");
  ui.endPanel();

  ui.beginPanel({ ...defaultOpts, alignment: Alignment.Horizontal, backgroundColor: BackgroundColor.IvoryWhite, borderColor: BorderColor.Black, borderWidth: BorderWidth.Med }, "characterScreen", x, y, pnlWidth, pnlHeight);
  ui.modal({ ...defaultOpts, textColor: BackgroundColor.Black }, "Waiting for next turn...", "waitingModal");
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

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.generateID = initIdGenerator();
    this.screens = {
      [UIMode.TitleScreen]: new RenderStack(),
      [UIMode.Waiting]: new RenderStack(),
      [UIMode.InGame]: new RenderStack(),
      [UIMode.OpponentTurn]: new RenderStack(),
    };
    this.curMode = this.screens[UIMode.TitleScreen];
    this.currentBuildMode = UIMode.TitleScreen;
    constructMainScreen(this);
    constructWaitingScreen(this);
    document.addEventListener("click", (e: MouseEvent) => {
      const mousePosition = this.mouse(e);
      for (const element of this.curMode.peek()!.children) {
        const btn = this.buttonClicked(element, mousePosition);

        if (btn instanceof Button) {
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
    this.currentBuildMode = mode;
    this.screens[mode].push(new Panel(id ?? this.generateID(), 0, 0, BASE_WIDTH, BASE_HEIGHT, defaultOpts));
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
