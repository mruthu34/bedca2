const pool = require("../services/db");

console.log("Creating CA1 tables...");

const createUserTable = `
  CREATE TABLE IF NOT EXISTS User (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    points INT DEFAULT 0
  );
`;

const createChallengeTable = `
  CREATE TABLE IF NOT EXISTS WellnessChallenge (
    challenge_id INT AUTO_INCREMENT PRIMARY KEY,
    creator_id INT NOT NULL,
    description TEXT NOT NULL,
    points INT NOT NULL,
    FOREIGN KEY (creator_id) REFERENCES User(user_id)
      ON DELETE CASCADE ON UPDATE CASCADE
  );
`;

const createCompletionTable = `
  CREATE TABLE IF NOT EXISTS UserCompletion (
    completion_id INT AUTO_INCREMENT PRIMARY KEY,
    challenge_id INT NOT NULL,
    user_id INT NOT NULL,
    details TEXT,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_id) REFERENCES WellnessChallenge(challenge_id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES User(user_id)
      ON DELETE CASCADE ON UPDATE CASCADE
  );
`;

const createItemTable = `
  CREATE TABLE IF NOT EXISTS Item (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cost_points INT NOT NULL,
    bonus_damage INT NOT NULL DEFAULT 0,
    multiplier FLOAT NOT NULL DEFAULT 1.0,
    description TEXT
  );
`;

const createInventoryTable = `
  CREATE TABLE IF NOT EXISTS Inventory (
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES User(user_id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (item_id) REFERENCES Item(item_id)
      ON DELETE CASCADE ON UPDATE CASCADE
  );
`;

const createUserEffectTable = `
  CREATE TABLE IF NOT EXISTS UserEffect (
    user_id INT PRIMARY KEY,
    bonus_damage INT NOT NULL DEFAULT 0,
    multiplier FLOAT NOT NULL DEFAULT 1.0,
    FOREIGN KEY (user_id) REFERENCES User(user_id)
      ON DELETE CASCADE ON UPDATE CASCADE
  );
`;

const createBossTable = `
  CREATE TABLE IF NOT EXISTS Boss (
    boss_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    max_hp INT NOT NULL,
    current_hp INT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1
  );
`;

const createBossDamageLogTable = `
  CREATE TABLE IF NOT EXISTS BossDamageLog (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    boss_id INT NOT NULL,
    user_id INT NOT NULL,
    completion_id INT NULL,
    damage INT NOT NULL,
    points_spent INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boss_id) REFERENCES Boss(boss_id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES User(user_id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (completion_id) REFERENCES UserCompletion(completion_id)
      ON DELETE SET NULL ON UPDATE CASCADE
  );
`;
pool.query(createUserTable, (err) => {
  if (err) console.log("User table error:", err);
  else console.log("User table ready");
});

pool.query(createChallengeTable, (err) => {
  if (err) console.log("Challenge table error:", err);
  else console.log("WellnessChallenge table ready");
});

pool.query(createCompletionTable, (err) => {
  if (err) console.log("Completion table error:", err);
  else console.log("UserCompletion table ready");
});

pool.query(createItemTable, (err) => {
  if (err) console.log("Item table error:", err);
  else console.log("Item table ready");
});

pool.query(createInventoryTable, (err) => {
  if (err) console.log("Inventory table error:", err);
  else console.log("Inventory table ready");
});

pool.query(createUserEffectTable, (err) => {
  if (err) console.log("UserEffect table error:", err);
  else console.log("UserEffect table ready");
});

pool.query(createBossTable, (err) => {
  if (err) console.log("Boss table error:", err);
  else console.log("Boss table ready");
});

pool.query(createBossDamageLogTable, (err) => {
  if (err) console.log("BossDamageLog table error:", err);
  else console.log("BossDamageLog table ready");
});
