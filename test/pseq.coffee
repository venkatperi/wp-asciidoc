assert = require( 'assert' )
pseq = require( '../lib/util/pseq' )
_ = require( 'lodash' )

arr = [ 1, 2, 3, 4, 5 ]

describe 'pseq', ->

  describe 'last', ->
    res = []

    beforeEach -> res = []

    it 'exec promises in sequence', ->
      pseq.last( _.map( arr, ( x ) -> -> Promise.resolve( res.push x ) ) ).then ->
        assert.deepEqual( res, arr )

    it 'wraps non promises', ->
      pseq.last( _.map( arr, ( x ) -> -> res.push x ) ).then ->
        assert.deepEqual( res, arr )

  describe 'all', ->
    res = []

    beforeEach -> res = []

    it 'exec promises in sequence, returning all the results', ->
      pseq.all(arr).then (res) ->
        assert.deepEqual(res, arr)

    it 'wraps non promises', ->
      pseq.last( _.map( arr, ( x ) -> -> res.push x ) ).then ->
        assert.deepEqual( res, arr )


