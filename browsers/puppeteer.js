const Browser = require('../browser');
const puppeteer = require('puppeteer');

class Puppeteer extends Browser {
  constructor(options) {
    super(options);

    this.browser = null;
    this.page = null;
    this.window = null;
    this.document = null;
    this.statusCode = null;
    this.finalStatusCode = null;
    this.finalUrl = null;
    this.contentType = null;
    this.headers = null;
    this.html = null;
    this.js = null;
    this.links = [];
    this.scripts = [];
    this.cookies = [];
    this.options = options;
  }

  async visit(url) {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox'],
    });
    this.page = await this.browser.newPage();
    await this.page.setRequestInterception(true);

    this.page.on('request', (request) => {
      request.continue();
    });

    try {
      const response = await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
      });

      this.finalUrl = response.url();
      this.finalStatusCode = response.status();

      this.html = await response.text();

      this.statusCode = this.finalStatusCode;

      // Corrected header handling:
      const rawHeaders = response.headers();
      this.headers = {};

      for (const key in rawHeaders) {
          this.headers[key] = Array.isArray(rawHeaders[key]) ? rawHeaders[key] : [rawHeaders[key]];
      }
      // End of header handling

      this.contentType = this.headers['content-type'] ? this.headers['content-type'][0] || null : null;

      this.links = await this.page.evaluate(() => {
        const links = [];
        document.querySelectorAll('a').forEach((link) => {
          links.push({
            href: link.href,
            protocol: link.protocol,
            hostname: link.hostname,
            pathname: link.pathname,
            rel: link.rel,
          });
        });
        return links;
      });

      this.scripts = await this.page.evaluate(() => {
        const scripts = [];
        document.querySelectorAll('script').forEach((script) => {
          if (script.src) {
            scripts.push(script.src);
          }
        });
        return scripts;
      });
      this.js = await this.page.evaluateHandle('window');

      const rawCookies = await this.page.cookies();
      rawCookies.forEach(cookie => {
        const domain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;

        this.cookies.push({
          domain,
          name: cookie.name,
          value: cookie.value,
        });
      });
      await this.browser.close();
      return;
    } catch (error) {
      if (this.browser) await this.browser.close();
      throw error;
    }
  }
}

module.exports = Puppeteer;