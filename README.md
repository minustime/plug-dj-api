# Plug API

A generic library to create bots for plug.dj

## Usage

```
const PlugApi = require('./dist');

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
