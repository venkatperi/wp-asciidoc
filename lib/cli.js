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

const conf = require( './conf' );
const yargs = require( 'yargs' );
const _ = require( 'lodash' );
const WpClient = require( './wp_client' );
const Q = require( 'Q' );
const child_process = require( 'child_process' );

const pexec = Q.denodeify( child_process.exec );

const getClient = ( args ) => new WpClient( args.site );

function newPost( args ) {
  let data = _.extend( {content : ''}, _.pick( args, ['title', 'excerpt', 'content'] ) );
  return getClient( args )
      .newPost( data )
      .then( ( id ) => String( id ) );
}

function listPosts( args ) {
  let client = getClient( args );

  return client.getPosts( _.pick( args, ['number'] ) )
      .then( ( posts ) => posts.map( ( x ) => `${x.id}  ${x.title}` ).join( '\n' ) )
}

function pullPost( args ) {
  return getClient( args )
      .pullPost( args.id )
      .then( () => '' );
}

function getContent( args ) {
  return getClient( args )
      .getPost( args.id )
      .then( ( post ) => post.content );
}

function pushPost( args ) {
  return getClient( args )
      .editPost( args.id )
      .then( () => '' );
}

function editLocally( args ) {
  let dir = getClient( args ).postDir( args.id );
  return pexec( `/usr/local/bin/atom ${dir}/content.adoc` );
}

const exec = ( f ) => ( args ) => f( args ).then( console.log ).catch( console.log );

const args = yargs
    .command( 'new', 'create new post', {
      title : {alias : 't', required : true},
      excerpt : {alias : 'e', required : false},
    }, exec( newPost ) )

    .command( 'list', 'list posts', {
      number : {alias : 'n', description : 'number of posts to get'},
      offset : {alias : 'o', description : 'offset to start from'}
    }, exec( listPosts ) )

    .command( 'pull', 'pull post data', {
      id : {alias : 'i', required : true}
    }, exec( pullPost ) )

    .command( 'content', 'dump remote post content', {
      id : {alias : 'i', required : true}
    }, exec( getContent ) )

    .command( 'push', 'push content to existing post', {
      id : {alias : 'i', required : true}
    }, exec( pushPost ) )

    .command( 'edit', 'locally edit asciidoc', {
      id : {alias : 'i', required : true}
    }, exec( editLocally ) )

    .options( {
      site : {alias : 's', required : true, default : conf.get( "default-site" )}
    } )
    .demandCommand( 1, "Command missing" )
    .usage( "usage: wpasc <command> <options>" )
    .help()
    .argv;


