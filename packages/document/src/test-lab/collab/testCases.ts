import { Op } from "quill-delta";

export interface TestCase {
  ops: Op[];
  userId: string;
  delay: number;
}

export const docId = "9089d075-6604-41f6-a4fa-4d466c60f4c4";

export const query1 = new URLSearchParams({
  loginName: "sixty",
  pwd: "000000",
  docId: docId,
}).toString();

export const query2 = new URLSearchParams({
  loginName: "wangwu",
  pwd: "000000",
  docId: docId,
}).toString();

export const basicInsertConflict: TestCase[] = [
  {
    ops: [{ retain: 0 }, { insert: "A" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    ops: [{ retain: 0 }, { insert: "B" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];
