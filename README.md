# Plug.dj API

A generic library to create plug.dj bots.

## Usage

```
const PlugApi = require('plug-dj-api');

const plugApi = new PlugApi();

const options = {
  roomId: '',
  username: '',
  password: '',
};

(async () => {
  try {

    // Login and visit room
    await plugApi.connect(options);

    console.log(`Connected to room: ${options.roomId}`);

    // Handle CHAT events
    plugApi.on('CHAT', data => {
      console.log(data);
    });

    // Handle song ADVANCE
    plugApi.on('ADVANCE', data => {
      plugApi.sendChat('Song transitioned!');
    });

  } catch (err) {
    console.log(`Error setting up api: ${err}`);
  }
})();
```

## Sample bot

Follow these steps to run the provided sample bot:

1. Install dependencies

```
$ npm install
```

2. Build the project

```
$ npm run build
```

3. Configure your bot credentials

```
// Copy sample config and edit credentials within
$ cp example/config.sample.json example/config.json
```

4. Run it

```
$ node example/bot.js
```
