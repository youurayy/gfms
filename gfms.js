var argv = require('optimist')
    .usage('\nGithub Flavored Markdown Server.\nRun in your project\'s root directory.\nUsage: $0')
    .demand('p')
    .alias('p', 'port')
    .describe('p', 'Port number to listen at.')
    .alias('h', 'host')
    .describe('h', 'Host address to bind to.')
    .default('h', 'localhost')
    .boolean('a')
    .describe('a', 'Render using Github API.')
    .alias('a', 'api')
    .boolean('n')
    .describe('n', 'Disable usage of Github API when the doc is manually reloaded.')
    .alias('n', 'no-api-on-reload')
    .argv;

var express = require('express');
var stylus = require('stylus');
var nib = require('nib');
var app = express();
var http = require('http');
var server = http.createServer(app);
var markdown = //require('github-flavored-markdown').parse;
    require('./showdown.js').parse;
var _ = require('underscore');
var fs = require('fs');
var ews = require('ws');
var ws = require('ws-rpc').extend(ews);
var wss = new ws.Server({ server: server });
var request = require('request');

var laeh = require('laeh2').leanStacks(true);
var _e = laeh._e;
var _x = laeh._x;

var watched = {};
var styles = [];

app.configure(function() {

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
    }

    app.use(wss.middleware(express));
    app.use(express.favicon());
    app.use(app.router);
    app.use(express.static(pub));
    app.use(express.errorHandler({ dump: true, stack: true }));
});

app.configure('development', function() {
    require('utilz').watchFile(__filename);
});

function basename(fn) {
    var m = fn.match(/.*?([^\/]+)\/?$/);
    return m ? m[1] : fn;
}

function is_markdown(v) {
    return v.match(/.*?(?:\.md|\.markdown)$/) ? true : false;
}

app.get('*', function(req, res, next) {
    
    var base = req.path.replace('..', 'DENIED').replace(/\/$/, '');
    var dir = process.cwd() + base;
    
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
            return stat.isDirectory() || (stat.isFile() && is_markdown(v));
        }).map(function(v) {
            return {
                url: base + '/' + v,
                name: v
            };
        }).value();
        
        res.render('directory', {
            files: files,
            dir: dir,
            styles: styles,
            title: basename(dir)
        });
    }
    else if(is_markdown(dir)) {
        
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
                styles: styles,
                fullname: dir
            });
        }));
        
    }
    else
        return next();
});

function renderFile(file, api, cb) { // cb(err, res)
    var contents = fs.readFileSync(file, 'utf8');
    var func = api ? renderWithGithub : renderWithShowdown;
    func(contents, _x(cb, true, cb));
}

function renderWithShowdown(contents, cb) { // cb(err, res)
    var res = markdown(contents);
    cb(null, res);
}

function renderWithGithub(contents, cb) { // cb(err, res)
    var opts = {
        method: 'post',
        url: 'https://api.github.com/markdown',
        json: {
            text: contents,
            mode: 'markdown'
        },
        encoding: 'utf8'
    };

    request(opts, _x(cb, true, function(err, res, body) {
        console.log('remaining API requests: %d', res.headers['x-ratelimit-remaining']);
        cb(null, body);
    }));
}

process.on('SIGINT', function() {
    console.log('\nGFMS exit.');
    return process.exit();
});

console.log('Getting .css links from Github...');

if(!argv.a && !argv.n)
    argv.b = true;

request('http://www.github.com', function(err, res, body) {

    if(err || res.statusCode != 200)
        throw 'Cannot load .css links from Github';
    
    var m, re = /<link href="(.+?)" media="all" rel="stylesheet" type="text\/css" \/>/g;
    while(m = re.exec(body))
        styles.push(m[1]);
    
    if(!styles.length)
        throw 'Cannot parse .css links from Github';
        
    if(argv.a)
        console.log('Using Github API to render markdown for all updates.');
    else if(argv.b)
        console.log('Using Github API to render markdown for manual reload updates.');
    
    server.listen(argv.p, argv.h);
    console.log('GFMS serving ' + process.cwd() + ' at http://' + argv.h + ':' + argv.p + '/ - press CTRL+C to exit.');
});
