/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/static/js/ohf/";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

// https://developers.google.com/web/tools/workbox/guides/troubleshoot-and-debug
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.0.0-beta.1/workbox-sw.js'); // Install newest
// https://developers.google.com/web/tools/workbox/modules/workbox-core

workbox.core.skipWaiting();
workbox.core.clientsClaim(); // Cache static assets that aren't precached

workbox.routing.registerRoute(/\.(?:js|css)$/, new workbox.strategies.StaleWhileRevalidate({
  cacheName: 'static-resources'
})); // Cache the Google Fonts stylesheets with a stale-while-revalidate strategy.

workbox.routing.registerRoute(/^https:\/\/fonts\.googleapis\.com/, new workbox.strategies.StaleWhileRevalidate({
  cacheName: 'google-fonts-stylesheets'
})); // Cache the underlying font files with a cache-first strategy for 1 year.

workbox.routing.registerRoute(/^https:\/\/fonts\.gstatic\.com/, new workbox.strategies.CacheFirst({
  cacheName: 'google-fonts-webfonts',
  plugins: [new workbox.cacheableResponse.CacheableResponsePlugin({
    statuses: [0, 200]
  }), new workbox.expiration.ExpirationPlugin({
    maxAgeSeconds: 60 * 60 * 24 * 365,
    // 1 Year
    maxEntries: 30
  })]
})); // MESSAGE HANDLER

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        // TODO: We'll eventually want this to be user prompted
        // workbox.core.skipWaiting();
        // workbox.core.clientsClaim();
        // TODO: Global notification to indicate incoming reload
        break;

      default:
        console.warn("SW: Invalid message type: ".concat(event.data.type));
    }
  }
});
workbox.precaching.precacheAndRoute([{'revision':'e3ca557deaf9ccfbfb57985b4e447e42','url':'/static/js/ohf/0.5fc34f6b12ba05138829.css'},{'revision':'2121bea167176d99e5c0e70cda78f440','url':'/static/js/ohf/1.5fc34f6b12ba05138829.css'},{'revision':'37c6b1e97da96446a8c1dfb903184661','url':'/static/js/ohf/12.5fc34f6b12ba05138829.css'},{'revision':'2d134b65c192dcab5cc458442d71b361','url':'/static/js/ohf/12.bundle.05aef67199e5dd5d09dc.js'},{'revision':'51b8db98bb998e2c0f27595f82a53960','url':'/static/js/ohf/13.bundle.b86ed9a2cecf22af606c.js'},{'revision':'2625d1e558407a60e7b9a096615ba423','url':'/static/js/ohf/14.5fc34f6b12ba05138829.css'},{'revision':'eea62a2fdfd44218f9747d4bb9838993','url':'/static/js/ohf/14.bundle.4ed5ca695ae185de8d64.js'},{'revision':'c9c31e7bd2aa2fe1c41fde3b6d15f38c','url':'/static/js/ohf/15.bundle.ab1c9095ded78ff179e1.js'},{'revision':'12f7c3399cb85a186e166b0dc7722749','url':'/static/js/ohf/16.bundle.07f5d464d9752c897d8e.js'},{'revision':'bd828a4487cce934b303b4f8010abd0b','url':'/static/js/ohf/17.bundle.ac57da617c2220a630ea.js'},{'revision':'ce7e76e1bd77c4e9bba53bcd447bb2b9','url':'/static/js/ohf/18.bundle.bff299dafbf272c5bee2.js'},{'revision':'0731d3258f53b657979535b290f4c7a3','url':'/static/js/ohf/5.5fc34f6b12ba05138829.css'},{'revision':'260f7b0ecd47a2d3473d498bf9653b59','url':'/static/js/ohf/6.5fc34f6b12ba05138829.css'},{'revision':'733592c5d66dced84e6cb8bbd279e7b3','url':'/static/js/ohf/CallbackPage.bundle.bc9accaee706a519a26c.js'},{'revision':'5aaeb63e093f6a0138c140e3e0388d72','url':'/static/js/ohf/ConnectedStandaloneRouting.bundle.c92f1e2afc2827c40eeb.js'},{'revision':'0da6c503dc92e246d4a22336d79c6ec9','url':'/static/js/ohf/ConnectedStandaloneRouting~IHEInvokeImageDisplay~StudyListRouting~ViewerLocalFileData~ViewerRouting.bundle.48e4344b7a004201b08f.js'},{'revision':'494c0ff6f9855e51daf08f842e035a64','url':'/static/js/ohf/ConnectedStandaloneRouting~IHEInvokeImageDisplay~ViewerLocalFileData~ViewerRouting.bundle.862b0c6794a18e2cd485.js'},{'revision':'4c1a5db5d13640a2c07c768cfd1ab97d','url':'/static/js/ohf/IHEInvokeImageDisplay.bundle.8cf8ec43a7938d897ec4.js'},{'revision':'26f2163f4d07b3e9ec7b0aea8f304519','url':'/static/js/ohf/StudyListRouting.bundle.4ca8e1135edcb888c76a.js'},{'revision':'f6c42a405232d36ad8f90239ae3ecf5f','url':'/static/js/ohf/ViewerLocalFileData.bundle.fb963b972def63ca4c54.js'},{'revision':'50be7112d4903aaf1e8375195def6a49','url':'/static/js/ohf/ViewerRouting.bundle.7544d8a271f5435a435d.js'},{'revision':'ad4a38db8e5ec877a676b33fe3c16b17','url':'/static/js/ohf/app-config.js'},{'revision':'0ba59bf6440a8b393dc2d1bb019f9e80','url':'/static/js/ohf/app.5fc34f6b12ba05138829.css'},{'revision':'473e74a795f5a95dcfba304960bbcdf8','url':'/static/js/ohf/assets/Button_File.svg'},{'revision':'271da60b435c1445580caab72e656818','url':'/static/js/ohf/assets/Button_Folder.svg'},{'revision':'cb4f64534cdf8dd88f1d7219d44490db','url':'/static/js/ohf/assets/android-chrome-144x144.png'},{'revision':'5cde390de8a619ebe55a669d2ac3effd','url':'/static/js/ohf/assets/android-chrome-192x192.png'},{'revision':'e7466a67e90471de05401e53b8fe20be','url':'/static/js/ohf/assets/android-chrome-256x256.png'},{'revision':'9bbe9b80156e930d19a4e1725aa9ddae','url':'/static/js/ohf/assets/android-chrome-36x36.png'},{'revision':'5698b2ac0c82fe06d84521fc5482df04','url':'/static/js/ohf/assets/android-chrome-384x384.png'},{'revision':'56bef3fceec344d9747f8abe9c0bba27','url':'/static/js/ohf/assets/android-chrome-48x48.png'},{'revision':'3e8b8a01290992e82c242557417b0596','url':'/static/js/ohf/assets/android-chrome-512x512.png'},{'revision':'517925e91e2ce724432d296b687d25e2','url':'/static/js/ohf/assets/android-chrome-72x72.png'},{'revision':'4c3289bc690f8519012686888e08da71','url':'/static/js/ohf/assets/android-chrome-96x96.png'},{'revision':'cf464289183184df09292f581df0fb4f','url':'/static/js/ohf/assets/apple-touch-icon-1024x1024.png'},{'revision':'0857c5282c594e4900e8b31e3bade912','url':'/static/js/ohf/assets/apple-touch-icon-114x114.png'},{'revision':'4208f41a28130a67e9392a9dfcee6011','url':'/static/js/ohf/assets/apple-touch-icon-120x120.png'},{'revision':'cb4f64534cdf8dd88f1d7219d44490db','url':'/static/js/ohf/assets/apple-touch-icon-144x144.png'},{'revision':'977d293982af7e9064ba20806b45cf35','url':'/static/js/ohf/assets/apple-touch-icon-152x152.png'},{'revision':'6de91b4d2a30600b410758405cb567b4','url':'/static/js/ohf/assets/apple-touch-icon-167x167.png'},{'revision':'87bff140e3773bd7479a620501c4aa5c','url':'/static/js/ohf/assets/apple-touch-icon-180x180.png'},{'revision':'647386c34e75f1213830ea9a38913525','url':'/static/js/ohf/assets/apple-touch-icon-57x57.png'},{'revision':'0c200fe83953738b330ea431083e7a86','url':'/static/js/ohf/assets/apple-touch-icon-60x60.png'},{'revision':'517925e91e2ce724432d296b687d25e2','url':'/static/js/ohf/assets/apple-touch-icon-72x72.png'},{'revision':'c9989a807bb18633f6dcf254b5b56124','url':'/static/js/ohf/assets/apple-touch-icon-76x76.png'},{'revision':'87bff140e3773bd7479a620501c4aa5c','url':'/static/js/ohf/assets/apple-touch-icon-precomposed.png'},{'revision':'87bff140e3773bd7479a620501c4aa5c','url':'/static/js/ohf/assets/apple-touch-icon.png'},{'revision':'05fa74ea9c1c0c3931ba96467999081d','url':'/static/js/ohf/assets/apple-touch-startup-image-1182x2208.png'},{'revision':'9e2cd03e1e6fd0520eea6846f4278018','url':'/static/js/ohf/assets/apple-touch-startup-image-1242x2148.png'},{'revision':'5591e3a1822cbc8439b99c1a40d53425','url':'/static/js/ohf/assets/apple-touch-startup-image-1496x2048.png'},{'revision':'337de578c5ca04bd7d2be19d24d83821','url':'/static/js/ohf/assets/apple-touch-startup-image-1536x2008.png'},{'revision':'cafb4ab4eafe6ef946bd229a1d88e7de','url':'/static/js/ohf/assets/apple-touch-startup-image-320x460.png'},{'revision':'d9bb9e558d729eeac5efb8be8d6111cc','url':'/static/js/ohf/assets/apple-touch-startup-image-640x1096.png'},{'revision':'038b5b02bac8b82444bf9a87602ac216','url':'/static/js/ohf/assets/apple-touch-startup-image-640x920.png'},{'revision':'2177076eb07b1d64d663d7c03268be00','url':'/static/js/ohf/assets/apple-touch-startup-image-748x1024.png'},{'revision':'4fc097443815fe92503584c4bd73c630','url':'/static/js/ohf/assets/apple-touch-startup-image-750x1294.png'},{'revision':'2e29914062dce5c5141ab47eea2fc5d9','url':'/static/js/ohf/assets/apple-touch-startup-image-768x1004.png'},{'revision':'f692ec286b3a332c17985f4ed38b1076','url':'/static/js/ohf/assets/browserconfig.xml'},{'revision':'f3d9a3b647853c45b0e132e4acd0cc4a','url':'/static/js/ohf/assets/coast-228x228.png'},{'revision':'533ba1dcac7b716dec835a2fae902860','url':'/static/js/ohf/assets/favicon-16x16.png'},{'revision':'783e9edbcc23b8d626357ca7101161e0','url':'/static/js/ohf/assets/favicon-32x32.png'},{'revision':'0711f8e60267a1dfc3aaf1e3818e7185','url':'/static/js/ohf/assets/favicon.ico'},{'revision':'5df2a5b0cee399ac0bc40af74ba3c2cb','url':'/static/js/ohf/assets/firefox_app_128x128.png'},{'revision':'11fd9098c4b07c8a07e1d2a1e309e046','url':'/static/js/ohf/assets/firefox_app_512x512.png'},{'revision':'27cddfc922dca3bfa27b4a00fc2f5e36','url':'/static/js/ohf/assets/firefox_app_60x60.png'},{'revision':'2017d95fae79dcf34b5a5b52586d4763','url':'/static/js/ohf/assets/manifest.webapp'},{'revision':'cb4f64534cdf8dd88f1d7219d44490db','url':'/static/js/ohf/assets/mstile-144x144.png'},{'revision':'334895225e16a7777e45d81964725a97','url':'/static/js/ohf/assets/mstile-150x150.png'},{'revision':'e295cca4af6ed0365cf7b014d91b0e9d','url':'/static/js/ohf/assets/mstile-310x150.png'},{'revision':'cbefa8c42250e5f2443819fe2c69d91e','url':'/static/js/ohf/assets/mstile-310x310.png'},{'revision':'aa411a69df2b33a1362fa38d1257fa9d','url':'/static/js/ohf/assets/mstile-70x70.png'},{'revision':'5609af4f69e40e33471aee770ea1d802','url':'/static/js/ohf/assets/yandex-browser-50x50.png'},{'revision':'cfea70d7ddc8f06f276ea0c85c4b2adf','url':'/static/js/ohf/assets/yandex-browser-manifest.json'},{'revision':'0ca44a1b8719e835645ffa804a9d1395','url':'/static/js/ohf/es6-shim.min.js'},{'revision':'fc5ca61e7823972f5c8fd43675770bc8','url':'/static/js/ohf/google.js'},{'revision':'73a7aeb73a88188e7d42ff09160770ea','url':'/static/js/ohf/index.html'},{'revision':'4e41fd55c08031edf19119a1df1a0538','url':'/static/js/ohf/init-service-worker.js'},{'revision':'74fc9658b62903be2048c1f82a22b4d4','url':'/static/js/ohf/manifest.json'},{'revision':'754d698a7b334af57c00f29723fd9751','url':'/static/js/ohf/oidc-client.min.js'},{'revision':'d05a380d50b74e629738ae6f62fb7e78','url':'/static/js/ohf/polyfill.min.js'},{'revision':'f528b6861c82ee4415fce0821fd695c1','url':'/static/js/ohf/silent-refresh.html'},{'revision':'83444eaf7461a993ceb5f464dff9cae9','url':'/static/js/ohf/vendors~StudyListRouting.bundle.6ed9ccb1455a6d7a7db1.js'},{'revision':'26b8a8638b179a868c60bd4ba64eb823','url':'/static/js/ohf/vendors~ViewerLocalFileData.bundle.5f7549843eb92b6f51b1.js'},{'revision':'8cf66c93f80df0bcda6758d57a9a8ab0','url':'/static/js/ohf/vendors~dicom-microscopy-viewer.bundle.1c96f3e45d6070dc8287.js'}]); // TODO: Cache API
// https://developers.google.com/web/fundamentals/instant-and-offline/web-storage/cache-api
// Store DICOMs?
// Clear Service Worker cache?
// navigator.storage.estimate().then(est => console.log(est)); (2GB?)

/***/ })
/******/ ]);