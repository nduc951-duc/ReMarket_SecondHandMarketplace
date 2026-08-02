const { runEmbeddingBatch } = require('./vectorEmbeddingWorker');

runEmbeddingBatch()
  .then((result) => {
    console.log(JSON.stringify(result));
    if (result.failed > 0) process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
