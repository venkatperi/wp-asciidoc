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
const db = require( './config/db' );
const yargs = require( 'yargs' );
const _ = require( 'lodash' );
const prettyoutput = require( 'prettyoutput' );
const post = require( './command/post' );
const blog = require( './command/blog' );

let pretty = ( x ) => prettyoutput( x, {maxDepth : 3} );

const exec = ( f ) => ( args ) => {
  f( args )
      .then( ( x ) => {
        console.log( _.isObjectLike( x ) ? pretty( x ) : x );
      } )
      .catch( ( e ) => console.log( pretty( e.message ? e.message : e ) ) );
};

const args = yargs

    .command( 'blog', 'blog commands', ( y ) => y
        .command( 'add', 'add a blog', {
          name : {required : true},
          url : {type : 'string', required : true},
          username : {type : 'string'},
          password : {type : 'string'},
          minPostId : {type : 'number'},
          dir : {type : 'string', default : path.join( process.env.HOME, 'wp-asciidoc' )},
          append : {
            type : 'string',
            default : '{"id":"wp-asciidoc", "style":"display;none; visibility:hidden;", "class":"wp-asciidoc"}'
          },
          default : {type : 'boolean', default : undefined}
        }, exec( blog.create ) )

        .command( 'list', 'show blogs list', exec( blog.list ) )

        .command( 'update [name]', 'update blog settings', {
          name : {required : true},
          url : {type : 'string'},
          username : {type : 'string'},
          password : {type : 'string'},
          minPostId : {type : 'number'},
          default : {type : 'boolean', default : undefined}
        }, exec( blog.update ) )

        .command( 'show [name]', 'show blog details', {
          name : {required : true}
        }, exec( blog.show ) )

        .command( 'rm [name]', 'delete blog', {
          name : {required : true}
        }, exec( blog.remove ) )

        .demandCommand( 1, "blog: command missing" )
    )

    .command( 'post', 'post commands', ( y ) => y

        .command( 'new', 'create new post', {
          title : {required : true, type : 'string'},
          excerpt : {type : 'string'}
        }, exec( post.create ) )

        .command( 'listLocal', 'list local posts', {}, exec( post.listLocal ) )

        .command( 'pull', 'pull post info from wordpress', {
          ids : {type : 'array', required : true}
        }, exec( post.pull ) )

        .command( 'list', 'list remote posts', {
          number : {alias : 'n', description : 'limit to number of posts'},
        }, exec( post.list ) )

        .command( 'content [id]', 'dump remote post content', {
          id : {type : 'number', required : true}
        }, exec( post.content ) )

        .command( 'render [id]', 'render post and dump HTML locally', {
          id : {type : 'number', required : true}
        }, exec( post.render ) )

        .command( 'update [id]', 'update remote post settings (except content)', {
          id : {type : 'number', required : true},
          title : {type : 'string', default : undefined},
          excerpt : {type : 'string', default : undefined},
          status : {
            choices : [undefined, 'draft', 'pending', 'publish', 'auto-draft', 'future', 'private', 'inherit', 'trash'],
            required : false,
            default : undefined
          }
        }, exec( post.update ) )

        .command( 'changed [id]', 'Checks if rendering of post has changed since the last push', {
          id : {type : 'number', required : true}
        }, exec( post.changed ) )

        .command( 'push [id]', 'push content to existing post', {
          id : {type : 'number', required : true},
          force : {},
        }, exec( post.push ) )

        .command( 'edit [id]', 'locally edit asciidoc', {
          id : {type : 'number', required : true}
        }, exec( post.edit ) )

        .options( {blog : {type : 'string'}} )

        .demandCommand( 1, "post: command missing" )
    )
    .demandCommand( 1, "wpasc: command missing" )
    .usage( "usage: wpasc <command> [$1]" )
    .help()
    .version()
    // .strict();

db.sequelize.sync().then( () => args.argv );



