const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

document.addEventListener(
  "touchstart",
  (e) => {
    // Если используется более одного пальца
    if (e.touches.length > 1) {
      e.preventDefault(); // Отключаем действие по умолчанию
    }
  },
  { passive: false }
); // { passive: false } важно для предотвращения поведения по умолчанию
document.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches.length > 1) {
      e.preventDefault(); // Отключаем зумирование двумя пальцами
    }
  },
  { passive: false }
); // { passive: false } важно для отмены действия по умолчанию

// Настройка холста
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Загрузка изображений для бонусов
let bonusImages = {
  shield: new Image(),
  doubleScore: new Image(),
  autoFire: new Image(),
  tripleScore: new Image(),
};

// Указываем пути к изображениям
bonusImages.shield.src = "shield.png";
bonusImages.doubleScore.src = "doubleScore.png";
bonusImages.autoFire.src = "autoFire.png";
bonusImages.tripleScore.src = "tripleScore.png";

const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 60;
const ENEMY_WIDTH = 70;
const ENEMY_HEIGHT = 70;
const BULLET_WIDTH = 5;
const BULLET_HEIGHT = 10;
const BONUS_WIDTH = 45;
const BONUS_HEIGHT = 35;

const planets = [
  {
    name: "Neptune",
    image: "image/planet/neptune.png",
    scoreToAppear: 1000,
  },
  { name: "Uranus", image: "image/planet/uranus.png", scoreToAppear: 17000 },
  { name: "Saturn", image: "image/planet/saturn.png", scoreToAppear: 30000 },
  { name: "Jupiter", image: "image/planet/jupiter.png", scoreToAppear: 45000 },
  { name: "Mars", image: "image/planet/mars.png", scoreToAppear: 58000 },
  { name: "Earth", image: "image/planet/earth.png", scoreToAppear: 70000 },
  { name: "Venus", image: "image/planet/venus.png", scoreToAppear: 90000 },
];

let currentPlanetIndex = 0; // Индекс текущей планеты
let activePlanet = null; // Активная планета, которая сейчас на экране

// Функция для загрузки изображения
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
  });
}

// Функция для инициализации планеты
async function initPlanet(planetData) {
  const planetImage = await loadImage(planetData.image);
  return {
    ...planetData,
    x: canvas.width, // Начальная позиция за экраном справа
    y: Math.random() * (canvas.height - planetImage.height), // Случайная высота
    speed: Math.random() * 2 + 1, // Случайная скорость движения
    image: planetImage,
  };
}

// Обновление и отрисовка активной планеты
function updateAndDrawPlanet() {
  if (activePlanet) {
    // Двигаем планету влево
    activePlanet.x -= activePlanet.speed;

    // Если планета улетела за экран, сбрасываем активную планету
    if (activePlanet.x + activePlanet.image.width < 0) {
      activePlanet = null;
      currentPlanetIndex++;
    } else {
      // Отрисовываем планету
      ctx.drawImage(activePlanet.image, activePlanet.x, activePlanet.y);
    }
  }
}

let enemySpeed = 3;
let spawnInterval = 700; // Интервал появления врагов 500 мс
let score = 0;
let isGameOver = false;
let autoFireInterval = null;

// Интервалы спавна бонусов
let bonusSpawnIntervals = {
  doubleScore: 5000, // 5 секунд
  autoFire: 10000, // 10 секунд
};

let bonuses = {
  shield: 0,
  doubleScore: 0,
  tripleScore: 0,
  autoFire: 0, // Время работы автострельбы
};

let player = {
  x: canvas.width / 2 - PLAYER_WIDTH / 2,
  y: canvas.height - PLAYER_HEIGHT - 70,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  color: "#00ff00",
  hasShield: false,
  image: new Image(), // Добавляем изображение игрока
};

player.image.src = "spaceship.gif"; // Укажите путь к вашему GIF-файлу

// Загрузка изображения врага (метеорита) // Изменено
let enemyImage = new Image();
enemyImage.src = "meteorit.png";

let enemies = [
  { color: "#ff4500", opacity: 0.8 },
  {
    color: "#008000",
    borderColor: "#000",
  },
  { color: "#0000ff", opacity: 0.5 },
];
let bullets = [];
let stars = [];
let activeBonuses = [];
let spawnIntervalId;
let bonusSpawnIntervalIds = {};
const MAX_BONUSES_ON_SCREEN = 3; // Максимальное количество бонусов на экране

// Генерация звезд для фона
for (let i = 0; i < 200; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 3,
    speed: Math.random() * 1 + 0.5, // Скорость движения звезды
  });
}

function drawStars() {
  ctx.fillStyle = "#fff";
  stars.forEach((star) => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateStars() {
  stars.forEach((star) => {
    star.y += star.speed; // Двигаем звезды вниз
    if (star.y > canvas.height) {
      star.y = 0; // Если звезда вышла за пределы, возвращаем ее наверх
      star.x = Math.random() * canvas.width; // Случайная новая позиция по X
    }
  });
}

function spawnEnemy() {
  let enemyX = Math.random() * (canvas.width - ENEMY_WIDTH);
  // Добавляем hp, позицию и размер
  enemies.push({
    x: enemyX,
    y: -ENEMY_HEIGHT,
    width: ENEMY_WIDTH,
    height: ENEMY_HEIGHT,
    hp: 2,
  });
}

function spawnBonus(type, x, y) {
  if (activeBonuses.length >= MAX_BONUSES_ON_SCREEN) return; // Если бонусов больше лимита, новые не появляются
  activeBonuses.push({
    x: x || Math.random() * (canvas.width - BONUS_WIDTH),
    y: y || -BONUS_HEIGHT,
    width: BONUS_WIDTH,
    height: BONUS_HEIGHT,
    type: type,
  });
}

function startBonusSpawns() {
  // Спавн бонуса "автострельба"
  bonusSpawnIntervalIds.autoFire = setInterval(() => {
    spawnBonus("autoFire");
  }, bonusSpawnIntervals.autoFire);

  // Спавн бонуса "удвоение очков"
  bonusSpawnIntervalIds.doubleScore = setInterval(() => {
    spawnBonus("doubleScore");
  }, bonusSpawnIntervals.doubleScore);
}

function shootBullet() {
  bullets.push({
    x: player.x + player.width / 2 - BULLET_WIDTH / 2,
    y: player.y,
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
  });
}

function startAutoFire() {
  if (!autoFireInterval) {
    autoFireInterval = setInterval(() => {
      shootBullet();
    }, 100); // Автоматические выстрелы каждые 100 мс
  }
}

function stopAutoFire() {
  clearInterval(autoFireInterval);
  autoFireInterval = null;
}

function drawBullets() {
  ctx.fillStyle = "#00ffFF";
  bullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
}

function updateBullets() {
  bullets.forEach((bullet) => {
    bullet.y -= 10;
  });
  bullets = bullets.filter((bullet) => bullet.y > 0);
}

function drawPlayer() {
  // Рисуем щит, если он активен
  if (player.hasShield) {
    //player.hasShield
    ctx.beginPath();
    ctx.arc(
      player.x + player.width / 2,
      player.y + player.height / 2,
      player.width,
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = "#00bfff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgb(0, 191, 255, 0.2)";
    ctx.fill();
  }

  // Если текстура загружена, рисуем её
  if (player.image.complete) {
    ctx.drawImage(
      player.image,
      player.x,
      player.y,
      player.width,
      player.height
    );
  } else {
    // Если текстура ещё не загружена, временно рисуем квадрат
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
  }
}

// Угол поворота для метеоритов
let meteorRotationAngle = 0;

function drawEnemies() {
  meteorRotationAngle += 0.005; // медленный поворот
  enemies.forEach((enemy) => {
    if (enemyImage.complete) {
      // Сохраняем контекст
      ctx.save();

      // Переносим точку отсчета в центр врага
      ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
      // Вращаем контекст
      ctx.rotate(meteorRotationAngle);
      // Рисуем метеорит так, чтобы его центр совпал с точкой вращения
      ctx.drawImage(
        enemyImage,
        -enemy.width / 2,
        -enemy.height / 2,
        enemy.width,
        enemy.height
      );

      // Восстанавливаем контекст
      ctx.restore();
    } else {
      ctx.fillStyle = "#ff4500";
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    }
  });
}

function drawBonuses() {
  activeBonuses.forEach((bonus) => {
    // Проверяем, что изображение загружено
    if (bonusImages[bonus.type].complete) {
      ctx.drawImage(
        bonusImages[bonus.type],
        bonus.x,
        bonus.y,
        bonus.width,
        bonus.height
      );
    } else {
      // Если изображение еще не загружено, можно временно отрисовать рамку или цвет
      ctx.fillStyle = "#fff";
      ctx.fillRect(bonus.x, bonus.y, bonus.width, bonus.height);
    }
  });
}

function drawActiveBonuses() {
  ctx.fillStyle = "#fff";
  ctx.font = "26px Pixel";
  let yOffset = 80;
  for (const [key, value] of Object.entries(bonuses)) {
    if (value > 0) {
      switch (key) {
        case "shield":
          ctx.fillText(
            `${"щит".toUpperCase()}: ${Math.ceil(value / 1000)} сек.`,
            20,
            yOffset
          );
          yOffset += 30;
          break;
        case "doubleScore":
          ctx.fillText(
            `${"счет х2".toUpperCase()}: ${Math.ceil(value / 1000)} сек.`,
            20,
            yOffset
          );
          yOffset += 30;
          break;
        case "autoFire":
          ctx.fillText(
            `${"бластер".toUpperCase()}: ${Math.ceil(value / 1000)} сек.`,
            20,
            yOffset
          );
          yOffset += 30;
          break;
        case "tripleScore":
          ctx.fillText(
            `${"счет х3".toUpperCase()}: ${Math.ceil(value / 1000)} сек.`,
            20,
            yOffset
          );
          yOffset += 30;
          break;
        default:
          break;
      }
    }
  }
}

function updateEnemies() {
  enemies.forEach((enemy) => {
    enemy.y += enemySpeed; // Враги становятся быстрее
  });
  enemies = enemies.filter((enemy) => enemy.y < canvas.height && enemy.hp > 0);
}

function updateBonuses() {
  activeBonuses.forEach((bonus) => {
    bonus.y += 2;
  });
  activeBonuses = activeBonuses.filter((bonus) => bonus.y < canvas.height);
}

function checkCollisions() {
  enemies.forEach((enemy, enemyIndex) => {
    // Проверка попаданий пуль
    bullets.forEach((bullet, bulletIndex) => {
      if (
        bullet.x < enemy.x + enemy.width &&
        bullet.x + bullet.width > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y + bullet.height > enemy.y
      ) {
        enemy.hp -= 1;
        bullets.splice(bulletIndex, 1);

        // Если враг уничтожен, проверяем на бонусы
        if (enemy.hp <= 0) {
          enemies.splice(enemyIndex, 1);
          score += 10;

          // Шанс выпадения щита (измените при необходимости)
          if (Math.random() < 0.5) {
            spawnBonus("shield", enemy.x, enemy.y);
          }

          // Шанс выпадения x3 очков (измените при необходимости)
          if (Math.random() < 0.5) {
            spawnBonus("tripleScore", enemy.x, enemy.y);
          }
        }
      }
    });

    // Проверка столкновения врага с игроком
    if (
      player.x < enemy.x + enemy.width &&
      player.x + player.width > enemy.x &&
      player.y < enemy.y + enemy.height &&
      player.y + player.height > enemy.y
    ) {
      if (player.hasShield) {
        player.hasShield = false; // Снимаем щит
        enemies.splice(enemyIndex, 1); // Убираем врага
      } else {
        triggerGameOver();
      }
    }
  });

  activeBonuses.forEach((bonus, bonusIndex) => {
    if (
      player.x < bonus.x + bonus.width &&
      player.x + player.width > bonus.x &&
      player.y < bonus.y + bonus.height &&
      player.y + bonus.height > bonus.y
    ) {
      activateBonus(bonus.type);
      activeBonuses.splice(bonusIndex, 1);
    }
  });
}

function activateBonus(type) {
  if (type === "shield") {
    player.hasShield = true;
  } else if (type === "autoFire") {
    bonuses.autoFire = 30000; // Включаем автострельбу на 30 секунд
    startAutoFire();
  } else {
    bonuses[type] = 30000; // Устанавливаем таймер для других бонусов
  }
}

function updateBonusesTimers(deltaTime) {
  for (const key in bonuses) {
    if (bonuses[key] > 0) {
      bonuses[key] -= deltaTime;

      if (key === "autoFire" && bonuses[key] <= 0) {
        stopAutoFire(); // Останавливаем автострельбу, если бонус закончился
      }
    }
  }
}

function drawScore() {
  ctx.fillStyle = "#fff";
  ctx.font = "36px Pixel";
  ctx.fillText(`Счет: ${score}`, 20, 40);
}

function increaseDifficulty() {
  enemySpeed += 0.35; // Увеличиваем скорость врагов
  if (spawnInterval > 300) {
    spawnInterval -= 100; // Уменьшаем интервал появления врагов
    clearInterval(spawnIntervalId);
    spawnIntervalId = setInterval(spawnEnemy, spawnInterval);
  }
}

function triggerGameOver() {
  isGameOver = true;
  clearInterval(spawnIntervalId);
  Object.values(bonusSpawnIntervalIds).forEach(clearInterval); // Очищаем интервалы бонусов
  stopAutoFire();
  document.getElementById("gameOverScreen").classList.remove("hidden");
  document.getElementById("finalScore").innerText = `Ваш счет: ${score}`;
  cancelAnimationFrame(animationId);
}

function restartGame() {
  resetGame();
  document.getElementById("startScreen").classList.remove("hidden");
}

function resetGame() {
  isGameOver = false;
  score = 0;
  enemySpeed = 3;
  spawnInterval = 500;
  bonuses = { shield: 0, doubleScore: 0, tripleScore: 0, autoFire: 0 };
  player.hasShield = false;
  enemies = [];
  bullets = [];
  activeBonuses = [];
  Object.values(bonusSpawnIntervalIds).forEach(clearInterval);
  stopAutoFire();
  document.getElementById("gameOverScreen").classList.add("hidden");
}

let animationId;
let lastTime = 0;
// Логика появления планет

function gameLoop(timestamp) {
  if (isGameOver) return;

  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateStars();
  drawStars();
  // Обновление и отрисовка активной планеты
  updateAndDrawPlanet();
  drawPlayer();
  drawEnemies();
  drawBullets();
  drawBonuses();
  drawActiveBonuses();
  drawScore();

  updateEnemies();
  updateBullets();
  updateBonuses();
  checkCollisions();
  updateBonusesTimers(deltaTime);

  if (!activePlanet && currentPlanetIndex < planets.length) {
    const nextPlanet = planets[currentPlanetIndex];
    if (score >= nextPlanet.scoreToAppear) {
      initPlanet(nextPlanet).then((planet) => {
        activePlanet = planet;
      });
    }
  }

  score += bonuses.tripleScore > 0 ? 3 : bonuses.doubleScore > 0 ? 2 : 1;

  if (score % 50 === 0 && score !== 0) {
    increaseDifficulty();
  }

  animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
  document.getElementById("startScreen").classList.add("hidden");
  spawnIntervalId = setInterval(spawnEnemy, spawnInterval);

  // Запускаем независимый спавн бонусов "автострельба" и "удвоение"
  startBonusSpawns();

  gameLoop(0);
}

canvas.addEventListener("touchstart", (event) => {
  const touchX = event.touches[0].clientX;
  player.x = touchX - player.width / 2;

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width)
    player.x = canvas.width - player.width;
});

canvas.addEventListener("touchmove", (event) => {
  const touchX = event.touches[0].clientX;
  player.x = touchX - player.width / 2;

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width)
    player.x = canvas.width - player.width;
});

window.addEventListener("mousemove", (event) => {
  const canvasRect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - canvasRect.left;
  player.x = mouseX - player.width / 2;

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width)
    player.x = canvas.width - player.width;
});

document.getElementById("startButton").addEventListener("click", startGame);
document.getElementById("restartButton").addEventListener("click", restartGame);

