var fs = require('fs');
var path = require('path');
var async = require('async');
var log = require('logmagic').local('ChefParser');


function getJsonFileList(directory, callback) {
  fs.readdir(directory, function(err, flist) {
    var jsonFList = [];

    if (!flist) {
      log.debug('directory empty, skipping it', {directory: directory});
      callback();
      return;
    }

    async.each(flist, function(f, callback) {
      var fullPath = path.resolve(directory, f);

      fs.stat(fullPath, function(err, stat) {
        if (err) {
          log.error('cloud not stat: ' + err, {path: fullPath});
        } else {
          //make a recursive call if we've found a directory
          if (stat.isDirectory()) {
            getJsonFileList(fullPath, function(err, fileList) {
              jsonFList = jsonFList.concat(fileList);
              callback(err);
            });
          } else {
            jsonFList.push(fullPath);
            callback();
          }
        }
      });
    }, function(err) {
      //we only care for json files
      jsonFList = jsonFList.filter(function(entry) {
        if (/.json$/.test(entry)) {
          return true;
        } else {
          log.warn('skipping unexpected non-json file', {file: entry});
          return false;
        }
      });
      callback(err, jsonFList);
    });
  });
};

function parseFile(filename, callback) {
  fs.readFile(filename, function(err, contents) {
    var parsed;
    if (err) {
      log.error('failed to read file: ' + err, {file: filename});
    } else {
      try {
        parsed = JSON.parse(contents);
      } catch (parseErr) {
        log.error('failed to parse file: ' + err, {file: filename});
        err = parseErr;
      }
    }
    callback(err, parsed);
  });
};

function ChefParser(options) {
  this.repoPath = options.repoPath || null;
  this.nodes = {};
  this.environments = {};
  this.dataBags = {};

  if (!options.repoPath) {
    throw new Error('options.repoPath must be defined');
  };
}

ChefParser.prototype.addNode = function(node, callback) {
  var env,
      err;

  if (!node) {
    throw new Error('node must be defined');
  }

  if (!node.hasOwnProperty('json_class') || node.json_class !== 'Chef::Node') {
    err = new Error('wrong json_class attribute, expected "Chef::Node"');
  }

  if (!err && node.hasOwnProperty('name') && node.name.length > 0) {
    if (node.hasOwnProperty('chef_environment') && node.chef_environment.length > 0) {
      env = node.chef_environment;
    } else {
      log.warn('node has no chef_environment attribute, adding to _default', {node: node});
      env = '_default';
    }

    if (!this.environments.hasOwnProperty(env)) {
      log.debug('creating new environment: ' + env);
      this.environments[env] = {};
      this.environments[env]['name'] = env;
      this.environments[env]['_nodes'] = {};
      this.environments[env]['json_class'] = 'Chef::Environment';
    }

    this.environments[env]['_nodes'][node.name] = node;
    this.nodes[node.name] = node;

  } else {
    log.error('node has no name attribute, not adding', {node: node});
    err = new Error('node has no name attribute');
  }

  callback(err, env);
}

ChefParser.prototype.addEnv = function(env, callback) {
  var err,
      self = this;

  if (!env) {
    throw new Error('env must be defined');
  }

  if (!env.hasOwnProperty('json_class') || env.json_class !== 'Chef::Environment') {
    err = new Error('wrong json_class attribute, expected "Chef::Environment"');
  }

  if (!err && env.hasOwnProperty('name') && env.name.length > 0) {

    if (this.environments.hasOwnProperty(env.name)) {
      log.debug('environment already exists', {env: env});
    } else {
      log.debug('creating new environment: ' + env.name);
      this.environments[env.name] = env;
      this.environments[env.name]['_nodes'] = {};
    }
  } else {
    log.error('environment has no name attribute, not adding', {env: env});
    err = new Error('environment has no name attribute');
  }

  callback(err);
}

ChefParser.prototype.addDataBagItem = function(dataBagName, dataBagItem, callback) {
  var err;

  if (!dataBagName) {
    throw new Error('dataBagName must be defined');
  }

  if (!dataBagItem) {
    throw new Error('dataBagItem must be defined');
  }

  if (!err && dataBagItem.hasOwnProperty('id') && dataBagItem.id.length > 0) {

    if (this.dataBags.hasOwnProperty(dataBagName)) {
      log.debug('data bag already exists', {dataBag: dataBagName});
    } else {
      log.debug('creating new data bag: ' + dataBagName);
      this.dataBags[dataBagName] = {};
    }
    this.dataBags[dataBagName][dataBagItem.id] = dataBagItem;
  } else {
    log.error('data bag has no id attribute, not adding', {dataBag: dataBag});
    err = new Error('data bag has no id attribute');
  }

  callback(err);
}


ChefParser.prototype.parse = function(callback) {
  var self = this;

  async.series([
    function parseNodes(callback) {
      var nodePath = path.resolve(self.repoPath, 'nodes');
      getJsonFileList(nodePath, function(err, list) {
        if (err || !list) {
          log.error('error walking nodes directory', {path: nodePath});
          callback(err);
        } else {
          async.each(list, function(entry, callback) {
            parseFile(entry, function(err, obj) {
              if (err) {
                callback(err);
              } else {
                self.addNode(obj, function(err, env) {
                  callback(err);
                });
              }
            });
          }, callback);
        }
      });
    },
    function parseEnvs(callback) {
      var envPath = path.resolve(self.repoPath, 'environments');
      getJsonFileList(envPath, function(err, list) {
        if (err || !list) {
          log.error('error walking environments directory', {path: envPath});
          callback(err);
        } else {
          async.each(list, function(entry, callback) {
            parseFile(entry, function(err, obj) {
              if (err) {
                callback(err);
              } else {
                self.addEnv(obj, function(err) {
                  callback(err);
                });
              }
            });
          }, callback);
        }
      });
    },
    function parseDataBags(callback) {
      var dataBagsPath = path.resolve(self.repoPath, 'data_bags');
      //not using getJsonFileList here as we don't want to just walk the full subtree
      //data bag items should respect a path of data_bags/$BAG_NAME/$ITEM_NAME.json
      fs.readdir(dataBagsPath, function(err, flist) {
        if (err || !flist) {
          log.error('error walking data bags directory', {path: dataBagsPath});
          callback(err);
        } else {
          async.each(flist, function(entry, callback) {
            var bagName = path.basename(entry),
                bagPath = path.resolve(dataBagsPath, entry);

            fs.stat(bagPath, function(err, stat) {
              if (err) {
                callback(err);
              } else if (stat.isDirectory()) {
                fs.readdir(bagPath, function(err, flist) {
                  async.each(flist, function(file, callback) {
                    var filePath = path.resolve(bagPath, file);
                    if (/\.json$/.test(file)) {
                      parseFile(filePath, function(err, obj) {
                        if (err) {
                          callback(err);
                        } else {
                          self.addDataBagItem(bagName, obj, function(err) {
                            callback(err);
                          });
                        }
                      });
                    } else {
                      log.warn('ignoring non-json file in data bag', {file: entry});
                      callback();
                    }
                  }, callback);
                });
              } else {
                log.warn('skipping non-directory entry in data bags directory', {entry: entry});
                callback();
              }
            });
          }, callback);
        }
      });
    }],
    function parseHandler(err) {
      if (err) {
        log.error('failed to parse chef repo: ' + err);
      }
      callback(err);
    });
}

ChefParser.prototype.getEnvironments = function() {
  return this.environments;
}

ChefParser.prototype.getNodes = function() {
  return this.nodes;
}

ChefParser.prototype.getDataBags = function() {
  return this.dataBags;
}

exports.ChefParser = ChefParser;
