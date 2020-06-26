(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],{

/***/ 981:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";

// EXTERNAL MODULE: /Users/george/ohif/Viewers/node_modules/react/index.js
var react = __webpack_require__(0);
var react_default = /*#__PURE__*/__webpack_require__.n(react);

// EXTERNAL MODULE: /Users/george/ohif/Viewers/node_modules/react-router-dom/esm/react-router-dom.js
var react_router_dom = __webpack_require__(110);

// EXTERNAL MODULE: /Users/george/ohif/Viewers/node_modules/react-router/esm/react-router.js
var react_router = __webpack_require__(27);

// EXTERNAL MODULE: /Users/george/ohif/Viewers/node_modules/react-i18next/dist/es/index.js + 9 modules
var es = __webpack_require__(28);

// EXTERNAL MODULE: /Users/george/ohif/Viewers/node_modules/prop-types/index.js
var prop_types = __webpack_require__(1);
var prop_types_default = /*#__PURE__*/__webpack_require__.n(prop_types);

// EXTERNAL MODULE: /Users/george/ohif/Viewers/node_modules/classnames/index.js
var classnames = __webpack_require__(14);
var classnames_default = /*#__PURE__*/__webpack_require__.n(classnames);

// EXTERNAL MODULE: /Users/george/ohif/Viewers/platform/ui/src/index.js + 118 modules
var src = __webpack_require__(13);

// CONCATENATED MODULE: ./components/UserPreferences/hotkeysConfig.js
var range = function range(start, end) {
  return new Array(end - start).fill().map(function (d, i) {
    return i + start;
  });
};

var MODIFIER_KEYS = ['ctrl', 'alt', 'shift'];
var DISALLOWED_COMBINATIONS = {
  '': [],
  alt: ['space'],
  shift: [],
  ctrl: ['f4', 'f5', 'f11', 'w', 'r', 't', 'o', 'p', 'a', 'd', 'f', 'g', 'h', 'j', 'l', 'z', 'x', 'c', 'v', 'b', 'n', 'pagedown', 'pageup'],
  'ctrl+shift': ['q', 'w', 'r', 't', 'p', 'a', 'h', 'v', 'b', 'n']
};
var SPECIAL_KEYS = {
  8: 'backspace',
  9: 'tab',
  13: 'return',
  16: 'shift',
  17: 'ctrl',
  18: 'alt',
  19: 'pause',
  20: 'capslock',
  27: 'esc',
  32: 'space',
  33: 'pageup',
  34: 'pagedown',
  35: 'end',
  36: 'home',
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
  45: 'insert',
  46: 'del',
  96: '0',
  97: '1',
  98: '2',
  99: '3',
  100: '4',
  101: '5',
  102: '6',
  103: '7',
  104: '8',
  105: '9',
  106: '*',
  107: '+',
  109: '-',
  110: '.',
  111: '/',
  112: 'f1',
  113: 'f2',
  114: 'f3',
  115: 'f4',
  116: 'f5',
  117: 'f6',
  118: 'f7',
  119: 'f8',
  120: 'f9',
  121: 'f10',
  122: 'f11',
  123: 'f12',
  144: 'numlock',
  145: 'scroll',
  191: '/',
  224: 'meta'
};
// CONCATENATED MODULE: ./components/UserPreferences/hotkeysValidators.js


var formatPressedKeys = function formatPressedKeys(pressedKeysArray) {
  return pressedKeysArray.join('+');
};

var findConflictingCommand = function findConflictingCommand(hotkeys, currentCommandName, pressedKeys) {
  var firstConflictingCommand = undefined;
  var formatedPressedHotkeys = formatPressedKeys(pressedKeys);

  for (var commandName in hotkeys) {
    var toolHotkeys = hotkeys[commandName].keys;
    var formatedToolHotkeys = formatPressedKeys(toolHotkeys);

    if (formatedPressedHotkeys === formatedToolHotkeys && commandName !== currentCommandName) {
      firstConflictingCommand = hotkeys[commandName];
      break;
    }
  }

  return firstConflictingCommand;
};

var ERROR_MESSAGES = {
  MODIFIER: "It's not possible to define only modifier keys (ctrl, alt and shift) as a shortcut",
  EMPTY: "Field can't be empty."
}; // VALIDATORS

var hotkeysValidators_modifierValidator = function modifierValidator(_ref) {
  var pressedKeys = _ref.pressedKeys;
  var lastPressedKey = pressedKeys[pressedKeys.length - 1]; // Check if it has a valid modifier

  var isModifier = MODIFIER_KEYS.includes(lastPressedKey);

  if (isModifier) {
    return {
      hasError: true,
      errorMessage: ERROR_MESSAGES.MODIFIER
    };
  }
};

var emptyValidator = function emptyValidator(_ref2) {
  var _ref2$pressedKeys = _ref2.pressedKeys,
      pressedKeys = _ref2$pressedKeys === void 0 ? [] : _ref2$pressedKeys;

  if (!pressedKeys.length) {
    return {
      hasError: true,
      errorMessage: ERROR_MESSAGES.EMPTY
    };
  }
};

var conflictingValidator = function conflictingValidator(_ref3) {
  var commandName = _ref3.commandName,
      pressedKeys = _ref3.pressedKeys,
      hotkeys = _ref3.hotkeys;
  var conflictingCommand = findConflictingCommand(hotkeys, commandName, pressedKeys);

  if (conflictingCommand) {
    return {
      hasError: true,
      errorMessage: "\"".concat(conflictingCommand.label, "\" is already using the \"").concat(pressedKeys, "\" shortcut.")
    };
  }
};

var hotkeysValidators_disallowedValidator = function disallowedValidator(_ref4) {
  var _ref4$pressedKeys = _ref4.pressedKeys,
      pressedKeys = _ref4$pressedKeys === void 0 ? [] : _ref4$pressedKeys;
  var lastPressedKey = pressedKeys[pressedKeys.length - 1];
  var modifierCommand = formatPressedKeys(pressedKeys.slice(0, pressedKeys.length - 1));
  var disallowedCombination = DISALLOWED_COMBINATIONS[modifierCommand];
  var hasDisallowedCombinations = disallowedCombination ? disallowedCombination.includes(lastPressedKey) : false;

  if (hasDisallowedCombinations) {
    return {
      hasError: true,
      errorMessage: "\"".concat(formatPressedKeys(pressedKeys), "\" shortcut combination is not allowed")
    };
  }
};

var hotkeysValidators = [emptyValidator, hotkeysValidators_modifierValidator, conflictingValidator, hotkeysValidators_disallowedValidator];

// EXTERNAL MODULE: ./App.js + 33 modules
var App = __webpack_require__(245);

// EXTERNAL MODULE: ./components/UserPreferences/HotkeysPreferences.styl
var HotkeysPreferences = __webpack_require__(984);

// CONCATENATED MODULE: ./components/UserPreferences/HotkeysPreferences.js
function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }










/**
 * Take hotkeyDefenintions and build an initialState to be used into the component state
 *
 * @param {Object} hotkeyDefinitions
 * @returns {Object} initialState
 */

var initialState = function initialState(hotkeyDefinitions) {
  return {
    hotkeys: _objectSpread({}, hotkeyDefinitions),
    errors: {}
  };
};
/**
 * Take the updated command and keys and validate the changes with all validators
 *
 * @param {Object} arguments
 * @param {string} arguments.commandName command name string to be updated
 * @param {array} arguments.pressedKeys new array of keys to be added for the commandName
 * @param {array} arguments.hotkeys all hotkeys currently into the app
 * @returns {Object} {errorMessage} errorMessage coming from any of the validator or undefined if none
 */


var HotkeysPreferences_validateCommandKey = function validateCommandKey(_ref) {
  var commandName = _ref.commandName,
      pressedKeys = _ref.pressedKeys,
      hotkeys = _ref.hotkeys;

  var _iterator = _createForOfIteratorHelper(hotkeysValidators),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var validator = _step.value;
      var validation = validator({
        commandName: commandName,
        pressedKeys: pressedKeys,
        hotkeys: hotkeys
      });

      if (validation && validation.hasError) {
        return validation;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return {
    errorMessage: undefined
  };
};
/**
 * Take all hotkeys and split the list into two lists
 *
 * @param {array} hotkeys list of all hotkeys
 * @returns {array} array containing two arrays of keys
 */


var splitHotkeys = function splitHotkeys(hotkeys) {
  var splitedHotkeys = [];
  var arrayHotkeys = Object.entries(hotkeys);

  if (arrayHotkeys.length) {
    var halfwayThrough = Math.ceil(arrayHotkeys.length / 2);
    splitedHotkeys.push(arrayHotkeys.slice(0, halfwayThrough));
    splitedHotkeys.push(arrayHotkeys.slice(halfwayThrough, arrayHotkeys.length));
  }

  return splitedHotkeys;
};
/**
 * HotkeysPreferences tab
 * It renders all hotkeys displayed into columns/rows
 *
 * It stores current state and whenever it changes, component messages parent of new value (through function callback)
 * @param {object} props component props
 * @param {string} props.onClose
 */


function HotkeysPreferences_HotkeysPreferences(_ref2) {
  var onClose = _ref2.onClose;

  var _useTranslation = Object(es["c" /* useTranslation */])('UserPreferencesModal'),
      t = _useTranslation.t;

  var hotkeyDefaults = App["d" /* hotkeysManager */].hotkeyDefaults,
      hotkeyDefinitions = App["d" /* hotkeysManager */].hotkeyDefinitions;

  var _useState = Object(react["useState"])(initialState(hotkeyDefinitions)),
      _useState2 = _slicedToArray(_useState, 2),
      state = _useState2[0],
      setState = _useState2[1];

  var snackbar = Object(src["L" /* useSnackbarContext */])();

  var onResetPreferences = function onResetPreferences() {
    var defaultHotKeyDefinitions = {};
    hotkeyDefaults.map(function (item) {
      var commandName = item.commandName,
          values = _objectWithoutProperties(item, ["commandName"]);

      defaultHotKeyDefinitions[commandName] = _objectSpread({}, values);
    });
    setState(initialState(defaultHotKeyDefinitions));
  };

  var onSave = function onSave() {
    var hotkeys = state.hotkeys;
    App["d" /* hotkeysManager */].setHotkeys(hotkeys);
    localStorage.setItem('hotkey-definitions', JSON.stringify(hotkeys));
    onClose();
    snackbar.show({
      message: t('SaveMessage'),
      type: 'success'
    });
  };

  var onHotkeyChanged = function onHotkeyChanged(commandName, hotkeyDefinition, keys) {
    var _validateCommandKey = HotkeysPreferences_validateCommandKey({
      commandName: commandName,
      pressedKeys: keys,
      hotkeys: state.hotkeys
    }),
        errorMessage = _validateCommandKey.errorMessage;

    setState(function (prevState) {
      return {
        hotkeys: _objectSpread(_objectSpread({}, prevState.hotkeys), {}, _defineProperty({}, commandName, _objectSpread(_objectSpread({}, hotkeyDefinition), {}, {
          keys: keys
        }))),
        errors: _objectSpread(_objectSpread({}, prevState.errors), {}, _defineProperty({}, commandName, errorMessage))
      };
    });
  };

  var hasErrors = Object.keys(state.errors).some(function (key) {
    return !!state.errors[key];
  });
  var hasHotkeys = Object.keys(state.hotkeys).length;
  var splitedHotkeys = splitHotkeys(state.hotkeys);
  return /*#__PURE__*/react_default.a.createElement(react_default.a.Fragment, null, /*#__PURE__*/react_default.a.createElement("div", {
    className: "HotkeysPreferences"
  }, hasHotkeys ? /*#__PURE__*/react_default.a.createElement("div", {
    className: "hotkeyTable"
  }, splitedHotkeys.map(function (hotkeys, index) {
    return /*#__PURE__*/react_default.a.createElement("div", {
      className: "hotkeyColumn",
      key: index
    }, /*#__PURE__*/react_default.a.createElement("div", {
      className: "hotkeyHeader"
    }, /*#__PURE__*/react_default.a.createElement("div", {
      className: "headerItemText text-right"
    }, "Function"), /*#__PURE__*/react_default.a.createElement("div", {
      className: "headerItemText text-center"
    }, "Shortcut")), hotkeys.map(function (hotkey) {
      var commandName = hotkey[0];
      var hotkeyDefinition = hotkey[1];
      var keys = hotkeyDefinition.keys,
          label = hotkeyDefinition.label;
      var errorMessage = state.errors[hotkey[0]];

      var handleChange = function handleChange(keys) {
        onHotkeyChanged(commandName, hotkeyDefinition, keys);
      };

      return /*#__PURE__*/react_default.a.createElement("div", {
        key: commandName,
        className: "hotkeyRow"
      }, /*#__PURE__*/react_default.a.createElement("div", {
        className: "hotkeyLabel"
      }, label), /*#__PURE__*/react_default.a.createElement("div", {
        "data-key": "defaultTool",
        className: classnames_default()('wrapperHotkeyInput', errorMessage ? 'stateError' : '')
      }, /*#__PURE__*/react_default.a.createElement(src["i" /* HotkeyField */], {
        keys: keys,
        modifier_keys: MODIFIER_KEYS,
        handleChange: handleChange,
        classNames: 'preferencesInput'
      }), /*#__PURE__*/react_default.a.createElement("span", {
        className: "preferencesInputErrorMessage"
      }, errorMessage)));
    }));
  })) : 'Hotkeys definitions is empty'), /*#__PURE__*/react_default.a.createElement(src["B" /* TabFooter */], {
    onResetPreferences: onResetPreferences,
    onSave: onSave,
    onCancel: onClose,
    hasErrors: hasErrors,
    t: t
  }));
}

HotkeysPreferences_HotkeysPreferences.propTypes = {
  onClose: prop_types_default.a.func
};

// EXTERNAL MODULE: /Users/george/ohif/Viewers/node_modules/react-redux/es/index.js + 22 modules
var react_redux_es = __webpack_require__(51);

// EXTERNAL MODULE: /Users/george/ohif/Viewers/platform/core/src/redux/index.js + 11 modules
var redux = __webpack_require__(233);

// EXTERNAL MODULE: ./components/UserPreferences/WindowLevelPreferences.styl
var WindowLevelPreferences = __webpack_require__(985);

// CONCATENATED MODULE: ./components/UserPreferences/WindowLevelPreferences.js
function WindowLevelPreferences_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function WindowLevelPreferences_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { WindowLevelPreferences_ownKeys(Object(source), true).forEach(function (key) { WindowLevelPreferences_defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { WindowLevelPreferences_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function WindowLevelPreferences_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function WindowLevelPreferences_slicedToArray(arr, i) { return WindowLevelPreferences_arrayWithHoles(arr) || WindowLevelPreferences_iterableToArrayLimit(arr, i) || WindowLevelPreferences_unsupportedIterableToArray(arr, i) || WindowLevelPreferences_nonIterableRest(); }

function WindowLevelPreferences_nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function WindowLevelPreferences_unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return WindowLevelPreferences_arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return WindowLevelPreferences_arrayLikeToArray(o, minLen); }

function WindowLevelPreferences_arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function WindowLevelPreferences_iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function WindowLevelPreferences_arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }







var actions = redux["a" /* default */].actions;


function WindowLevelPreferences_WindowLevelPreferences(_ref) {
  var onClose = _ref.onClose;
  var dispatch = Object(react_redux_es["c" /* useDispatch */])();
  var windowLevelData = Object(react_redux_es["d" /* useSelector */])(function (state) {
    var _state$preferences = state.preferences,
        preferences = _state$preferences === void 0 ? {} : _state$preferences;
    var windowLevelData = preferences.windowLevelData;
    return windowLevelData;
  });

  var _useState = Object(react["useState"])({
    values: WindowLevelPreferences_objectSpread({}, windowLevelData)
  }),
      _useState2 = WindowLevelPreferences_slicedToArray(_useState, 2),
      state = _useState2[0],
      setState = _useState2[1];

  var _useTranslation = Object(es["c" /* useTranslation */])('UserPreferencesModal'),
      t = _useTranslation.t;

  var onResetPreferences = function onResetPreferences() {};

  var hasErrors = false;

  var onSave = function onSave() {
    dispatch(actions.setUserPreferences({
      windowLevelData: state.values
    }));
    onClose();
    snackbar.show({
      message: t('SaveMessage'),
      type: 'success'
    });
  };

  var snackbar = Object(src["L" /* useSnackbarContext */])();

  var handleInputChange = function handleInputChange(event) {
    var $target = event.target;
    var _$target$dataset = $target.dataset,
        key = _$target$dataset.key,
        inputname = _$target$dataset.inputname;
    var inputValue = $target.value;

    if (!state.values[key] || !state.values[key][inputname]) {
      return;
    }

    setState(function (prevState) {
      return WindowLevelPreferences_objectSpread(WindowLevelPreferences_objectSpread({}, prevState), {}, {
        values: WindowLevelPreferences_objectSpread(WindowLevelPreferences_objectSpread({}, prevState.values), {}, WindowLevelPreferences_defineProperty({}, key, WindowLevelPreferences_objectSpread(WindowLevelPreferences_objectSpread({}, prevState.values[key]), {}, WindowLevelPreferences_defineProperty({}, inputname, inputValue))))
      });
    });
  };

  return /*#__PURE__*/react_default.a.createElement(react_default.a.Fragment, null, /*#__PURE__*/react_default.a.createElement("div", {
    className: "WindowLevelPreferences"
  }, /*#__PURE__*/react_default.a.createElement("div", {
    className: "wlColumn"
  }, /*#__PURE__*/react_default.a.createElement("div", {
    className: "wlRow header"
  }, /*#__PURE__*/react_default.a.createElement("div", {
    className: "wlColumn preset"
  }, "Preset"), /*#__PURE__*/react_default.a.createElement("div", {
    className: "wlColumn description"
  }, "Description"), /*#__PURE__*/react_default.a.createElement("div", {
    className: "wlColumn window"
  }, "Window"), /*#__PURE__*/react_default.a.createElement("div", {
    className: "wlColumn level"
  }, "Level")), Object.keys(state.values).map(function (key, index) {
    return /*#__PURE__*/react_default.a.createElement("div", {
      className: "wlRow",
      key: key
    }, /*#__PURE__*/react_default.a.createElement("div", {
      className: "wlColumn preset"
    }, key), /*#__PURE__*/react_default.a.createElement("div", {
      className: "wlColumn description"
    }, /*#__PURE__*/react_default.a.createElement("input", {
      type: "text",
      className: "preferencesInput",
      value: state.values[key].description,
      "data-key": key,
      "data-inputname": "description",
      onChange: handleInputChange
    })), /*#__PURE__*/react_default.a.createElement("div", {
      className: "wlColumn window"
    }, /*#__PURE__*/react_default.a.createElement("input", {
      type: "number",
      className: "preferencesInput",
      value: state.values[key].window,
      "data-key": key,
      "data-inputname": "window",
      onChange: handleInputChange
    })), /*#__PURE__*/react_default.a.createElement("div", {
      className: "wlColumn level"
    }, /*#__PURE__*/react_default.a.createElement("input", {
      type: "number",
      className: "preferencesInput",
      value: state.values[key].level,
      "data-key": key,
      "data-inputname": "level",
      onChange: handleInputChange
    })));
  }))), /*#__PURE__*/react_default.a.createElement(src["B" /* TabFooter */], {
    onResetPreferences: onResetPreferences,
    onSave: onSave,
    onCancel: onClose,
    hasErrors: hasErrors,
    t: t
  }));
}

WindowLevelPreferences_WindowLevelPreferences.propTypes = {
  onClose: prop_types_default.a.func
};

// EXTERNAL MODULE: /Users/george/ohif/Viewers/platform/i18n/src/index.js + 36 modules
var i18n_src = __webpack_require__(101);

// EXTERNAL MODULE: ./components/UserPreferences/GeneralPreferences.styl
var GeneralPreferences = __webpack_require__(986);

// CONCATENATED MODULE: ./components/UserPreferences/GeneralPreferences.js
function GeneralPreferences_slicedToArray(arr, i) { return GeneralPreferences_arrayWithHoles(arr) || GeneralPreferences_iterableToArrayLimit(arr, i) || GeneralPreferences_unsupportedIterableToArray(arr, i) || GeneralPreferences_nonIterableRest(); }

function GeneralPreferences_nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function GeneralPreferences_unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return GeneralPreferences_arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return GeneralPreferences_arrayLikeToArray(o, minLen); }

function GeneralPreferences_arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function GeneralPreferences_iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function GeneralPreferences_arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }







/**
 * General Preferences tab
 * It renders the General Preferences content
 *
 * @param {object} props component props
 * @param {function} props.onClose
 */

function GeneralPreferences_GeneralPreferences(_ref) {
  var onClose = _ref.onClose;

  var _useTranslation = Object(es["c" /* useTranslation */])('UserPreferencesModal'),
      t = _useTranslation.t;

  var snackbar = Object(src["L" /* useSnackbarContext */])();
  var currentLanguage = i18n_src["a" /* default */].language;
  var availableLanguages = i18n_src["a" /* default */].availableLanguages;

  var _useState = Object(react["useState"])(currentLanguage),
      _useState2 = GeneralPreferences_slicedToArray(_useState, 2),
      language = _useState2[0],
      setLanguage = _useState2[1];

  var onResetPreferences = function onResetPreferences() {
    setLanguage(i18n_src["a" /* default */].defaultLanguage);
  };

  var onSave = function onSave() {
    i18n_src["a" /* default */].changeLanguage(language);
    onClose();
    snackbar.show({
      message: t('SaveMessage'),
      type: 'success'
    });
  };

  var hasErrors = false;
  return /*#__PURE__*/react_default.a.createElement(react_default.a.Fragment, null, /*#__PURE__*/react_default.a.createElement("div", {
    className: "GeneralPreferences"
  }, /*#__PURE__*/react_default.a.createElement("div", {
    className: "language"
  }, /*#__PURE__*/react_default.a.createElement("label", {
    htmlFor: "language-select",
    className: "languageLabel"
  }, "Language"), /*#__PURE__*/react_default.a.createElement(src["k" /* LanguageSwitcher */], {
    language: language,
    onLanguageChange: setLanguage,
    languages: availableLanguages
  }))), /*#__PURE__*/react_default.a.createElement(src["B" /* TabFooter */], {
    onResetPreferences: onResetPreferences,
    onSave: onSave,
    onCancel: onClose,
    hasErrors: hasErrors,
    t: t
  }));
}

GeneralPreferences_GeneralPreferences.propTypes = {
  onClose: prop_types_default.a.func
};

// EXTERNAL MODULE: ./components/UserPreferences/UserPreferences.styl
var UserPreferences = __webpack_require__(987);

// CONCATENATED MODULE: ./components/UserPreferences/UserPreferences.js


 // Tabs





var tabs = [{
  name: 'Hotkeys',
  Component: HotkeysPreferences_HotkeysPreferences,
  customProps: {}
}, {
  name: 'General',
  Component: GeneralPreferences_GeneralPreferences,
  customProps: {}
}, {
  name: 'Window Level',
  Component: WindowLevelPreferences_WindowLevelPreferences,
  customProps: {}
}];

function UserPreferences_UserPreferences(_ref) {
  var hide = _ref.hide;
  var customProps = {
    onClose: hide
  };
  return /*#__PURE__*/react_default.a.createElement(src["A" /* TabComponents */], {
    tabs: tabs,
    customProps: customProps
  });
}

UserPreferences_UserPreferences.propTypes = {
  hide: prop_types_default.a.func
};

// CONCATENATED MODULE: ./components/UserPreferences/index.js

// EXTERNAL MODULE: ./components/OHIFLogo/OHIFLogo.js
var OHIFLogo = __webpack_require__(488);

// EXTERNAL MODULE: ./components/Header/Header.css
var Header = __webpack_require__(988);

// CONCATENATED MODULE: ./components/Header/Header.js
function Header_slicedToArray(arr, i) { return Header_arrayWithHoles(arr) || Header_iterableToArrayLimit(arr, i) || Header_unsupportedIterableToArray(arr, i) || Header_nonIterableRest(); }

function Header_nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function Header_unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return Header_arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return Header_arrayLikeToArray(o, minLen); }

function Header_arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function Header_iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function Header_arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }






 //





function Header_Header(props) {
  var t = props.t,
      user = props.user,
      userManager = props.userManager,
      show = props.modal.show,
      useLargeLogo = props.useLargeLogo,
      linkPath = props.linkPath,
      linkText = props.linkText,
      location = props.location,
      children = props.children;

  var _useState = Object(react["useState"])([]),
      _useState2 = Header_slicedToArray(_useState, 2),
      options = _useState2[0],
      setOptions = _useState2[1];

  var hasLink = linkText && linkPath;
  Object(react["useEffect"])(function () {
    var optionsValue = [{
      title: t('About'),
      icon: {
        name: 'info'
      },
      onClick: function onClick() {
        return show({
          content: src["a" /* AboutContent */],
          title: t('OHIF Viewer - About')
        });
      }
    }, {
      title: t('Preferences'),
      icon: {
        name: 'user'
      },
      onClick: function onClick() {
        return show({
          content: UserPreferences_UserPreferences,
          title: t('User Preferences')
        });
      }
    }];

    if (user && userManager) {
      optionsValue.push({
        title: t('Logout'),
        icon: {
          name: 'power-off'
        },
        onClick: function onClick() {
          return userManager.signoutRedirect();
        }
      });
    }

    setOptions(optionsValue);
  }, [setOptions, show, t, user, userManager]);
  return /*#__PURE__*/react_default.a.createElement(react_default.a.Fragment, null, /*#__PURE__*/react_default.a.createElement("div", {
    className: "notification-bar"
  }, t('INVESTIGATIONAL USE ONLY')), /*#__PURE__*/react_default.a.createElement("div", {
    className: classnames_default()('entry-header', {
      'header-big': useLargeLogo
    })
  }, /*#__PURE__*/react_default.a.createElement("div", {
    className: "header-left-box"
  }, location && location.studyLink && /*#__PURE__*/react_default.a.createElement(react_router_dom["b" /* Link */], {
    to: location.studyLink,
    className: "header-btn header-viewerLink"
  }, t('Back to Viewer')), children, hasLink && /*#__PURE__*/react_default.a.createElement(react_router_dom["b" /* Link */], {
    className: "header-btn header-studyListLinkSection",
    to: {
      pathname: linkPath,
      state: {
        studyLink: location.pathname
      }
    }
  }, t(linkText))), /*#__PURE__*/react_default.a.createElement("div", {
    className: "header-menu"
  }, /*#__PURE__*/react_default.a.createElement("span", {
    className: "research-use"
  }, t('INVESTIGATIONAL USE ONLY')), /*#__PURE__*/react_default.a.createElement(src["f" /* Dropdown */], {
    title: t('Options'),
    list: options,
    align: "right"
  }))));
}

Header_Header.propTypes = {
  // Study list, /
  linkText: prop_types_default.a.string,
  linkPath: prop_types_default.a.string,
  useLargeLogo: prop_types_default.a.bool,
  //
  location: prop_types_default.a.object.isRequired,
  children: prop_types_default.a.node,
  t: prop_types_default.a.func.isRequired,
  userManager: prop_types_default.a.object,
  user: prop_types_default.a.object,
  modal: prop_types_default.a.object
};
Header_Header.defaultProps = {
  useLargeLogo: false,
  children: Object(OHIFLogo["a" /* default */])()
};
/* harmony default export */ var components_Header_Header = (Object(es["d" /* withTranslation */])(['Header', 'AboutModal'])(Object(react_router["g" /* withRouter */])(Object(src["N" /* withModal */])(Header_Header))));
// CONCATENATED MODULE: ./connectedComponents/ConnectedHeader.js



var mapStateToProps = function mapStateToProps(state) {
  return {
    user: state.oidc && state.oidc.user
  };
};

var ConnectedHeader = Object(react_redux_es["b" /* connect */])(mapStateToProps)(components_Header_Header);
/* harmony default export */ var connectedComponents_ConnectedHeader = __webpack_exports__["a"] = (ConnectedHeader);

/***/ }),

/***/ 984:
/***/ (function(module, exports, __webpack_require__) {

// extracted by extract-css-chunks-webpack-plugin

/***/ }),

/***/ 985:
/***/ (function(module, exports, __webpack_require__) {

// extracted by extract-css-chunks-webpack-plugin

/***/ }),

/***/ 986:
/***/ (function(module, exports, __webpack_require__) {

// extracted by extract-css-chunks-webpack-plugin

/***/ }),

/***/ 987:
/***/ (function(module, exports, __webpack_require__) {

// extracted by extract-css-chunks-webpack-plugin

/***/ }),

/***/ 988:
/***/ (function(module, exports, __webpack_require__) {

// extracted by extract-css-chunks-webpack-plugin

/***/ })

}]);