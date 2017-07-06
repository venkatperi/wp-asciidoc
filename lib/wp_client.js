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

const wordpress = require( 'wordpress' );
const _ = require( 'lodash' );
const asciidoc = require( './asciidoc' );
const Q = require( 'Q' );
const conf = require( './conf' );
const pfs = require( './pfs' );
const path = require( 'path' );
const mkdirp = Q.denodeify( require( 'mkdirp' ).mkdirp );
const moment = require( 'moment' );

const methods = ['newPost', 'getPost', 'getPosts', 'editPost'];

class WpClient {
  constructor( site, opts ) {
    this._site = site;
    this.opts = _.extend( {}, conf.get(), opts );

    this._client = wordpress.createClient( this.siteOpts.connection );

    methods.forEach( ( m ) => this[`_${m}`] = Q.nbind( this._client[m], this._client ) );
  }

  get siteOpts() {
    return this.opts.sites[this._site];
  }

  convertAsciiDoc( content, opts ) {
    opts = _.extend( {}, this.opts.asciidoc, opts );
    return asciidoc.convert( content, opts );
  }

  newPost( data ) {
    let now = moment.utc().toDate();
    data.content = this.convertAsciiDoc( data.content );
    data.date = data.date || now;
    return this
        ._newPost( data )
        .then( ( id ) => {
          this.writePostInfo( id );
          return id;
        } );
  }

  getPosts( filter ) {
    return this._getPosts( filter );
  }

  getPost( id, fields ) {
    return this._getPost( id, fields );
  }

  editPost( id ) {
    let postDir = this.postDir( id );
    let contentFileName = `${postDir}/content.adoc`;
    return pfs
        .readFile( contentFileName, "utf8" )
        .then( ( content ) => {
          let html = this.convertAsciiDoc( content );
          html += `<div class="asciidoc" style="display: none; visibility:hidden;"${content}</div>`;
          return this._editPost( id, {id : id, content : html} );
        } );
  }

  pullPost( id ) {
    let post = null;
    let postDir = this.postDir( id );

    return mkdirp( postDir )
        .then( () => this.getPost( id ) )
        .then( ( post ) => _.pick( post, ['id', 'title', 'excerpt'] ) )
        .then( ( data ) => pfs.writeFile( `${postDir}/post.json`, JSON.stringify( data, null, 2 ) ) )
  }

  postDir( id ) {
    return path.join( this.siteOpts.dir, 'posts', String( id ) );
  }
}

module.exports = WpClient;
