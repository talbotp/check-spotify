
var AWS = require('aws-sdk');
AWS.config.update({region: process.env.AWS_REGION});
var ses = new AWS.SES();

var SENDER   = process.env.SENDER
var RECEIVER = process.env.RECEIVER

/**
 * Main handler for /contact endpoint.
 */
exports.handler = async (event) => {
  
  var json = JSON.parse(event.body);
    
  var name    = json.name;
  var email   = json.email;
  var message = json.message;
    
  console.log('ContactMe Name=' + name);
  console.log('ContactMe Email=' + email);
  console.log('ContactMe Message=' + message);
    
  var params = {
    Destination: {
      ToAddresses: [RECEIVER],
    },
    Message: {
      Body: {
        Text: { Data: 'Name: ' + name + '\n\nEmail: ' + email + '\n\nMessage:\n' + message},
      },

      Subject: { Data: "ContactMe Form has new message from: " + name },
    },
      Source: SENDER,
  };

  await ses.sendEmail(params).promise()
    
  return {
    statusCode: 200,
    headers: {'Access-Control-Allow-Origin' : "*", 'content-type': 'application/json'},
    body: JSON.stringify(
      {
        'result': 'sent'
      },
      null,
      2
    ),
  }
}
