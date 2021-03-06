// swagger.spec.ts

/*
 The MIT License

 Copyright (c) 2014-2016 Carl Ansley

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

import * as assert from 'assert';
import * as swagger from './swagger';
import {Compiled} from './swagger';

describe('swagger2', () => {
  it('has a loadDocumentSync function', () => assert.equal(typeof swagger.loadDocumentSync, 'function'));
  it('has a validateDocument function', () => assert.equal(typeof swagger.validateDocument, 'function'));
  it('has a validateRequest function', () => assert.equal(typeof swagger.validateRequest, 'function'));
  it('has a validateResponse function', () => assert.equal(typeof swagger.validateResponse, 'function'));
  it('has a compileDocument function', () => assert.equal(typeof swagger.compileDocument, 'function'));

  describe('petstore', () => {
    const raw = swagger.loadDocumentSync(__dirname + '/../test/yaml/petstore.yaml');
    const document: swagger.Document | undefined = swagger.validateDocument(raw);

    let compiled: Compiled;

    if (document !== undefined) {
      // construct a validation object, pre-compiling all schema and regex required
      compiled = swagger.compileDocument(document);
    }

    it('invalid paths are undefined', () => {
      assert.equal(undefined, compiled('/v1/bad'));
      assert.equal(undefined, compiled('/v2/pets'));
    });

    it('compiles valid paths', () => {
      let compiledPath = compiled('/v1/pets');
      assert.notEqual(compiledPath, undefined);
      if (compiledPath !== undefined) {
        assert.equal(compiledPath.name, '/pets');
        assert.notEqual(compiledPath.path.get, undefined);
        if (compiledPath.path.get !== undefined) {
          assert.equal(compiledPath.path.get.summary, 'List all pets');
        }
      }
    });

    describe('/v1/pets', () => {
      let compiledPath = compiled('/v1/pets');

      it('do not allow DELETE', () => {
        assert.equal(undefined, swagger.validateRequest(compiledPath, 'delete', {}, {}));
      });

      it('do not allow undefined paths on requests or responses', () => {
        assert.equal(undefined, swagger.validateRequest(undefined, 'delete', {}, {}));
        assert.deepStrictEqual(swagger.validateResponse(undefined, 'delete', 201), {
          actual: 'UNDEFINED_PATH', expected: 'PATH'
        });
      });

      describe('put', () => {
        it('empty array works', () => {
          assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'put', undefined, []), []);
        });
      });

      describe('post', () => {

        it('body must be empty', () => {
          assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'post', undefined, {x: 'hello'}), [{
            actual: {x: 'hello'},
            expected: {},
            where: 'body'
          }]);
        });

        it('parameters must be empty', () => {
          assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'post', {x: 'y'}), [{
            where: 'query',
            name: 'x',
            actual: 'y',
            expected: {}
          }]);
        });

        it('succeed if request valid', () => {
          assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'post'), []);
        });

        it('succeed if response valid', () => {
          assert.deepStrictEqual(swagger.validateResponse(compiledPath, 'post', 201), undefined);
        });
      });

      describe('get', () => {

        it('limit must be a number', () => {
          assert.deepStrictEqual([{
            actual: 'hello',
            expected: {type: 'integer', format: 'int32'},
            where: 'query'
          }], swagger.validateRequest(compiledPath, 'get', {limit: 'hello'}));

          assert.deepStrictEqual([{
            actual: 23.3,
            expected: {type: 'integer', format: 'int32'},
            where: 'query'
          }], swagger.validateRequest(compiledPath, 'get', {limit: 23.3}));

          assert.deepStrictEqual([{
            actual: 'hello',
            expected: {type: 'number'},
            where: 'query'
          }], swagger.validateRequest(compiledPath, 'get', {numberLimit: 'hello'}));

          assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'get', {limit: 5}), []);
          assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'get', {numberLimit: 5}), []);
          assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'get', {numberLimit: 5.5}), []);
          assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'get', {limit: '5'}), []);
          assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'get', {numberLimit: '5'}), []);
        });

        it('booleanLimit must be a boolean', () => {
          assert.deepStrictEqual([{
            actual: 'hello',
            expected: {type: 'boolean'},
            where: 'query'
          }], swagger.validateRequest(compiledPath, 'get', {booleanLimit: 'hello'}));

          assert.deepStrictEqual([{
            actual: '0',
            expected: {type: 'boolean'},
            where: 'query'
          }], swagger.validateRequest(compiledPath, 'get', {booleanLimit: '0'}));

          assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'get', {booleanLimit: true}), []);
          assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'get', {booleanLimit: false}), []);
          assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'get', {booleanLimit: 'true'}), []);
          assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'get', {booleanLimit: 'false'}), []);
        });

        it('body must be empty', () => {
          assert.deepStrictEqual([{
            actual: {x: 'hello'},
            expected: {},
            where: 'body'
          }], swagger.validateRequest(compiledPath, 'get', undefined, {x: 'hello'}));
        });

        it('ok with no limit', () => assert.deepStrictEqual([], swagger.validateRequest(compiledPath, 'get')));
        it('ok with valid limit', () => assert.deepStrictEqual([], swagger.validateRequest(compiledPath, 'get', {limit: 50})));
        it('invalid method response', () => assert.deepStrictEqual(swagger.validateResponse(compiledPath, 'get', 201,
          {code: 'hello'}), {
          'actual': {'code': 'hello'},
          'expected': {
            'schema': {
              'required': ['code', 'message'],
              'properties': {'code': {'type': 'integer', 'format': 'int32'}, 'message': {'type': 'string'}}
            }
          }
        }));

        it('invalid object response', () => assert.deepStrictEqual(swagger.validateResponse(compiledPath, 'get', 200, {bad: 'object'}), {
          'actual': {'bad': 'object'},
          'expected': {
            'schema': {
              'type': 'array',
              'items': {
                'required': ['id', 'name'],
                'properties': {
                  'id': {'type': 'integer', 'format': 'int64'},
                  'name': {'type': 'string'},
                  'tag': {'type': 'string'}
                }
              }
            }
          }
        }));

        it('invalid array response', () => assert.deepStrictEqual(swagger.validateResponse(compiledPath, 'get', 200,
          [{bad: 'value'}]), {
          'actual': [{'bad': 'value'}],
          'expected': {
            'schema': {
              'type': 'array',
              'items': {
                'required': ['id', 'name'],
                'properties': {
                  'id': {'type': 'integer', 'format': 'int64'},
                  'name': {'type': 'string'},
                  'tag': {'type': 'string'}
                }
              }
            }
          }
        }));

        it('invalid pet object response', () => assert.deepStrictEqual(swagger.validateResponse(compiledPath, 'get', 200, [{
          id: 'abc', name: 'hello'
        }]), {
          'actual': [{'id': 'abc', 'name': 'hello'}],
          'expected': {
            'schema': {
              'type': 'array',
              'items': {
                'required': ['id', 'name'],
                'properties': {
                  'id': {'type': 'integer', 'format': 'int64'},
                  'name': {'type': 'string'},
                  'tag': {'type': 'string'}
                }
              }
            }
          }
        }));

        it('valid error response', () => assert.deepStrictEqual(swagger.validateResponse(compiledPath, 'get', 400, {
          code: 32,
          message: 'message'
        }), undefined));

        it('valid empty array response', () => assert.deepStrictEqual(swagger.validateResponse(compiledPath, 'get', 200, []), undefined));
        it('valid array response', () => assert.deepStrictEqual(swagger.validateResponse(compiledPath, 'get', 200, [{
          id: 3, name: 'hello'
        }]), undefined));

      });
    });

    describe('/v1/pets/{petId}', () => {

      it('do not allow POSTs, PUTs or DELETE', () => {
        let compiledPath = compiled('/v1/pets/3');
        assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'post', {}, {}), undefined);
        assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'put', {}, {}), undefined);
        assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'delete', {}, {}), undefined);
      });

      describe('get', () => {
        it('petId must return an array of pet objects', () => {
          let compiledPath = compiled('/v1/pets/abc');
          assert.deepStrictEqual([], swagger.validateRequest(compiledPath, 'get'));
          assert.deepStrictEqual(swagger.validateResponse(compiledPath, 'get', 200, [{
            id: 3, name: 'hello'
          }]), undefined);
        });
      });
    });
  });


  //TODO: load relative references so we can validate petstore-separate
  // describe('petstore-separate', () => {
  //   const raw = swagger.loadDocumentSync(__dirname + '/../test/yaml/petstore-separate/spec/swagger.yaml');
  //   const document: swagger.Document = swagger.validateDocument(raw);
  //   let compiled = swagger.compileDocument(document);
  //   describe('/api/pets', () => {
  //     let compiledPath = compiled('/api/pets');
  //     describe('post', () => {
  //       assert.deepStrictEqual(swagger.validateRequest(compiledPath, 'post', {}, { x: 'y' }), []);
  //     });
  //   });
  // });

});
