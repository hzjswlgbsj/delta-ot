import { initDB, sequelize } from "../index";
import { getServiceLogger } from "../../utils/logger";

const sync = async () => {
  const logger = getServiceLogger("db");
  await initDB();
  await sequelize.sync({ alter: true });
  logger.info("DB synced");
  process.exit(0);
};

sync();
