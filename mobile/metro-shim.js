const fs = require('fs');

// Intercept directory creation for colon-containing paths (invalid in Windows)
const originalMkdir = fs.mkdir;
fs.mkdir = function(path, ...args) {
  if (typeof path === 'string' && path.includes('node:')) {
    const callback = args[args.length - 1];
    if (typeof callback === 'function') {
      callback(null);
    }
    return;
  }
  return originalMkdir.call(this, path, ...args);
};

const originalMkdirSync = fs.mkdirSync;
fs.mkdirSync = function(path, ...args) {
  if (typeof path === 'string' && path.includes('node:')) {
    return;
  }
  return originalMkdirSync.call(this, path, ...args);
};

// Intercept file writes for colon-containing paths
const originalWriteFile = fs.writeFile;
fs.writeFile = function(path, ...args) {
  if (typeof path === 'string' && path.includes('node:')) {
    const callback = args[args.length - 1];
    if (typeof callback === 'function') {
      callback(null);
    }
    return;
  }
  return originalWriteFile.call(this, path, ...args);
};

const originalWriteFileSync = fs.writeFileSync;
fs.writeFileSync = function(path, ...args) {
  if (typeof path === 'string' && path.includes('node:')) {
    return;
  }
  return originalWriteFileSync.call(this, path, ...args);
};

// Intercept path checks
const originalExistsSync = fs.existsSync;
fs.existsSync = function(path) {
  if (typeof path === 'string' && path.includes('node:')) {
    return true;
  }
  return originalExistsSync.call(this, path);
};

const originalStatSync = fs.statSync;
fs.statSync = function(path, ...args) {
  if (typeof path === 'string' && path.includes('node:')) {
    return {
      isDirectory: () => true,
      isFile: () => false,
    };
  }
  return originalStatSync.call(this, path, ...args);
};

// Intercept promises API
if (fs.promises) {
  const originalPromisesMkdir = fs.promises.mkdir;
  fs.promises.mkdir = function(path, ...args) {
    if (typeof path === 'string' && path.includes('node:')) {
      return Promise.resolve();
    }
    return originalPromisesMkdir.call(this, path, ...args);
  };

  const originalPromisesWriteFile = fs.promises.writeFile;
  fs.promises.writeFile = function(path, ...args) {
    if (typeof path === 'string' && path.includes('node:')) {
      return Promise.resolve();
    }
    return originalPromisesWriteFile.call(this, path, ...args);
  };

  const originalPromisesStat = fs.promises.stat;
  fs.promises.stat = function(path, ...args) {
    if (typeof path === 'string' && path.includes('node:')) {
      return Promise.resolve({
        isDirectory: () => true,
        isFile: () => false,
      });
    }
    return originalPromisesStat.call(this, path, ...args);
  };
}
