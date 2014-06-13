## node-chef-parser

### Description

  Parses your chef repository's nodes, environments and data_bags directories
  so you can access any of their attributes in node.
  This is pretty much alpha. It only parses json and does not support roles yet.

### Example
```javascript
async.series([
  function parseChefEntities(callback) {
    chefParser = new ChefParser({
      'repoPath': './example/chef'
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
    }
  }
);
```
will display
```json
envs {
    "dev": {
        "name": "dev",
        "_nodes": {
            "dev-web01": {
                "json_class": "Chef::Node",
                "chef_environment": "dev",
                "normal": {
                    "runit": {
                        "service_dir": "/etc/service",
                        "chpst_bin": "/usr/bin/chpst",
                        "sv_bin": "/usr/bin/sv",
                        "sv_dir": "/etc/sv"
                    },
                    "tags": [],
                    "network": {
                        "interfaces": {
                            "eth0": {
                                "addresses": {},
                                "status": "auto"
                            }
                        }
                    },
                    "packages": {
                        "nodejs": "0.10.28",
                        "racoon": "latest"
                    }
                },
                "name": "dev-web01",
                "run_list": [
                    "role[users::sysadmins]",
                    "recipe[network]"
                ]
            },
            "dev-web02": {
                "json_class": "Chef::Node",
                "chef_environment": "dev",
                "normal": {
                    "runit": {
                        "service_dir": "/etc/service",
                        "chpst_bin": "/usr/bin/chpst",
                        "sv_bin": "/usr/bin/sv",
                        "sv_dir": "/etc/sv"
                    },
                    "tags": [],
                    "network": {
                        "interfaces": {
                            "eth0": {
                                "addresses": {},
                                "status": "auto"
                            }
                        }
                    },
                    "packages": {
                        "nodejs": "0.10.28",
                        "racoon": "latest"
                    }
                },
                "name": "dev-web02",
                "run_list": [
                    "role[users::sysadmins]",
                    "recipe[network]"
                ]
            }
        },
        "json_class": "Chef::Environment"
    }
}
```
etc. etc.

### License

  MIT.

