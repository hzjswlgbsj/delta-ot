import request from "@/network/request";
import { File } from "@/types/base";
import { BaseResponse } from "@/types/network";

export async function getFiles(): Promise<BaseResponse<File[]>> {
  return await request.get("/file/getAllFiles");
}

export async function getFileInfo(guid: string): Promise<BaseResponse<File>> {
  return await request.get(`/file/getFileDetail/${guid}`);
}
