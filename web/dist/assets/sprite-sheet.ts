export Characters = {
  Knight: {
    image: "./assets/knight/knight_sprite_sheet.png",
    moves: [
      { name: "Slash", damage: 10 },
      { name: "Defend", damage: 0 },
    ],
    animations: {
    },
    name: "knight",
  },
  BlueWitch: {
    image: "./assets/blue_witch/blue_witch_sprite_sheet.png",
    moves: [
      { name: "Heal", damage: - 4 },
      { name: "Arcane Burst", damage: 7 },
    ],
    animations: {
      ["idle"]: { start: new Vector(250, 0), size: new Vector(32, 40), frames: 6 },
      ["damage"]: { start: new Vector(218, 0), size: new Vector(32, 40), frames: 3 },
      ["run"]: { start: new Vector(186, 0), size: new Vector(32, 40), frames: 8 },
      ["death"]: { start: new Vector(154, 0), size: new Vector(32, 40), frames: 12 },
      ["Heal"]: { start: new Vector(186, 0), size: new Vector(32, 48), frames: 5 },
      ["Arcane Burst"]: { start: new Vector(0, 0), size: new Vector(186, 48), frames: 9 }
    },
    name: "Witch",
  },
  Necromancer: {
    image: "./assets/necromancer/sprite_sheet.png",
    moves: [
      { name: "Bone Shield", damage: 0 },
      { name: "Dark Pulse", damage: 7 },
    ],
    name: "Necromancer",
  },
}
