[![MIT License](https://img.shields.io/npm/l/prpcow.svg?)](https://github.com/yeskiy/prpcow/blob/master/LICENSE)
[![View this project on NPM](https://img.shields.io/npm/v/prpcow.svg)](https://npmjs.org/package/prpcow)
[![View this project on NPM](https://img.shields.io/npm/dm/prpcow.svg)](https://npmjs.org/package/prpcow)
[![Known Vulnerabilities](https://snyk.io/test/github/yeskiy/prpcow/badge.svg)](https://snyk.io/test/github/yeskiy/prpcow)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=yeskiy_prpcow&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=yeskiy_prpcow)


# PRPCOW
### Plain Remote Procedure Call Over Websocket

#### What is the PRPCOW?
PRPCOW is a new kind of RPC, that takes advantage of the advancement in `WebSocket` technology, and the power of `Node.js`.

### Why use PRPCOW?
> Supports Node.js (`>=16.x`) as well as all modern browsers

> Allows you to use functions natively like `await someFunc()`

> After connecting, the server and the client become equal (the client can provide functions for execution)

> Ability to create your own `modelResolvers` and `functionResolvers`

> Ability to use your own Websocket implementation


## Installation

Install `rust-wasmpack-loader` with npm

```shell script
  npm i prpcow
```

Or install into Dev dependencies

```shell script
  npm i --save-dev prpcow
```

## Examples
Check the **[tests](./tests)** folder for a better understanding of how the prpcow works

## Contributing

Contributions are always welcome!

See [CONTRIBUTING.md](./CONTRIBUTING.md) for ways to get started.

## Acknowledgements

- [gRPC](https://github.com/grpc)
- [JSON-RPC](https://www.jsonrpc.org/)

## License

[MIT](https://choosealicense.com/licenses/mit/)