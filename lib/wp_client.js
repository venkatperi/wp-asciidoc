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
    let html = asciidoc.convert( content, opts );
    let append = this.siteOpts.appendAsciiDoc;
    if ( append ) {
      let attr = _.map( append, ( v, k ) => `${k}=${v}` ).join( ' ' );
      html += `<div ${attr}>${content}</div>`;
    }
    return html;
  }

  newPost( data ) {
    data.content = this.convertAsciiDoc( data.content );
    return this._newPost( data )
        .then( ( id ) => {
          pfs.writeFile( this.contentFileName( id ), `//title: ${data.title}\n\n${data.content}\n` );
          return id;
        } );
  }

  _getAllPosts( perPage, offset, total, res ) {
    return this._getPosts( {number : perPage, offset : offset} )
        .then( ( posts ) => {
          res = res.concat( posts );
          return posts.length && (res.length < total)
              ? this._getAllPosts( perPage, offset + posts.length, total, res )
              : res.slice(0, total)
        } );
  }

  getPosts( opts ) {
    let count = opts.number || Infinity;
    return this._getAllPosts( 100, 0, count, [] );
  }

  getPost( id, fields ) {
    return this._getPost( id, fields );
  }

  editPost( id ) {
    if ( this.siteOpts.minId && id < this.siteOpts.minId ) {
      return Promise.reject( `push: id < ${this.siteOpts.minId}, won't clobber` );
    }
    return pfs.readFile( this.contentFileName( id ), "utf8" )
        .then( ( content ) => this._editPost( id, {id : id, content : this.convertAsciiDoc( content )} ) );
  }

  pullPost( id ) {
    return Promise
        .all( [
          mkdirp( this.postDir( id ) ),
          this.getPost( id )
              .then( ( post ) => JSON.stringify( _.pick( post, ['id', 'title', 'excerpt'] ), null, 2 ) )
        ] )
        .then( ( [_dir, data] ) => pfs.writeFile( `${this.infoFileName( id )}`, data ) )
  }

  postDir( id ) {
    return path.join( this.siteOpts.dir, 'posts', String( id ) );
  }

  infoFileName( id ) {
    return `${this.postDir( id )}/post.json`;
  }

  contentFileName( id ) {
    return `${this.postDir( id )}/content.adoc`;
  }
}

module.exports = WpClient;
