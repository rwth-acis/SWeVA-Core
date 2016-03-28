## SWeVA Core

The Core Framework for the SWeVA platform.

### Installation

You need Node.js installed.
Install gulp and bower globally and resolve dependencies:

```sh
npm install -g gulp bower && npm install && bower install
```

There can be some errors, if you don't have python 2 installed. You can ignore them.

Start it on http://localhost:5001 

```sh
gulp serve
```

### Documentation

You can generate jsdoc documentation by running
```sh
npm run jsdoc
```

The output can be found in ./docs/jsdoc

Additionally you can generate docker documentation (mix of jsdoc and simple inline comments displayed directly next to the source code).
It is a little broken, as it is not actively maintained, but maybe someone will find this 'view' more useful, than looking at the raw .js files.
You will need to have python 3 installed.

```sh
npm run docker
```

You can generate both documentations at once using
```sh
npm run doc
```