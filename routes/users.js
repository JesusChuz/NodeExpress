var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.json([{user: 'Jesus', job: 'Support Engineer'}, {user: 'Randall', job: 'Support Engineer'}, {user: 'Aaron', job: 'Developer'}]);
});

module.exports = router;
