// packages/service/src/db/models/File.ts
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../index";

export interface FileAttributes {
  id: number;
  guid: string;
  name: string;
  content: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  authorId: string;
  updater?: string | null;
}

export interface FileCreationAttributes
  extends Optional<
    FileAttributes,
    "id" | "deletedAt" | "createdAt" | "updatedAt" | "updater"
  > {}

export class File
  extends Model<FileAttributes, FileCreationAttributes>
  implements FileAttributes
{
  public id!: number;
  public guid!: string;
  public name!: string;
  public content!: string;
  public type!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
  public authorId!: string;
  public updater?: string | null;
}

File.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: "doc",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    authorId: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    updater: {
      type: DataTypes.STRING(64),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: "file",
    modelName: "File",
    timestamps: true,
    paranoid: true, // 开启逻辑删除
    underscored: true, // 数据库字段以下划线命名
  }
);
