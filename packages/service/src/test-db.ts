import { sequelize } from "./db";

import { getServiceLogger } from "./utils/logger";

async function testConnection() {
  const logger = getServiceLogger("db");
  try {
    await sequelize.authenticate();
    logger.info("database connected successfully");
  } catch (err) {
    logger.error("database connection failed:", err);
  } finally {
    await sequelize.close();
  }
}

testConnection();
