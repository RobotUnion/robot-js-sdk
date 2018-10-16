# RALLF Node.js SDK (#unstable)

[![GitHub](https://img.shields.io/github/license/RobotUnion/rallf-js-sdk.svg?style=flat-square)](https://github.com/RobotUnion/rallf-js-sdk)
[![npm](https://img.shields.io/npm/v/rallf-sdk.svg?style=flat-square)](https://www.npmjs.com/package/rallf-sdk)
[![David](https://img.shields.io/david/RobotUnion/rallf-sdk.svg?style=flat-square)](https://github.com/RobotUnion/rallf-js-sdk)
[![node](https://img.shields.io/node/v/rallf-sdk.svg?style=flat-square)](https://www.npmjs.com/package/rallf-sdk)

Toolset to create/test **Tasks** for [RALLF](https://ralf.robotunion.net)
based on [selenium-webdriver](https://www.npmjs.com/package/selenium-webdriver)

## Resources
* [Install](#install)
* [Getting Started](https://github.com/RobotUnion/rallf-sdk/wiki/Getting-Started)
* [Creating Tasks](https://github.com/RobotUnion/rallf-sdk/wiki/Creating-Tasks)
* [Running Tasks](https://github.com/RobotUnion/rallf-sdk/wiki/Running-Tasks)
* [Technical Docs](https://github.com/RobotUnion/rallf-sdk/wiki/Technical-Docs)


### Install
* Run `npm install rallf-js-sdk --save` to install the sdk


### Create task
* Create a directory: `mkdir test-tast`
* Init npm project: `npm init`
* Install the sdk: `npm install rallf-js-sdk --save`
* Create the following files:
  * `config/manifest.json` - [Example](./examples/basic-example/config/manifest.json)
  * `src/main.js` - [Example](./examples/basic-example/src/main.js)
* Now create a mock file:
  * `mocks/test.mock.js` [Example](./examples/basic-example/mocks/test.mock.js)
* Create a robot if needed:
  * `robots/robot-test` [Example](./examples/basic-example/robots/robot-test)
* Now lets test if it works: 
  * `node ./node_modules/.bin/rallf-runner --mock test --input {}`
  * The runner will let you know if it has been successfull