'use strict';

var AWS = require('aws-sdk');
AWS.config.update({region: process.env.AWS_REGION})
var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'})

var axios = require('axios')

/**
 * Main handler function
 */
module.exports.handler = async event => {

  var params = {
    TableName: '<<DYNAMODB_TABLE_NAME>>',
    Key: {
      'spotify_token': {S: 'prod'}
    }
  }

  const tokenData = await dynamodb.getItem(params).promise()
  if (!Object.keys(tokenData).length || Date.now() > parseInt(tokenData.Item.expires_at.N)) {
    var accessToken = await refreshAccessToken(process.env.REFRESH_TOKEN)
  } else {
    var accessToken = tokenData.Item.access_token.S
  }

  const spotifyData = await getSpotifyData(accessToken)
  const currentlyOrWas = spotifyData.is_playing ? 'Currently' : 'Was';
  console.log(currentlyOrWas + ' listening to ' + spotifyData.song_name + ' by ' + spotifyData.artist_name + '.')

  return {
    statusCode: 200,
    headers: {'Access-Control-Allow-Origin' : "*", 'content-type': 'application/json'},
    body: JSON.stringify(
      {
        song:       spotifyData.song_name,
        artist:     spotifyData.artist_name,
        isPlaying:  spotifyData.is_playing,
        previewUrl: spotifyData.preview_url
      },
      null,
      2
    ),
  }

}

/**
 * Make call to spotify api to get current spotify information.
 */
const getSpotifyData = async (accessToken) => {
  const headers = {'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json', 'Accept': 'application/json'}
  try {
    var response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {headers: headers})
    // In this case, we must make another request i.e not listening to spotify right now.
    if (Object.keys(response.data).length == 0) {
      response = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {headers: headers})
      return {
        song_name:    response.data.items[0].track.name,
        artist_name:  response.data.items[0].track.artists[0].name,
        is_playing:   false,
        preview_url:  undefined
      }
    }

    return {
      song_name:    response.data.item.name,
      artist_name:  response.data.item.artists[0].name,    // Just get first artists name.
      is_playing:   response.data.item.preview_url,
      preview_url:  response.data.is_playing
    }
  } catch (error) {
    console.log(error)
  }
}

/**
 * Refresh the spotify access token from the spotify API, important that we 
 * add the new access token to dynamodb here.
 */
const refreshAccessToken = async (refreshToken) => {
  const url = 'https://accounts.spotify.com/api/token'
  const axParams = {
    method  : 'post',
    url     : url,
    headers : {'Authorization': process.env.CLIENT_BASE_64},
    params  : {'grant_type': 'refresh_token', 'refresh_token': refreshToken}
  }
  try {
    var response = await axios(axParams)
    const newAccessToken = response.data.access_token
    console.log('New access_token=' + newAccessToken)
    
    // Time in which we expire the access_token, as they will expire in 1 hour we use 50 minutes for safety.
    const expireIn = 50 * 60000
    var ddbParams = {
      TableName: '<<DYNAMO_DB_TABLE_NAME>>',
      Item: {
        spotify_token:  {S: 'prod'},
        access_token:   {S: newAccessToken},
        expires_at:     {N: (Date.now() + expireIn).toString()}
      }
    }
    // Put into dynamodb
    var putResult = await dynamodb.putItem(ddbParams).promise()
    return newAccessToken
  } catch(error) {
    console.log(error)
  }
} 
  