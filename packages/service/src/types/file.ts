export enum FileType {
  DOCUMENT = "doc",
  EXCEL = "excel",
  PDF = "pdf",
}

export interface CreateFileBody {
  name: string;
  content: string;
  type: FileType;
  authorId: string;
  updater?: string;
}

export interface UpdateFileBody {
  name?: string;
  content?: string;
  type?: string;
  updater?: string;
}

export interface FileResponse {
  id: number;
  guid: string;
  name: string;
  content: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  authorId: string;
  updater: string | null;
}
