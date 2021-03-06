// Copyright 2017, Venkat Peri.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

const AsciiDoctor = require( 'asciidoctor.js' );
const _ = require( 'lodash' );
const asciiDoctor = AsciiDoctor();
const path = require( 'path' );

var BASE_DIR = path.resolve();

module.exports = {
  convert : function ( content, attrs = {} ) {
    let opts = null;
    if ( !_.isEmpty( attrs ) ) {
      let base_dir = attrs.base_dir || BASE_DIR;
      delete attrs.base_dir;
      let safe = attrs.safe || 'safe';
      delete attrs.safe;

      let str = _.reduce( attrs, ( r, v, k ) => r.concat( `${k}=${v}` ), [] );
      opts = Opal.hash2( ['attributes', 'base_dir', 'safe'],
          {
            'attributes' : str,
            'base_dir' : base_dir,
            'safe' : 'safe'
          } );
    }
    return asciiDoctor.convert( content, opts );
  }
};


