'use strict';

var sutils = require('./spotify-utils')

var AWS = require('aws-sdk');
AWS.config.update({region: process.env.AWS_REGION})

var axios = require('axios')

/**
 * Main handler function to search for songs.
 */
module.exports.handler = async event => {

  const query = event.queryStringParameters.query
  console.log('Received request to query spotify for=' + query)

  const accessToken = await sutils.getAccessToken()
  const headers = {'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json', 'Accept': 'application/json'}
  const url = 'https://api.spotify.com/v1/search?q=' + encodeURI(query) + '&type=track'
  var response = await axios.get(url, {headers: headers}) 

  var reply = []
  response.data.tracks.items.forEach(element => {
    console.log(element.artists[0])
    reply.push({
      name      : element.name,
      artist    : element.artists[0].name,
      song_uri  : element.uri
    })
  })

  return {
    statusCode: 200,
    headers: {'Access-Control-Allow-Origin' : "*", 'content-type': 'application/json'},
    body: JSON.stringify(
      {
        search_results: reply
      },
      null,
      2
    ),
  }
}
