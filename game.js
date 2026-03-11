/**
 * Urban Heist - Polícia e Ladrão
 * All sprites are drawn programmatically for guaranteed visibility.
 */

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const TILE  = 40;
const COLS  = 18;
const ROWS  = 14;
const OX    = 20;   // offset X
const OY    = 60;   // offset Y (below HUD)

// 0=road, 1=wall, 2=money, 3=diamond
const MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3,1],
    [1,2,1,1,2,1,1,2,1,1,2,1,1,2,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,2,1,1,1,1,2,1,2,1,1,2,1],
    [1,2,2,2,2,1,2,2,1,1,2,2,1,2,2,2,2,1],
    [1,1,1,1,2,1,1,2,1,1,2,1,1,2,1,1,1,1],
    [1,0,0,1,2,1,2,2,0,0,2,2,1,2,1,0,0,1],
    [1,1,1,1,2,1,2,1,0,0,1,2,1,2,1,1,1,1],
    [1,2,2,2,2,2,2,1,1,1,1,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,2,2,2,2,2,2,1,2,1,1,2,1],
    [1,2,2,1,2,1,1,1,1,1,1,1,1,2,1,2,2,1],
    [1,3,2,2,2,2,2,2,1,1,2,2,2,2,2,2,3,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// ─── GAME STATE ──────────────────────────────────────────────────────────────
let player, policeCars, moneyGroup, diamondGroup, wallGroup;
let cursors, wasd;
let scoreText, livesText, highScoreText;
let score = 0, lives = 3, highScore = 0;
let isPanic = false, panicTimer = null;
let gameActive = true;

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const config = {
    type: Phaser.AUTO,
    width: OX * 2 + COLS * TILE,
    height: OY + ROWS * TILE + 10,
    backgroundColor: '#111111',
    parent: 'game-container',
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

// ─── TEXTURE HELPERS ─────────────────────────────────────────────────────────

function makeThiefTexture(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    // Car body — dark with bright trim
    g.fillStyle(0x222222); g.fillRoundedRect(4, 2, 24, 36, 4);
    g.fillStyle(0x00ffcc); g.fillRect(6, 4, 20, 6);   // windshield
    g.fillStyle(0x00ffcc); g.fillRect(6, 30, 20, 6);  // rear window
    g.fillStyle(0xff4400); g.fillRect(5, 32, 6, 4);   // tail lights L
    g.fillStyle(0xff4400); g.fillRect(21, 32, 6, 4);  // tail lights R
    g.fillStyle(0xffffff); g.fillRect(5, 2, 6, 4);    // headlights L
    g.fillStyle(0xffffff); g.fillRect(21, 2, 6, 4);   // headlights R
    g.generateTexture('thief', 32, 40);
    g.destroy();
}

function makePoliceTexture(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    // Body white/blue
    g.fillStyle(0xdddddd); g.fillRoundedRect(4, 2, 24, 36, 4);
    g.fillStyle(0x0044ff); g.fillRect(4, 14, 24, 12); // stripe
    // Lights on top
    g.fillStyle(0xff0000); g.fillRect(7,  14, 8, 5);
    g.fillStyle(0x0088ff); g.fillRect(17, 14, 8, 5);
    // Windows
    g.fillStyle(0x88ccff); g.fillRect(6, 4, 20, 8);
    g.fillStyle(0x88ccff); g.fillRect(6, 28, 20, 6);
    // Tail / head lights
    g.fillStyle(0xff4400); g.fillRect(5, 32, 6, 4);
    g.fillStyle(0xff4400); g.fillRect(21, 32, 6, 4);
    g.fillStyle(0xffffff); g.fillRect(5, 2, 6, 4);
    g.fillStyle(0xffffff); g.fillRect(21, 2, 6, 4);
    g.generateTexture('police', 32, 40);
    g.destroy();
}

function makePolicePanicTexture(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x5500aa); g.fillRoundedRect(4, 2, 24, 36, 4);
    g.fillStyle(0xaa00ff); g.fillRect(4, 14, 24, 12);
    g.fillStyle(0xffffff); g.fillRect(7, 14, 8, 5);
    g.fillStyle(0xffffff); g.fillRect(17, 14, 8, 5);
    g.fillStyle(0x8800ff); g.fillRect(6, 4, 20, 8);
    g.fillStyle(0x8800ff); g.fillRect(6, 28, 20, 6);
    g.generateTexture('police_panic', 32, 40);
    g.destroy();
}

function makeMoneyTexture(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffcc00); g.fillCircle(10, 10, 9);
    g.fillStyle(0x226600); g.fillCircle(10, 10, 7);
    g.fillStyle(0xffcc00);
    // Draw $ sign with rectangles
    g.fillRect(8, 3, 4, 14);
    g.fillRect(6, 3, 8, 3);
    g.fillRect(6, 9, 8, 3);
    g.fillRect(6, 14, 8, 3);
    g.generateTexture('money', 20, 20);
    g.destroy();
}

function makeDiamondTexture(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x00eeff);
    g.fillTriangle(12, 0, 24, 10, 0, 10);
    g.fillStyle(0x0088cc);
    g.fillTriangle(0, 10, 12, 24, 24, 10);
    g.fillStyle(0xaaffff);
    g.fillTriangle(12, 0, 18, 10, 6, 10);
    g.generateTexture('diamond', 24, 24);
    g.destroy();
}

// ─── PHASER SCENE ────────────────────────────────────────────────────────────

function preload() {
    // No external assets needed — all drawn in create()
}

function create() {
    // Build textures
    makeThiefTexture(this);
    makePoliceTexture(this);
    makePolicePanicTexture(this);
    makeMoneyTexture(this);
    makeDiamondTexture(this);

    // Groups
    wallGroup    = this.physics.add.staticGroup();
    moneyGroup   = this.physics.add.staticGroup();
    diamondGroup = this.physics.add.staticGroup();

    // Build map
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cx = OX + c * TILE + TILE / 2;
            const cy = OY + r * TILE + TILE / 2;
            const cell = MAP[r][c];

            if (cell === 1) {
                // Wall — draw a building block
                const wall = this.add.rectangle(cx, cy, TILE, TILE, 0x3a3a5c);
                // Inner shadow for depth
                const inner = this.add.rectangle(cx - 2, cy - 2, TILE - 6, TILE - 6, 0x2a2a46);
                this.physics.add.existing(wall, true);
                wallGroup.add(wall);
            } else if (cell === 0) {
                // Empty garage/zone — darker road
                this.add.rectangle(cx, cy, TILE, TILE, 0x0e0e0e);
            } else {
                // Road tile
                this.add.rectangle(cx, cy, TILE, TILE, 0x1a1a1a);
                // Road lane marks
                if (r > 0 && r < ROWS - 1 && c > 0 && c < COLS - 1) {
                    this.add.rectangle(cx, cy, 2, 10, 0x333333);
                }
            }

            if (cell === 2) {
                const m = this.physics.add.staticImage(cx, cy, 'money');
                moneyGroup.add(m);
            } else if (cell === 3) {
                const d = this.physics.add.staticImage(cx, cy, 'diamond');
                diamondGroup.add(d);
                // Pulsing tween
                this.tweens.add({ targets: d, scaleX: 1.3, scaleY: 1.3, duration: 700, yoyo: true, repeat: -1 });
            }
        }
    }

    // Player
    const startX = OX + 8 * TILE + TILE / 2;
    const startY = OY + 7 * TILE + TILE / 2;
    player = this.physics.add.sprite(startX, startY, 'thief');
    player.setCollideWorldBounds(true);
    player.body.setSize(20, 28);
    player.setDepth(10);
    player._startX = startX;
    player._startY = startY;

    // Police
    policeCars = this.physics.add.group();
    const spawns = [
        { col: 1,  row: 1,  behavior: 'Chaser'     },
        { col: 16, row: 1,  behavior: 'Strategist'  },
        { col: 1,  row: 12, behavior: 'Patroller'   },
        { col: 16, row: 12, behavior: 'Chaotic'     },
    ];

    // Patrol waypoints for Patroller
    const patrolWaypoints = [
        { col: 1, row: 1 }, { col: 7, row: 1 }, { col: 7, row: 5 },
        { col: 1, row: 5 }, { col: 1, row: 9 }, { col: 7, row: 9 },
    ];

    spawns.forEach(({ col, row, behavior }) => {
        const px = OX + col * TILE + TILE / 2;
        const py = OY + row * TILE + TILE / 2;
        const p = policeCars.create(px, py, 'police');
        p.setCollideWorldBounds(true);
        p.body.setSize(20, 28);
        p.setDepth(9);
        p.speed    = 90;
        p.behavior = behavior;
        p.nextDecision = 0;
        p.waypointIdx  = 0;
        p.patrolWPs    = patrolWaypoints;
        // Siren animation
        this.tweens.add({
            targets: p,
            alpha: 0.7,
            duration: 400,
            yoyo: true,
            repeat: -1
        });
    });

    // HUD background
    this.add.rectangle(config.width / 2, 30, config.width, 58, 0x000000).setDepth(20);
    this.add.rectangle(config.width / 2, 59, config.width, 2, 0x00ffcc).setDepth(21);

    scoreText     = this.add.text(16, 10, 'SCORE: 0',      { font: 'bold 20px monospace', fill: '#ffffff' }).setDepth(22);
    highScoreText = this.add.text(16, 35, 'BEST: 0',       { font: '16px monospace',      fill: '#888888' }).setDepth(22);
    livesText     = this.add.text(config.width - 16, 10, '❤ ❤ ❤', { font: '20px monospace', fill: '#ff4444' }).setOrigin(1, 0).setDepth(22);
    this.add.text(config.width / 2, 22, 'URBAN HEIST', { font: 'bold 18px monospace', fill: '#00ffcc' }).setOrigin(0.5).setDepth(22);

    // Collisions
    this.physics.add.collider(player,     wallGroup);
    this.physics.add.collider(policeCars, wallGroup);

    this.physics.add.overlap(player, moneyGroup,   collectMoney,        null, this);
    this.physics.add.overlap(player, diamondGroup, collectDiamond,      null, this);
    this.physics.add.overlap(player, policeCars,   handlePoliceContact, null, this);

    // Input
    cursors = this.input.keyboard.createCursorKeys();
    wasd    = this.input.keyboard.addKeys('W,A,S,D');

    // Store scene ref globally for helper functions
    this._scene = this;
}

function update(time) {
    if (!gameActive) return;

    // ── Player movement ──────────────────────────────────────────────────────
    player.setVelocity(0);
    const spd = isPanic ? 220 : 160;

    if (cursors.left.isDown  || wasd.A.isDown) { player.setVelocityX(-spd); player.setAngle(-90); }
    else if (cursors.right.isDown || wasd.D.isDown) { player.setVelocityX(spd);  player.setAngle(90);  }
    else if (cursors.up.isDown    || wasd.W.isDown) { player.setVelocityY(-spd); player.setAngle(0);   }
    else if (cursors.down.isDown  || wasd.S.isDown) { player.setVelocityY(spd);  player.setAngle(180); }

    // ── Police AI ────────────────────────────────────────────────────────────
    policeCars.getChildren().forEach(p => {
        if (!p.active) return;

        // Switch texture based on panic mode
        if (isPanic) {
            if (p.texture.key !== 'police_panic') p.setTexture('police_panic');
        } else {
            if (p.texture.key !== 'police') p.setTexture('police');
        }

        if (time < p.nextDecision) return;
        p.nextDecision = time + 600;

        if (isPanic) {
            // Flee from player
            const ang = Phaser.Math.Angle.Between(p.x, p.y, player.x, player.y);
            p.setVelocity(-Math.cos(ang) * p.speed, -Math.sin(ang) * p.speed);
        } else {
            switch (p.behavior) {
                case 'Chaser': {
                    const ang = Phaser.Math.Angle.Between(p.x, p.y, player.x, player.y);
                    p.setVelocity(Math.cos(ang) * p.speed, Math.sin(ang) * p.speed);
                    break;
                }
                case 'Strategist': {
                    const tx = player.x + player.body.velocity.x * 1.5;
                    const ty = player.y + player.body.velocity.y * 1.5;
                    const ang = Phaser.Math.Angle.Between(p.x, p.y, tx, ty);
                    p.setVelocity(Math.cos(ang) * p.speed, Math.sin(ang) * p.speed);
                    break;
                }
                case 'Patroller': {
                    const wp = p.patrolWPs[p.waypointIdx];
                    const wx = OX + wp.col * TILE + TILE / 2;
                    const wy = OY + wp.row * TILE + TILE / 2;
                    if (Phaser.Math.Distance.Between(p.x, p.y, wx, wy) < TILE) {
                        p.waypointIdx = (p.waypointIdx + 1) % p.patrolWPs.length;
                    }
                    const ang = Phaser.Math.Angle.Between(p.x, p.y, wx, wy);
                    p.setVelocity(Math.cos(ang) * p.speed, Math.sin(ang) * p.speed);
                    break;
                }
                case 'Chaotic': {
                    const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
                    const ang  = dirs[Phaser.Math.Between(0, 3)];
                    p.setVelocity(Math.cos(ang) * p.speed, Math.sin(ang) * p.speed);
                    break;
                }
            }
        }

        // Rotate police toward velocity
        const vx = p.body.velocity.x, vy = p.body.velocity.y;
        if (vx !== 0 || vy !== 0) {
            p.setAngle(Phaser.Math.RadToDeg(Math.atan2(vy, vx)) + 90);
        }
    });
}

// ─── CALLBACKS ───────────────────────────────────────────────────────────────

function collectMoney(player, money) {
    money.destroy();
    score += 10;
    if (score > highScore) highScore = score;
    scoreText.setText('SCORE: ' + score);
    highScoreText.setText('BEST: '  + highScore);

    if (moneyGroup.countActive(true) === 0) {
        triggerWin(game.scene.scenes[0]);
    }
}

function collectDiamond(player, diamond) {
    diamond.destroy();
    score += 50;
    scoreText.setText('SCORE: ' + score);
    activatePanic(game.scene.scenes[0]);
}

function activatePanic(scene) {
    isPanic = true;
    if (panicTimer) panicTimer.remove(false);
    panicTimer = scene.time.delayedCall(10000, () => {
        isPanic = false;
    });
    // Flash HUD
    scene.tweens.add({ targets: livesText, alpha: 0.2, duration: 150, yoyo: true, repeat: 20 });
}

function handlePoliceContact(player, police) {
    if (isPanic) {
        // Player eats the police
        police.destroy();
        score += 200;
        scoreText.setText('SCORE: ' + score);
        // Respawn after delay
        game.scene.scenes[0].time.delayedCall(5000, () => {
            const sp = Phaser.Utils.Array.GetRandom([
                { col: 1, row: 1 }, { col: 16, row: 1 },
                { col: 1, row: 12 }, { col: 16, row: 12 }
            ]);
            policeCars.create(OX + sp.col * TILE + TILE / 2, OY + sp.row * TILE + TILE / 2, 'police')
                      .setCollideWorldBounds(true)
                      .setDepth(9);
        });
        return;
    }

    // Player loses a life
    lives--;
    const hearts = '❤ '.repeat(Math.max(lives, 0)).trim();
    livesText.setText(lives > 0 ? hearts : '');

    if (lives <= 0) {
        triggerGameOver(game.scene.scenes[0]);
    } else {
        // Flash player
        player.setPosition(player._startX, player._startY);
        player.setVelocity(0);
        game.scene.scenes[0].tweens.add({ targets: player, alpha: 0.1, duration: 100, yoyo: true, repeat: 6 });
    }
}

function triggerWin(scene) {
    gameActive = false;
    scene.physics.pause();
    const panel = scene.add.rectangle(config.width / 2, config.height / 2, 360, 120, 0x001133, 0.92).setDepth(50);
    scene.add.text(config.width / 2, config.height / 2 - 22, '🏆  VOCÊ VENCEU!',
        { font: 'bold 28px monospace', fill: '#00ffcc' }).setOrigin(0.5).setDepth(51);
    scene.add.text(config.width / 2, config.height / 2 + 18, 'Score final: ' + score,
        { font: '20px monospace', fill: '#ffffff' }).setOrigin(0.5).setDepth(51);
    scene.add.text(config.width / 2, config.height / 2 + 44, 'Pressione F5 para jogar de novo',
        { font: '13px monospace', fill: '#888888' }).setOrigin(0.5).setDepth(51);
}

function triggerGameOver(scene) {
    gameActive = false;
    scene.physics.pause();
    const panel = scene.add.rectangle(config.width / 2, config.height / 2, 360, 120, 0x330000, 0.92).setDepth(50);
    scene.add.text(config.width / 2, config.height / 2 - 22, '🚨  GAME OVER',
        { font: 'bold 28px monospace', fill: '#ff4444' }).setOrigin(0.5).setDepth(51);
    scene.add.text(config.width / 2, config.height / 2 + 18, 'Score: ' + score,
        { font: '20px monospace', fill: '#ffffff' }).setOrigin(0.5).setDepth(51);
    scene.add.text(config.width / 2, config.height / 2 + 44, 'Pressione F5 para jogar de novo',
        { font: '13px monospace', fill: '#888888' }).setOrigin(0.5).setDepth(51);
}
