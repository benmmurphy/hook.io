process.setMaxListeners(99);
/* worker agent for running hooks */

var config = require('../config');

if (process.platform === "darwin") {
  config.sslKeyDirectory = __dirname + '/../ssl/';
  config.chrootDirectory = '/Users/chroot';
  config.redis.host = "0.0.0.0";
  config.couch.host = "0.0.0.0";
  config.site.host = "0.0.0.0";
  //config.locales.directory 
}

var http = require('resource-http');
var debug = require('debug')('big::worker');
var hook = require('./resources/hook');
var user = require('./resources/user');
var fs = require('fs');
var chroot = require('chroot');
var i18n = require('i18n-2')

var trycatch = require('trycatch');

var worker = {};
module['exports'] = worker;
var posix = require('posix');
// sometimes in development you might mix and match a common ssl for projects
// comment this line out for production usage
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

worker.start = function (opts, cb) {

  // sometimes in development you might mix and match a common ssl for projects
  // comment this line out for production usage
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

  var sslKeyDirectory = config.sslKeyDirectory;
  var key = fs.readFileSync(sslKeyDirectory + "server.key").toString();
  var cert = fs.readFileSync(sslKeyDirectory + "server.crt").toString();
  var ca = [fs.readFileSync(sslKeyDirectory + 'gd1.crt').toString(), fs.readFileSync(sslKeyDirectory + 'gd2.crt').toString(), fs.readFileSync(sslKeyDirectory + 'gd3.crt').toString()]
  // worker is very simple. everything is streaming http.
  // http-resource will auto-increment the port if 10000 is not available
  // this gives the ability to run this script multiple times to spawn multiple servers
  http.listen({ 
    port: 10000,
    https: config.site.https,
    cert: cert,
    host: config.site.host,
    key: key,
    ca: ca,
    sslRequired: false,
    onlySSL: false
  }, function (err, app) {

    user.persist(config.couch);
    hook.persist(config.couch);

    if (config.useChroot === true) {
      try {
        chroot(config.chrootDirectory, 'worker', 1000);
        posix.setrlimit('nproc', {
          soft: config.worker.nproc.soft,
          hard: config.worker.nproc.hard
        });
        console.log('changed root to "/Users/chroot" and user to "worker"');
      } catch(err) {
        console.error('changing root or user failed', err);
        process.exit(1);
      }
    }

    app.use(function (req, res, next) {
      var opt = {
        request: req,
        locales: config.locales.locales,
        directory: require.resolve('hook.io-i18n').replace('index.js', '/locales')
      };
      opt.request = req;
      req.i18n = new i18n(opt);
      // Express 3
      if (res.locals) {
        i18n.registerMethods(res.locals, req)
      }
      next();
    });

    app.get('/', function serveInfo (req, res){
      res.end('worker online');
    });
    app.get('/:owner/:hook', hook.run);
    app.post('/:owner/:hook', hook.run)
    app.get('/:owner/:hook/*', hook.run);
    app.post('/:owner/:hook/*', hook.run)
    return cb(err, app);
  })
};