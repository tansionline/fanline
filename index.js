const express = require('express') // Express web server framework
const request = require('request') // "Request" library
const cors = require('cors')
const querystring = require('querystring')
const cookieParser = require('cookie-parser')

require('dotenv').config()

const client_id = process.env.client_id // Your client id
const client_secret = process.env.client_secret // Your secret
const redirect_uri = 'http://localhost:8888/callback/' // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = (length) => {
  let text = ''
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

let stateKey = 'spotify_auth_state'

const app = express()

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser())

app.get('/login', function(req, res) {

  let state = generateRandomString(16)
  res.cookie(stateKey, state)

  // your application requests authorization
  let scope = 'user-read-private user-read-email'
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }))
})

app.get('/callback', (req, res) => {

  // your application requests refresh and access tokens
  // after checking the state parameter

  let code = req.query.code || null
  let state = req.query.state || null
  let storedState = req.cookies ? req.cookies[stateKey] : null

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }))
  } 
    else {
    res.clearCookie(stateKey)
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + new Buffer((client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    }

    request.post(authOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {

        const access_token = body.access_token,
            refresh_token = body.refresh_token

        const options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        }

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body)
        })

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }))
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }))
      }
    })
  }
})

app.get('/refresh_token', (req, res) => {

  // requesting access token from refresh token
  let refresh_token = req.query.refresh_token
  let authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  }

  request.post(authOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      let access_token = body.access_token
      res.send({
        'access_token': access_token
      })
    }
  })
})

app.listen(8888, () => {
    console.log('Working 8888!')
})