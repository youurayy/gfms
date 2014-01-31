# Github Flavored Markdown Server (GFMS)

### News

Changed Showdown to [Marked](https://github.com/chjj/marked), as it can parse gfm markdown very well, and added [Highlight](http://highlightjs.org/) to use syntax highlight ou source codes. You can even direct link to source code files (just Javascript, PHP, Python and SQL, for now).

You can now use the option `-a` to tell GFMS to render your documents via the [Github Markdown Rendering API](http://developer.github.com/v3/markdown/). For simplicity, the public access is used, which is limited to 60 requests per hour per an IP address.

If the mode `-a` is not specified, GFMS will render your doc via Github API only when you manually reload it in the browser (and on the first load). This way you are less likely ot hit the hourly API limit, because you will only use the API to check for correctness occasionally. Use `-n` to disable this feature.

### (based on Node.js, Express.js, Jade, Stylus, ws-rpc and Marked)

## Usage

    [sudo] npm install gfms -g
    cd your-github-project-dir
    gfms -p 1234

(If you don't know how to install NPM, see here: http://npmjs.org/)

Now browse to `http://localhost:1234`, and select the `.md` or `.markdown` file to view.

When you save the source Markdown file in your editor, it will be automatically updated in your browser. So perhaps a good setup is to have both your editor window and your browser window visible at the same time, so that you don't have to switch in between.

## License
(The MIT License)

Copyright (c) 2012 Juraj Vitko (http://ypocat.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.