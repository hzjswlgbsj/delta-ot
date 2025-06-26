import { defineComponent, onMounted } from "vue";
import { DocumentManager } from "../DocumentManager";
import { generateUuidV4 } from "../utils";
import { Editor } from "@/components";

export default defineComponent({
  setup() {
    onMounted(async () => {
      const documentId = generateUuidV4();
      const docManager = new DocumentManager();
      docManager.setup({
        userInfo: {
          userId: "123",
          userName: "John Doe",
          avatar: "https://example.com/avatar.jpg",
        },
        documentId,
      });
    });

    return () => (
      <div>
        <Editor />
      </div>
    );
  },
});
