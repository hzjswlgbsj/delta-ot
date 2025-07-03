import { initDB, sequelize } from "../index";

const sync = async () => {
  await initDB();
  await sequelize.sync({ alter: true });
  console.log("DB synced");
  process.exit(0);
};

sync();
