const {
  enqueueEmbeddingReindex,
  syncKnowledgeDocuments,
} = require('../src/services/ragDocumentService');

syncKnowledgeDocuments()
  .then(async (result) => {
    const queued = await enqueueEmbeddingReindex();
    console.log(
      `Synced ${result.documents} documents (${result.unchanged} unchanged, ${result.deactivated} inactive) into ${result.chunks} changed chunks; queued ${queued} embeddings${process.argv.includes('--reindex') ? ' for full model reindex' : ''}.`,
    );
  })
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
