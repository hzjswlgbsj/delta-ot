import { DocumentManager } from "./DocumentManager";
import { generateUuidV4 } from "./utils";

const getUser = async () => {
  return {
    userId: "123",
    userName: "John Doe",
    avatar: "https://example.com/avatar.jpg",
  };
};
const getDocument = async () => {
  // 可能是从 URL 参数获取文档 ID
  const documentId = generateUuidV4();
  return {
    id: 1,
    documentId,
    name: "测试文档",
    content: JSON.stringify([{ insert: "Hello, world!" }]),
  };
};

const setup = async () => {
  const userInfo = await getUser();
  const documentInfo = await getDocument();
  const docManager = new DocumentManager();
  console.log("[DocumentManager] Init with doc:", documentInfo.documentId);
  docManager.setup({
    userInfo,
    documentId: documentInfo.documentId,
  });
};

console.log("[DocumentManager] Starting setup...");
setup();
