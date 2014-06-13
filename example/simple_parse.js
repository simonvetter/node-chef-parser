var optimist = require('optimist');
var async = require('async');
var ChefParser = require('../lib/chef_parser').ChefParser;

var args = optimist
            .usage('Usage: $0 --chef-nodes /path/to/my/chefrepo/')
            .describe('repo-path', 'path to your chef repository')
            .demand(['repo-path'])
            .argv;

var chefParser;

async.series([
  function parseChefEntities(callback) {
    chefParser = new ChefParser({
      'repoPath': args['repo-path']
    });
    chefParser.parse(function(err) {
      callback(err);
    });
  }
  ], function errHandler(err) {
    if (err) {
      console.error('something went wrong:' + err);
    } else {
      console.log('envs', JSON.stringify(chefParser.getEnvironments(), null, 4));
      console.log('nodes', JSON.stringify(chefParser.getNodes(), null, 4));
      console.log('data bags', JSON.stringify(chefParser.getDataBags(), null, 4));
    }
  }
); 
