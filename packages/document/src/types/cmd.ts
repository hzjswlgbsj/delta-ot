import Delta from "quill-delta";

export type KeyFramePayload = {
  content: Delta;
  userIds: string[];
  sequence: number;
};
