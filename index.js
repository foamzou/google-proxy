addEventListener('fetch', event => {
    event.respondWith(fetchAndApply(event.request))
})

const hostMapId = {
    'google.com': 'g',
    'gstatic.com': 'gs',
    'googleapis.com': 'gapi',
    'googleusercontent.com': 'googleusercontent',
    'googlesource.com': 'googlesource',
    'googleblog.com': 'googleblog',
    'googlevideo.com': 'googlevideo',
    'googlecode.com': 'googlecode',
    'stackoverflow.com': 'sof',
    'stackoverflow.blog': 'sofb',
    'imgur.com': 'imgur',
    'youtube.com': 'youtube',
    'ytimg.com': 'ytimg',
    'ggpht.com': 'ggpht',
    'youtu.be': 'youtu_be',
    'wikipedia.org': 'wikipedia',
    'github.com': 'github',
};

const replaceRude = [
    'www.gstatic.com',
    'fonts.googleapis.com',
    'www.youtube.com',
    'apis.google.com',
];

const bodyReplacer = (body, url = undefined) => {
    for (let host in hostMapId) {
        const id = hostMapId[host];
        const regex = new RegExp(`//([^/]+?)\.${host}/`, 'g');
        body = body.replace(regex, `//g.foamzou.com/origin_${id}_$1/`);
        const regex2 = new RegExp(`//${host}/`, 'g');
        body = body.replace(regex2, `//g.foamzou.com/origin_${id}_/`);
    }
    replaceRude.map(host => {
        let levelOneHost = '';
        if (host.split('.').length <= 2) {
            levelOneHost = host;
        } else {
            let hostChunk = host.split('.');
            let hostChunkLength = hostChunk.length;
            levelOneHost = hostChunk[hostChunkLength - 2] + '.' + hostChunk[hostChunkLength - 1];
        }
        const id = hostMapId[levelOneHost];
        const regex = new RegExp(`${host}`, 'g');
        body = body.replace(regex, `//g.foamzou.com/origin_${id}_/`);
    })

    if (url !== undefined && url.indexOf('g.foamzou.com/origin_') !== -1 && (body.indexOf('src="/') !== -1 || body.indexOf('href="/') !== -1)) {
        let hostChunk = url.split('/');
        let baseHost = hostChunk[0] + '/' + hostChunk[1] + '/' + hostChunk[2] + '/' + hostChunk[3];
        body = body.replace(/src\s*=\s*"\/[^/]/g, `src="${baseHost}/`);
        body = body.replace(/href\s*=\s*"\/[^/]/g, `href="${baseHost}/`);
    }

    return body;
}

const parseUrl = (url) => {
    let idMapHost = {};
    for (let host in hostMapId) {
        const id = hostMapId[host];
        idMapHost[id] = host;
    }
    let urlChunk = url.split('/');
    if (urlChunk[3] && urlChunk[3].indexOf('origin_') === 0) {
        let schema = urlChunk[3].split('_');
        let id = schema[1];
        if (idMapHost[id]) {
            if (schema[2]) {
                urlChunk[2] = `${schema[2]}.${idMapHost[id]}`;
            } else {
                urlChunk[2] = `${idMapHost[id]}`;
            }
            delete urlChunk[3];
        }
    }
    url = urlChunk.join('/').replace('g.foamzou.com', 'www.google.com');
    if (url.indexOf('sorry/index?continue=') !== -1) {
        url = url.replace('origin_g_www%2F', '').replace('origin_g_www/', '');
    }
    return url;
}

const hackDomainFromCookie = (cookie) => {
    if (!cookie) {
        return '';
    }
    cookie = cookie.replace(/path=(.+?);/g, 'path=/;');
    return cookie.replace(/domain=(.+?)([,;])/g, 'domain=.foamzou.com$2');
}

async function fetchAndApply(request) {
    console.log(request.url);
    let url = request.url;
    url = parseUrl(url);

    const newRequest = new Request(url, request);

    if (url.split('/').pop().split('#')[0].split('?')[0].match(/\.png$|\.jpg$|\.jpeg$|\.gif$/) === null) {
        let response = await fetch(newRequest);
        let cookie = response.headers.get('Set-Cookie');
        cookie = hackDomainFromCookie(cookie)
        if (response.status == 301 || response.status == 302) {
            console.log(response.headers.get('location'));
            let redirectUrl = bodyReplacer(response.headers.get('location'));
            
            let newResponse = new Response(response.body, response);
            newResponse.headers.set('Set-Cookie', cookie);
            newResponse.headers.set('location', redirectUrl);
            newResponse.headers.set('foamtest', redirectUrl);
            return newResponse;
        }

        let body = await response.text();
        if (body) {
            let newResponse = new Response(bodyReplacer(body, request.url), response);
            newResponse.headers.set('Set-Cookie', cookie);
            return newResponse;
        } else {
            let newResponse = new Response(null, response);
            newResponse.headers.set('Set-Cookie', cookie);
            return newResponse;
        }
    }

    return fetch(newRequest);
}



let url = 'https://g.foamzou.com/origin_g_www/sorry/index?continue=https://g.foamzou.com/origin_g_www/xxx';

console.log(parseUrl(url))