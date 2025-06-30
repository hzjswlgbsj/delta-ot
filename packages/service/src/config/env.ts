import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

export const SECRET_KEY = process.env.SECRET_KEY!;
export const DB_HOST = process.env.DB_HOST!;
export const DB_USER = process.env.DB_USER!;
export const DB_PASS = process.env.DB_PASS!;
export const DB_NAME = process.env.DB_NAME!;
export const PORT = process.env.PORT;
