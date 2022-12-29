/* eslint-disable no-param-reassign */
const resultAdapter = require("./resultAdapter.util");

module.exports = function websocketModifier(websocket) {
    // reassign origin function
    websocket.__send = websocket.send;
    // assign new function with resultAdapter
    websocket.send = async function send(message) {
        return this.__send(await resultAdapter(message));
    }.bind(websocket);
    return websocket;
};
