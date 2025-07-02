import { sequelize } from "./db";

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("database connected successfully");
  } catch (err) {
    console.error("database connection failed:", err);
  } finally {
    await sequelize.close();
  }
}

testConnection();
