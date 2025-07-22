import { DataTypes, Model } from "sequelize";
import { sequelize } from "../index";

export class User extends Model {
  public id!: number;
  public userId!: string;
  public userName!: string;
  public password!: string;
  public avatar?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      field: "id",
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "user_id",
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "user_name",
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "password",
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "avatar",
    },
    loginName: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      field: "login_name",
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "user", // 显式指定数据表名
    modelName: "User",
    timestamps: true, // 如果不想 Sequelize 管时间字段可以设置为 false
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);
