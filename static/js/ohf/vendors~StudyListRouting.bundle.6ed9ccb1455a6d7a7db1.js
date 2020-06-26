(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[9],{

/***/ 1000:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _propTypes = __webpack_require__(1);

var _propTypes2 = _interopRequireDefault(_propTypes);

var _classnames = __webpack_require__(14);

var _classnames2 = _interopRequireDefault(_classnames);

var _Dismiss = __webpack_require__(979);

var _Dismiss2 = _interopRequireDefault(_Dismiss);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ModalHeader = function (_React$Component) {
  _inherits(ModalHeader, _React$Component);

  function ModalHeader() {
    _classCallCheck(this, ModalHeader);

    return _possibleConstructorReturn(this, _React$Component.apply(this, arguments));
  }

  ModalHeader.getDefaultPrefix = function getDefaultPrefix() {
    return 'modal';
  };

  ModalHeader.prototype.render = function render() {
    var _props = this.props,
        modalPrefix = _props.modalPrefix,
        closeButton = _props.closeButton,
        children = _props.children,
        className = _props.className,
        label = _props['aria-label'],
        props = _objectWithoutProperties(_props, ['modalPrefix', 'closeButton', 'children', 'className', 'aria-label']);

    var prefix = modalPrefix || ModalHeader.getDefaultPrefix();

    return _react2.default.createElement(
      'div',
      _extends({}, props, {
        className: (0, _classnames2.default)(className, prefix + '-header')
      }),
      closeButton && _react2.default.createElement(
        _Dismiss2.default,
        {
          className: 'close',
          'aria-label': label
        },
        _react2.default.createElement(
          'span',
          { 'aria-hidden': 'true' },
          '\xD7'
        )
      ),
      children
    );
  };

  return ModalHeader;
}(_react2.default.Component);

ModalHeader._isModalHeader = true;
ModalHeader.propTypes = {
  closeButton: _propTypes2.default.bool,
  /**
   * A css class applied to the Component
   */
  modalPrefix: _propTypes2.default.string,

  'aria-label': _propTypes2.default.string
};
ModalHeader.defaultProps = {
  closeButton: false,
  'aria-label': 'Close Modal'
};
ModalHeader.contextTypes = {
  onModalHide: _propTypes2.default.func
};
exports.default = ModalHeader;
module.exports = exports['default'];

/***/ }),

/***/ 1001:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _propTypes = __webpack_require__(1);

var _propTypes2 = _interopRequireDefault(_propTypes);

var _classnames = __webpack_require__(14);

var _classnames2 = _interopRequireDefault(_classnames);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ModalTitle = function (_React$Component) {
  _inherits(ModalTitle, _React$Component);

  function ModalTitle() {
    _classCallCheck(this, ModalTitle);

    return _possibleConstructorReturn(this, _React$Component.apply(this, arguments));
  }

  ModalTitle.getDefaultPrefix = function getDefaultPrefix() {
    return 'modal';
  };

  ModalTitle.prototype.render = function render() {
    var _props = this.props,
        modalPrefix = _props.modalPrefix,
        className = _props.className,
        props = _objectWithoutProperties(_props, ['modalPrefix', 'className']);

    var prefix = modalPrefix || ModalTitle.getDefaultPrefix();

    return _react2.default.createElement('h4', _extends({}, props, {
      className: (0, _classnames2.default)(className, prefix + '-title')
    }));
  };

  return ModalTitle;
}(_react2.default.Component);

ModalTitle.propTypes = {
  /**
   * A css class applied to the Component
   */
  modalPrefix: _propTypes2.default.string
};
exports.default = ModalTitle;
module.exports = exports['default'];

/***/ }),

/***/ 1002:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _propTypes = __webpack_require__(1);

var _propTypes2 = _interopRequireDefault(_propTypes);

var _classnames = __webpack_require__(14);

var _classnames2 = _interopRequireDefault(_classnames);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ModalFooter = function (_React$Component) {
  _inherits(ModalFooter, _React$Component);

  function ModalFooter() {
    _classCallCheck(this, ModalFooter);

    return _possibleConstructorReturn(this, _React$Component.apply(this, arguments));
  }

  ModalFooter.getDefaultPrefix = function getDefaultPrefix() {
    return 'modal';
  };

  ModalFooter.prototype.render = function render() {
    var _props = this.props,
        modalPrefix = _props.modalPrefix,
        children = _props.children,
        className = _props.className,
        props = _objectWithoutProperties(_props, ['modalPrefix', 'children', 'className']);

    var prefix = modalPrefix || ModalFooter.getDefaultPrefix();

    return _react2.default.createElement(
      'div',
      _extends({}, props, { className: (0, _classnames2.default)(className, prefix + '-footer') }),
      children
    );
  };

  return ModalFooter;
}(_react2.default.Component);

ModalFooter.propTypes = {
  /**
   * A css class applied to the Component
   */
  modalPrefix: _propTypes2.default.string
};

exports.default = ModalFooter;
module.exports = exports['default'];

/***/ }),

/***/ 979:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _propTypes = __webpack_require__(1);

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var chain = function chain(a, b) {
  return function () {
    a && a.apply(undefined, arguments);
    b && b.apply(undefined, arguments);
  };
};

var Dismiss = function (_React$Component) {
  _inherits(Dismiss, _React$Component);

  function Dismiss() {
    _classCallCheck(this, Dismiss);

    return _possibleConstructorReturn(this, _React$Component.apply(this, arguments));
  }

  Dismiss.prototype.render = function render() {
    var _props = this.props,
        Tag = _props.component,
        children = _props.children,
        props = _objectWithoutProperties(_props, ['component', 'children']);

    return _react2.default.createElement(
      Tag,
      _extends({}, props, {
        onClick: chain(props.onClick, this.context.onModalHide)
      }),
      children
    );
  };

  return Dismiss;
}(_react2.default.Component);

Dismiss.propTypes = {
  component: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.func])
};
Dismiss.defaultProps = {
  component: 'button'
};
Dismiss.contextTypes = {
  onModalHide: _propTypes2.default.func
};
exports.default = Dismiss;
module.exports = exports['default'];

/***/ }),

/***/ 997:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _propTypes = __webpack_require__(1);

var _propTypes2 = _interopRequireDefault(_propTypes);

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _componentOrElement = __webpack_require__(137);

var _componentOrElement2 = _interopRequireDefault(_componentOrElement);

var _reactDom = __webpack_require__(17);

var _Modal = __webpack_require__(573);

var _Modal2 = _interopRequireDefault(_Modal);

var _isOverflowing = __webpack_require__(575);

var _isOverflowing2 = _interopRequireDefault(_isOverflowing);

var _Fade = __webpack_require__(998);

var _Fade2 = _interopRequireDefault(_Fade);

var _Body = __webpack_require__(999);

var _Body2 = _interopRequireDefault(_Body);

var _Header = __webpack_require__(1000);

var _Header2 = _interopRequireDefault(_Header);

var _Title = __webpack_require__(1001);

var _Title2 = _interopRequireDefault(_Title);

var _Footer = __webpack_require__(1002);

var _Footer2 = _interopRequireDefault(_Footer);

var _Dismiss = __webpack_require__(979);

var _Dismiss2 = _interopRequireDefault(_Dismiss);

var _ownerDocument = __webpack_require__(111);

var _ownerDocument2 = _interopRequireDefault(_ownerDocument);

var _inDOM = __webpack_require__(96);

var _inDOM2 = _interopRequireDefault(_inDOM);

var _scrollbarSize = __webpack_require__(574);

var _scrollbarSize2 = _interopRequireDefault(_scrollbarSize);

var _style = __webpack_require__(198);

var _style2 = _interopRequireDefault(_style);

var _classnames = __webpack_require__(14);

var _classnames2 = _interopRequireDefault(_classnames);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var baseIndex = {};
var PREFIX = 'modal';

var getZIndex = void 0;

var omit = function omit(obj, keys) {
  return Object.keys(obj).reduce(function (o, key) {
    if (keys.indexOf(key) === -1) o[key] = obj[key];
    return o;
  }, {});
};

function DialogTransition(props) {
  return _react2.default.createElement(_Fade2.default, _extends({}, props, { timeout: Modal.TRANSITION_DURATION }));
}
function BackdropTransition(props) {
  return _react2.default.createElement(_Fade2.default, _extends({}, props, { timeout: Modal.BACKDROP_TRANSITION_DURATION }));
}

var Modal = function (_React$Component) {
  _inherits(Modal, _React$Component);

  Modal.getDefaultPrefix = function getDefaultPrefix() {
    return PREFIX;
  };

  Modal.prototype.getChildContext = function getChildContext() {
    return this._context || (this._context = { onModalHide: this.props.onHide });
  };

  function Modal() {
    _classCallCheck(this, Modal);

    var _this = _possibleConstructorReturn(this, _React$Component.call(this));

    _this.handleEntering = _this.handleEntering.bind(_this);
    _this.handleExiting = _this.handleExiting.bind(_this);

    _this.state = {
      classes: ''
    };
    return _this;
  }

  Modal.prototype.componentDidMount = function componentDidMount() {
    var _this2 = this;

    getZIndex = getZIndex || function () {
      var modal = document.createElement('div'),
          backdrop = document.createElement('div'),
          zIndexFactor = void 0;

      modal.className = 'modal hide';
      backdrop.className = 'modal-backdrop hide';

      document.body.appendChild(modal);
      document.body.appendChild(backdrop);

      baseIndex.modal = +(0, _style2.default)(modal, 'z-index');
      baseIndex.backdrop = +(0, _style2.default)(backdrop, 'z-index');
      zIndexFactor = baseIndex.modal - baseIndex.backdrop;

      document.body.removeChild(modal);
      document.body.removeChild(backdrop);

      return function (type) {
        return baseIndex[type] + zIndexFactor * (_this2.props.manager.modals.length - 1);
      };
    }();
  };

  Modal.prototype.handleEntering = function handleEntering() {
    this._show.apply(this, arguments);

    if (this.props.onEntering) {
      this.props.onEntering();
    }
  };

  Modal.prototype.handleExiting = function handleExiting() {
    this._removeAttentionClasses();
    if (this.props.onExiting) {
      this.props.onExiting();
    }
  };

  Modal.prototype.render = function render() {
    var _this3 = this;

    var _props = this.props,
        className = _props.className,
        children = _props.children,
        keyboard = _props.keyboard,
        transition = _props.transition,
        modalPrefix = _props.modalPrefix,
        dialogClassName = _props.dialogClassName,
        container = _props.container,
        onEnter = _props.onEnter,
        onEntered = _props.onEntered,
        onExit = _props.onExit,
        onExited = _props.onExited,
        props = _objectWithoutProperties(_props, ['className', 'children', 'keyboard', 'transition', 'modalPrefix', 'dialogClassName', 'container', 'onEnter', 'onEntered', 'onExit', 'onExited']);

    var _state = this.state,
        dialog = _state.dialog,
        classes = _state.classes,
        backdrop = _state.backdrop;


    delete props.manager;
    var elementProps = omit(props, Object.keys(Modal.propTypes));

    var prefix = modalPrefix || Modal.getDefaultPrefix();

    if (transition === true) transition = DialogTransition;

    var modal = _react2.default.createElement(
      'div',
      _extends({}, elementProps, {
        ref: function ref(r) {
          return _this3.dialog = r;
        },
        style: dialog,
        className: (0, _classnames2.default)(className, prefix, { in: props.show && !transition }),
        onClick: this.props.backdrop ? function (e) {
          return _this3.handleBackdropClick(e);
        } : null
      }),
      _react2.default.createElement(
        'div',
        {
          key: 'modal',
          ref: function ref(r) {
            return _this3.innerRef = r;
          },
          className: (0, _classnames2.default)(prefix + '-dialog', dialogClassName, classes, (props.small || props.sm) && prefix + '-sm', (props.large || props.lg) && prefix + '-lg')
        },
        _react2.default.createElement(
          'div',
          { className: prefix + '-content' },
          children
        )
      )
    );

    return _react2.default.createElement(
      _Modal2.default,
      {
        keyboard: keyboard,
        ref: function ref(_ref) {
          _this3.modal = _ref && _ref.modal;
          _this3.backdrop = _ref && _ref.backdrop;
        },
        container: container,
        backdrop: props.backdrop,
        show: props.show,
        backdropStyle: backdrop,
        backdropClassName: prefix + '-backdrop',
        containerClassName: prefix + '-open',
        transition: transition || undefined,
        backdropTransition: transition ? BackdropTransition : undefined,
        onHide: this.props.onHide,
        onEnter: onEnter,
        onEntering: this.handleEntering,
        onEntered: onEntered,
        onExit: onExit,
        onExiting: this.handleExiting,
        onExited: onExited
      },
      modal
    );
  };

  Modal.prototype.attention = function attention() {
    var _this4 = this;

    var attentionClass = this.props.attentionClass;


    if (attentionClass) this.setState({ classes: '' }, function () {
      if (_this4.props.show) {
        // eslint-disable-next-line no-unused-expressions
        _this4.innerRef.offsetWidth;
        _this4.setState({
          classes: attentionClass + ' animated'
        });
      }
    });
  };

  Modal.prototype.handleBackdropClick = function handleBackdropClick(e) {
    if (e.target !== e.currentTarget) return;
    if (this.props.backdrop === 'static') return this.attention();

    this.props.onHide();
  };

  Modal.prototype._show = function _show() {
    if (this.props.show) this.setState(this._getStyles());
  };

  Modal.prototype._getStyles = function _getStyles() {
    if (!_inDOM2.default) return {};

    var node = (0, _reactDom.findDOMNode)(this.dialog),
        doc = (0, _ownerDocument2.default)(node),
        scrollHt = node.scrollHeight,
        bodyIsOverflowing = (0, _isOverflowing2.default)(this.props.container || doc.body),
        modalIsOverflowing = scrollHt > doc.documentElement.clientHeight;

    return {
      dialog: {
        zIndex: getZIndex('modal'),
        paddingRight: bodyIsOverflowing && !modalIsOverflowing ? (0, _scrollbarSize2.default)() : void 0,
        paddingLeft: !bodyIsOverflowing && modalIsOverflowing ? (0, _scrollbarSize2.default)() : void 0
      },
      backdrop: {
        zIndex: getZIndex('backdrop')
      }
    };
  };

  Modal.prototype._removeAttentionClasses = function _removeAttentionClasses() {
    this.setState({ classes: '' });
  };

  return Modal;
}(_react2.default.Component);

Modal.propTypes = {
  show: _propTypes2.default.bool,

  /** sizes **/
  small: _propTypes2.default.bool,
  sm: _propTypes2.default.bool,
  large: _propTypes2.default.bool,
  lg: _propTypes2.default.bool,
  /** --- **/

  backdrop: _propTypes2.default.oneOf(['static', true, false]),
  keyboard: _propTypes2.default.bool,
  animate: _propTypes2.default.bool,
  transition: _propTypes2.default.any,
  container: _propTypes2.default.oneOfType([_componentOrElement2.default, _propTypes2.default.func]),

  onHide: _propTypes2.default.func,
  onEnter: _propTypes2.default.func,
  onEntering: _propTypes2.default.func,
  onEntered: _propTypes2.default.func,
  onExit: _propTypes2.default.func,
  onExiting: _propTypes2.default.func,
  onExited: _propTypes2.default.func,

  modalPrefix: _propTypes2.default.string,
  dialogClassName: _propTypes2.default.string,
  attentionClass: _propTypes2.default.string
};
Modal.defaultProps = {
  backdrop: true,
  keyboard: true,
  animate: true,
  transition: true,
  container: _inDOM2.default ? document.body : null,
  attentionClass: 'shake',
  manager: (_Modal2.default.getDefaultProps ? _Modal2.default.getDefaultProps() : _Modal2.default.defaultProps).manager
};
Modal.childContextTypes = {
  onModalHide: _propTypes2.default.func
};


Modal.injectCSSPrefix = function (prefix) {
  PREFIX = prefix;
};

function getDefaultPrefix() {
  return PREFIX;
}

_Body2.default.getDefaultPrefix = getDefaultPrefix;
_Header2.default.getDefaultPrefix = getDefaultPrefix;
_Title2.default.getDefaultPrefix = getDefaultPrefix;
_Footer2.default.getDefaultPrefix = getDefaultPrefix;

Modal.Body = _Body2.default;
Modal.Header = _Header2.default;
Modal.Title = _Title2.default;
Modal.Footer = _Footer2.default;
Modal.Dismiss = _Dismiss2.default;

Modal.BaseModal = Modal;

Modal.TRANSITION_DURATION = 300;
Modal.BACKDROP_TRANSITION_DURATION = 150;

exports.default = Modal;
module.exports = exports['default'];

/***/ }),

/***/ 998:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _fadeStyles;

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Transition = __webpack_require__(125);

var _Transition2 = _interopRequireDefault(_Transition);

var _classnames = __webpack_require__(14);

var _classnames2 = _interopRequireDefault(_classnames);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var fadeStyles = (_fadeStyles = {}, _fadeStyles[_Transition.ENTERING] = 'in', _fadeStyles[_Transition.ENTERED] = 'in', _fadeStyles);

var Fade = function (_React$Component) {
  _inherits(Fade, _React$Component);

  function Fade(props, context) {
    _classCallCheck(this, Fade);

    return _possibleConstructorReturn(this, _React$Component.call(this, props, context));
  }

  Fade.prototype.render = function render() {
    var _props = this.props,
        className = _props.className,
        children = _props.children,
        props = _objectWithoutProperties(_props, ['className', 'children']);

    return _react2.default.createElement(
      _Transition2.default,
      props,
      function (status, innerProps) {
        return _react2.default.cloneElement(children, _extends({}, innerProps, {
          className: (0, _classnames2.default)('fade', className, children.props.className, fadeStyles[status])
        }));
      }
    );
  };

  return Fade;
}(_react2.default.Component);

exports.default = Fade;
module.exports = exports['default'];

/***/ }),

/***/ 999:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _propTypes = __webpack_require__(1);

var _propTypes2 = _interopRequireDefault(_propTypes);

var _classnames = __webpack_require__(14);

var _classnames2 = _interopRequireDefault(_classnames);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ModalBody = function (_React$Component) {
  _inherits(ModalBody, _React$Component);

  function ModalBody() {
    _classCallCheck(this, ModalBody);

    return _possibleConstructorReturn(this, _React$Component.apply(this, arguments));
  }

  ModalBody.getDefaultPrefix = function getDefaultPrefix() {
    return 'modal';
  };

  ModalBody.prototype.render = function render() {
    var _props = this.props,
        modalPrefix = _props.modalPrefix,
        children = _props.children,
        className = _props.className,
        props = _objectWithoutProperties(_props, ['modalPrefix', 'children', 'className']);

    var prefix = modalPrefix || ModalBody.getDefaultPrefix();

    return _react2.default.createElement(
      'div',
      _extends({}, props, { className: (0, _classnames2.default)(className, prefix + '-body') }),
      children
    );
  };

  return ModalBody;
}(_react2.default.Component);

ModalBody.propTypes = {
  /**
   * A css class applied to the Component
   */
  modalPrefix: _propTypes2.default.string
};

exports.default = ModalBody;
module.exports = exports['default'];

/***/ })

}]);