const express = require('express');
const app = express();
//const dynamicStatic = require('express-dynamic-static')();
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

let RedisStore = require('connect-redis')(session);

const cors = require('cors');
if (process.env.NODE_ENV == 'development') {
  app.use(cors('*'));
} else {
  app.use(cors({ credentials: true }));
}

global.appRoot = path.resolve(__dirname);
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

const PORT = normalizePort(process.env.PORT || '8080');
//Need to add the following

//KeyVault, Prod, Azure_Managed_ID=Get the Managed ID,

if (!process.env['Prod']) {
  //In Dev
  process.env.AZURE_TENANT_ID = '62ffbf34-05c6-4362-94d0-9a7c70c9e268';

  process.env.AZURE_CLIENT_ID = '92c2f002-ac04-41ec-9c4b-4ad985e65641';

  process.env.AZURE_CLIENT_SECRET = 'yVL7Q~9eO1PqHWeerIyqr1rX0tZRIe1EcQEqY';
  process.env.KeyVault = 'KVDevHR'; // dev DB

  process.env.cust = 'hanover'
  process.env.app = 'surveyapp'

  // process.env.KeyVault = "KVProdHRInternal"; // prod DB
  console.log('Dev Server Started');
}
const {redisPromiseSession} = require("./common/redisconfigs");
const sessionMgr = require("./session");
const apiSurveyRouter = require("./api/survey");
const apiAdminRouter = require("./api/admin");
const apiPBIRouter = require("./api/pbi");
const apiDataVaultRouter = require("./api/dataVault");
const apiDataCleaningRouter = require("./api/dataCleaning");

const startServer = () => {
redisPromiseSession.then(redisClient => {
  app.use(cookieParser());

  //Configure session middleware
  const client = redisClient.client
  app.use(session({
    secret: 'ssshhhhh1234',
    name: 'sessionName',
    cookie: {
      secure: false,
      maxAge: 86400000
    },
    store: new RedisStore({client: client, prefix: `sessions:${process.env.cust}:${process.env.app}:`}),
    resave: false,
  }))

//APIs
  var apiSurveyRouter = require('./api/survey');
  var apiAdminRouter = require('./api/admin');
  var apiPBIRouter = require('./api/pbi');
  var apiDataVaultRouter = require('./api/dataVault');
  var apiDataCleaningRouter = require('./api/dataCleaning');

  /*
  app.use('/', (req, res, next) => {
    sess=req.session;
    return res.redirect('/client');
  });
  */

// middleware function to check for logged-in users
  var sessionChecker = (req, res, next) => {
    var sessionMgr = require('./session');

    var logInUserID = sessionMgr.getUserAccount(req);

    if (!logInUserID || logInUserID.length < 5) {
      res.status(403).send('Not Valid');
    } else {
      if (!req.session.isSetup) {
        console.log(req.originalUrl);
        if (req.originalUrl.includes('client')) {
          res.redirect('/session');
        } else {
          next();
          //res.status(403).send('Not Valid');
        }
      } else {
        next();
      }
    }
  };

  app.use(express.json({
    limit: '200mb'    ///////// LIMIT for JSON
  }));

  app.use(express.urlencoded({
    limit: '200mb', ///////// LIMIT for URL ENCODE (image data)
    extended: true
  }));

  app.use('/api/survey', sessionChecker, apiSurveyRouter);
  app.use('/api/admin', sessionChecker, apiAdminRouter);
  app.use('/api/pbi', sessionChecker, apiPBIRouter);
  app.use('/api/dataVault', sessionChecker, apiDataVaultRouter);
  app.use('/api/dataCleaning', sessionChecker, apiDataCleaningRouter);

  app.get('/session', (req, res) => {
    let sess = req.session;

    var useProd = process.env['Prod'];

    var page = `
        <!doctype html>
        <html lang="en">
        <head>
        <meta charset="utf-8"/>
        <title>Survey Manager Start</title>
        </head><body>
        <div id="root">
        <a href="/sessionStart">Click Here To Start the Survey Console</a>
        </div>
        </body></html>

        `;

    res.send(page);
  });

  app.get('/sessionStart', (req, res) => {
    let sess = req.session;

    var useProd = process.env['Prod'];

    sess.TUpdate = Date.now();

    const processLoad = (err) => {
      var sessionID = req.sessionID;
      console.log('session id');
      var sessionMgr = require('./session');

      var userAccount = sessionMgr.getUserAccount(req);

      sessionMgr.setupSession(userAccount, sessionID, sess).then((result) => {
        sess.isSetup = result.isSetup;
        sess.SecurityRoles = result.SecurityRoles;
        console.log(sess.DBConfig);
        console.log(sess.DWConfig);
        res.redirect('/client');
      });
    };

    if (req.session.isSetup) {
      req.session.regenerate(function (err) {
        // will have a new session here
        console.log('Session Re-Generated');
        processLoad(err);
      });
    } else {
      processLoad(false);
    }
  });

  app.use('/', sessionChecker, express.static(path.join(__dirname, 'client/build')));
  app.use('/static', sessionChecker, express.static(path.join(__dirname, 'client/build/static')));

  app.get('/*', function (req, res) {
    console.log(path.join(__dirname, 'client/build/index.html'), '===path');
    res.sendFile(path.join(__dirname, 'client/build/index.html'), function (err) {
      if (err) {
        res.status(500).send(err);
      }
    });
  });

  //Temp Solution for Linux vNet process.env.PORT should be PORT constant
    client.connect().then(r => {
      app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));
    }).catch((err) => {
      startServer()
    })
  }).catch(err => {
    console.log('START WITHOUT REDIS')
    app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));
  })
}
startServer()