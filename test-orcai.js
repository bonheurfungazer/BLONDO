const { ChatOpenAI } = require("@langchain/openai");
const { OpenAIEmbeddings } = require("@langchain/openai");

async function main() {
  try {
    const chat = new ChatOpenAI({
      modelName: "gemini-2.5-flash-lite",
      configuration: {
        baseURL: "https://cc.orcai.cc/api/v1",
        apiKey: "cr_38a682b85cce2aad0378038336892f787092dce9202314641859b6710eaf32e8",
      }
    });
    const res = await chat.invoke("Hello, who are you?");
    console.log("Chat response:", res.content);

    const embeddings = new OpenAIEmbeddings({
      modelName: "text-embedding-3-small",
      configuration: {
        baseURL: "https://cc.orcai.cc/api/v1",
        apiKey: "cr_38a682b85cce2aad0378038336892f787092dce9202314641859b6710eaf32e8",
      }
    });
    const emb = await embeddings.embedQuery("Hello");
    console.log("Embedding length:", emb.length);
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
