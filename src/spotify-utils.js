/**
 * Utils for spotify lambda functions.
 */

var AWS = require('aws-sdk');
AWS.config.update({region: process.env.AWS_REGION})
var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'})

var axios = require('axios')

module.exports = {

  /**
   * Get the access token for spotify from DynamoDB. If it's old, 
   * then refresh the access token.
   */
  getAccessToken : async () => {
    var params = {
      TableName: '<<DYNAMODB_TABLE_NAME>>',
      Key: {
        spotify_token: {S: 'prod'}
      }
    }
    const tokenData = await dynamodb.getItem(params).promise()
    if (!Object.keys(tokenData).length || Date.now() > parseInt(tokenData.Item.expires_at.N)) {
      var accessToken = await refreshAccessToken(process.env.REFRESH_TOKEN)
    } else {
      var accessToken = tokenData.Item.access_token.S
    }
    return accessToken
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
      TableName: '<<DYNAMODB_TABLE_NAME>>',
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
