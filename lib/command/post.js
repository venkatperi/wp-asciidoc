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

const path = require( 'path' );
const db = require( '../config/db' );
const _ = require( 'lodash' );
const sprintf = require( 'sprintf-js' ).sprintf;
const pseq = require( '../util/pseq' );
const display = require( '../util/display' );
const pexec = require( '../util/pexec' );
const getClient = require( './client' );
const Q = require( 'q' );
const {chain} = require( 'arrayp' );

module.exports = {
  create : function ( args ) {
    let data = _.extend( {content : ''}, _.pick( args, ['title', 'excerpt', 'content'] ) );
    return chain( [
      getClient( args ),
      ( client ) => client.newPost( data ),
      display.post] )
  },

  list : function ( args ) {
    chain( [
      getClient( args ),
      ( client ) => client.getPosts( _.pick( args, ['number'] ) ),
      ( posts ) => posts.map( ( x ) => `${x.id}  ${x.title}` ).join( '\n' )] )
  },

  listLocal : function ( args ) {
    return chain( [
      db.posts.findAll(),
      ( post ) => post.map( ( x ) => sprintf( '%-5s %-40s %-10s', x.id,
          _.truncate( x.title, {length : 39} ), x.status ) )
          .join( '\n' )] )
  },

  pull : function ( args ) {
    let ids = args.ids;
    if ( typeof ids[0] === 'string' && ids[0].indexOf( '-' ) > 0 ) {
      let [start, end] = ids[0].split( '-' ).map( ( x ) => Number( x ) );
      ids = [];
      for ( let i = start; i <= end; i++ ) {
        ids.push( i );
      }
    }
    return getClient( args ).then(
        ( client ) => pseq.all(
            ids.map( ( id ) => client.pullPost( id ).then( display.post ).catch( () => {} ) ), {delay : 100} )
            .then( ( res ) => _.filter( res, ( x ) => x ) ) );
  },

  content : function ( args ) {
    return chain( [
      getClient( args ),
      ( client ) => client.getPost( args.id ),
      ( post ) => post.content] )
  },

  push : function ( args ) {
    return chain( [
      getClient( args ),
      ( client ) => client.editPost( args.id, args ),
      display.post] )
  },

  update : function ( args ) {
    return chain( [
      getClient( args ),
      ( client ) => chain( [
        client.editPost( args.id, _.pick( args, ['status', 'title', 'excerpt'] ) ),
        ( updated ) => updated ? client.getPost( args.id ) : 'not updated'] ),
      display.post] )
  },

  render : function ( args ) {
    return getClient( args )
        .then( ( client ) => client.renderPost( args.id ) );
  },

  changed : function ( args ) {
    return getClient( args )
        .then( ( client ) => client._renderPost( args.id ) )
        .then( ( x ) => x.changed ? 'yes' : 'no' );
  },

  edit : function ( args ) {
    return getClient( args ).then( ( client ) => {
      let dir = client.postDir( args.id );
      let editor = process.env.EDITOR;
      return !editor ? Promise.reject( 'edit: environment variable "EDITOR" must be set.' ) : pexec(
          `${editor} ${dir}/content.adoc` ).then( () => '' );
    } );
  }
};
