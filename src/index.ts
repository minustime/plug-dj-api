'use strict';

import EventEmitter from 'events';
import puppeteer from 'puppeteer';
import Joi from 'joi';
import plugApiMethods from './plug-api-methods';
import plugApiEvents from './plug-api-events';

import { IPuppeteerOptions, IConnectOptions, IPlugAPI } from './index.types';

declare global {
  interface Window {
    _csrf: string;
    __sendout: (key: string, data: any) => void;
    API: IPlugAPI;
  }
}

class PlugDjApi extends EventEmitter {
  private readonly PLUG_URL: string = 'https://plug.dj';
  private readonly PLUG_LOGIN_URL: string = 'https://plug.dj/_/auth/login';
  private puppeteerOptions: IPuppeteerOptions;
  private page: any;

  constructor(puppeteerOptions: IPuppeteerOptions = {}) {
    super();
    this.puppeteerOptions = Object.assign({ headless: true, ...puppeteerOptions });
    this.mirrorPlugApiMethods();
  }

  /**
   * Logs in to Plug and brings up specified room
   */
  async connect(options: IConnectOptions) {
    // Connect options validaion
    const optionsSchema = {
      username: Joi.string()
        .min(1)
        .required(),
      password: Joi.string()
        .min(1)
        .required(),
      roomId: Joi.string()
        .min(1)
        .required(),
    };

    const validation = Joi.validate(options, optionsSchema);

    if (validation.error) {
      throw new Error(validation.error.details.map(i => i.message).join(''));
    } else {
      const browser = await puppeteer.launch(this.puppeteerOptions);
      this.page = await browser.newPage();
      try {
        await this.login(options.username, options.password);
        await this.visitRoom(options.roomId);
      } catch (err) {
        throw new Error('Could not login or visit room, check credentials and/or room name');
      }
    }
  }

  /**
   * Logs in to Plug.dj
   */
  async login(username: string, password: string) {
    await this.page.goto(this.PLUG_URL, { waitUntil: 'load' });
    await this.page.evaluate(
      (loginUrl: string, username: string, password: string) => {
        return new Promise((resolve, reject) => {
          const interval = window.setInterval(() => {
            if (window._csrf) {
              const xhr = new XMLHttpRequest();
              xhr.open('POST', loginUrl, true);
              xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
              xhr.onload = () => {
                if (xhr.readyState === xhr.DONE) {
                  if (xhr.status === 200) {
                    resolve(true);
                  } else {
                    reject(false);
                  }
                }
              };
              xhr.send(
                JSON.stringify({
                  csrf: window._csrf,
                  email: username,
                  password: password,
                })
              );
              clearInterval(interval);
            }
          }, 500);
        });
      },
      this.PLUG_LOGIN_URL,
      username,
      password
    );
  }

  /**
   * Navigate to the Plug.dj room
   */
  async visitRoom(roomId: string) {
    await this.page.goto(`https://plug.dj/${roomId}`, { waitUntil: 'load' });
    await this.page.exposeFunction('__sendout', (eventType: string, data: any) =>
      this.emit(eventType, data)
    );
    await this.page.evaluate((plugApiEventNames: string[]) => {
      return new Promise((resolve, reject) => {
        const interval = window.setInterval(() => {
          if (typeof window.API !== 'undefined' && window.API.getUsers().length) {
            clearInterval(interval);

            // Register event handlers
            for (let [key, value] of plugApiEventNames) {
              window.API.on(value, data => window.__sendout(key, data));
            }

            resolve();
          }
        }, 500);
      });
    }, plugApiEvents);
  }

  /**
   * Executes a Plug API method in the context of the Plug room
   */
  async runPlugApiMethod(method: string, args: any) {
    return await this.page.evaluate(
      (method: string, args: any) => window.API[method].apply(this, args),
      method,
      args
    );
  }

  /**
   * Creates methods within this class to mirror the plug API ones
   */
  mirrorPlugApiMethods() {
    for (let method of plugApiMethods) {
      (this as any)[method] = (...args: any) => this.runPlugApiMethod(method, args);
    }
  }
}

module.exports = PlugDjApi;
