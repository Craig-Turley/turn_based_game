// class GameState {
//   roomKey: string | null;
//   team: Character[];
//   enemyTeam: Character[];
//   attackQueue: Attack[];
//
//   constructor(ctxWidth: number, ctxHeight: number) {
//     this.team = this.constructTeam(ctxWidth, ctxHeight);
//     this.enemyTeam = [];
//     this.attackQueue = [];
//     this.roomKey = null;
//   }
//
//   queAttack(attack: Attack): Boolean {
//     const index = this.attackQueue.findIndex((qattack) => attack.character === qattack.character);
//
//     if (index !== -1) {
//       this.attackQueue.splice(index, 1);
//     }
//
//     this.attackQueue.push(attack);
//     return this.attackQueue.length == this.team.length;
//   }
//
//   flushQueue(): void {
//     this.attackQueue = [];
//   }
//
//   constructTeam(ctxWidth: number, ctxHeight: number): Character[] {
//     const team: Character[] = [];
//     const spacing = Math.floor((ctxWidth / 2) / 4);
//
//     const necromancerSprite = new Sprite(Characters.Necromancer.image, Characters.Necromancer.start, Characters.Necromancer.size, Characters.Necromancer.offset, Characters.Necromancer.id, Characters.Necromancer.animations, true, 15);
//     const necromancerPos = new Vector(spacing * 1, ctxHeight - Characters.StageFloor.size.y - necromancerSprite.size.y);
//     team.push(new Character(necromancerSprite, necromancerPos, 20, 5, Characters.Necromancer.moves, Characters.Necromancer.id));
//
//     const witchSprite = new Sprite(Characters.BlueWitch.image, Characters.BlueWitch.start, Characters.BlueWitch.size, Characters.BlueWitch.offset, Characters.BlueWitch.id, Characters.BlueWitch.animations, true, 10);
//     const witchPos = new Vector(spacing * 2, ctxHeight - Characters.StageFloor.size.y - witchSprite.size.y);
//     team.push(new Character(witchSprite, witchPos, 17, 6, Characters.BlueWitch.moves, Characters.BlueWitch.id));
//
//     const knightSprite = new Sprite(Characters.Knight.image, Characters.Knight.start, Characters.Knight.size, Characters.Knight.offset, Characters.Knight.id, Characters.Knight.animations, true, 5);
//     const knightPos = new Vector(spacing * 3, ctxHeight - Characters.StageFloor.size.y - knightSprite.size.y);
//     team.push(new Character(knightSprite, knightPos, 22, 3, Characters.Knight.moves, Characters.Knight.id));
//
//     return team;
//   }
//
//   async handleOutgoingAttack(animating: Promise<void> | null, data: Attack) {
//     if (animating) {
//       await animating;
//     }
//
//     const { attack, character, target } = data;
//     target.health -= attack.damage;
//
//   }
//
//   async handleIncomingAttack(animating: Promise<void> | null, attack: any) {
//     if (animating) {
//       await animating;
//     }
//
//     const target = this.team.find((character) => character.name == attack.target);
//   }
//
//   setEnemyTeam(enemyTeam: Character[]) {
//     if (enemyTeam.length != 3) {
//       console.error(`Team lenght mistmatch. Got ${enemyTeam.length}, want 3`);
//     }
//     //TODO handle this error
//     //text book bad dev moment
//     this.enemyTeam = enemyTeam;
//   }
//
// }
