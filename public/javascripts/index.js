'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var WebStore = require('rdf-store-web');
var SimpleRDFCore = require('simplerdf-core');
var rdf = require('rdf-ext');

var SimpleRDF = function (_SimpleRDFCore) {
  _inherits(SimpleRDF, _SimpleRDFCore);

  function SimpleRDF(context, iri, graph, store) {
    _classCallCheck(this, SimpleRDF);

    var _this = _possibleConstructorReturn(this, (SimpleRDF.__proto__ || Object.getPrototypeOf(SimpleRDF)).call(this, context, iri, graph));

    _this._store = store || new WebStore();
    return _this;
  }

  _createClass(SimpleRDF, [{
    key: 'child',
    value: function child(iri) {
      return new SimpleRDF(this._core.context, iri, this._core.graph, this._store);
    }
  }, {
    key: 'get',
    value: function get(iri, options) {
      var _this2 = this;

      if (typeof iri !== 'string') {
        options = iri;
        iri = null;
      }

      if (iri) {
        this.iri(iri);
      }

      return rdf.dataset().import(this._store.match(null, null, null, this._core.iri, options)).then(function (graph) {
        _this2.graph(graph);

        return _this2;
      });
    }
  }, {
    key: 'save',
    value: function save(iri, options) {
      if (typeof iri !== 'string') {
        options = iri;
        iri = null;
      }

      if (iri) {
        this.iri(iri);
      }

      // assign IRI to the graph of all quads
      var dataset = rdf.dataset(this._core.graph, this._core.iri);

      return rdf.waitFor(this._store.import(dataset.toStream()));
    }
  }]);

  return SimpleRDF;
}(SimpleRDFCore);

module.exports = function (context, iri, graph, store) {
  return new SimpleRDF(context, iri, graph, store);
};

module.exports.isArray = SimpleRDFCore.isArray;
module.exports.SimpleRDF = SimpleRDF;