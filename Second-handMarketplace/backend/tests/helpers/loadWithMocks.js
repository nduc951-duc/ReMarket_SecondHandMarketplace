function loadWithMocks(modulePath, mocks) {
  const resolvedModule = require.resolve(modulePath);
  const originals = [];

  for (const [dependency, exportsValue] of Object.entries(mocks)) {
    const resolvedDependency = require.resolve(dependency);
    originals.push([resolvedDependency, require.cache[resolvedDependency]]);
    require.cache[resolvedDependency] = {
      id: resolvedDependency,
      filename: resolvedDependency,
      loaded: true,
      exports: exportsValue,
      children: [],
      paths: [],
    };
  }

  delete require.cache[resolvedModule];
  const loaded = require(resolvedModule);

  for (const [resolvedDependency, original] of originals) {
    if (original) {
      require.cache[resolvedDependency] = original;
    } else {
      delete require.cache[resolvedDependency];
    }
  }

  return loaded;
}

module.exports = { loadWithMocks };
