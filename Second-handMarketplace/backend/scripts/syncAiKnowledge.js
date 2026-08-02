const {
  enqueueEmbeddingReindex,
  syncKnowledgeDocuments,
} = require('../src/services/ragDocumentService');

syncKnowledgeDocuments()
  .then(async (result) => {
    const queued = await enqueueEmbeddingReindex();
    console.log(
      `Synced ${result.documents} documents into ${result.chunks} chunks; queued ${queued} embeddings.`,
    );
  })
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
