export interface IPuppeteerOptions {
  headless?: boolean;
}

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

export interface IWindow extends Window {
  _csrf: string;
  __sendout: (key: string, data: any) => void;
  API: IPlugAPI;
}
