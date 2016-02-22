require('dotenv').load();
var express = require('express');
var app = express();
app.locals._ = require('lodash');
var _ = require('lodash');
app.locals.moment = require('moment');
var moment = require('moment');
var request = require('request');
var cheerio = require('cheerio');

// generate unique filename
var unix_time = moment().unix().toString();
var filename = './tmp/' + unix_time + '.csv';

// csv library
var json2csv = require('json2csv');
var fs = require('fs');
var fields = ['row_num', 'name', 'is_converted', 'duration', 'chat_date']

request = request.defaults({
  jar: true,
  rejectUnauthorized: false, 
  followAllRedirects: true
});

var un = process.env.USER_NAME;
var pw = process.env.PASSWORD;

// var urls = {
//   landing_page: process.env.LANDING_PAGE,
//   login_url: process.env.LOGIN_URL,
//   report_url: process.env.REPORT_URL,
//   agent_report_url: process.env.AGENT_REPORT_URL
// };

var urls = {
  landing_page: 'http://inventoryplus.dealertrack.com/backend',
  login_url: 'http://inventoryplus.dealertrack.com/backend/login',
  report_url: 'http://inventoryplus.dealertrack.com/backend/chat/managed_chat_report',
  agent_report_url: 'http://inventoryplus.dealertrack.com/backend/chat/user_chat_facts'
};

var date_begin = process.env.BEGIN_DATE;
var date_end = process.env.END_DATE;
var chat_org_eid = process.env.ORG_EID;

var report_properties = {
  period: 'custom',
  date_begin: date_begin,
  date_end: date_end,
  chatter_eid: '',
  chat_org_eid: chat_org_eid
};

var login_data = {
  'username': un,
  'password': pw,
  'submit': 'Login'
};

var agents = [];
var records = [];

function compare(a, b) {
  if (a.name < b.name) {
    return -1;
  }else if (a.name > b.name) {
    return 1;
  }else{
    return 0;
  }
}

var records_sorted = records.sort(compare);

request(urls.landing_page, function() {
  
  console.log('HTTP Request Successful! Location:', urls.landing_page);

  request.post({url: urls.login_url, formData: login_data}, function(err, res, body) {
    if (err) {
      return console.error('HTTP Request Failed:', err);
    }
    console.log('HTTP Request Successful! Location:', urls.login_url);

    var cookie = res.headers['set-cookie'];

    var options = {
      url: urls.report_url,
      method: 'GET',
      gzip: true,
      qs: report_properties,
      header: {
        'Cookie': cookie
      }
    };

    request(options, function(err, res, body) {
      if (err) {
        return console.error('HTTP Request Failed:', err);
      }
      console.log('HTTP Request Successful! Location:', urls.report_url);

      var cookie = res.headers['set-cookie'];

      var $ = cheerio.load(body, {
        normalizeWhitespace: true,
        xmlMode: true
      });

      $('.user').removeClass().addClass('chat-agent')
      $('.user.altrow').removeClass().addClass('chat-agent')

      $('.chat-agent').each(function(i, element) {
        var agent_id = $(element).attr('id');
        var agent_name = $(element).children().first().text();
        var agent = {
          id: agent_id,
          name: agent_name
        };
        agents[i] = agent;
      });

      console.log(agents);

      var x = 1;

      _.forEach(agents, function(val, i, collection) {
        var agent_report_properties = {
          user_eid: agents[i].id,
          chat_org_eid: chat_org_eid,
          date_begin: date_begin,
          date_end: date_end
        };

        var agent_options = {
          url: urls.agent_report_url,
          method: 'GET',
          gzip: true,
          qs: agent_report_properties,
          header: {
            'Cookie': cookie
          }
        };

        request(agent_options, function(err, res, body) {
          if (err) {
            return console.error('HTTP Request Failed:', err);
          }
          console.log('HTTP Request Successful! Location:', urls.agent_report_url);

          var $ = cheerio.load(body, {
            normalizeWhitespace: true,
            xmlMode: true
          });

          $('.fact').removeClass().addClass('record-row');
          $('.fact.altrow').removeClass().addClass('record-row');

          $('.record-row').each(function(i, element) {
            var agent_name = $(element).children().first().text();
            var is_converted = $(element).children().first().next().text();
            var duration = $(element).children().last().prev().text();
            var chat_date = $(element).children().last().text();

            if (agent_name == '') {
              agent_name = 'Not Answered';
            }

            var record = {
              row_num: i,
              name: agent_name,
              is_converted: is_converted,
              duration: duration,
              chat_date: chat_date
            };

            records[x] = record;
            x++
          });

          json2csv({ data: records_sorted, fields: fields }, function(err, csv) {
            if (err) console.log(err);
            fs.writeFile(filename, csv, function(err) {
              if (err) throw err;
              console.log('file saved');
            });
          });
          
        });
      });
    });
  });
});

// console.log(agents);
// console.log(records);

module.exports = app;