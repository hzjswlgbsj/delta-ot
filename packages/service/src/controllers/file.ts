import { Context } from "koa";
import { File } from "../db/models/File";
import { v4 as uuidv4 } from "uuid";
import { getBody } from "../utils/body";
import { success, fail } from "../utils/response";
import { CreateFileBody, UpdateFileBody } from "../types/file";
import { ErrorCode } from "../types/error-code";

export async function createFile(ctx: Context) {
  const body = getBody<CreateFileBody>(ctx);
  const { name, content, type } = body;
  const guid = uuidv4();
  const authorId = ctx.state.user?.userId;

  if (!authorId) {
    ctx.body = fail("Missing authorId", ErrorCode.INVALID_TOKEN);
    return;
  }

  const file = await File.create({
    guid,
    name,
    content,
    type,
    authorId,
    updater: authorId,
  });

  ctx.body = success({ guid: file.guid }, "File created successfully");
}

export async function getFileDetail(ctx: Context) {
  const guid = ctx.params.guid;
  const file = await File.findOne({ where: { guid } });

  if (!file) {
    ctx.body = fail("File not found", ErrorCode.FILE_NOT_FOUND);
    return;
  }

  ctx.body = success(file);
}

export async function updateFile(ctx: Context) {
  const guid = ctx.params.guid;
  const body = getBody<UpdateFileBody>(ctx);
  const file = await File.findOne({ where: { guid } });

  if (!file) {
    ctx.body = fail("File not found", ErrorCode.FILE_NOT_FOUND);
    return;
  }

  const updater = ctx.state.user?.userId || file.updater;

  await file.update({ ...body, updater });
  ctx.body = success(null, "File updated successfully");
}

export async function deleteFile(ctx: Context) {
  const guid = ctx.params.guid;
  const file = await File.findOne({ where: { guid } });

  if (!file) {
    ctx.body = fail("File not found", ErrorCode.FILE_NOT_FOUND);
    return;
  }

  await file.destroy();
  ctx.body = success(null, "File deleted successfully");
}

export async function getAllFiles(ctx: Context) {
  const files = await File.findAll();
  ctx.body = success(files);
}
