'use strict';

var sutils = require('./spotify-utils')

var AWS = require('aws-sdk');
AWS.config.update({region: process.env.AWS_REGION})

var fetch = require('node-fetch')

/**
 * Main handler function to add a song to public queue.
 */
module.exports.handler = async event => {

  const songUri = event.queryStringParameters.songUri
  console.log('Received request to add id=' + songUri + ' to the queue.')

  const accessToken = await sutils.getAccessToken()
  const headers = {'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json', 'Accept': 'application/json'}
  const url = 'https://api.spotify.com/v1/users/<<YOUR_SPOTIFY_USERNAME>>/playlists/<<YOUR_SPOTIFY_PLAYLIST_ID>>/tracks?uris=' + songUri

  var response = await fetch(url, {headers: headers, method: 'POST'})

  if (response.status == 201)
    return {
      statusCode: 200,
      headers: {'Access-Control-Allow-Origin' : "*", 'content-type': 'application/json'},
      body: JSON.stringify(
        {
          'result': 'added'
        },
        null,
        2
      ),
    }
  else
    return {
      statusCode: 500,
      headers: {'Access-Control-Allow-Origin' : "*", 'content-type': 'application/json'},
      body: JSON.stringify(
        {
          'result': 'failed'
        },
        null,
        2
      )
    }
    
}
