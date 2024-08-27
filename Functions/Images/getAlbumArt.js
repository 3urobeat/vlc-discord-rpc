import axios from 'axios';
import querystring from "querystring";
import { spotify } from "../../Storage/config.js";
import { XMLParser } from "fast-xml-parser";

// Spotify API endpoint for searching albums
const url = "https://api.spotify.com/v1/search";

// Your Spotify app client ID and client secret
const client_id = spotify.clientID;
const client_secret = spotify.clientSecret;

// Base64-encoded string of the form "client_id:client_secret"
const credentials = Buffer.from(`${client_id}:${client_secret}`).toString("base64");

/**
 * Retrieves the album cover art from Spotify based on the album name and artist.
 * @param {string} albumName - The name of the album.
 * @param {string} albumArtist - The artist of the album.
 * @returns {string|null} The URL of the album cover image if found, or null if not found or an error occurs.
 */
async function getAlbumArt(albumName, albumArtist) {
  try {
    // Make POST request to obtain an access token using the Client Credentials Flow
    const tokenResponse = await axios.post("https://accounts.spotify.com/api/token", "grant_type=client_credentials", {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    // Extract the access token from the response
    const {access_token} = tokenResponse.data;

    // Set headers with access token for authorization
    const headers = {
      Authorization: `Bearer ${access_token}`
    };

    // Make GET request to search for the album
    const response = await axios.get(url, {
      headers: headers,
      params: {
        q: albumName + " " + albumArtist,
        type: "album"
      }
    });

    // Extract the first album from the response
    const [album] = response.data.albums.items; 

    // Return the album cover image URL
    return album.images[0].url;
  } catch (error) {
    console.log("Please report this issue to the VLC-RPC devs!");
    console.log(error);
    return null;
  }
}
/**
 * Retrieves the album cover art from coverartarchive.org based on the album name and artist.
 * @param {string} album - The name of the album
 * @param {string} artist - The artist of the album
 * @returns {string|null} The URL of the album cover image if found, or null if not found or an error occurs.
 */
async function getAlbumArtArchive(album, artist){
  let imageUrl = null;
  // Search string query
  const query = querystring.escape(album+" AND artist:"+artist+" AND status:official");

  // Makes GET request to query the database for the album
  try{
    let response = await axios.get("https://musicbrainz.org/ws/2/release?query="+query, {
      headers: {
        Accept: 'application/xml'
      }
    });

    // Parses XML response
    const parser = new XMLParser({
      ignoreAttributes : false
    });
    const parsedData = parser.parse(response.data);

    const releases = parsedData.metadata['release-list'].release;

    // Loops through matches until finding album cover
    if(releases){
      for (let i = 0; i < releases.length; i++) {
        const release = releases[i];
        const mbid = release['@_id'];
        try{
          // Makes GET request to get album cover
          // If GET completes breaks from the loop
          response = await axios.get("https://coverartarchive.org/release/"+mbid);
          imageUrl = response.data.images[0].image;
          break;
        }catch(err){
          // Cover art not avalible
        }
      }
    }
  }catch(error){
    console.log("Please report this issue to the VLC-RPC devs!");
    console.log(error);
  }
  return imageUrl;
}

export {getAlbumArt, getAlbumArtArchive};
