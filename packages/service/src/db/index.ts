import { Sequelize } from "sequelize";
import { DB_HOST, DB_NAME, DB_PASS, DB_USER } from "../config/env";
import { getServiceLogger } from "../utils/logger";

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  dialect: "mysql",
  logging: false,
});

export const initDB = async () => {
  try {
    await sequelize.authenticate();
    const logger = getServiceLogger("db");
    logger.info("Sequelize connected to MySQL.");
  } catch (error) {
    const logger = getServiceLogger("db");
    logger.error("Failed to connect to MySQL:", error);
  }
};
