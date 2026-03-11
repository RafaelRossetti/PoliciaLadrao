/**
 * Urban Heist - Main Game Logic
 */

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player;
let policeCars;
let moneyBags;
let diamonds;
let walls;
let cursors;
let score = 0;
let lives = 3;
let scoreText;
let livesText;
let isPanicMode = false;
let panicTimer;

// Map constants
const TILE_SIZE = 40;
const OFFSET_X = 40;
const OFFSET_Y = 80;

// 0: Road, 1: Wall, 2: Money Bag, 3: Diamond
const maze = [
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

function preload() {
    this.load.image('thief', 'assets/thief.png');
    this.load.image('police', 'assets/police.png');
    this.load.image('money', 'assets/money.png');
    this.load.image('diamond', 'assets/diamond.png');
}

function create() {
    walls = this.physics.add.staticGroup();
    moneyBags = this.physics.add.group();
    diamonds = this.physics.add.group();

    // Setup Maze
    for (let r = 0; r < maze.length; r++) {
        for (let c = 0; c < maze[r].length; c++) {
            const x = OFFSET_X + c * TILE_SIZE;
            const y = OFFSET_Y + r * TILE_SIZE;

            if (maze[r][c] === 1) {
                // Draw a simple wall rectangle
                let wall = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0x444444);
                this.physics.add.existing(wall, true);
                walls.add(wall);
            } else if (maze[r][c] === 2) {
                let money = moneyBags.create(x, y, 'money');
                money.setScale(24 / money.width);
                money.body.setSize(money.width * 0.3, money.height * 0.3);
                money.setBlendMode(Phaser.BlendModes.MULTIPLY);
            } else if (maze[r][c] === 3) {
                let diamond = diamonds.create(x, y, 'diamond');
                diamond.setScale(30 / diamond.width);
                diamond.body.setSize(diamond.width * 0.3, diamond.height * 0.3);
                diamond.setBlendMode(Phaser.BlendModes.MULTIPLY);
            }
        }
    }

    // Player
    player = this.physics.add.sprite(OFFSET_X + 8 * TILE_SIZE, OFFSET_Y + 7 * TILE_SIZE, 'thief');
    // Scale to fit nicely in a 40px tile (using 32px for the car)
    const playerScale = 32 / player.width;
    player.setScale(playerScale);
    player.setCollideWorldBounds(true);
    // Tight hitbox to ignore the white background padding
    player.body.setSize(player.width * 0.4, player.height * 0.4);
    player.body.setOffset(player.width * 0.3, player.height * 0.3);
    player.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Police
    policeCars = this.physics.add.group();
    const spawnPoints = [
        { x: 1, y: 1 }, { x: 16, y: 1 }, { x: 1, y: 12 }, { x: 16, y: 12 }
    ];

    const behaviors = ['Chaser', 'Strategist', 'Patroller', 'Chaotic'];
    
    spawnPoints.forEach((pos, index) => {
        let police = policeCars.create(OFFSET_X + pos.x * TILE_SIZE, OFFSET_Y + pos.y * TILE_SIZE, 'police');
        const policeScale = 32 / police.width;
        police.setScale(policeScale);
        police.behavior = behaviors[index];
        police.speed = 100;
        police.setBounce(1);
        police.setCollideWorldBounds(true);
        police.lastDecisionTime = 0;
        // Tight hitbox for police too
        police.body.setSize(police.width * 0.5, police.height * 0.5);
        police.body.setOffset(police.width * 0.25, police.height * 0.25);
        police.setBlendMode(Phaser.BlendModes.MULTIPLY);
    });

    // ... (rest of UI and inputs)

    // UI
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff' });
    livesText = this.add.text(600, 16, 'Lives: 3', { fontSize: '32px', fill: '#fff' });

    // Inputs
    cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    // Collisions
    this.physics.add.collider(player, walls);
    this.physics.add.collider(policeCars, walls);
    this.physics.add.overlap(player, moneyBags, collectMoney, null, this);
    this.physics.add.overlap(player, diamonds, activatePanicMode, null, this);
    this.physics.add.overlap(player, policeCars, handlePoliceCollision, null, this);
}

function update(time, delta) {
    if (lives <= 0) return;

    // Player Movement
    player.setVelocity(0);
    const speed = isPanicMode ? 200 : 150;

    if (cursors.left.isDown || this.wasd.A.isDown) {
        player.setVelocityX(-speed);
        player.setAngle(-90);
    } else if (cursors.right.isDown || this.wasd.D.isDown) {
        player.setVelocityX(speed);
        player.setAngle(90);
    } else if (cursors.up.isDown || this.wasd.W.isDown) {
        player.setVelocityY(-speed);
        player.setAngle(0);
    } else if (cursors.down.isDown || this.wasd.S.isDown) {
        player.setVelocityY(speed);
        player.setAngle(180);
    }

    // Police AI
    policeCars.getChildren().forEach(police => {
        if (time > police.lastDecisionTime + 500) {
            updatePoliceAI(this, police, player, time);
            police.lastDecisionTime = time;
        }
    });
}

function updatePoliceAI(scene, police, player, time) {
    if (isPanicMode) {
        const angle = Phaser.Math.Angle.Between(police.x, police.y, player.x, player.y);
        police.setVelocity(-Math.cos(angle) * police.speed, -Math.sin(angle) * police.speed);
        police.setTint(0x0000ff);
        return;
    } else {
        police.clearTint();
    }

    const angleToPlayer = Phaser.Math.Angle.Between(police.x, police.y, player.x, player.y);
    
    switch (police.behavior) {
        case 'Chaser':
            scene.physics.velocityFromAngle(Phaser.Math.RadToDeg(angleToPlayer), police.speed, police.body.velocity);
            break;
        case 'Strategist':
            const targetX = player.x + player.body.velocity.x * 2;
            const targetY = player.y + player.body.velocity.y * 2;
            const angleStrategist = Phaser.Math.Angle.Between(police.x, police.y, targetX, targetY);
            scene.physics.velocityFromAngle(Phaser.Math.RadToDeg(angleStrategist), police.speed, police.body.velocity);
            break;
        case 'Chaotic':
            if (Math.random() > 0.95) {
                const randomAngle = Math.random() * 360;
                scene.physics.velocityFromAngle(randomAngle, police.speed, police.body.velocity);
            }
            break;
        case 'Patroller':
            if (police.body.velocity.x === 0 && police.body.velocity.y === 0) {
                const randomAngle = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
                scene.physics.velocityFromAngle(randomAngle, police.speed, police.body.velocity);
            }
            break;
    }

    // Set rotation based on velocity
    if (police.body.velocity.x !== 0 || police.body.velocity.y !== 0) {
        police.rotation = Phaser.Math.Angle.Between(0, 0, police.body.velocity.x, police.body.velocity.y) + Math.PI / 2;
    }
}

function collectMoney(player, money) {
    money.disableBody(true, true);
    score += 10;
    scoreText.setText('Score: ' + score);

    if (moneyBags.countActive(true) === 0) {
        winLevel();
    }
}

function activatePanicMode(player, diamond) {
    diamond.disableBody(true, true);
    isPanicMode = true;
    
    // Sirens effect
    this.tweens.add({
        targets: policeCars.getChildren(),
        alpha: 0.5,
        duration: 200,
        yoyo: true,
        repeat: 10
    });

    if (panicTimer) panicTimer.remove();
    panicTimer = this.time.delayedCall(10000, () => {
        isPanicMode = false;
        policeCars.getChildren().forEach(p => p.clearTint());
    });
}

function handlePoliceCollision(player, police) {
    if (isPanicMode) {
        police.disableBody(true, true);
        score += 200;
        scoreText.setText('Score: ' + score);
        
        // Respawn after 5 seconds
        this.time.delayedCall(5000, () => {
            police.enableBody(true, OFFSET_X + 8 * TILE_SIZE, OFFSET_Y + 7 * TILE_SIZE, true, true);
        });
    } else {
        lives--;
        livesText.setText('Lives: ' + lives);
        
        if (lives > 0) {
            player.setPosition(OFFSET_X + 8 * TILE_SIZE, OFFSET_Y + 7 * TILE_SIZE);
        } else {
            gameOver();
        }
    }
}

function winLevel() {
    this.physics.pause();
    this.add.text(400, 300, 'VOCÊ VENCEU!', { fontSize: '64px', fill: '#0f0' }).setOrigin(0.5);
}

function gameOver() {
    this.physics.pause();
    this.add.text(400, 300, 'GAME OVER', { fontSize: '64px', fill: '#f00' }).setOrigin(0.5);
}
