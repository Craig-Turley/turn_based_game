const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ButtonType = {
  PLAY: "Play",
  CHANGE_TEAM: "ChangeTeam",
  UNUSED: "Unused",
}

const UIState = {
  TITLE_SCREEN: "TitleScreen",
  IN_GAME: "InGame",
  SETTINGS: "Settings",
};

const Event = {
  MOUSE_DOWN: "MouseDown", 
}

/*
*   @param {EventType}
*   @param {any]
*   @returns {event}
*/
function constructEvent(eventType, data) {
  return {
    event: eventType,
    data: data,
  } 
}

class Game {
  constructor(ctx) {
    this.ctx = ctx;
    this.eventBus = new EventBus(this);
    // TODO find a better way to deal with this
    // pretty dirty :(
    const boundingBox = canvas.parentElement.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio; 

    this.ctx.canvas.width = boundingBox.width * devicePixelRatio;
    this.ctx.canvas.height = boundingBox.height * devicePixelRatio; 
    this.ctx.canvas.style.width = `${boundingBox.width}px`
    this.ctx.canvas.style.height = `${boundingBox.height}px`

    this.ui = new UI(this.eventBus, this.ctx);
    this.displayDriver = new DisplayDriver(this.ctx, this.eventBus, this.ui);
    this.uiState = UIState.TITLE_SCREEN;
    requestAnimationFrame(() =>{ 
      this.draw();
    });
  }

  draw() {
    this.displayDriver.draw(this.uiState);
    requestAnimationFrame(() => {
      this.draw();
    });
  }

  update(event) {
    switch (event.event) {
      case Event.MOUSE_DOWN:
        console.log(event);
        this.handleBtn(event.data);
        break;
    } 
  }

  handleBtn(btn) {
    switch (btn) {
    case ButtonType.PLAY:
      this.uiState = UIState.IN_GAME;
      this.ui.update(UIState.IN_GAME);
      break;
    } 
  }

}

class DisplayDriver {
  constructor(ctx, eventBus, ui) {
    this.ctx = ctx;
    this.eventBus = eventBus;
    this.ui = ui;
    
    window.addEventListener("resize", () => {
      this.resize()
    });
    this.resize();

    window.addEventListener("mousedown", (e) => {
      const btn = this.buttonClicked(this.mouse(e));
      const event = constructEvent(Event.MOUSE_DOWN, btn);
      this.eventBus.send(event); 
    });
  }

  resize() {
    const boundingBox = canvas.parentElement.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio; 

    this.ctx.canvas.width = boundingBox.width * devicePixelRatio;
    this.ctx.canvas.height = boundingBox.height * devicePixelRatio; 
    this.ctx.canvas.style.width = `${boundingBox.width}px`
    this.ctx.canvas.style.height = `${boundingBox.height}px`

    this.ui.resize(); 
  }

  draw(uiState) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    switch (uiState) {
    case UIState.TITLE_SCREEN:
      this.ui.drawTitleScreenUi(); 
      break;
    case UIState.IN_GAME:
      this.ui.drawGameUi(); 
      break;
    } 
  }

  buttonClicked(mouse) {
    const btn = this.ui.currentButtons.find(btn => 
      mouse.x >= btn.x &&
      mouse.x <= btn.x + btn.width &&
      mouse.y >= btn.y &&
      mouse.y <= btn.y + btn.height
    );
    return btn ? btn.button : null; 
  }

  mouse(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width; 
      const scaleY = canvas.height / rect.height; 

      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      return { x: x, y: y };
  }

}

class EventBus {
 
  // this is the game object
  constructor(bus) {
    this.bus = bus;
  }
  // sends an event to the game update loop
  send(event) {
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

function constructTitleScreen(ctxWidth, ctxHeight) {
  const mainPanel = new Panel(
    ctxWidth * 0.25,
    ctxHeight * 0.25,
    ctxWidth * 0.5,
    ctxHeight * 0.5,
    Alignment.VERTICAL,
    10
  );

  mainScreenButtons.forEach((btn, index) => {
    const buttonWidth = mainPanel.width * 0.8;
    const buttonHeight = mainPanel.height / mainScreenButtons.length - mainPanel.margin;
    const childBtn = new Button(0, 0, buttonWidth, buttonHeight, btn.text);
    mainPanel.addChild(childBtn);
  });

  mainPanel.resize();
  return mainPanel;
}

class UI {
  constructor(eventBus, ctx) {
    this.eventBus = eventBus;
    this.ctx = ctx;
    this.titleScreen = constructTitleScreen(this.ctx.canvas.width, this.ctx.canvas.height);
  }

  drawTitleScreenUi() {
    this.titleScreen.draw(this.ctx);
  }

  resize() {
    this.titleScreen.height = Math.floor(this.ctx.canvas.height * 0.4);
    this.titleScreen.width = Math.floor(this.titleScreen.height * 0.5);
    this.titleScreen.x = Math.floor((this.ctx.canvas.width / 2) - (this.titleScreen.width / 2));
    this.titleScreen.y = Math.floor((this.ctx.canvas.height / 2) - (this.titleScreen.height / 2));

    this.titleScreen.resize();
  }

}

class UIElement {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.children = [];
  }

  draw(ctx) {
    this.children.forEach((child) => child.draw(ctx));
  }

  resize() {
    this.children.forEach((child) => child.resize(ctx));
  }
}

const Alignment = {
  VERTICAL: "Vertical",
  HORIZONTAL: "Horizontal",
}

class Panel extends UIElement {
  constructor(x, y, width, height, alignment, margin) {
    super(x, y, width, height);
    this.alignment = alignment;
    this.margin = margin;
  }

  resize() {
    const totalChildren = this.children.length;
    let width, height, xOffset, yOffset;

    switch (this.alignment) {
      case Alignment.VERTICAL:
        height = Math.floor((this.height / totalChildren) - this.margin);
        width = this.width;
        xOffset = 0;
        yOffset = (index) => (height + this.margin) * index;
        break;

      case Alignment.HORIZONTAL:
        width = Math.floor((this.width / totalChildren) - this.margin);
        height = this.height;
        xOffset = (index) => (width + this.margin) * index;
        yOffset = 0;
        break;
    }

    for (const [index, child] of this.children.entries()) {
      child.width = width;
      child.height = height;
      child.x = this.x + (xOffset ? xOffset(index) : 0);
      child.y = this.y + (yOffset ? yOffset(index) : 0);
    }

    super.resize();
  }
  
  addChild(child) {
    this.children.push(child);
  }
}

class Button extends UIElement {
  constructor(x, y, width, height, text) {
    super(x, y, width, height);
    this.text = text;
  }

  resize() {}

  draw(ctx) {
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.stroke();

    const fontsize = Math.round(this.width * 0.1);
    ctx.fillStyle = "white";
    ctx.font = `${fontsize}px Arial`;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle"; 

    const textX = this.x + this.width / 2; 
    const textY = this.y + this.height / 2; 

    ctx.fillText(this.text, textX, textY);
  }

  containsPoint(x, y) {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    );
  }
}

function main() {
  const game = new Game(ctx);
}

main();
