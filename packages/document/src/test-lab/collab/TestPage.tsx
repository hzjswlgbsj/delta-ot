// 包裹一个 editor + 状态展示（user、ack、delta）
import { defineComponent, ref } from "vue";

export default defineComponent({
  setup() {
    const docId = ref("9089d075-6604-41f6-a4fa-4d466c60f4c4");

    const accounts = [
      { loginName: "sixty", pwd: "000000", insertText: "A", insertAt: 0 },
      { loginName: "wangwu", pwd: "000000", insertText: "B", insertAt: 0 },
    ];

    return () => (
      <div class="grid grid-cols-2 gap-4 p-4">
        {accounts.map((account) => {
          const query = new URLSearchParams({
            loginName: account.loginName,
            pwd: account.pwd,
            docId: docId.value,
            simulateConflict: "true",
            insertText: account.insertText,
            insertAt: String(account.insertAt),
          }).toString();

          return (
            <iframe
              key={account.loginName}
              src={`/client-test?${query}`}
              class="w-full h-[90vh] border shadow"
            />
          );
        })}
      </div>
    );
  },
});
