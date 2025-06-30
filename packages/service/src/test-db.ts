import { sequelize } from "./db";

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("✅ 数据库连接成功！");
  } catch (err) {
    console.error("❌ 数据库连接失败：", err);
  } finally {
    await sequelize.close();
  }
}

testConnection();
