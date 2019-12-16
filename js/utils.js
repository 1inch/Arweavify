function concatBuffers(buffers) {
  let total_length = 0;

  for (let i = 0; i < buffers.length; i++) {
    total_length += buffers[i].byteLength;
  }

  let temp = new Uint8Array(total_length);
  let offset = 0;

  temp.set(new Uint8Array(buffers[0]), offset);
  offset += buffers[0].byteLength;

  for (let i = 1; i < buffers.length; i++) {
    temp.set(new Uint8Array(buffers[i]), offset);
    offset += buffers[i].byteLength;
  }

  return temp;
}

function b64UrlToString(b64UrlString) {
  let buffer = b64UrlToBuffer(b64UrlString);

  // TextEncoder will be available in browsers, but not in node
  if (typeof TextDecoder == "undefined") {
    const TextDecoder = require("util").TextDecoder;
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  }

  return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}

function bufferToString(buffer) {
  // TextEncoder will be available in browsers, but not in node
  if (typeof TextDecoder == "undefined") {
    const TextDecoder = require("util").TextDecoder;
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  }

  return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}

function stringToBuffer(string) {
  // TextEncoder will be available in browsers, but not in node
  if (typeof TextEncoder == "undefined") {
    const TextEncoder = require("util").TextEncoder;
    return new TextEncoder().encode(string);
  }
  return new TextEncoder().encode(string);
}

function stringToB64Url(string) {
  return bufferTob64Url(stringToBuffer(string));
}

function b64UrlToBuffer(b64UrlString) {
  return new Uint8Array(base64js.toByteArray(b64UrlDecode(b64UrlString)));
}

function bufferTob64(buffer) {
  return base64js.fromByteArray(new Uint8Array(buffer));
}

function bufferTob64Url(buffer) {
  return b64UrlEncode(bufferTob64(buffer));
}

function b64UrlEncode(b64UrlString) {
  return b64UrlString
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/\=/g, "");
}

function b64UrlDecode(b64UrlString) {
  b64UrlString = b64UrlString.replace(/\-/g, "+").replace(/\_/g, "/");
  let padding;
  b64UrlString.length % 4 == 0
    ? (padding = 0)
    : (padding = 4 - (b64UrlString.length % 4));
  return b64UrlString.concat("=".repeat(padding));
}

function convertUint8ArrayToBinaryString(u8Array) {
  var i, len = u8Array.length, b_str = "";
  for (i=0; i<len; i++) {
    b_str += String.fromCharCode(u8Array[i]);
  }
  return b_str;
}

function jwkToPublicCryptoKey(publicJwk){
  return crypto.subtle.importKey(
        "jwk",
        publicJwk,
        {
          name: "RSA-PSS",
          hash: {
            name: "SHA-256"
          }
        },
        false,
        ["verify"]
      ); 
}