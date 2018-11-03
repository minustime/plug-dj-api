# Plug.dj API

A generic library to create a plug.dj bot

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
      console.log(data);
    });

  } catch (err) {
    console.log(`Error setting up api: ${err}`);
  }
})();
```

## Sample bot

Follow these steps to the provided sample bot

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
$ cp example/config.sample.json example/config.json
```

4. Run it

```
$ node example/bot.js
```
