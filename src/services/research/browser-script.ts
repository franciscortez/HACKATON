// These fixed scripts execute in the isolated Apify Actor, never in the application or a user's browser.
export const browserGuard = String.raw`[async ({ page }) => {
  const { lookup } = process.getBuiltinModule('node:dns').promises;
  const { BlockList, isIP } = process.getBuiltinModule('node:net');
  const denied = new BlockList();
  for (const [ip, bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['192.0.0.0',24],['192.0.2.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]]) denied.addSubnet(ip,bits,'ipv4');
  for (const [ip,bits] of [['::',96],['fc00::',7],['fe80::',10],['ff00::',8],['2001:db8::',32]]) denied.addSubnet(ip,bits,'ipv6');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setBypassServiceWorker', { bypass: true });
  await page.routeWebSocket('**/*', socket => socket.close());
  cdp.on('Fetch.requestPaused', async event => {
    const fail = () => cdp.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'BlockedByClient' }).catch(() => {});
    try {
      const request = event.request, url = new URL(request.url);
      const host = url.hostname.replace(/^\[|\]$/g,'').replace(/\.$/,'').toLowerCase();
      if (!['http:','https:'].includes(url.protocol) || url.username || url.password || isIP(host) || !host.includes('.') || /\.(local|localhost|internal|lan|home|test|invalid)$/.test(host) || (url.port && !['80','443'].includes(url.port)) || !['GET','HEAD'].includes(request.method)) return fail();
      if (['Media','EventSource','WebSocket'].includes(event.resourceType)) return fail();
      const addresses = await lookup(host, { all: true });
      if (!addresses.length || addresses.some(a => a.address.toLowerCase().includes('ffff:') || denied.check(a.address,a.family === 6 ? 'ipv6' : 'ipv4'))) return fail();
      return await cdp.send('Fetch.continueRequest', { requestId: event.requestId });
    } catch { return fail(); }
  });
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
}]`;

export const browserPage = String.raw`async function pageFunction(context) {
  const { page, request, customData } = context;
  const host = u => new URL(u).hostname.replace(/^www\./,'');
  if (host(page.url()) !== host(customData.startUrl)) return { excluded: true };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForLoadState("load", { timeout: 3000 }).catch(() => {});
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]));
  await page.waitForTimeout(1250);
  const result = await page.evaluate(() => {
    const visible = e => e instanceof Element && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== 'hidden';
    const selector = e => e.id ? '#' + CSS.escape(e.id) : e.tagName.toLowerCase() + (e.classList.length ? '.' + CSS.escape(e.classList[0]) : '');
    const observation = (e, value, role) => ({ value: String(value).slice(0,240), selector: selector(e).slice(0,180), role });
    const targets = [document.body, document.querySelector('h1'), document.querySelector('main p') || document.querySelector('p'), ...document.querySelectorAll('header a, main a, button')].filter(e => e && visible(e)).slice(0,20);
    const colors = [], fonts = [];
    for (const e of targets) {
      const style = getComputedStyle(e);
      for (const [value, role] of [[style.color,'text'],[style.backgroundColor,'background']]) {
        if (value !== 'rgba(0, 0, 0, 0)' && !colors.some(c => c.value === value)) colors.push(observation(e,value,role));
      }
      if (!fonts.some(f => f.value === style.fontFamily)) fonts.push(observation(e,style.fontFamily,e.tagName === 'H1' ? 'heading font' : 'body font'));
    }
    const images = [...document.images].filter(visible);
    const logo = [...document.querySelectorAll('header a[href="/"] img, header a[href="#"] img, header .brand img, header .logo img, header svg[aria-label], header svg:has(title), header img[alt*="logo" i]')].find(visible);
    const imagery = images.filter(e => e !== logo && e.width >= 200).slice(0,4).map(e => observation(e,e.alt || 'Image without descriptive alternative text','image description'));
    const actions = [...document.querySelectorAll('header a, main a, main button')].filter(visible).filter(e => e.textContent.trim()).slice(0,5).map(e => observation(e,e.textContent.trim(),'link or action'));
    const links = [...document.querySelectorAll('a[href]')].map(e => ({ url:e.href, text:e.textContent.trim().slice(0,100) }));
    const meta = document.querySelector('meta[name="description"]')?.content || '';
    const structured = [...document.querySelectorAll('script[type="application/ld+json"]')].slice(0,3).map(e => {
      try { const item = JSON.parse(e.textContent); return JSON.stringify(item).slice(0,3000); } catch { return ''; }
    }).filter(Boolean);
    const main = document.querySelector('main') || document.body;
    const text = [document.title, meta, main.innerText, ...structured].join('\n\n');
    return { url:location.href, title:document.title, text:text.slice(0,12000), truncated:text.length > 12000, links,
      brand:{ colors:colors.slice(0,8), fonts:fonts.slice(0,6), imagery, actions, logo:logo ? observation(logo,logo.getAttribute('alt') || logo.getAttribute('aria-label') || logo.querySelector('title')?.textContent || 'Header logo candidate','logo candidate') : null } };
  });
  const initial = request.userData?.initial === true;
  if (initial) {
    const root = new URL('/', result.url).href;
    const rank = item => /about|our-story|who-we/.test(item.url + item.text) ? 1 : /services|products|solutions/.test(item.url + item.text) ? 2 : /pricing/.test(item.url + item.text) ? 3 : /case-stud|portfolio|work/.test(item.url + item.text) ? 4 : /contact/.test(item.url + item.text) ? 5 : 99;
    const candidates = [{ url:root, text:'homepage' }, ...result.links.sort((a,b) => rank(a) - rank(b))];
    const seen = new Set([new URL(result.url).href]);
    for (const item of candidates) {
      let u;
      try { u = new URL(item.url); } catch { continue; }
      u.hash = '';
      if (!['https:','http:'].includes(u.protocol) || host(u.href) !== host(result.url) || u.search || seen.has(u.href) || (u.href !== root && rank(item) === 99)) continue;
      seen.add(u.href);
      await context.enqueueRequest({ url:u.href });
      if (seen.size >= 6) break;
    }
  }
  const homepage = new URL(result.url).pathname === '/';
  if (homepage || initial) {
    const key = homepage ? 'brand-home' : 'brand-entry';
    try { await context.setValue(key, await page.screenshot({ type:'jpeg', quality:65, fullPage:false, animations:'disabled' }), { contentType:'image/jpeg' }); result.previewKey = key; } catch { result.previewKey = null; }
  }
  delete result.links;
  return result;
}`;
