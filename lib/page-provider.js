const { URL, URLSearchParams } = require("url");
const { AuthorizationError, NotAuthorizedError } = require("./errors");
const {
  orderMiddleware,
  queryMiddleware,
  sortMiddleware
} = require("./middlewares");
const { decodeWindows1251 } = require("./utils");
const axios = require("axios");

class PageProvider {
  constructor() {
    this.authorized = false;
    this.request = axios;
    this.cookie = null;
    this.host = "https://rutracker.org";
    this.loginUrl = `${this.host}/forum/login.php`;
    this.searchUrl = `${this.host}/forum/tracker.php`;
    this.threadUrl = `${this.host}/forum/viewtopic.php`;
    this.downloadUrl = `${this.host}/forum/dl.php`;

    this.searchMiddlewares = [queryMiddleware, sortMiddleware, orderMiddleware];
  }

  login(cookie) {
    const body = new URLSearchParams();

    if (cookie) {
        this.cookie = cookie;
        this.authorized = true;
        return Promise.resolve(true);
    } else {
        throw new AuthorizationError("Cookie is required for login");
    }
  }

  search(params) {
    if (!this.authorized) {
      return Promise.reject(new NotAuthorizedError());
    }

    const url = new URL(this.searchUrl);
    const body = new URLSearchParams();

    try {
      this.searchMiddlewares.forEach(middleware => {
        middleware(params, body, url);
      });
    } catch (err) {
      return Promise.reject(err);
    }

    return this.request({
      url: url.toString(),
      data: body.toString(),
      method: "POST",
      responseType: "arraybuffer",
      headers: {
        Cookie: this.cookie
      }
    }).then(response => decodeWindows1251(response.data));
  }

  thread(id) {
    if (!this.authorized) {
      return Promise.reject(new NotAuthorizedError());
    }

    const url = `${this.threadUrl}?t=${encodeURIComponent(id)}`;

    return this.request({
      url,
      method: "GET",
      responseType: "arraybuffer",
      headers: {
        Cookie: this.cookie
      }
    }).then(response => decodeWindows1251(response.data));
  }

  torrentFile(id) {
    if (!this.authorized) {
      return Promise.reject(new NotAuthorizedError());
    }

    const url = `${this.downloadUrl}?t=${encodeURIComponent(id)}`;

    return this.request({
      url,
      method: "GET",
      responseType: "stream",
      headers: {
        Cookie: this.cookie
      }
    }).then(response => response.data);
  }
}

module.exports = PageProvider;
