const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const BUTTONS = [
  {
    text: "Play",
    height: 100,
    width: 200,
    x: 0,
    y: 0,
  },
  {
    text: "Change Team",
    height: 100,
    width: 200,
    x: 0,
    y: 0,
  },
  {
    text: "Unused",
    height: 100,
    width: 200,
    x: 0,
    y: 0,
  },
  {
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
  
class Game {
  constructor(ctx, buttons) {
    this.ctx = ctx;
    this.buttons = buttons;
    this.displayDriver = new DisplayDriver(this.ctx, this.buttons);
    this.uiState = UIState.TITLE_SCREEN;
    window.addEventListener("resize", () => {
      this.resize()
    });
    requestAnimationFrame(() =>{ 
      this.draw();
    });
    this.resize();
    
    window.addEventListener("mousedown", (e) => {
      console.log(this.buttonClicked(this.mouse(e))); 
    });
  }

  buttonClicked(mouse) {
    const btn = this.buttons.find(btn => 
      mouse.x >= btn.x &&
      mouse.x <= btn.x + btn.width &&
      mouse.y >= btn.y &&
      mouse.y <= btn.y + btn.height
    );
    return btn ? btn.text : null; 
  }

  resize() {
    const boundingBox = canvas.parentElement.getBoundingClientRect();

    this.ctx.canvas.width = boundingBox.width;
    this.ctx.canvas.height = boundingBox.height; 
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

  draw() {
    this.displayDriver.draw(this.uiState);
    requestAnimationFrame(() => {
      this.draw();
    });
  }
  
  mouse(e) {
    const rect = canvas.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    return {x: x, y: y}
  }
}

class DisplayDriver {
  constructor(ctx, buttons) {
    this.ctx = ctx;
    this.buttons = buttons;
  }

  draw(uiState) {
    switch (uiState) {
    case UIState.TITLE_SCREEN:
      this.drawUI();
      break;
    } 
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
    console.log(btn.width, btn.height);
  });
}
}
  
function main() {
  const game = new Game(ctx, BUTTONS);
}

main();
