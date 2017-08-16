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
const getClient = require( './client' );

module.exports = {

  create : function ( args ) {
    return db.blogs
        .create( db.blogs.pickFields( args ) )
        .then( ( blog ) => blog.getSanitized() )
  },

  remove : function ( args ) {
    return db.blogs
        .destroy( {where : {name : args.name}} );
  },

  show : function ( args ) {
    return db.blogs
        .findOne( {name : args.name} )
        .then( ( blog ) => blog.getSanitized() )
  },

  update : function ( args ) {
    args = db.blogs.pickFields( args );
    if ( _.isEmpty( _.omit( args, ['name'] ) ) ) {
      return Promise.reject( 'nothing to change' );
    }
    return pseq.last( [ args.default !== undefined ? db.blogs.update( {default : false}, {where : {default : true}} ) : null,
      db.blogs.update( args, {where : {name : args.name}} )
    ] ).then( () => showBlog( args ) )
  },

  list : function ( args ) {
    return db.blogs
        .findAll()
        .then( ( blogs ) => blogs.map( ( x ) =>
            sprintf( '%-10s %-20s %-10s %t', x.name, x.url, x.username, x.default ) )
            .join( '\n' ) );
  }

}
