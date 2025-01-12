const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const BUTTONS = [
  {
    text: "Play",
    height: 100,
    width: 200,
  },
  {
    text: "Change Team",
    height: 100,
    width: 200,
  },
  {
    text: "Unused",
    height: 100,
    width: 200,
  },
]

class Game {
  constructor(ctx, buttons) {
    this.ctx = ctx;
    this.buttons = buttons;
    this.displayDriver = new DisplayDriver(this.ctx, this.buttons);
    window.addEventListener("resize", () => {
      this.resize()
    });
    requestAnimationFrame(() =>{ 
      this.draw();
    });
    this.resize();
    
    window.addEventListener("mousedown", (e) => {
      console.log(this.mouse(e)); 
    });
  }

  resize() {
    const boundingBox = canvas.parentElement.getBoundingClientRect();

    this.ctx.canvas.width = boundingBox.width;
    this.ctx.canvas.height = boundingBox.height; 
    this.ctx.canvas.style.width = `${boundingBox.width}px`
    this.ctx.canvas.style.height = `${boundingBox.height}px`
  }

  draw() {
    this.displayDriver.draw();
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

  draw() {
    this.drawUI();
  }

  drawUI() {
    const top = Math.round(this.ctx.canvas.height - (this.ctx.canvas.height * 0.9));
    const height = Math.round(this.ctx.canvas.height - (this.ctx.canvas.height * 0.2));
    const offset = Math.round(height / this.buttons.length);
 
    for (const [i, button] of this.buttons.entries()) {
      const x = Math.round((this.ctx.canvas.width / 2) - (button.width / 2)); 
      const y = top + (offset * i);

      this.ctx.fillStyle = "white";
      this.ctx.fillRect(x, y, button.width, button.height);
    }
  }
}
  
function main() {
  const game = new Game(ctx, BUTTONS);
}

main();
