'use strict';

import EventEmitter from 'events';
import puppeteer from 'puppeteer';
import Joi from 'joi';

import { IPuppeteerOptions, IOptions, IPlugAPI } from './index.types';

declare global {
  interface Window {
    _csrf: string;
    __sendout: (key: string, data: any) => void;
    API: IPlugAPI;
  }
}

class PlugDjApi extends EventEmitter {
  private PLUG_URL: string;
  private PLUG_LOGIN_URL: string;
  private PLUG_API_EVENTS: any;
  private PLUG_API_METHODS: string[];

  private puppeteerOptions: IPuppeteerOptions;
  private page: any;

  constructor(puppeteerOptions: IPuppeteerOptions = {}) {
    super();
    this.PLUG_URL = 'https://plug.dj';
    this.PLUG_LOGIN_URL = 'https://plug.dj/_/auth/login';
    this.PLUG_API_EVENTS = [
      ['ADVANCE', 'advance'],
      // ['BAN', ''],
      ['CHAT', 'chat'],
      ['CHAT_COMMAND', 'chatCommand'],
      ['FRIEND_JOIN', 'friendJoin'],
      ['GRAB_UPDATE', 'grabUpdate'],
      ['HISTORY_UPDATE', 'historyUpdate'],
      ['MOD_SKIP', 'modSkip'],
      // ['MUTE', ''],
      // ['ROLE', ''],
      ['SCORE_UPDATE', 'scoreUpdate'],
      ['USER_JOIN', 'userJoin'],
      ['USER_LEAVE', 'userLeave'],
      ['USER_SKIP', 'userSkip'],
      ['VOTE_UPDATED', 'voteUpdate'],
      ['WAIT_LIST_UPDATE', 'waitListUpdate'],
    ];
    this.PLUG_API_METHODS = [
      'chatLog',
      'djJoin',
      'djLeave',
      'getAdmins',
      'getAmbassadors',
      'getAudience',
      'getBannedUsers',
      'getDJ',
      'getHistory',
      'getHost',
      'getMedia',
      'getNextMedia',
      'getScore',
      'getStaff',
      'getTimeElapsed',
      'getTimeRemaining',
      'getUser',
      'getUsers',
      'getVolume',
      'getWaitList',
      'getWaitListPosition',
      'hasPermission',
      'moderateAddDJ',
      'moderateBanUser',
      'moderateDJCycle',
      'moderateDeleteChat',
      'moderateForceSkip',
      'moderateLockWaitList',
      'moderateMinChatLevel',
      'moderateMoveDJ',
      'moderateMuteUser',
      'moderateRemoveDJ',
      'moderateSetRole',
      'moderateUnbanUser',
      'moderateUnmuteUser',
      'sendChat',
      'setVolume',
    ];
    this.puppeteerOptions = puppeteerOptions;
    this.mirrorPlugApiMethods();
  }

  /**
   * Logs in to Plug and brings up specified room
   * @param {object} options - Plug.dj connection options
   */
  connect(options: IOptions) {
    return new Promise(async (resolve, reject) => {
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
        reject(validation.error.details.map(i => i.message).join(''));
      } else {
        const browser = await puppeteer.launch(this.puppeteerOptions);
        this.page = await browser.newPage();
        try {
          await this.login(options.username, options.password);
          await this.visitRoom(options.roomId);
          resolve();
        } catch (err) {
          reject('Could not login or visit room, check credentials and/or room name');
        }
      }
    });
  }

  /**
   * Logs in to Plug.dj
   * @param {string} username - Plug.dj username
   * @param {string} password - Plug.dj password
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
   * @param {string} roomId - Id of the Plug.dj room
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
              window.API.on(value, async data => window.__sendout(key, data));
            }

            resolve();
          }
        }, 500);
      });
    }, this.PLUG_API_EVENTS);
  }

  /**
   * Executes a Plug API method in the context of the Plug room
   * @param {string} method - Plug.dj API method to execute
   * @param {array} args - Arguments passed to the Plug.dj API method
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
    for (let method of this.PLUG_API_METHODS) {
      (this as any)[method] = (...args: any) => this.runPlugApiMethod(method, args);
    }
  }
}

module.exports = PlugDjApi;
