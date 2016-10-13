'use strict';

var assign = require('lodash/object/assign'),
    map = require('lodash/collection/map');

var ModelUtil = require('../util/ModelUtil'),
    is = ModelUtil.is;

function elementData(semantic, attrs) {
  return assign({
    id: semantic.id,
    type: semantic.$type,
    businessObject: semantic
  }, attrs);
}

function getHREF(element) {
  return element && element.href.slice(1);
}

function collectWaypoints(edge) {
  var waypoints = edge.waypoints;

  if (waypoints) {
    return map(waypoints, function(waypoint) {
      return { x: waypoint.x, y: waypoint.y };
    });
  }
}

function DrdImporter(eventBus, canvas, drdElementFactory, elementRegistry) {
  this._eventBus = eventBus;
  this._canvas = canvas;
  this._elementRegistry = elementRegistry;
  this._elementFactory = drdElementFactory;
}

DrdImporter.$inject = [ 'eventBus', 'canvas', 'drdElementFactory', 'elementRegistry' ];

module.exports = DrdImporter;


DrdImporter.prototype.root = function(diagram) {
  var element = this._elementFactory.createRoot(elementData(diagram));

  this._canvas.setRootElement(element);

  return element;
};

/**
 * Add drd element (semantic) to the canvas.
 */
DrdImporter.prototype.add = function(semantic, di) {

  var elementFactory = this._elementFactory,
      canvas = this._canvas,
      eventBus = this._eventBus;

  var element, waypoints, sourceShape, targetShape, elementDefinition,
      sourceID, targetID;

  if (di.$instanceOf('biodi:Bounds')) {
    elementDefinition = elementData(semantic, {
      x: Math.round(di.x),
      y: Math.round(di.y),
      width: Math.round(di.width),
      height: Math.round(di.height)
    });

    element = elementFactory.createShape(elementDefinition);

    canvas.addShape(element);

    eventBus.fire('drdElement.added', { element: element, di: di });

  } else if (di.$instanceOf('biodi:Edge')) {
    waypoints = collectWaypoints(di);

    sourceID = di.source;
    targetID = semantic.$parent.id;

    if (is(semantic, 'dmn:Association')) {
      targetID = getHREF(semantic.targetRef);
    }

    sourceShape = this._getShape(sourceID);
    targetShape = this._getShape(targetID);

    semantic.di = di;

    if (sourceShape && targetShape) {
      elementDefinition = elementData(semantic, {
        hidden: false,
        source: sourceShape,
        target: targetShape,
        waypoints: waypoints
      });

      element = elementFactory.createConnection(elementDefinition);

      canvas.addConnection(element);

      eventBus.fire('drdElement.added', { element: element, di: di });
    }

  } else {
    throw new Error('unknown di for element ' + semantic.id);
  }

  return element;
};

DrdImporter.prototype._getShape = function(id) {
  return this._elementRegistry.get(id);
};