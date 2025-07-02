import { Sequelize } from "sequelize";
import { DB_HOST, DB_NAME, DB_PASS, DB_USER } from "../config/env";

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  dialect: "mysql",
  logging: false,
});

export const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Sequelize connected to MySQL.");
  } catch (error) {
    console.error("Failed to connect to MySQL:", error);
  }
};
