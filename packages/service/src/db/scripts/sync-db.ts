import { initDB, sequelize } from "../index";
import { User } from "../models/User";

const sync = async () => {
  await initDB();
  await sequelize.sync({ alter: true });
  console.log("DB synced");
  process.exit(0);
};

sync();
