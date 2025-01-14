const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const Button = {
  PLAY: "Play",
  CHANGE_TEAM: "ChangeTeam",
  UNUSED: "Unused",
}

const BUTTONS = [
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
]

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
  constructor(ctx, buttons) {
    this.ctx = ctx;
    this.buttons = buttons;
    this.eventBus = new EventBus(this);
    this.displayDriver = new DisplayDriver(this.ctx, this.eventBus, this.buttons);
    this.uiState = UIState.TITLE_SCREEN;
    requestAnimationFrame(() =>{ 
      this.draw();
    });
  }


  draw() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
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
      break;
    } 
  }
  

}

class DisplayDriver {
  constructor(ctx, eventBus, buttons) {
    this.ctx = ctx;
    this.eventBus = eventBus;
    this.buttons = buttons;
    
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

    // bounding box of buttons
    const height = Math.round(this.ctx.canvas.height - (this.ctx.canvas.height * 0.6));
    const top = Math.round((this.ctx.canvas.height / 2) - (height / 2));
    const offset = Math.round(height / this.buttons.length);

    // h x w of each button
    const h = Math.round(offset - (offset * 0.2));
    const w = height * 0.5;

    this.buttons.forEach((button, i) => {
      button.width = w;
      button.height = h;
      button.x = Math.round((this.ctx.canvas.width / 2) - (button.width / 2)); 
      button.y = top + (offset * i);
    });
  }

  draw(uiState) {
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
    const btn = this.buttons.find(btn => 
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
    this.buttons.forEach((btn) => {
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
  
function main() {
  const game = new Game(ctx, BUTTONS);
}

main();
