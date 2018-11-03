export interface IPuppeteerOptions {}

export interface IConnectOptions {
  username: string;
  password: string;
  roomId: string;
}

export interface IPlugAPI {
  getUsers(): object[];
  on(eventType: string, callback: (data: string) => void): void;
  [key: string]: any;
}
