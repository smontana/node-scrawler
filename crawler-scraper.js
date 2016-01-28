var request = require('request');
var cheerio = require('cheerio');
var _ = require('lodash');

request = request.defaults({
  jar: true,
  rejectUnauthorized: false, 
  followAllRedirects: true
});

var results = [];

var url_with_login_form = 'http://inventoryplus.dealertrack.com/backend'
var login_url = 'http://inventoryplus.dealertrack.com/backend/login';
var report_url = 'http://inventoryplus.dealertrack.com/backend/chat/managed_chat_report';

var un = login_config.username;
var pw = login_config.password;

var date_begin = '01/17/2016';
var date_end = '01/23/2016';
var chatter_eid = '';
var chat_org_eid = '66rGbhW2CdqtdXICBDz53g';

var propertiesObject = {
  period: 'custom',
  date_begin: date_begin,
  date_end: date_end,
  chatter_eid: chatter_eid,
  chat_org_eid: chat_org_eid
}

var formData = {
  'username': un,
  'password': pw,
  'submit': 'Login'
};

request(url_with_login_form, function() {
  request.post({url: login_url, formData: formData}, function(err, res, body) {
    if (err) {
      return console.error('HTTP Request Failed:', err);
    }
    console.log('HTTP Request Successful! Location:', url_with_login_form);

    var cookie = res.headers['set-cookie'];

    var options = {
      url: report_url,
      method: 'GET',
      gzip: true,
      qs: propertiesObject,
      header: {
        'Cookie': cookie
      }
    };

    request(options, function(err, res, body) {
      if (err) {
        return console.error('HTTP Request Failed:', err);
      }
      console.log('HTTP Request Successful! Location:', report_url);

      var $ = cheerio.load(body, {
        normalizeWhitespace: true,
        xmlMode: true
      });

      var agent_rows = $('tr[class=user]').contents();

      console.log(agent_rows);

    });
  });
});