const { OpenAIEmbeddings } = require("@langchain/openai");

async function main() {
  const models = ["text-embedding-004", "models/embedding-001", "text-embedding-3-small"];

  for (const model of models) {
    try {
      const embeddings = new OpenAIEmbeddings({
          apiKey: "cr_38a682b85cce2aad0378038336892f787092dce9202314641859b6710eaf32e8",
          configuration: {
              baseURL: "https://cc.orcai.cc/api"
          },
          model: model
      });
      const emb = await embeddings.embedQuery("Hello");
      console.log(`Success with model ${model}, length:`, emb.length);
      return;
    } catch (e) {
        console.error(`Error with model ${model}:`, e.message);
    }
  }
}

main();
