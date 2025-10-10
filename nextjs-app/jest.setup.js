import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

// Polyfill Web APIs for Next.js server components
// @ts-ignore
global.Request = class Request {
  constructor(input, init = {}) {
    this.url = input;
    this.method = init.method || 'GET';
    this.headers = new Headers(init.headers);
    this.body = init.body;
    this._bodyInit = init.body;
  }

  async json() {
    return JSON.parse(this._bodyInit);
  }

  async text() {
    return this._bodyInit;
  }
}

// @ts-ignore
global.Headers = class Headers {
  constructor(init = {}) {
    this._headers = {};
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this._headers[key.toLowerCase()] = value;
      });
    }
  }

  get(name) {
    return this._headers[name.toLowerCase()] || null;
  }

  set(name, value) {
    this._headers[name.toLowerCase()] = value;
  }

  append(name, value) {
    this._headers[name.toLowerCase()] = value;
  }

  has(name) {
    return name.toLowerCase() in this._headers;
  }
}

// @ts-ignore
global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || '';
    this.headers = new Headers(init.headers);
    this.ok = this.status >= 200 && this.status < 300;
  }

  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
  }

  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
  }
}
