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
const hash = require( './util/hash' );
const db = require( './config/db' );

const methods = ['newPost', 'getPost', 'getPosts', 'editPost'];

class WpClient {

  constructor( blog, opts ) {
    this.blog = blog;
    this.opts = _.extend( {}, conf.get(), opts );
    this._client = wordpress.createClient( _.pick( blog.get(), ['url', 'username', 'password'] ) );
    methods.forEach( ( m ) => this[`_${m}`] = Q.nbind( this._client[m], this._client ) );
  }

  convertAsciiDoc( content, opts ) {
    opts = _.extend( {}, this.opts.asciidoc, opts );
    let html = asciidoc.convert( content, opts );
    let append = this.blog.get( 'append' );
    if ( append ) {
      append = typeof append === 'string' ? JSON.parse( append ) : append;
      let attr = _.map( append, ( v, k ) => `${k}="${v}"` ).join( ' ' );
      html += `<div ${attr}>${content}</div>`;
    }
    return html;
  }

  newPost( data ) {
    let asciidoc = `//title:${data.title}\n\n${data.content}`;
    data.content = this.convertAsciiDoc( asciidoc );

    return this._newPost( data )
        .then( ( id ) => Promise
            .all( [
              db.posts.create( {id : id, title : data.title} ),
              mkdirp( this.postDir( id ) )] )
            .then( () => this._writeContentFile( id, asciidoc ) )
            .then( () => this.pullPost( id ) ) )
  }

  getPosts( opts ) {
    let count = opts.number || Infinity;
    return this._getAllPosts( 100, 0, count, [] );
  }

  getPost( id, fields ) {
    return this._getPost( id, fields );
  }

  renderPost( id ) {
    return pfs.readFile( this.contentFileName( id ), "utf8" )
        .then( ( content ) => this.convertAsciiDoc( content ) );
  }

  _renderPost( id ) {
    return Promise
        .all( [db.posts.findById( id ), this.renderPost( id )] )
        .then( ( [post, rendered] ) => {
          let h = hash( rendered );
          return {
            changed : post.get( 'hash' ) !== h,
            rendered : rendered,
            post : post,
            hash : h
          }
        } );
  }

  editPost( id, args ) {
    let self = this;
    let _update = ( fields, post ) => Promise.all( [
      self._editPost( id, fields ),
      post && fields.content ? post.update( {hash : hash( fields.content )} ) : Promise.resolve()
    ] ).then( ( [a, b] ) => a );

    let push = !args || args.content;
    let minId = this.blog.get( 'minId' );

    return !push
        ? _update( args )
        : minId && id < minId
               ? Promise.reject( `push: id < ${minId}: won't clobber` )
               : this._renderPost( id ).then( ( x ) =>
                !x.changed
                    ? Promise.reject( "Won't upload since no change in rendered content. Use --force?" )
                    : ( x ) => _update( {content : x.rendered}, x.post ) );
  }

  pullPost( id ) {
    return Promise.all( [
      mkdirp( this.postDir( id ) ),
      this.getPost( id )
          .then( ( post ) =>
              ['auto-draft', 'inherit', 'trash'].indexOf( post.status ) >= 0 || post.type !== 'post'
                  ? Promise.resolve()
                  : db.posts.upsert( db.posts.pickFields( post ) ).then( () => post ) )
          .then( ( post ) => post )] )
        .then( ( [_md, post] ) => post )
  }

  postDir( id ) {
    return path.join( this.blog.get( 'dir' ), 'posts', String( id ) );
  }

  contentFileName( id ) {
    return `${this.postDir( id )}/content.adoc`;
  }

  _writeContentFile( id, content ) {
    let h = hash( content );
    return Promise.all( [
      pfs.writeFile( this.contentFileName( id ), content ),
      db.posts.update( {hash : h}, {where : {id : id}} )
    ] )
  }

  _getAllPosts( perPage, offset, total, res ) {
    return this._getPosts( {number : perPage, offset : offset} )
        .then( ( posts ) => {
          res = res.concat( posts );
          return posts.length && (res.length < total)
              ? this._getAllPosts( perPage, offset + posts.length, total, res )
              : res.slice( 0, total )
        } );
  }
}

module.exports = WpClient;
