# Github Flavored Markdown Server (GFMS)

### (based on Node.js, Express.js, Jade, Stylus, ws-rpc and GFM for JavaScript)

---
I could not find a tool that would allow me to preview Github Flavored Markdown files offline, so I wrote one. (Well it's not completely offline - it loads the Github CSS from Akamai and JQuery from Google's CDN, but you know how to cache them if you need to.)

Basically the only way how to preview GFM somewhat properly, was to commit the file to the Github repo and reload the browser page. However committing just for preview unecessarily pollutes GIT history of the file, and it's a tedious process.

Sure, there are various good Markdown editors for all platforms, but only a few support GFM, and to my knowledge, none properly supports the syntax-colored code blocks denoted by three apostrophes, e.g.

```js
function(arg) {
	// some code here
	for(var i = 0; i < 10; i++)
		console.log('hello ' + i);
}
```

And none would show the result looking (almost) exactly like at Github.

## Limitations

Well, the current implementation of GFMS doesn't color the source code blocks, but it at least renders them correctly. I had to modify the `showdown.js` from `github-flavored-markdown`. I made a copy of that file, and fork & pull-request to the original project is on my `TODO` list. GFMS has `github-flavored-markdown` as a dependency despite it's not needed, so that the heritage is obvious in NPM.

Another possible shortcoming is that the URLs of the Github CSS files are scraped from www.github.com directly, introducing some fragility inherent to the nature of scraping.

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