const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const Button = {
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
    case Button.PLAY:
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
      this.drawUI();
      break;
    case UIState.IN_GAME:
      this.drawGame();
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

  drawUI() {
    this.ui.mainScreenButtons.forEach((btn) => {
      this.ctx.strokeStyle = "white";
      this.ctx.beginPath();
      this.ctx.rect(btn.x, btn.y, btn.width, btn.height);
      this.ctx.stroke();

      const fontsize = Math.round(btn.width * 0.1);
      this.ctx.fillStyle = "white";
      this.ctx.font = `${fontsize}px Arial`;

      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle"; 

      const textX = btn.x + btn.width / 2; 
      const textY = btn.y + btn.height / 2; 

      this.ctx.fillText(btn.text, textX, textY);
    });
  }

  drawGame() {
    this.ctx.fillText("Game", this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);
    this.ui.inGameButtons.forEach((btn) => {
      this.ctx.strokeStyle = "white";
      this.ctx.beginPath();
      this.ctx.rect(btn.x, btn.y, btn.width, btn.height);
      this.ctx.stroke();

      const fontsize = Math.round(btn.width * 0.1);
      this.ctx.fillStyle = "white";
      this.ctx.font = `${fontsize}px Arial`;

      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle"; 

      const textX = btn.x + btn.width / 2; 
      const textY = btn.y + btn.height / 2; 

      this.ctx.fillText(btn.text, textX, textY);
    });
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

class UI {
  mainScreenButtons = [
    {
      button: Button.PLAY,
      text: "Play",
      height: 100,
      width: 200,
      x: 0,
      y: 0,
    },
    {
      button: Button.CHANGE_TEAM,
      text: "Change Team",
      height: 100,
      width: 200,
      x: 0,
      y: 0,
    },
    {
      button: Button.UNUSED,
      text: "Unused",
      height: 100,
      width: 200,
      x: 0,
      y: 0,
    },
    {
      button: Button.UNUSED,
      text: "Unused",
      height: 100,
      width: 200,
      x: 0,
      y: 0,
    },
  ];

  inGameButtons = [
    {
      text: "Panel",
      height: 100,
      width: 100,
      x: 0,
      y: 0,
    },
  ];

  currentButtons = this.mainScreenButtons;

  constructor(eventBus, ctx) {
    this.eventBus = eventBus;
    this.ctx = ctx;
  }

  resize() {
    // mainscreen buttons ------------
    // bounding box of buttons
    const height = Math.round(this.ctx.canvas.height - (this.ctx.canvas.height * 0.6));
    const top = Math.round((this.ctx.canvas.height / 2) - (height / 2));
    const offset = Math.round(height / this.mainScreenButtons.length);

    // h x w of each button
    const h = Math.round(offset - (offset * 0.2));
    const w = height * 0.5;

    this.mainScreenButtons.forEach((button, i) => {
      button.width = w;
      button.height = h;
      button.x = Math.round((this.ctx.canvas.width / 2) - (button.width / 2)); 
      button.y = top + (offset * i);
    });

    // in game buttons -----------
    this.inGameButtons[0].height = Math.round(this.ctx.canvas.height * 0.1);
    this.inGameButtons[0].width = Math.round(this.ctx.canvas.width);
    this.inGameButtons[0].x = 0;
    this.inGameButtons[0].y = Math.round(this.ctx.canvas.height - this.inGameButtons[0].height);
  }

  update(uiState) {
    switch (uiState) {
    case UIState.IN_GAME:
      this.currentButtons = this.inGameButtons;
      break;
    }
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
}

class Panel extends UIElement {
  constructor(x, y, width, height, alignment, margin) {
    super(x, y, width, height) 
    this.alignment = alignment;
    this.margin = margin;
  }
  
  resize() {
    switch (this.alignment) {
    case Alignment.VERTICAL:
      this.resizeVertical();
    case
    }
  }
}

function main() {
  const game = new Game(ctx);
}

main();
