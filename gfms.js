var laeh = require('laeh2').leanStacks(true);
var _e = laeh._e;
var _x = laeh._x;

var express = require('express');
var stylus = require('stylus');
var nib = require('nib');
var app = express();
var http = require('http');
var server = http.createServer(app);
var marked = require('marked');
var highlight = require('highlight.js');
var _ = require('underscore');
var fs = require('fs');
var ews = require('ws');
var ws = require('ws-rpc').extend(ews);
var wss = new ws.Server({ server: server });
var request = require('request');
var async = require('async-mini');
var utilz = require('utilz');
var optimist = require('optimist');

var watched = {};
var styles = {};
var cssUpdateInterval = 1000 * 60 * 60 * 24;
var cssCheckInterval = 1000 * 60 * 5;
var lastCssUpdate = 0;
var updatingCss;

var pkgJson = require('./package.json');

function cb(err, msg) {
    console.log(err ? (err.stack || err) : msg || 'done');
}

var argv = optimist
    .usage('\nGithub Flavored Markdown Server.\nRun in your project\'s root directory.\nUsage: $0')
    .demand('p')
    .alias('p', 'port')
    .describe('p', 'Port number to listen at.')
    .alias('h', 'host')
    .describe('h', 'Host address to bind to.')
    .default('h', 'localhost')
    .describe('proxy', 'if behind a proxy, proxy url.')
    .boolean('a')
    .describe('a', 'Render using Github API.')
    .alias('a', 'api')
    .boolean('n')
    .describe('n', 'Disable usage of Github API when the doc is manually reloaded.')
    .alias('n', 'no-api-on-reload')
    .argv;

var pub = __dirname + '/public';
var views = __dirname + '/views';
app.set('views', views);
app.set('view engine', 'jade');
app.set('view options', { layout: false });


if(process.env.NODE_ENV === 'development') {
    // only use Stylus in development, because when gfms is installed
    // globally with sudo, and then run by an user, it cannot create
    // the generate .css files (and I'm too tired to look for a solution now).
    app.use(stylus.middleware({
        src: views,
        dest: pub,
        compile: function(str, path) {
            return stylus(str)
                .set('filename', path)
                .set('compress', true)
                .use(nib())
                .import('nib');
        }
    }));

    utilz.watchFile(__filename);
}

app.use(wss.middleware(express));
// app.use(express.favicon());
// app.use(app.router);
app.use(express.static(pub));
// app.use(express.errorHandler({ dump: true, stack: true }));


function basename(fn) {
    var m = fn.match(/.*?([^\/]+)\/?$/);
    return m ? m[1] : fn;
}

function is_markdown(v) {
    return v.match(/.*?(?:\.md|\.markdown)$/) ? true : false;
}

function is_image(v) {
    return v.match(/.*?(?:\.png|\.jpg|\.gif|\.svg)$/) ? true : false;
}

function is_sourcecode(v) {
    var matched = v.match(/.*?(?:(\.js|\.php|\.php5|\.py|\.sql))$/, 'i');

    if (matched) {
        return matched[1].substring(1).toLowerCase();
    }

    return false;
}

app.get('*', function(req, res, next) {

    if(req.path.indexOf('/styles/') === 0) {
        var style = styles[req.path];
        if(!style) {
            res.status(404).send();
        }
        else {
            res.set('Content-Type', 'text/css');
            // res.set('ETag', utilz.randomString());
            return res.status(200).send(style);
        }
    }

    var base = req.path.replace('..', 'DENIED').replace(/\/$/, '');
    var query = req.query || {};
    var dir = decodeURI(process.cwd() + base);
    var lang = '';

    var stat;
    try {
        stat = fs.statSync(dir);
    }
    catch(e) {
        return next();
    }

    if(stat.isDirectory()) {

        var files = _.chain(fs.readdirSync(dir)).filter(function(v) {
            var stat = fs.statSync(dir + '/' + v);
            return stat.isDirectory() || (stat.isFile() && (is_markdown(v) || is_image(v)));
        }).map(function(v) {
            return {
                url: base + '/' + v,
                name: v
            };
        }).value();

        res.render('directory', {
            files: files,
            dir: dir,
            styles: Object.keys(styles),
            title: basename(dir)
        });
    } else if(query.raw === "true") {
        var content = fs.readFileSync(dir);
        res.writeHead('200');
        res.end(content,'binary');
    } else if(is_markdown(dir)) {

        if(!watched[dir]) {
            fs.watchFile(dir, { interval: 500 }, function(curr, prev) {
                if(curr.mtime.getTime() !== prev.mtime.getTime()) {

                    console.log('file ' + dir + ' has changed');

                    renderFile(dir, argv.a, _x(console.log, false, function(err, rendered) {
                        wss.message('update', { update: dir, content: err || rendered });
                    }));
                }
            });
            watched[dir] = true;
        }

        renderFile(dir, argv.a || argv.b, _x(next, true, function(err, rendered) {
            res.render('file', {
                file: rendered,
                title: basename(dir),
                styles: Object.keys(styles),
                fullname: dir
            });
        }));

    }
    else if(is_image(dir)) {

        if(!watched[dir]) {
            fs.watchFile(dir, { interval: 500 }, function(curr, prev) {
                if(curr.mtime.getTime() !== prev.mtime.getTime()) {

                    console.log('file ' + dir + ' has changed');

                    renderImageFile(base, argv.a, _x(console.log, false, function(err, rendered) {
                        wss.message('update', { update: dir, content: err || rendered });
                    }));
                }
            });
            watched[dir] = true;
        }

        renderImageFile(base, argv.a || argv.b, _x(next, true, function(err, rendered) {
            res.render('file', {
                file: rendered,
                title: basename(dir),
                styles: Object.keys(styles),
                fullname: dir
            });
        }));

    }
    else if(lang = is_sourcecode(dir)) {
        if(!watched[dir]) {
            fs.watchFile(dir, { interval: 500 }, function(curr, prev) {
                if(curr.mtime.getTime() !== prev.mtime.getTime()) {

                    console.log('file ' + dir + ' has changed');

                    renderSourceCode(dir, argv.a, lang, _x(console.log, false, function(err, rendered) {
                        wss.message('update', { update: dir, content: err || rendered });
                    }));
                }
            });
            watched[dir] = true;
        }

        renderSourceCode(dir, argv.a || argv.b, lang, _x(next, true, function(err, rendered) {
            res.render('file', {
                file: rendered,
                title: basename(dir),
                styles: Object.keys(styles),
                fullname: dir
            });
        }));
    }
    else
        return next();
});

function renderFile(file, api, cb) { // cb(err, res)
    var contents = fs.readFileSync(file, 'utf8');
    var func = api ? renderWithGithub : renderWithMarked;
    func(contents, _x(cb, true, cb));
}

function renderImageFile(file, api, cb) { // cb(err, res)
    var html = '<div class="image js-image"><span class="border-wrap"><img src="' + file + '?raw=true"></span></div>';
    cb(null, html);
}

function renderSourceCode(file, api, lang, cb) { // cb(err, res)
    var contents = "```" + lang + "\n" + fs.readFileSync(file, 'utf8') + "\n```";
    var func = api ? renderWithGithub : renderWithMarked;
    func(contents, _x(cb, true, cb));
}

function renderWithMarked(contents, cb) { // cb(err, res)
    marked.setOptions({
      gfm: true,
      tables: true,
      smartLists: true,
      breaks: true,
      highlight: function (code, lang) {
        if (lang) {
            return highlight.highlight(lang, code, true).value;
        } else {
            return highlight.highlightAuto(code).value;
        }
      }
    });

    var html = marked(contents);
    cb(null, html);
}

function renderWithGithub(contents, cb) { // cb(err, res)
    var opts = {
        method: 'post',
        url: 'https://api.github.com/markdown',
        json: {
            text: contents,
            mode: 'markdown'
        },
        headers: {
          'User-Agent': 'gfms/' + pkgJson.version + ' https://github.com/ypocat/gfms'
        },
        encoding: 'utf8'
    };

    if(argv.proxy && argv.proxy.length > 0) {
        opts.proxy = argv.proxy;
    }

    request(opts, _x(cb, true, function(err, res, body) {
        console.log('remaining API requests: %d', res.headers['x-ratelimit-remaining']);
        cb(null, body);
    }));
}

process.on('SIGINT', function() {
    console.log('\nGFMS exit.');
    return process.exit();
});

function loadStyle(style, cb) {

    request(style, _x(cb, true, function(err, res, body) {

        if(res.statusCode != 200)
            throw 'Cannot load stylesheet: ' + style;

        cb(null, body);
    }));
}

function getStylesheetBaseName(url) {

    var m = /\/([^\/]+)$/.exec(url);

    if(!m)
        _e('unexpected stylesheet url: ' + url);

    return m[1];
}

function loadStyles(_cb) {

    if(updatingCss)
        return;
    updatingCss = true;

    function cb(err) {
        updatingCss = false;
        _cb(err);
    }

    _x(cb, false, function() {

        console.log('Loading Github CSS...');

        var opts = {url:'http://www.github.com'};
        if(argv.proxy && argv.proxy.length > 0) {
            opts.proxy = argv.proxy;
        }
        request(opts, _x(cb, true, function(err, res, body) {

            if(res.statusCode != 200)
                throw 'Cannot load .css links from Github';

            var ff = {};
            var m;
            var re = /href="([^"]+?\/assets\/[^"]+?\.css)"/g;

            while(m = re.exec(body)) {

                (function(url) {

                    var base = '/styles/' + getStylesheetBaseName(url);

                    ff[base] = _x(null, false, function(cb) {
                        var opts = {url:url};
                        if(argv.proxy && argv.proxy.length > 0) {
                            opts.proxy = argv.proxy;
                        }
                        loadStyle(opts, cb);
                    });

                })(m[1]);
            }

            async.parallel(ff, _x(cb, true, function(err, res) {
                styles = res;
                cb();
            }));

        }));

    })();
}

function startCssUpdater(interval) {

    console.log('Auto-updating CSS every ' + utilz.timeSpan(interval) + '.');

    setInterval(_x(cb, false, function() {

        if(Date.now() - lastCssUpdate > interval) {

            loadStyles(_x(cb, true, function() {

                lastCssUpdate = Date.now();

                cb(null, 'Auto-updated CSS.');
            }));
        }

    }), cssCheckInterval);
}

if(!argv.a && !argv.n)
    argv.b = true;

_x(cb, false, function() {
    loadStyles(_x(cb, true, function() {

        if(!Object.keys(styles).length)
            _e('Cannot parse .css links from Github');

        if(argv.a)
            console.log('Using Github API to render markdown for all updates.');
        else if(argv.b)
            console.log('Using Github API to render markdown for manual reload updates.');

        server.listen(argv.p, argv.h);
        console.log('GFMS ' + pkgJson.version + ' serving ' + process.cwd() + ' at http://' + argv.h + ':' + argv.p + '/ - press CTRL+C to exit.');

        lastCssUpdate = Date.now();
        startCssUpdater(cssUpdateInterval);
    }));
})();
